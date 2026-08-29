import { describe, expect, it } from 'vitest';
import type { CardDefinition } from '../../../engine/state/card';
import {
  evaluateDeckFormatStatusFromCards,
  evaluateSavedDeckFormatStatus,
  formatKindForCardNumber,
} from '../evaluateDeckFormatStatus';
import { CARD_FORMAT_BY_NUMBER } from '../generatedRegistry';
import type { SavedDeck, SavedDeckCardSnapshot } from '../../decks/savedDeck';
import { defaultDeckAccessories } from '../../accessories/deckAccessories';

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
    accessories: defaultDeckAccessories(),
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

/**
 * OP17 and ST31-ST36 were scraped from Limitless before those products
 * released, so their legality badges read "Standard unreleased" and
 * generate-format-registry.mjs bucketed all 149 card numbers as 'unknown'.
 * Unknown cards are treated as non-Standard, so every deck containing one was
 * capped at extraLegal and locked out of Ranked (RankedScreen + the server's
 * deckValidationService both require status === 'legal').
 */
describe('released-set legality (OP17, ST31-ST36)', () => {
  const releasedSamples = [
    'OP17-001',
    'OP17-119',
    'ST31-001',
    'ST32-001',
    'ST33-001',
    'ST34-001',
    'ST35-005',
    'ST36-005',
  ];

  it('resolves post-release set cards as Standard legal', () => {
    for (const cardNumber of releasedSamples) {
      expect(formatKindForCardNumber(cardNumber)).toBe('standardLegal');
    }
  });

  it('rates a deck built from OP17 + ST31 as legal', () => {
    const deck = makeDeck('OP17-001', ['OP17-002', 'OP17-002', 'ST31-001']);
    expect(evaluateSavedDeckFormatStatus(deck).status).toBe('legal');
  });

  it('leaves no catalog card number unresolved in the generated registry', () => {
    const unresolved = Object.entries(CARD_FORMAT_BY_NUMBER)
      .filter(([, kind]) => kind === 'unknown')
      .map(([cardNumber]) => cardNumber);
    expect(unresolved).toEqual([]);
  });
});
