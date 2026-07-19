/**
 * Thin REST client for the backend deck-library surface
 * (server/src/decks/routes.ts). Same shape as profileClient.ts /
 * rankedClient.ts: typed wrappers, one DeckApiError carrying the server's
 * machine code, no state kept here — that's deckSync.ts's job.
 */
import type { SavedDeck } from '../../cards/decks/savedDeck';
import type { DeckApiErrorBody } from '../../../shared/decks';
import { apiBaseUrl } from './backendConfig';

export class DeckApiError extends Error {
  constructor(
    message: string,
    readonly code: DeckApiErrorBody['code'],
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DeckApiError';
  }
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const err = body as Partial<DeckApiErrorBody>;
    throw new DeckApiError(err.error ?? `Request failed (${res.status}).`, err.code ?? 'INTERNAL', res.status, err.details);
  }
  return body as T;
}

function url(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

function authHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

/** Every saved deck on this account — full snapshots, used to refresh the local offline cache, not to render a picker list directly. */
export async function listRemoteDecks(token: string): Promise<SavedDeck[]> {
  const { decks } = await parseOrThrow<{ decks: SavedDeck[] }>(await fetch(url('/decks'), { headers: authHeaders(token) }));
  return decks;
}

/** Upsert. `deck.deckId` in the URL and the body must match — server rejects otherwise. */
export async function saveRemoteDeck(token: string, deck: SavedDeck): Promise<SavedDeck> {
  const { deck: saved } = await parseOrThrow<{ deck: SavedDeck }>(
    await fetch(url(`/decks/${encodeURIComponent(deck.deckId)}`), {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ deck }),
    }),
  );
  return saved;
}

export async function deleteRemoteDeck(token: string, deckId: string): Promise<void> {
  await parseOrThrow(await fetch(url(`/decks/${encodeURIComponent(deckId)}`), { method: 'DELETE', headers: authHeaders(token) }));
}
