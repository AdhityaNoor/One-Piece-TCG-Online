/**
 * Auth REST surface: POST /auth/signup, POST /auth/login, GET /auth/me.
 * Logout is client-side (drop the token) — there is no server session to
 * destroy, by design, so it needs no endpoint.
 *
 * Every response body is either the shared AuthResponse/MeResponse or the
 * shared ApiErrorBody. Password hashes never appear in any response.
 */
import { Router, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { users } from '../db/mongo';
import { hashPassword, verifyPassword } from './password';
import { signToken } from './jwt';
import { requireAuth } from './middleware';
import { toPublicUser, type UserDocument } from './userModel';
import type {
  ApiErrorBody,
  AuthResponse,
  LoginRequest,
  MeResponse,
  SignupRequest,
} from '../../../shared/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(res: Response, status: number, code: ApiErrorBody['code'], error: string): void {
  const body: ApiErrorBody = { error, code };
  res.status(status).json(body);
}

function validateSignup(input: Partial<SignupRequest>): string | null {
  if (!input.email || !EMAIL_RE.test(input.email)) return 'A valid email is required.';
  if (!input.username || input.username.trim().length < 2) return 'Username must be at least 2 characters.';
  if (!input.password || input.password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

export function authRouter(): Router {
  const router = Router();

  router.post('/signup', async (req: Request, res: Response) => {
    const input = (req.body ?? {}) as Partial<SignupRequest>;
    const problem = validateSignup(input);
    if (problem) return fail(res, 400, 'VALIDATION', problem);

    const email = input.email!.trim();
    const emailLower = email.toLowerCase();
    const doc: UserDocument = {
      email,
      emailLower,
      username: input.username!.trim(),
      passwordHash: await hashPassword(input.password!),
      createdAt: new Date(),
    };

    try {
      const result = await users().insertOne(doc);
      doc._id = result.insertedId;
    } catch (err: unknown) {
      // Duplicate key from the unique collated email index.
      if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) {
        return fail(res, 409, 'EMAIL_TAKEN', 'An account with that email already exists.');
      }
      throw err;
    }

    const user = toPublicUser(doc);
    const token = signToken({ sub: user.id, email: user.email, username: user.username });
    const body: AuthResponse = { token, user };
    res.status(201).json(body);
  });

  router.post('/login', async (req: Request, res: Response) => {
    const input = (req.body ?? {}) as Partial<LoginRequest>;
    if (!input.email || !input.password) {
      return fail(res, 400, 'VALIDATION', 'Email and password are required.');
    }
    const doc = await users().findOne({ emailLower: input.email.trim().toLowerCase() });
    // Same generic message whether the email is unknown or the password is
    // wrong — never reveal which, to avoid account enumeration.
    if (!doc || !(await verifyPassword(input.password, doc.passwordHash))) {
      return fail(res, 401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    }
    const user = toPublicUser(doc);
    const token = signToken({ sub: user.id, email: user.email, username: user.username });
    const body: AuthResponse = { token, user };
    res.json(body);
  });

  router.get('/me', requireAuth, async (req: Request, res: Response) => {
    const claims = req.auth!;
    let doc: UserDocument | null = null;
    try {
      doc = await users().findOne({ _id: new ObjectId(claims.sub) });
    } catch {
      doc = null;
    }
    if (!doc) return fail(res, 404, 'NOT_FOUND', 'User no longer exists.');
    const body: MeResponse = { user: toPublicUser(doc) };
    res.json(body);
  });

  return router;
}
