import type { Response } from 'express';
import type { DeckApiErrorCode } from '../../../shared/decks';

export class DeckServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: DeckApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DeckServiceError';
  }
}

export function sendDeckError(res: Response, cause: unknown): void {
  if (cause instanceof DeckServiceError) {
    res.status(cause.status).json({ error: cause.message, code: cause.code, details: cause.details });
    return;
  }
  console.error('[decks] unhandled error:', cause);
  res.status(500).json({ error: 'Deck service failed.', code: 'INTERNAL' satisfies DeckApiErrorCode });
}
