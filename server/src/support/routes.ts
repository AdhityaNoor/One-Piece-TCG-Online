/**
 * Support REST surface. Auth-gated like every other route in this app (see
 * profile/routes.ts's doc comment — no anonymous public web presence), so a
 * report always carries a real reporterUserId, never an anonymous one.
 */
import { Router, type Request } from 'express';
import { requireAuth } from '../auth/middleware';
import { BugReportService } from './bugReportService';
import { sendSupportError } from './errors';
import type { SubmitBugReportRequest } from '../../../shared/support';

const bugReportService = new BugReportService();

function userId(req: Request): string {
  return req.auth!.sub;
}

export function supportRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.post('/bug-report', async (req, res) => {
    try {
      const result = await bugReportService.submit(userId(req), (req.body ?? {}) as SubmitBugReportRequest);
      res.status(201).json(result);
    } catch (cause) {
      sendSupportError(res, cause);
    }
  });

  return router;
}
