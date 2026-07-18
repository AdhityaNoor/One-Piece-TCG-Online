/**
 * Admin JWT sign/verify. Deliberately a full copy of auth/jwt.ts's shape
 * rather than a shared generic — signed with env.adminJwtSecret, NOT
 * env.jwtSecret, so a player token and an admin token can never verify
 * against each other (project decision: fully separate admin credential
 * store, see models/admin.ts doc comment).
 */
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AdminJwtClaims } from '../../../shared/admin';

/** Admin sessions are intentionally short — this is a moderation/ops tool, not a player session. */
const ADMIN_TOKEN_TTL = '12h';

export function signAdminToken(claims: AdminJwtClaims): string {
  return jwt.sign(claims, env.adminJwtSecret as jwt.Secret, { expiresIn: ADMIN_TOKEN_TTL });
}

export function verifyAdminToken(token: string): AdminJwtClaims | null {
  try {
    const decoded = jwt.verify(token, env.adminJwtSecret);
    if (typeof decoded === 'string') return null;
    const { sub, email, displayName } = decoded as jwt.JwtPayload & Partial<AdminJwtClaims>;
    if (!sub || !email || !displayName) return null;
    return { sub, email, displayName };
  } catch {
    return null;
  }
}
