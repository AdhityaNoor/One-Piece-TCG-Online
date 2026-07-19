/**
 * Wire contract for the account-backed deck library (server/src/decks/routes.ts
 * <-> src/multiplayer/net/deckClient.ts). Types only, same "no runtime, no
 * build step" rule as shared/auth.ts and shared/profile.ts.
 *
 * Deliberately does NOT redeclare SavedDeck's shape here — both sides already
 * import the real `SavedDeck` type straight from `src/cards/decks/savedDeck`
 * (the server already does this for ranked deck snapshots; see
 * models/ranked.ts / game/matchEngine.ts). Duplicating it into a wire-only
 * type would just be a second shape to keep in sync for no benefit, since
 * both processes share one repo and one build boundary via this shared/ dir.
 */

export type DeckApiErrorCode = 'VALIDATION' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';

export interface DeckApiErrorBody {
  error: string;
  code: DeckApiErrorCode;
  details?: unknown;
}
