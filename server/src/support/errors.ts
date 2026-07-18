/**
 * Error shape for the support surface. Mirrors profile/errors.ts's pattern
 * (one typed error class + one response translator) rather than sharing that
 * module directly — support is its own domain (bug reports today, may grow
 * feedback/contact-us later) and shouldn't couple its error codes to
 * PublicProfileErrorCode's profile-specific vocabulary.
 */
import type { Response } from 'express';
import type { SupportErrorCode } from '../../../shared/support';

export class SupportServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: SupportErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SupportServiceError';
  }
}

export function sendSupportError(res: Response, cause: unknown): void {
  if (cause instanceof SupportServiceError) {
    res.status(cause.status).json({ error: cause.message, code: cause.code, details: cause.details });
    return;
  }
  console.error('[support] unhandled error:', cause);
  res.status(500).json({ error: 'Support service failed.', code: 'INTERNAL' satisfies SupportErrorCode });
}
