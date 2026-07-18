import { Router, type Request, type Response } from 'express';
import { CardLegalityService } from './cardLegalityService';
import { sendAdminError } from './errors';
import type { SetCardLegalityOverrideRequest } from '../../../shared/admin';

const service = new CardLegalityService();

function adminId(req: Request): string {
  return req.admin!.sub;
}

export function cardLegalityRoutes(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      res.json({ overrides: await service.list() });
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.put('/:cardNumber', async (req: Request, res: Response) => {
    try {
      res.json(await service.setOverride(adminId(req), req.params.cardNumber, (req.body ?? {}) as SetCardLegalityOverrideRequest));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.delete('/:cardNumber', async (req: Request, res: Response) => {
    try {
      await service.removeOverride(req.params.cardNumber);
      res.status(204).end();
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  return router;
}
