/**
 * Combined Admin CMS resource router — every route here requires
 * requireAdminAuth (applied once at the mount point in index.ts, not
 * per-sub-router, so it's impossible to forget on a new resource added
 * later). Admin LOGIN itself lives in adminAuth/routes.ts, mounted
 * separately at /admin/auth so it stays public.
 */
import { Router } from 'express';
import { playerAdminRoutes } from './playerAdminRoutes';
import { featureFlagRoutes } from './featureFlagRoutes';
import { bannerRoutes } from './bannerRoutes';
import { cardLegalityRoutes } from './cardLegalityRoutes';
import { bugReportAdminRoutes } from './bugReportAdminRoutes';

export function adminRouter(): Router {
  const router = Router();
  router.use('/players', playerAdminRoutes());
  router.use('/flags', featureFlagRoutes());
  router.use('/banners', bannerRoutes());
  router.use('/card-legality', cardLegalityRoutes());
  router.use('/bug-reports', bugReportAdminRoutes());
  return router;
}
