/**
 * Local card lookup by card number.
 *
 * With the checked-in catalog, a card id search becomes a pure data lookup
 * across the local set files. This keeps the deck builder search flow alive
 * without any remote dependency.
 */
import { fetchAllPlayableCardPrintings, type CardApiError, type FetchLike } from './client';
import type { CardPrintingDto } from './types';

export type ResolveCardByIdResult =
  | { ok: true; found: true; printings: CardPrintingDto[] }
  | { ok: true; found: false }
  | { ok: false; error: CardApiError };

export async function resolveCardPrintingsById(fetchImpl: FetchLike, cardId: string): Promise<ResolveCardByIdResult> {
  const result = await fetchAllPlayableCardPrintings(fetchImpl);
  if (!result.ok) return result;
  const printings = result.data.filter((row) => row.card_set_id === cardId);
  return printings.length > 0 ? { ok: true, found: true, printings } : { ok: true, found: false };
}
