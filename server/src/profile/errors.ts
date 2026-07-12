import type { Response } from 'express';
import type { PublicProfileErrorCode } from '../../../shared/profile';

export class ProfileServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: PublicProfileErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ProfileServiceError';
  }
}

export function sendProfileError(res: Response, cause: unknown): void {
  if (cause instanceof ProfileServiceError) {
    res.status(cause.status).json({ error: cause.message, code: cause.code, details: cause.details });
    return;
  }
  console.error('[profile] unhandled error:', cause);
  res.status(500).json({ error: 'Profile service failed.', code: 'INTERNAL' satisfies PublicProfileErrorCode });
}
