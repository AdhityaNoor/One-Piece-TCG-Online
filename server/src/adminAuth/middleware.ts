/**
 * Express middleware gating every /admin/* route (except /admin/auth/login
 * itself) on a valid admin Bearer JWT. Attaches decoded claims to req.admin
 * — a SEPARATE field from req.auth (player claims), so a handler can never
 * accidentally read the wrong identity even if both middlewares somehow ran
 * on the same request.
 */
import type { NextFunction, Request, Response } from 'express';
import { verifyAdminToken } from './adminJwt';
import type { AdminJwtClaims, AdminApiErrorBody } from '../../../shared/admin';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminJwtClaims;
    }
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    const body: AdminApiErrorBody = { error: 'Missing or malformed Authorization header.', code: 'UNAUTHORIZED' };
    res.status(401).json(body);
    return;
  }
  const claims = verifyAdminToken(token);
  if (!claims) {
    const body: AdminApiErrorBody = { error: 'Invalid or expired admin session.', code: 'UNAUTHORIZED' };
    res.status(401).json(body);
    return;
  }
  req.admin = claims;
  next();
}
