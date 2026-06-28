/**
 * Browsing-facing model for the card library / deck builder search.
 * Still pure data — no React, no fetching. This is what the (future) UI
 * layer renders a result grid from; it composes the normalization layer's
 * output with lightweight per-printing display info (art, set, rarity) that
 * CardDefinition deliberately omits (CardDefinition is the gameplay-facing
 * shape; one entry here can back many art variants of it).
 */
import type { CardDefinition } from '../../engine/state/card';
import type { CardPrintingDto } from '../api/types';
import { normalizeCardPrintings } from '../normalization/normalizeCardPrinting';
import type { NormalizationWarning } from '../normalization/warnings';

/** Cosmetic/identifying info for ONE specific printing — never used by the engine, only by art pickers and the saved-deck snapshot's display layer. */
export interface CardPrintingRef {
  printingImageId: string; // card_image_id — unique per printing
  setId: string;
  setName: string;
  rarity: string;
  imageUrl: string | null; // null is a real, expected case — see assets/assetCache.ts
}

export interface CardLibraryEntry {
  cardNumber: string;
  definition: CardDefinition;
  /** Canonical printing first, then every alternate — order matches "most game-accurate first, then cosmetic variety". */
  printings: CardPrintingRef[];
  /**
   * The full, unmodified raw rows backing `printings`, same order. Kept
   * alongside the lossy display refs because saving a deck (see
   * /src/cards/decks/saveDeck.ts) needs the complete CardPrintingDto for
   * whichever printing the user picked, not just its display fields.
   */
  rawPrintings: CardPrintingDto[];
  warnings: NormalizationWarning[];
}

function toPrintingRef(p: CardPrintingDto): CardPrintingRef {
  return {
    printingImageId: p.card_image_id,
    setId: p.set_id,
    setName: p.set_name,
    rarity: p.rarity,
    imageUrl: p.card_image,
  };
}

/** Builds one library entry from a full printings array for a single card number (as returned by /sets/card, /decks/card, or /promos/card). */
export function buildCardLibraryEntry(printings: CardPrintingDto[]): CardLibraryEntry {
  const { definition, alternatePrintingImageIds, warnings } = normalizeCardPrintings(printings);

  // cardDefinitionId is the card NUMBER (card_set_id), not a printing id — derive which
  // printing was canonical by elimination against the alternates list, see canonicalPrinting.ts.
  const alternateIds = new Set(alternatePrintingImageIds);
  const orderedPrintings = [...printings].sort((a, b) => {
    const aCanonical = !alternateIds.has(a.card_image_id);
    const bCanonical = !alternateIds.has(b.card_image_id);
    if (aCanonical && !bCanonical) return -1;
    if (!aCanonical && bCanonical) return 1;
    return 0;
  });

  return {
    cardNumber: definition.cardNumber,
    definition,
    printings: orderedPrintings.map(toPrintingRef),
    rawPrintings: orderedPrintings,
    warnings,
  };
}
