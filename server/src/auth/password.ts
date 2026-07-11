/**
 * Password hashing. bcryptjs (pure JS) rather than native bcrypt/argon2 so
 * the container builds with zero native toolchain on Cloud Run.
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
