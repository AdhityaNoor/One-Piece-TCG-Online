/**
 * Auth wire contracts shared by the Vercel frontend and the Cloud Run
 * backend. Types only — no runtime, no dependencies — so both `src/` (Vite)
 * and `server/src` (Node) can import these without a build step and stay in
 * lockstep on the REST shape.
 *
 * Golden rule mirrored from the backend: a PublicUser NEVER carries the
 * password hash. The hash exists only inside the Mongo `users` collection
 * and the server's UserDocument; it is stripped before anything crosses this
 * boundary.
 */

/** A user as the client is ever allowed to see it. No password material. */
export interface PublicUser {
  id: string;
  email: string;
  username: string;
  createdAt: string; // ISO 8601
}

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Returned by POST /auth/signup and POST /auth/login. */
export interface AuthResponse {
  token: string;
  user: PublicUser;
}

/** Returned by GET /auth/me. */
export interface MeResponse {
  user: PublicUser;
}

/** Uniform error body for every REST endpoint (never leaks stack/hash). */
export interface ApiErrorBody {
  error: string;
  /** Machine-readable code so the UI can branch without string-matching messages. */
  code:
    | 'VALIDATION'
    | 'EMAIL_TAKEN'
    | 'INVALID_CREDENTIALS'
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'INTERNAL';
}

/**
 * Decoded JWT payload. `sub` is the Mongo user id; the server signs this and
 * both the REST auth middleware and the Colyseus room's onAuth verify it.
 * Deliberately tiny — identity only, never authorization state that could go
 * stale inside a long-lived token.
 */
export interface JwtClaims {
  sub: string;
  email: string;
  username: string;
}
