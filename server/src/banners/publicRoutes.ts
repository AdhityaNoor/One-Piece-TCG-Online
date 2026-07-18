/**
 * Public, unauthenticated read of active home-screen banners — consumed by
 * the player-facing home screen (src/app/screens/HubScreen home tab). No
 * admin auth here; this is display content, not account data. Mounted at
 * GET /banners in server/src/index.ts.
 */
import { Router, type Request, type Response } from 'express';
import { BannerService } from '../admin/bannerService';

const service = new BannerService();

export function bannersPublicRouter(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      res.json({ banners: await service.listActiveForPlayers() });
    } catch (cause) {
      console.error('[banners] failed to list active banners:', cause);
      res.status(500).json({ error: 'Could not load banners.', code: 'INTERNAL' });
    }
  });

  return router;
}
