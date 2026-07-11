/**
 * User persistence shape + the mapping to the client-safe PublicUser. The
 * password HASH lives only here and in Mongo; toPublicUser strips it so it
 * can never cross the REST/WebSocket boundary (shared/auth.ts golden rule).
 */
import { ObjectId } from 'mongodb';
import type { PublicUser } from '../../../shared/auth';

export interface UserDocument {
  _id?: ObjectId;
  email: string;
  /** Lowercased copy of email for stable lookups (index is also collated). */
  emailLower: string;
  username: string;
  /** bcrypt hash — NEVER returned to any client. */
  passwordHash: string;
  createdAt: Date;
}

export function toPublicUser(doc: UserDocument): PublicUser {
  return {
    id: doc._id!.toHexString(),
    email: doc.email,
    username: doc.username,
    createdAt: doc.createdAt.toISOString(),
  };
}
