import type { Response } from 'express';

export type RankedErrorCode =
  | 'RANKED_DISABLED'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'QUEUE_CONFLICT'
  | 'PENALTY_ACTIVE'
  | 'NO_ACTIVE_SEASON'
  | 'INTERNAL';

export class RankedServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: RankedErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'RankedServiceError';
  }
}

export function sendRankedError(res: Response, cause: unknown): void {
  if (cause instanceof RankedServiceError) {
    res.status(cause.status).json({ error: cause.message, code: cause.code, details: cause.details });
    return;
  }
  console.error('[ranked] unhandled error:', cause);
  res.status(500).json({ error: 'Ranked service failed.', code: 'INTERNAL' satisfies RankedErrorCode });
}

