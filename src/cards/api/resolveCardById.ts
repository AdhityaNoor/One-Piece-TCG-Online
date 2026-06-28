/**
 * "Search by card number" needs ONE lookup, but optcgapi.com splits printings
 * across three disjoint endpoint families — Sets, Starter Decks, Promos —
 * with no unified "any card by id" endpoint and no documented way to know
 * which family a given id belongs to ahead of time (a leading "ST" or "P-"
 * is observed convention, not a documented guarantee). Rather than guess
 * from the id's shape, this tries each family in turn and trusts whichever
 * one actually returns rows.
 *
 * TODO / needs-confirmation: the try-order below (sets, then decks, then
 * promos) is a best-effort heuristic, not a documented rule — see project
 * ground rule "do not assume rules; mark as TODO" applied here to API USAGE
 * rather than game rules. If optcgapi.com ever adds a unified lookup, prefer
 * it over this fallback chain.
 */
import { optcgEndpoints } from './endpoints';
import { fetchCardPrintings } from './client';
import type { CardApiError, FetchLike } from './client';
import type { CardPrintingDto } from './types';

export type CardFamily = 'sets' | 'decks' | 'promos';

export type ResolveCardByIdResult =
  | { ok: true; found: true; family: CardFamily; printings: CardPrintingDto[] }
  | { ok: true; found: false }
  | { ok: false; error: CardApiError };

const FAMILY_ATTEMPTS: Array<{ family: CardFamily; buildUrl: (cardId: string) => string }> = [
  { family: 'sets', buildUrl: optcgEndpoints.cardPrintings },
  { family: 'decks', buildUrl: optcgEndpoints.deckCardPrintings },
  { family: 'promos', buildUrl: optcgEndpoints.promoCardPrintings },
];

/**
 * Tries every family in sequence; returns as soon as one has rows. A family
 * responding successfully with an EMPTY array is not an error — it just
 * means this id isn't in that family, so the chain keeps going. Only
 * surfaces `ok: false` (a real network/parse/shape problem) if every family
 * failed outright; if at least one family answered cleanly (even with zero
 * rows) the result is `found: false`, never a guess.
 */
export async function resolveCardPrintingsById(fetchImpl: FetchLike, cardId: string): Promise<ResolveCardByIdResult> {
  let lastError: CardApiError | undefined;

  for (const attempt of FAMILY_ATTEMPTS) {
    const url = attempt.buildUrl(cardId);
    const result = await fetchCardPrintings(fetchImpl, url);

    if (result.ok) {
      if (result.data.length > 0) {
        return { ok: true, found: true, family: attempt.family, printings: result.data };
      }
      continue;
    }

    lastError = result.error;
  }

  if (lastError) {
    return { ok: false, error: lastError };
  }

  return { ok: true, found: false };
}
