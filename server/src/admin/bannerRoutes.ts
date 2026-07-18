import { Router, type Request, type Response } from 'express';
import { BannerService } from './bannerService';
import { sendAdminError } from './errors';
import type { SaveHomeBannerRequest } from '../../../shared/admin';

const service = new BannerService();

function adminId(req: Request): string {
  return req.admin!.sub;
}

export function bannerRoutes(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      res.json({ banners: await service.listAllForAdmin() });
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      res.status(201).json(await service.create(adminId(req), (req.body ?? {}) as SaveHomeBannerRequest));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      res.json(await service.update(adminId(req), req.params.id, (req.body ?? {}) as SaveHomeBannerRequest));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await service.remove(req.params.id);
      res.status(204).end();
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  return router;
}
