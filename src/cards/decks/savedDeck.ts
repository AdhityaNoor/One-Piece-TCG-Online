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
 *
 * Hard rule, not just a convention: nothing in this file may ever carry
 * effect-CURATION data (an effect template/program id, a compiled effect, an
 * effect version, etc). `definition`/`rawPrinting` are card IDENTITY and
 * STATS only. Effect behavior is resolved live, by `cardNumber`, at match
 * start (src/app/store/matchStore.ts `startMatch` ->
 * `buildRegistryFromDefs`/`buildV2RuntimeFromDefs`, both rebuilt from the
 * CURRENT curated-effect tables every single call — see
 * src/cards/effectTemplates/curatedPrograms.ts and
 * src/cards/effectCompiler_V2/runtimeCatalog_V2.ts). This is what lets a
 * curation fix/addition for a card number apply automatically to every
 * already-saved deck containing that card, with zero deck migration. See
 * __tests__/savedDeck.test.ts's "stays free of effect-curation data" suite
 * for the compile-time guard that enforces this.
 */
import { coerceDeckAccessories, defaultDeckAccessories, type DeckAccessories } from '../accessories/deckAccessories';
import type { CardDefinition } from '../../engine/state/card';
import type { CardPrintingDto } from '../api/types';
import type { NormalizationWarning } from '../normalization/warnings';

/** Bump on any breaking change to this file's shape. Saved decks carry their own version so a future loader can migrate old saves instead of failing on them. See `migrateSavedDeck` below for the v1 -> v2 -> v3 upgrade path. */
export const SAVED_DECK_SCHEMA_VERSION = 3;

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
  /**
   * PURELY COSMETIC deck customization (added in schema v3): chosen main-deck
   * sleeve, DON!! sleeve, and DON!! card art. Like `definition`/`rawPrinting`,
   * this is IDENTITY/DISPLAY only and carries ZERO effect-curation data — it
   * never reaches the engine, only the Layer-3 board projection (see
   * matchStore / MatchScreen). Snapshots its chosen art by value so a saved
   * deck's look is stable even if the sleeve catalog changes later
   * (requirement #4). See ../accessories/deckAccessories.ts.
   */
  accessories: DeckAccessories;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  /** Provenance, for debugging/staleness display only — never read by the engine. */
  source: { provider: 'local-catalog'; fetchedAt: string };
}

/**
 * v1 (schemaVersion === 1 or absent) predates `variant`, `cachedImagePath`,
 * and `sourceImportLines` on SavedDeckCardSnapshot. Shape on disk otherwise
 * identical to v2. Neither v1 nor v2 has the `accessories` slot (added in v3).
 */
type SavedDeckCardSnapshotV1 = Omit<SavedDeckCardSnapshot, 'variant' | 'cachedImagePath' | 'sourceImportLines'>;
interface SavedDeckV1 extends Omit<SavedDeck, 'leader' | 'cards' | 'schemaVersion' | 'accessories'> {
  schemaVersion?: number;
  leader: SavedDeckCardSnapshotV1;
  cards: SavedDeckCardSnapshotV1[];
}

/** v2: identical to v3 except it has no `accessories` slot. */
type SavedDeckV2 = Omit<SavedDeck, 'schemaVersion' | 'accessories'> & { schemaVersion?: number };

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

/** v2 -> v3: backfill the cosmetic `accessories` slot with all-default (== today's built-in chrome). No card data touched. */
function migrateV2ToV3(v2: SavedDeckV2): SavedDeck {
  return {
    ...v2,
    schemaVersion: SAVED_DECK_SCHEMA_VERSION,
    accessories: defaultDeckAccessories(),
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
    // Already current shape — but a hand-edited/corrupted `accessories` slot
    // shouldn't crash rendering, so coerce it back to a valid block.
    const deck = input as SavedDeck;
    return { ...deck, accessories: coerceDeckAccessories((input as { accessories?: unknown }).accessories) };
  }

  // Upgrade step by step so every intermediate migration runs (v1 -> v2 -> v3).
  if (version === 1) {
    const v1 = input as unknown as SavedDeckV1;
    const v2: SavedDeckV2 = {
      ...v1,
      schemaVersion: 2,
      leader: migrateCardSnapshotV1ToV2(v1.leader),
      cards: v1.cards.map(migrateCardSnapshotV1ToV2),
    };
    return migrateV2ToV3(v2);
  }

  if (version === 2) {
    return migrateV2ToV3(input as unknown as SavedDeckV2);
  }

  // Unrecognized version newer than this code knows about — refuse to guess at its shape.
  return null;
}
