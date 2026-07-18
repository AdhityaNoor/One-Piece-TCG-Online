/**
 * Shared error shape for every /admin/* resource service (players, feature
 * flags, banners, card legality, bug report triage). Mirrors profile/errors.ts's
 * one-class-plus-one-translator pattern.
 */
import type { Response } from 'express';
import type { AdminErrorCode } from '../../../shared/admin';

export class AdminServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: AdminErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AdminServiceError';
  }
}

export function sendAdminError(res: Response, cause: unknown): void {
  if (cause instanceof AdminServiceError) {
    res.status(cause.status).json({ error: cause.message, code: cause.code, details: cause.details });
    return;
  }
  console.error('[admin] unhandled error:', cause);
  res.status(500).json({ error: 'Admin service failed.', code: 'INTERNAL' satisfies AdminErrorCode });
}
