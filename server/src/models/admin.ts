/**
 * Admin CMS credential store. Deliberately isolated from the player `users`
 * collection (project decision: a "fully separate admin credential store"
 * rather than a role flag on player accounts) — no admin account can ever
 * be created through a public signup route, only via the seedAdmin CLI
 * script (adminAuth/seedAdmin.ts) or another already-authenticated admin.
 */
import type { ObjectId } from 'mongodb';

export interface AdminDocument {
  _id?: ObjectId;
  email: string;
  /** Lowercased copy for stable, case-insensitive lookups (mirrors users.emailLower). */
  emailLower: string;
  displayName: string;
  /** bcrypt hash — NEVER returned to any client. */
  passwordHash: string;
  createdAt: string;
  lastLoginAt: string | null;
}
