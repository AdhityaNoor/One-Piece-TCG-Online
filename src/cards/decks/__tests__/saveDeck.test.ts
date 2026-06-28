import { describe, expect, it } from 'vitest';
import type { CardPrintingDto } from '../../api/types';
import { sampleCharacterPrintings, sampleLeaderPrintings } from '../../api/__fixtures__/sampleApiResponses';
import { buildCardLibraryEntry, type CardLibraryEntry } from '../../library/cardPrintingSummary';
import { createSavedDeck, type DeckCardSelection } from '../saveDeck';
import { SAVED_DECK_SCHEMA_VERSION } from '../savedDeck';

/** A synthetic single-printing card number, derived from a real fixture row so it still flows through real normalization — used to cheaply generate 13 distinct legal main-deck entries without 13 real API fixtures. */
function makeSyntheticCharacterEntry(cardNumber: string): CardLibraryEntry {
  const dto: CardPrintingDto = {
    ...sampleCharacterPrintings[0],
    card_set_id: cardNumber,
    card_image_id: cardNumber,
    card_name: cardNumber,
  };
  return buildCardLibraryEntry([dto]);
}

function legalMainDeckSelections(): DeckCardSelection[] {
  const selections: DeckCardSelection[] = [];
  for (let i = 1; i <= 12; i++) {
    const entry = makeSyntheticCharacterEntry(`C-${i}`);
    selections.push({ libraryEntry: entry, chosenPrintingImageId: entry.cardNumber, quantity: 4 });
  }
  const last = makeSyntheticCharacterEntry('C-13');
  selections.push({ libraryEntry: last, chosenPrintingImageId: last.cardNumber, quantity: 2 });
  return selections;
}

function leaderSelection(): DeckCardSelection {
  const entry = buildCardLibraryEntry(sampleLeaderPrintings);
  return { libraryEntry: entry, chosenPrintingImageId: 'OP01-001', quantity: 1 };
}

describe('createSavedDeck', () => {
  it('builds a SavedDeck embedding both normalized and raw data for a legal 50-card deck', () => {
    const result = createSavedDeck({
      deckId: 'deck-1',
      name: 'Test Deck',
      leader: leaderSelection(),
      mainDeck: legalMainDeckSelections(),
      now: () => '2026-06-28T00:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.deck.schemaVersion).toBe(SAVED_DECK_SCHEMA_VERSION);
    expect(result.deck.leader.cardNumber).toBe('OP01-001');
    expect(result.deck.leader.rawPrinting.card_name).toBe('Roronoa Zoro (001)');
    expect(result.deck.leader.definition.category).toBe('leader');
    expect(result.deck.cards).toHaveLength(13);
    expect(result.deck.cards.reduce((sum, c) => sum + c.quantity, 0)).toBe(50);
    expect(result.deck.donDeckSize).toBe(10);
  });

  it('produces a deck that survives a JSON round-trip with no loss (project ground rule: JSON-serializable)', () => {
    const result = createSavedDeck({
      deckId: 'deck-1',
      name: 'Test Deck',
      leader: leaderSelection(),
      mainDeck: legalMainDeckSelections(),
      now: () => '2026-06-28T00:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const roundTripped = JSON.parse(JSON.stringify(result.deck));
    expect(roundTripped).toEqual(result.deck);
  });

  it('rejects a deck that fails construction legality, surfacing deckValidation reasons', () => {
    const result = createSavedDeck({
      deckId: 'deck-1',
      name: 'Too Few',
      leader: leaderSelection(),
      mainDeck: legalMainDeckSelections().slice(0, 3), // far short of 50
      now: () => '2026-06-28T00:00:00.000Z',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((r) => r.includes('exactly 50'))).toBe(true);
  });

  it('rejects a stale printing selection (chosen art no longer present in fetched printings)', () => {
    const stale = leaderSelection();
    stale.chosenPrintingImageId = 'OP01-001_does_not_exist';
    const result = createSavedDeck({
      deckId: 'deck-1',
      name: 'Stale',
      leader: stale,
      mainDeck: legalMainDeckSelections(),
      now: () => '2026-06-28T00:00:00.000Z',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((r) => r.includes('was not found among its fetched printings'))).toBe(true);
  });
});

describe('createSavedDeck — new snapshot fields (variant, cachedImagePath, sourceImportLines)', () => {
  it('derives variant from the chosen printing image id, leaving it null for the base/no-variant printing', () => {
    const selections = legalMainDeckSelections(); // all base printings, chosenPrintingImageId === cardNumber
    const result = createSavedDeck({
      deckId: 'deck-1',
      name: 'Test Deck',
      leader: leaderSelection(),
      mainDeck: selections,
      now: () => '2026-06-28T00:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deck.leader.variant).toBeNull();
    expect(result.deck.cards.every((c) => c.variant === null)).toBe(true);
  });

  it('derives a non-null variant when a Parallel/SP/Manga printing is chosen instead of the base art', () => {
    const namiEntry = buildCardLibraryEntry(sampleCharacterPrintings); // OP01-016, has _p1/_p2/_p8 alternates
    const selections = legalMainDeckSelections();
    selections[0] = { libraryEntry: namiEntry, chosenPrintingImageId: 'OP01-016_p1', quantity: 4 };

    const result = createSavedDeck({
      deckId: 'deck-1',
      name: 'Test Deck',
      leader: leaderSelection(),
      mainDeck: selections,
      now: () => '2026-06-28T00:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const namiSnapshot = result.deck.cards.find((c) => c.cardNumber === 'OP01-016');
    expect(namiSnapshot?.variant).toBe('p1');
    expect(namiSnapshot?.printingImageId).toBe('OP01-016_p1');
  });

  it('always sets cachedImagePath to null (Phase 1 placeholder — no asset caching implemented yet)', () => {
    const result = createSavedDeck({
      deckId: 'deck-1',
      name: 'Test Deck',
      leader: leaderSelection(),
      mainDeck: legalMainDeckSelections(),
      now: () => '2026-06-28T00:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deck.leader.cachedImagePath).toBeNull();
    expect(result.deck.cards.every((c) => c.cachedImagePath === null)).toBe(true);
  });

  it('carries sourceImportLines through from a clipboard-imported selection, and defaults to null otherwise', () => {
    const selections = legalMainDeckSelections();
    selections[0] = { ...selections[0], sourceImportLines: ['4xC-1'] };

    const result = createSavedDeck({
      deckId: 'deck-1',
      name: 'Test Deck',
      leader: leaderSelection(),
      mainDeck: selections,
      now: () => '2026-06-28T00:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deck.cards.find((c) => c.cardNumber === 'C-1')?.sourceImportLines).toEqual(['4xC-1']);
    expect(result.deck.cards.find((c) => c.cardNumber === 'C-2')?.sourceImportLines).toBeNull();
    expect(result.deck.leader.sourceImportLines).toBeNull();
  });
});
