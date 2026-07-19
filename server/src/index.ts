/**
 * Backend entrypoint. Wires together, on ONE http server (so WebSocket
 * upgrades and REST share a port — required for Cloud Run):
 *   - Express REST: /health + /auth/* + /ranked/* + /profile/* + /support/*
 *     + /banners (public) + /admin/auth/* (public login) + /admin/* (admin-only CMS)
 *   - Colyseus realtime: the GameRoom, registered under GAME_ROOM_NAME
 *   - MongoDB Atlas connection (opened before listen)
 *
 * Cloud Run contract: bind process.env.PORT on 0.0.0.0. Colyseus's
 * WebSocketTransport attaches to the same server, so a single Cloud Run
 * service serves both HTTP and WS with WebSocket support enabled.
 */
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { env, isAllowedClientOrigin } from './config/env';
import { connectMongo, closeMongo } from './db/mongo';
import { authRouter } from './auth/routes';
import { rankedRouter } from './ranked/routes';
import { profileRouter } from './profile/routes';
import { decksRouter } from './decks/routes';
import { supportRouter } from './support/routes';
import { adminAuthRouter } from './adminAuth/routes';
import { requireAdminAuth } from './adminAuth/middleware';
import { adminRouter } from './admin/routes';
import { bannersPublicRouter } from './banners/publicRoutes';
import { GameRoom } from './rooms/GameRoom';
import { GAME_ROOM_NAME } from '../../shared/multiplayer';

async function main(): Promise<void> {
  await connectMongo();

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // CORS for the Vercel frontend origin(s). Same allow-list is honored by the
  // WebSocket transport via `verifyClient` below.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedClientOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin not allowed by CORS: ${origin ?? '<none>'}`));
      },
      credentials: true,
    }),
  );

  // Cloud Run health check — must be fast and dependency-light.
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', env: env.nodeEnv });
  });

  app.get('/rooms/open', async (_req, res, next) => {
    try {
      const rooms = await matchMaker.query({ name: GAME_ROOM_NAME });
      res.json(
        rooms
          .filter((room) => !room.locked && !room.private && !room.unlisted)
          .map((room) => ({
            roomId: room.roomId,
            clients: room.clients,
            maxClients: room.maxClients,
            metadata: room.metadata ?? {},
            createdAt: room.createdAt,
          })),
      );
    } catch (err) {
      next(err);
    }
  });

  app.use('/auth', authRouter());
  app.use('/ranked', rankedRouter());
  app.use('/profile', profileRouter());
  app.use('/decks', decksRouter());
  app.use('/support', supportRouter());
  app.use('/banners', bannersPublicRouter());

  // Admin CMS. Login is mounted first and stays public; requireAdminAuth is
  // applied ONCE here at the mount point for everything else under /admin,
  // rather than inside each sub-router, so a newly-added resource can never
  // forget to gate itself.
  app.use('/admin/auth', adminAuthRouter());
  app.use('/admin', requireAdminAuth, adminRouter());

  const httpServer = createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
      // Ready messages carry a full SavedDeck snapshot. The transport default
      // is 4KB, which is too small for real deck JSON and closes the socket.
      maxPayload: 1024 * 1024,
      // Reject WS handshakes from origins outside the allow-list.
      verifyClient: (info, next) => {
        next(isAllowedClientOrigin(info.origin));
      },
    }),
  });

  gameServer.define(GAME_ROOM_NAME, GameRoom);

  await gameServer.listen(env.port, '0.0.0.0', undefined, () => {
    console.log(`[server] listening on 0.0.0.0:${env.port} (${env.nodeEnv})`);
    console.log(`[server] CORS/WS origins: ${env.clientOrigins.join(', ')}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[server] ${signal} received, shutting down...`);
    await gameServer.gracefullyShutdown(false).catch(() => undefined);
    await closeMongo().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[server] fatal boot error:', err);
  process.exit(1);
});
