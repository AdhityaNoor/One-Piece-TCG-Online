import { Router, type Request, type Response } from 'express';
import { FeatureFlagService } from './featureFlagService';
import { sendAdminError } from './errors';
import type { CreateFeatureFlagRequest, UpdateFeatureFlagRequest } from '../../../shared/admin';

const service = new FeatureFlagService();

function adminId(req: Request): string {
  return req.admin!.sub;
}

export function featureFlagRoutes(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      res.json({ flags: await service.list() });
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      res.status(201).json(await service.create(adminId(req), (req.body ?? {}) as CreateFeatureFlagRequest));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.patch('/:key', async (req: Request, res: Response) => {
    try {
      res.json(await service.update(adminId(req), req.params.key, (req.body ?? {}) as UpdateFeatureFlagRequest));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.delete('/:key', async (req: Request, res: Response) => {
    try {
      await service.remove(req.params.key);
      res.status(204).end();
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  return router;
}
