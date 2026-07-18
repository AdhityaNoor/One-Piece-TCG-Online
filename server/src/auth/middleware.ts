/**
 * Express middleware that gates protected REST endpoints on a valid Bearer
 * JWT. On success it attaches the decoded claims to req.auth; on failure it
 * responds 401 with the uniform ApiErrorBody and does not call next().
 *
 * Ban enforcement (Admin CMS "ban the player" feature): after the token
 * itself checks out, this also rejects a SUSPENDED account with 403 — every
 * route mounted behind requireAuth (profile, ranked, support) is covered
 * from this one choke point, and GameRoom.onAuth runs the identical
 * moderationGate.isSuspended check for the WebSocket path (see that file's
 * doc comment). A suspended user's existing JWT is otherwise still
 * cryptographically valid until it expires — this check is what actually
 * locks them out, not token revocation.
 */
import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './jwt';
import { isSuspended } from './moderationGate';
import type { JwtClaims, ApiErrorBody } from '../../../shared/auth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtClaims;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  try {
    if (await isSuspended(claims.sub)) {
      const body: ApiErrorBody = { error: 'This account has been suspended.', code: 'SUSPENDED' };
      res.status(403).json(body);
      return;
    }
  } catch (err) {
    // Fail OPEN on a transient Mongo hiccup rather than making every
    // authenticated request in the app depend on this secondary lookup
    // succeeding — log it so an outage here is still visible.
    console.error('[auth] moderation check failed, allowing request through:', err);
  }

  req.auth = claims;
  next();
}
