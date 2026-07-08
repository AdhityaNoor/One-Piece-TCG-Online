import { describe, expect, it } from 'vitest';
import type { CardDefinition } from '../../../engine/state/card';
import { evaluateDeckFormatStatusFromCards, evaluateSavedDeckFormatStatus } from '../evaluateDeckFormatStatus';
import type { SavedDeck, SavedDeckCardSnapshot } from '../../decks/savedDeck';

function makeDef(cardNumber: string, name = cardNumber): CardDefinition {
  return {
    cardDefinitionId: cardNumber,
    name,
    category: 'character',
    colors: ['red'],
    types: [],
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber,
  };
}

function makeSnapshot(cardNumber: string, quantity = 1): SavedDeckCardSnapshot {
  return {
    cardNumber,
    variant: null,
    printingImageId: cardNumber,
    imageUrl: null,
    cachedImagePath: null,
    definition: makeDef(cardNumber),
    rawPrinting: null as never,
    quantity,
    warnings: [],
    sourceImportLines: null,
  };
}

function makeDeck(leaderNumber: string, mainNumbers: string[]): SavedDeck {
  return {
    schemaVersion: 2,
    deckId: 'test-deck',
    name: 'Test Deck',
    leader: { ...makeSnapshot(leaderNumber), definition: { ...makeDef(leaderNumber), category: 'leader' } },
    cards: mainNumbers.map((n) => makeSnapshot(n)),
    donDeckSize: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: { provider: 'local-catalog', fetchedAt: '2026-01-01T00:00:00.000Z' },
  };
}

describe('evaluateDeckFormatStatusFromCards', () => {
  it('marks a Standard-legal deck as legal', () => {
    const result = evaluateDeckFormatStatusFromCards([
      { cardNumber: 'OP16-001', name: 'Portgas.D.Ace' },
      { cardNumber: 'OP16-002', name: 'Some Character' },
    ]);
    expect(result.status).toBe('legal');
    expect(result.bannedCards).toEqual([]);
    expect(result.extraOnlyCards).toEqual([]);
  });

  it('marks a deck with Standard-not-legal cards as extraLegal', () => {
    const result = evaluateDeckFormatStatusFromCards([
      { cardNumber: 'OP01-001', name: 'Roronoa Zoro' },
      { cardNumber: 'OP16-001', name: 'Portgas.D.Ace' },
    ]);
    expect(result.status).toBe('extraLegal');
    expect(result.extraOnlyCards.some((c) => c.cardNumber === 'OP01-001')).toBe(true);
  });

  it('marks a deck with a banned card as banned', () => {
    const result = evaluateDeckFormatStatusFromCards([{ cardNumber: 'OP03-040', name: 'Nami' }]);
    expect(result.status).toBe('banned');
    expect(result.bannedCards).toHaveLength(1);
  });

  it('prioritizes banned over extra-only when both are present', () => {
    const result = evaluateDeckFormatStatusFromCards([
      { cardNumber: 'OP01-001', name: 'Roronoa Zoro' },
      { cardNumber: 'OP03-040', name: 'Nami' },
    ]);
    expect(result.status).toBe('banned');
  });

  it('treats unknown card numbers as extraLegal', () => {
    const result = evaluateDeckFormatStatusFromCards([{ cardNumber: 'ZZ99-999', name: 'Unknown' }]);
    expect(result.status).toBe('extraLegal');
    expect(result.unknownCards).toHaveLength(1);
  });
});

describe('evaluateSavedDeckFormatStatus', () => {
  it('deduplicates repeated card numbers across the main deck', () => {
    const deck = makeDeck('OP16-001', ['OP16-002', 'OP16-002', 'OP16-002']);
    const result = evaluateSavedDeckFormatStatus(deck);
    expect(result.status).toBe('legal');
  });
});
