/**
 * Backend entrypoint. Wires together, on ONE http server (so WebSocket
 * upgrades and REST share a port — required for Cloud Run):
 *   - Express REST: /health + /auth/*
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
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { env } from './config/env';
import { connectMongo, closeMongo } from './db/mongo';
import { authRouter } from './auth/routes';
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
      origin: env.clientOrigins,
      credentials: true,
    }),
  );

  // Cloud Run health check — must be fast and dependency-light.
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', env: env.nodeEnv });
  });

  app.use('/auth', authRouter());

  const httpServer = createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
      // Reject WS handshakes from origins outside the allow-list.
      verifyClient: (info, next) => {
        const origin = info.origin;
        const allowed = !origin || env.clientOrigins.includes(origin);
        next(allowed);
      },
    }),
  });

  gameServer.define(GAME_ROOM_NAME, GameRoom);

  httpServer.listen(env.port, '0.0.0.0', () => {
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
