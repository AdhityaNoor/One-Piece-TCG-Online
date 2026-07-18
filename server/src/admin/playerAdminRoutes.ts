import { Router, type Request, type Response } from 'express';
import { PlayerAdminService } from './playerAdminService';
import { MatchHistoryService } from '../profile/matchHistoryService';
import { sendAdminError } from './errors';
import type { BanPlayerRequest } from '../../../shared/admin';

const service = new PlayerAdminService();
const matchHistoryService = new MatchHistoryService();

function adminId(req: Request): string {
  return req.admin!.sub;
}

export function playerAdminRoutes(): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
      const limit = Number(req.query.limit ?? 25);
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;
      res.json(await service.listPlayers(cursor, limit, query));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.get('/:userId', async (req: Request, res: Response) => {
    try {
      res.json(await service.getPlayerDetail(req.params.userId));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.get('/:userId/decks', async (req: Request, res: Response) => {
    try {
      res.json({ decks: await service.getPlayerDecks(req.params.userId) });
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.get('/:userId/match-history', async (req: Request, res: Response) => {
    try {
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
      const limit = Number(req.query.limit ?? 20);
      res.json(await matchHistoryService.getPage(req.params.userId, cursor, limit));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.post('/:userId/ban', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as BanPlayerRequest;
      await service.ban(adminId(req), req.params.userId, body.reason ?? '');
      res.status(204).end();
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.post('/:userId/unban', async (req: Request, res: Response) => {
    try {
      await service.unban(adminId(req), req.params.userId);
      res.status(204).end();
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  return router;
}
