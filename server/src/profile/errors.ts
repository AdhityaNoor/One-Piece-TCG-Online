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

/**
 * body-parser rejects an oversized body by throwing its own error with a
 * `type` of 'entity.too.large' — not a ProfileServiceError, so without this
 * branch a too-big upload surfaced to the player as a generic 500 "Profile
 * service failed" with no hint that the file was simply too large.
 */
function asBodyParserFailure(cause: unknown): { status: number; code: PublicProfileErrorCode; message: string } | null {
  if (typeof cause !== 'object' || cause === null) return null;
  const type = (cause as { type?: unknown }).type;
  if (type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'That file is too large to upload.' };
  }
  if (type === 'entity.parse.failed') {
    return { status: 400, code: 'VALIDATION', message: 'The request body could not be read.' };
  }
  return null;
}

export function sendProfileError(res: Response, cause: unknown): void {
  if (cause instanceof ProfileServiceError) {
    res.status(cause.status).json({ error: cause.message, code: cause.code, details: cause.details });
    return;
  }
  const bodyFailure = asBodyParserFailure(cause);
  if (bodyFailure) {
    res.status(bodyFailure.status).json({ error: bodyFailure.message, code: bodyFailure.code });
    return;
  }
  console.error('[profile] unhandled error:', cause);
  res.status(500).json({ error: 'Profile service failed.', code: 'INTERNAL' satisfies PublicProfileErrorCode });
}
