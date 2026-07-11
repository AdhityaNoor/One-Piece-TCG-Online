/**
 * Express middleware that gates protected REST endpoints on a valid Bearer
 * JWT. On success it attaches the decoded claims to req.auth; on failure it
 * responds 401 with the uniform ApiErrorBody and does not call next().
 */
import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './jwt';
import type { JwtClaims, ApiErrorBody } from '../../../shared/auth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtClaims;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    const body: ApiErrorBody = { error: 'Missing or malformed Authorization header.', code: 'UNAUTHORIZED' };
    res.status(401).json(body);
    return;
  }
  const claims = verifyToken(token);
  if (!claims) {
    const body: ApiErrorBody = { error: 'Invalid or expired token.', code: 'UNAUTHORIZED' };
    res.status(401).json(body);
    return;
  }
  req.auth = claims;
  next();
}
