import { Router, type Request, type Response } from 'express';
import { BugReportAdminService } from './bugReportAdminService';
import { sendAdminError } from './errors';
import type { BugReportStatus, BugReportValidity, UpdateBugReportRequest } from '../../../shared/admin';

const service = new BugReportAdminService();

export function bugReportAdminRoutes(): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
      const limit = Number(req.query.limit ?? 25);
      res.json(
        await service.list(cursor, limit, {
          status: typeof req.query.status === 'string' ? (req.query.status as BugReportStatus) : undefined,
          validity: typeof req.query.validity === 'string' ? (req.query.validity as BugReportValidity) : undefined,
        }),
      );
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      res.json(await service.getById(req.params.id));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      res.json(await service.update(req.params.id, (req.body ?? {}) as UpdateBugReportRequest));
    } catch (cause) {
      sendAdminError(res, cause);
    }
  });

  return router;
}
