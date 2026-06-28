/**
 * Pure deck-save flow: turns the deck builder's in-progress selections into
 * an immutable SavedDeck snapshot, or a list of legality reasons if the
 * selections don't satisfy 5-1-2. No I/O here — fetching/normalizing already
 * happened upstream (this module never imports api/client.ts); persistence
 * (where the resulting SavedDeck actually gets written, e.g. localStorage /
 * IndexedDB / a future backend) is deliberately left to the app layer, same
 * separation the engine keeps between pure logic and storage.
 */
import type { CardLibraryEntry } from '../library/cardPrintingSummary';
import { validateDeckConstruction, type DeckConstructionEntry } from './deckValidation';
import { SAVED_DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckCardSnapshot } from './savedDeck';

export interface DeckCardSelection {
  libraryEntry: CardLibraryEntry;
  /** Which printing's art represents this selection — must be one of libraryEntry.rawPrintings. Cosmetic only. */
  chosenPrintingImageId: string;
  quantity: number;
  /**
   * Verbatim clipboard-import line(s) that produced this selection (see
   * clipboardImport.ts ParsedDeckListEntry.sourceLines). Omit/undefined for
   * selections made via Browse or Search-by-ID — defaults to null on the
   * resulting snapshot.
   */
  sourceImportLines?: string[];
}

export interface CreateSavedDeckInput {
  deckId: string;
  name: string;
  leader: DeckCardSelection;
  mainDeck: DeckCardSelection[];
  /** Injected clock, for deterministic tests — defaults to `new Date().toISOString`. */
  now?: () => string;
}

export type CreateSavedDeckResult = { ok: true; deck: SavedDeck } | { ok: false; reasons: string[] };

/**
 * Derives the clipboard-import-style variant suffix from a chosen printing,
 * rather than accepting it as separate caller input — keeps printingImageId
 * as the single source of truth (see SavedDeckCardSnapshot.variant doc).
 */
function deriveVariant(cardNumber: string, printingImageId: string): string | null {
  if (printingImageId === cardNumber) return null;
  const prefix = `${cardNumber}_`;
  return printingImageId.startsWith(prefix) ? printingImageId.slice(prefix.length) : printingImageId;
}

function toSnapshot(selection: DeckCardSelection): { snapshot: SavedDeckCardSnapshot; reasons: string[] } {
  const raw = selection.libraryEntry.rawPrintings.find((p) => p.card_image_id === selection.chosenPrintingImageId);
  if (!raw) {
    return {
      snapshot: null as never,
      reasons: [
        `Chosen printing "${selection.chosenPrintingImageId}" for ${selection.libraryEntry.cardNumber} was not found among its fetched printings — selection is stale, re-fetch before saving.`,
      ],
    };
  }
  return {
    snapshot: {
      cardNumber: selection.libraryEntry.cardNumber,
      variant: deriveVariant(selection.libraryEntry.cardNumber, raw.card_image_id),
      printingImageId: raw.card_image_id,
      imageUrl: raw.card_image,
      cachedImagePath: null,
      definition: selection.libraryEntry.definition,
      rawPrinting: raw,
      quantity: selection.quantity,
      warnings: selection.libraryEntry.warnings,
      sourceImportLines: selection.sourceImportLines ?? null,
    },
    reasons: [],
  };
}

export function createSavedDeck(input: CreateSavedDeckInput): CreateSavedDeckResult {
  const now = input.now ?? (() => new Date().toISOString());
  const reasons: string[] = [];

  const constructionEntries: DeckConstructionEntry[] = input.mainDeck.map((s) => ({
    definition: s.libraryEntry.definition,
    quantity: s.quantity,
  }));
  const construction = validateDeckConstruction(input.leader.libraryEntry.definition, constructionEntries);
  reasons.push(...construction.reasons);

  if (input.leader.quantity !== 1) {
    reasons.push(`Leader slot quantity must be exactly 1; got ${input.leader.quantity}.`);
  }

  const leaderSnapshotResult = toSnapshot(input.leader);
  reasons.push(...leaderSnapshotResult.reasons);

  const mainDeckSnapshots: SavedDeckCardSnapshot[] = [];
  for (const selection of input.mainDeck) {
    const result = toSnapshot(selection);
    reasons.push(...result.reasons);
    if (result.reasons.length === 0) {
      mainDeckSnapshots.push(result.snapshot);
    }
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  const timestamp = now();
  const deck: SavedDeck = {
    schemaVersion: SAVED_DECK_SCHEMA_VERSION,
    deckId: input.deckId,
    name: input.name,
    leader: leaderSnapshotResult.snapshot,
    cards: mainDeckSnapshots,
    donDeckSize: 10,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: { provider: 'optcgapi', fetchedAt: timestamp },
  };

  return { ok: true, deck };
}
