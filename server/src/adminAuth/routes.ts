/**
 * Admin auth REST surface: POST /admin/auth/login, GET /admin/auth/me.
 * Mounted separately from the rest of /admin (server/src/admin/routes.ts)
 * so login itself can stay PUBLIC while every other /admin/* route requires
 * requireAdminAuth — see server/src/index.ts for the two mount points.
 *
 * There is deliberately no signup route: admin accounts are created only by
 * the seedAdmin CLI script (adminAuth/seedAdmin.ts) or, later, by another
 * already-authenticated admin — never by an open endpoint.
 */
import { Router, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { admins } from '../db/mongo';
import { verifyPassword } from '../auth/password';
import { signAdminToken } from './adminJwt';
import { requireAdminAuth } from './middleware';
import type { AdminApiErrorBody, AdminAuthResponse, AdminLoginRequest, PublicAdmin } from '../../../shared/admin';
import type { AdminDocument } from '../models/admin';

function fail(res: Response, status: number, code: AdminApiErrorBody['code'], error: string): void {
  const body: AdminApiErrorBody = { error, code };
  res.status(status).json(body);
}

function toPublicAdmin(doc: AdminDocument): PublicAdmin {
  return { id: doc._id!.toHexString(), email: doc.email, displayName: doc.displayName, createdAt: doc.createdAt, lastLoginAt: doc.lastLoginAt };
}

export function adminAuthRouter(): Router {
  const router = Router();

  router.post('/login', async (req: Request, res: Response) => {
    const input = (req.body ?? {}) as Partial<AdminLoginRequest>;
    if (!input.email || !input.password) {
      return fail(res, 400, 'VALIDATION', 'Email and password are required.');
    }
    const doc = await admins().findOne({ emailLower: input.email.trim().toLowerCase() });
    // Same generic message whether the email is unknown or the password is
    // wrong, mirroring auth/routes.ts's account-enumeration guard.
    if (!doc || !(await verifyPassword(input.password, doc.passwordHash))) {
      return fail(res, 401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    }
    const lastLoginAt = new Date().toISOString();
    await admins().updateOne({ _id: doc._id }, { $set: { lastLoginAt } });
    const admin = toPublicAdmin({ ...doc, lastLoginAt });
    const token = signAdminToken({ sub: admin.id, email: admin.email, displayName: admin.displayName });
    const body: AdminAuthResponse = { token, admin };
    res.json(body);
  });

  router.get('/me', requireAdminAuth, async (req: Request, res: Response) => {
    const claims = req.admin!;
    let doc: AdminDocument | null = null;
    try {
      doc = await admins().findOne({ _id: new ObjectId(claims.sub) });
    } catch {
      doc = null;
    }
    if (!doc) return fail(res, 404, 'NOT_FOUND', 'Admin account no longer exists.');
    res.json({ admin: toPublicAdmin(doc) });
  });

  return router;
}
