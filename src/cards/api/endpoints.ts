/**
 * OPTCG API endpoint paths.
 * Source of truth: https://optcgapi.com/documentation, cross-checked against
 * live responses 2026-06-28. No API key/header is required (consumption-only,
 * unauthenticated GET per project facts).
 *
 * Operational facts that drive how these are USED (see api/cache.ts):
 * - The "all*" endpoints (allSets, allSetCards, allSTCards, allPromos,
 *   allDonCards) return their ENTIRE table in one unpaginated response —
 *   allDonCards alone is 70KB+ of JSON today and will only grow. The site
 *   owner explicitly asks API consumers to go easy on call volume (it's a
 *   self-funded VPS). These must be fetched rarely and cached aggressively,
 *   never re-fetched per keystroke of a search box.
 * - The "/filtered/" endpoints are UNRELIABLE: a live test of
 *   /api/sets/filtered/?card_color=Red&card_type=Event correctly filtered
 *   card_type (123/123 rows were Event) but silently IGNORED card_color
 *   (rows came back in all 6 colors). Never trust /filtered/ query params to
 *   have actually filtered — the adapter must re-filter client-side after
 *   any /filtered/ call, treating the server-side filter as a (possibly
 *   no-op) optimization hint only.
 * - No pagination parameters are documented or observed on any endpoint.
 */

export const OPTCG_API_BASE_URL = 'https://optcgapi.com/api';

/** Manual query-string builder — deliberately not `URLSearchParams` so /src/cards/api makes no assumption about DOM/Node globals being present (same environment-agnostic rule as client.ts's FetchLike). */
function toQueryString(query: Record<string, string>): string {
  return Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export const optcgEndpoints = {
  /** All sets metadata (cheap — ~21 rows today). */
  allSets: () => `${OPTCG_API_BASE_URL}/allSets/`,
  /** Every card from every numbered set, unpaginated. Avoid; prefer setCards/cardPrintings. */
  allSetCards: () => `${OPTCG_API_BASE_URL}/allSetCards/`,
  /** All cards belonging to one set, e.g. set_id "OP-01". */
  setCards: (setId: string) => `${OPTCG_API_BASE_URL}/sets/${encodeURIComponent(setId)}/`,
  /** All printings of one card NUMBER, e.g. "OP01-016". Returns an array — see types.ts. */
  cardPrintings: (cardId: string) => `${OPTCG_API_BASE_URL}/sets/card/${encodeURIComponent(cardId)}/`,
  /** Server-side filter; UNRELIABLE per field, see module doc above. Query params unconfirmed beyond card_type. */
  setsFiltered: (query: Record<string, string>) => `${OPTCG_API_BASE_URL}/sets/filtered/?${toQueryString(query)}`,
  /** Cards scraped/updated in the last two weeks — useful for incremental cache refresh. Param shape unconfirmed (TODO). */
  setsCardTwoWeeks: () => `${OPTCG_API_BASE_URL}/sets/card/twoweeks/`,

  /** All Starter Deck metadata. */
  allDecks: () => `${OPTCG_API_BASE_URL}/allDecks/`,
  /** Every Starter Deck card, unpaginated. */
  allSTCards: () => `${OPTCG_API_BASE_URL}/allSTCards/`,
  /** All cards in one starter deck, e.g. st_id "ST-01". */
  deckCards: (stId: string) => `${OPTCG_API_BASE_URL}/decks/${encodeURIComponent(stId)}/`,
  /** All printings of one Starter Deck card number, e.g. "ST01-001". */
  deckCardPrintings: (cardId: string) => `${OPTCG_API_BASE_URL}/decks/card/${encodeURIComponent(cardId)}/`,
  deckCardTwoWeeks: () => `${OPTCG_API_BASE_URL}/decks/card/twoweeks/`,

  /** All promo cards, unpaginated. Docs tab label says allPromoCards, but the live documented endpoint is allPromos. */
  allPromoCards: () => `${OPTCG_API_BASE_URL}/allPromos/`,
  /** All printings of one promo card number, e.g. "P-001". */
  promoCardPrintings: (cardId: string) => `${OPTCG_API_BASE_URL}/promos/card/${encodeURIComponent(cardId)}/`,
  promoCardTwoWeeks: () => `${OPTCG_API_BASE_URL}/promos/card/twoweeks/`,

  /** All DON!! cards, unpaginated (largest single endpoint observed). */
  allDonCards: () => `${OPTCG_API_BASE_URL}/allDonCards/`,
  donFiltered: (query: Record<string, string>) => `${OPTCG_API_BASE_URL}/don/filtered/?${toQueryString(query)}`,
} as const;
