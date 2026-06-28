/**
 * Raw OPTCG API ("optcgapi.com") wire types.
 *
 * Source of truth: live responses captured 2026-06-28 from the documented
 * endpoints (https://optcgapi.com/documentation). There is no published
 * OpenAPI/JSON-Schema for this API, so these interfaces are reverse-engineered
 * from real payloads, not from written docs. Treat every optional/nullable
 * marking below as "observed", not "guaranteed" — re-verify if the API
 * changes shape (see normalization/ for the defensive layer that assumes
 * this contract WILL drift).
 *
 * Ground rule: these are DTOs only. Nothing in this file or anywhere under
 * /src/cards/api may be imported by /src/engine. Card text fields here are
 * raw display strings, never parsed into executable logic.
 */

/** Row shape for GET /api/allSets/. */
export interface SetSummaryDto {
  set_name: string;
  set_id: string; // e.g. "OP-01". NOT a fixed pattern — also seen "EB-01", "PRB-01", "OP14-EB04".
}

/**
 * Shared row shape returned by every "playing card" endpoint family: Sets
 * (/api/sets/...), Starter Decks (/api/decks/...), and Promos
 * (/api/promos/...). Confirmed identical field set across Leader, Character,
 * Event, and Stage rows in live samples (Stage not yet observed directly,
 * assumed consistent with Event's null pattern — TODO confirm).
 *
 * IMPORTANT — one card number, many rows: /api/sets/card/{card_id}/ (and the
 * decks/promos equivalents) return an ARRAY, not a single object. Every
 * printing/reprint/parallel/SP/manga variant of that card NUMBER is a
 * separate row sharing the same card_set_id. Rows for the "same" card can
 * have non-identical card_text (observed: OP01-016 Nami's SP printing wraps
 * a type name in [] instead of "" — likely a scraping/formatting artifact,
 * not a rules difference, but normalization must pick ONE row as canonical
 * rather than averaging or guessing — see normalization/canonicalPrinting.ts).
 *
 * Field-type quirks observed live (do not assume uniformity):
 * - card_power, card_cost, life: numeric value encoded AS A STRING, or null.
 * - counter_amount: a real JSON number (0 for "no counter" on some
 *   Characters, e.g. promo Luffy P-001; null on Leader/Event/Stage/DON rows).
 * - inventory_price, market_price: real JSON numbers (TCGplayer-style market
 *   pricing — out of scope for the game engine, kept only for optional
 *   collection-flavor UI; never used by /src/cards/normalization).
 * - card_image: a full URL string, OR null (observed on several promo rows,
 *   e.g. P-001_pr7, P-001_pr5 — a missing/never-scraped asset, not an error).
 */
export interface CardPrintingDto {
  inventory_price: number | null;
  market_price: number | null;
  card_name: string;
  set_name: string;
  card_text: string;
  set_id: string; // the SET this printing belongs to, e.g. "OP-01" — confusingly distinct from card_set_id below.
  rarity: string;
  /** The card NUMBER, e.g. "OP01-016". This is the deck-construction identity key (5-1-2-3), despite the "set" in its name. */
  card_set_id: string;
  /**
   * Single color string in every sample seen ("Red", "Purple", ...).
   * Comprehensive Rules 2-3-5 describes multicolor cards counting as every
   * listed color, but no multicolor row has been observed yet, so the
   * delimiter (likely "/") is UNCONFIRMED. TODO: verify against a known
   * multicolor card before normalization assumes a split character.
   */
  card_color: string;
  card_type: 'Leader' | 'Character' | 'Event' | 'Stage';
  life: string | null;
  card_cost: string | null;
  card_power: string | null;
  /**
   * Free-text tribal types as ONE space-joined string with NO reliable
   * delimiter between distinct types (observed: "Animal Kingdom Pirates The
   * Four Emperors" is two multi-word types concatenated with a plain space —
   * indistinguishable from a single four-word type by string inspection
   * alone). Do not auto-split this without a maintained type-name dictionary
   * — see normalization warnings.
   */
  sub_types: string | null;
  counter_amount: number | null;
  attribute: string | null; // e.g. "Slash", "Special"; null for Event/Stage. "?" attribute (2-5-2) not yet observed.
  /** Date the pricing snapshot was last scraped — NOT a rules field. Excluded from normalized CardDefinition. */
  date_scraped: string;
  /** Printing-specific image variant id, e.g. "OP01-016" (base) vs "OP01-016_p1" (parallel) vs "OP01-016_p8" (manga reprint). Unique per printing, NOT per card number. */
  card_image_id: string;
  card_image: string | null;
}

/**
 * Row shape for GET /api/allDonCards/. Structurally unrelated to
 * CardPrintingDto — DON!! cards have no color/type/cost/power/life fields.
 */
export interface DonCardDto {
  inventory_price: number | null;
  market_price: number | null;
  card_name: string;
  card_text: string;
  rarity: string; // observed constant "DON!!"
  card_type: 'DON!!';
  don_id: string | null; // observed always null in samples — purpose unconfirmed, kept for forward-compat.
  date_scraped: string;
  card_image_id: string;
  card_image: string | null;
  optcg_don_name: string; // long descriptive name, e.g. "DON!! Card (Iceberg) (Gold) - Premium Booster -The Best- (PRB-01)"
}

/** Discriminates which raw-row shape a given API family returns, for generic plumbing in client.ts. */
export type CardApiResourceKind = 'set-card' | 'don-card' | 'set-summary';
