/**
 * JWT sign/verify — the one place tokens are minted and checked. Used by both
 * the REST auth middleware and the Colyseus room's onAuth, so a single token
 * format authenticates HTTP and WebSocket alike.
 */
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtClaims } from '../../../shared/auth';

export function signToken(claims: JwtClaims): string {
  return jwt.sign(claims, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/** Returns claims on a valid token, or null on any failure (expired/tampered). */
export function verifyToken(token: string): JwtClaims | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === 'string') return null;
    const { sub, email, username } = decoded as jwt.JwtPayload & Partial<JwtClaims>;
    if (!sub || !email || !username) return null;
    return { sub, email, username };
  } catch {
    return null;
  }
}
