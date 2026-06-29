/**
 * The local, stable deck snapshot. This is the project's core resilience
 * guarantee (requirement #4: "must not break if the API changes later") —
 * once a deck is saved, it never needs the remote card API again. Every selected
 * card's full raw API row AND its derived CardDefinition are embedded
 * in-place, not referenced by id.
 *
 * Why embed BOTH raw and normalized data (requirement #5 only asks for
 * normalized data for the engine):
 * - `definition` (CardDefinition) is what the engine actually consumes —
 *   game setup reads straight from here, never touching /src/cards/api.
 * - `rawPrinting` (CardPrintingDto, verbatim) is kept so that if a bug in
 *   normalizeCardPrintings is found and fixed later, OR the API's field
 *   meanings turn out to differ from what was assumed, every existing saved
 *   deck can be RE-normalized offline from data already on disk — without
 *   ever re-fetching a remote provider, which may have changed or gone away by
 *   then. Re-deriving from a frozen raw row is strictly safer than trusting
 *   a frozen derived value forever.
 *
 * Everything here is plain JSON-serializable data (project ground rule) —
 * no functions, no Map/Set, no class instances.
 */
import type { CardDefinition } from '../../engine/state/card';
import type { CardPrintingDto } from '../api/types';
import type { NormalizationWarning } from '../normalization/warnings';

/** Bump on any breaking change to this file's shape. Saved decks carry their own version so a future loader can migrate old saves instead of failing on them. See `migrateSavedDeck` below for the v1 -> v2 upgrade path. */
export const SAVED_DECK_SCHEMA_VERSION = 2;

export interface SavedDeckCardSnapshot {
  /** = CardDefinition.cardNumber. Deck-construction copy-count tracking (5-1-2-3) keys off THIS, not printingImageId. */
  cardNumber: string;
  /**
   * 2-11/5-1-2-3 note: NOT a rules field — purely which art/printing was
   * chosen. Derived from `printingImageId` (`${cardNumber}_${variant}`, the
   * API's own `card_image_id` convention — see api/types.ts), so it is
   * always consistent with printingImageId by construction, never set
   * independently. Mirrors the clipboard-import format's own
   * `cardId[_variant]` shape (see ./clipboardImport.ts).
   */
  variant: string | null;
  /** The specific printing/art chosen for display — cosmetic only, never affects rules. */
  printingImageId: string;
  imageUrl: string | null;
  /**
   * Local cache key/path for this card's image once downloaded — see
   * /src/cards/assets/assetCache.ts. Always null until asset download/
   * caching actually ships (project requirement #9); present now so the
   * saved-deck SHAPE doesn't need another schema bump just to add it later.
   */
  cachedImagePath: string | null;
  definition: CardDefinition;
  rawPrinting: CardPrintingDto;
  /** 1-4. Always 1 for the leader slot. */
  quantity: number;
  warnings: NormalizationWarning[];
  /**
   * Verbatim clipboard-import line(s) that produced this card (see
   * ./clipboardImport.ts ParsedDeckListEntry.sourceLines), preserved for
   * provenance/debugging ("why did this card end up in my deck?"). An array
   * because duplicate clipboard lines aggregate into one entry. Null when
   * this card was added via Browse or Search-by-ID instead of paste-import.
   */
  sourceImportLines: string[] | null;
}

export interface SavedDeck {
  schemaVersion: number;
  deckId: string;
  name: string;
  leader: SavedDeckCardSnapshot;
  /** The 50-card main deck (5-1-2), expanded one entry per distinct card number+printing choice; quantities sum to 50 once validated. */
  cards: SavedDeckCardSnapshot[];
  /** DON!! deck is always 10 generic DON!! cards per 5-1-2 — no per-deck DON!! selection exists in the rules, so nothing to snapshot here beyond the constant. */
  donDeckSize: 10;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  /** Provenance, for debugging/staleness display only — never read by the engine. */
  source: { provider: 'local-catalog'; fetchedAt: string };
}

/**
 * v1 (schemaVersion === 1 or absent) predates `variant`, `cachedImagePath`,
 * and `sourceImportLines` on SavedDeckCardSnapshot. Shape on disk otherwise
 * identical to v2.
 */
type SavedDeckCardSnapshotV1 = Omit<SavedDeckCardSnapshot, 'variant' | 'cachedImagePath' | 'sourceImportLines'>;
interface SavedDeckV1 extends Omit<SavedDeck, 'leader' | 'cards' | 'schemaVersion'> {
  schemaVersion?: number;
  leader: SavedDeckCardSnapshotV1;
  cards: SavedDeckCardSnapshotV1[];
}

function looksLikeSavedDeckShape(input: unknown): input is { schemaVersion?: unknown; deckId?: unknown; leader?: unknown; cards?: unknown } {
  return typeof input === 'object' && input !== null && 'deckId' in input && 'leader' in input && 'cards' in input;
}

function migrateCardSnapshotV1ToV2(snapshot: SavedDeckCardSnapshotV1): SavedDeckCardSnapshot {
  return {
    ...snapshot,
    variant: null,
    cachedImagePath: null,
    sourceImportLines: null,
  };
}

/**
 * Schema-version-aware loader: upgrades a deck persisted under ANY past
 * `SAVED_DECK_SCHEMA_VERSION` to the current shape, backfilling new fields
 * with safe defaults rather than rejecting the deck outright — a deck saved
 * before a schema bump must keep loading (project requirement #4: "must not
 * break if the API changes later" extends to "must not break when OUR OWN
 * schema evolves later" too). Returns null only if `input` doesn't even
 * look like a SavedDeck (e.g. corrupted localStorage entry) — that case is
 * the caller's (deckStorage.ts, not yet built) responsibility to surface as
 * a load error, not silently skip.
 *
 * Pure function, no I/O — deckStorage.ts calls this after JSON.parse, before
 * handing a deck to the rest of the app.
 */
export function migrateSavedDeck(input: unknown): SavedDeck | null {
  if (!looksLikeSavedDeckShape(input)) return null;

  const version = typeof input.schemaVersion === 'number' ? input.schemaVersion : 1;

  if (version === SAVED_DECK_SCHEMA_VERSION) {
    return input as SavedDeck;
  }

  if (version === 1) {
    const v1 = input as unknown as SavedDeckV1;
    return {
      ...v1,
      schemaVersion: SAVED_DECK_SCHEMA_VERSION,
      leader: migrateCardSnapshotV1ToV2(v1.leader),
      cards: v1.cards.map(migrateCardSnapshotV1ToV2),
    };
  }

  // Unrecognized version newer than this code knows about — refuse to guess at its shape.
  return null;
}
