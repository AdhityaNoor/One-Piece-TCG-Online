import { describe, expect, it } from 'vitest';
import { SAVED_DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckCardSnapshot } from '../../../cards/decks/savedDeck';
import { defaultDeckAccessories, selectionFromOption } from '../../../cards/accessories/deckAccessories';
import { SLEEVE_CATALOG } from '../../../cards/accessories/sleeveCatalog';
import type { CardDefinition } from '../../../engine/state/card';
import {
  buildAccessoriesByPlayer,
  DEFAULT_DON_ART_URL,
  DEFAULT_DON_SLEEVE_URL,
  DEFAULT_MAIN_SLEEVE_URL,
  savedDeckToPlayerSetupInput,
} from '../savedDeckToSetupInput';

function definition(overrides: Partial<CardDefinition>): CardDefinition {
  return {
    cardDefinitionId: overrides.cardDefinitionId ?? overrides.cardNumber ?? 'CARD',
    cardNumber: overrides.cardNumber ?? 'CARD',
    name: overrides.name ?? 'Test Card',
    category: overrides.category ?? 'character',
    colors: overrides.colors ?? ['yellow'],
    types: overrides.types ?? [],
    text: overrides.text ?? '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    ...overrides,
  };
}

function snapshot(def: CardDefinition, quantity: number): SavedDeckCardSnapshot {
  return {
    cardNumber: def.cardNumber,
    variant: null,
    printingImageId: def.cardNumber,
    imageUrl: null,
    cachedImagePath: null,
    definition: def,
    rawPrinting: {} as SavedDeckCardSnapshot['rawPrinting'],
    quantity,
    warnings: [],
    sourceImportLines: null,
  };
}

function deckWithLeader(leader: CardDefinition): SavedDeck {
  const filler = definition({ cardDefinitionId: 'FILLER', cardNumber: 'FILLER', name: 'Filler' });
  return {
    schemaVersion: SAVED_DECK_SCHEMA_VERSION,
    deckId: 'deck',
    name: 'Deck',
    leader: snapshot(leader, 1),
    cards: [snapshot(filler, 50)],
    donDeckSize: 10,
    accessories: defaultDeckAccessories(),
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    source: { provider: 'local-catalog', fetchedAt: '2026-07-11T00:00:00.000Z' },
  };
}

describe('savedDeckToPlayerSetupInput', () => {
  it('uses a 6-card DON deck for OP15-058 Enel', () => {
    const leader = definition({ cardDefinitionId: 'OP15-058', cardNumber: 'OP15-058', name: 'Enel', category: 'leader', life: 5, basePower: 5000 });

    expect(savedDeckToPlayerSetupInput(deckWithLeader(leader), 'p1').donDeckSize).toBe(6);
  });

  it('keeps the saved DON deck size for normal leaders', () => {
    const leader = definition({ cardDefinitionId: 'ST01-001', cardNumber: 'ST01-001', name: 'Monkey.D.Luffy', category: 'leader', life: 5, basePower: 5000 });

    expect(savedDeckToPlayerSetupInput(deckWithLeader(leader), 'p1').donDeckSize).toBe(10);
  });
});

describe('buildAccessoriesByPlayer', () => {
  const leader = definition({ cardDefinitionId: 'ST01-001', cardNumber: 'ST01-001', category: 'leader', life: 5, basePower: 5000 });

  it('falls back to bundled default chrome for a deck with no accessory choices', () => {
    const resolved = buildAccessoriesByPlayer([{ playerId: 'p1', deck: deckWithLeader(leader) }]);
    expect(resolved.p1).toEqual({
      mainSleeveUrl: DEFAULT_MAIN_SLEEVE_URL,
      donSleeveUrl: DEFAULT_DON_SLEEVE_URL,
      donArtUrl: DEFAULT_DON_ART_URL,
    });
  });

  it('resolves a chosen main-deck sleeve to its snapshotted art, per seat', () => {
    const deck = deckWithLeader(leader);
    const sleeve = SLEEVE_CATALOG[0];
    deck.accessories = { ...defaultDeckAccessories(), mainSleeve: selectionFromOption(sleeve) };

    const resolved = buildAccessoriesByPlayer([{ playerId: 'p2', deck }]);
    expect(resolved.p2.mainSleeveUrl).toBe(sleeve.imageUrl);
    // Unset slots still default.
    expect(resolved.p2.donSleeveUrl).toBe(DEFAULT_DON_SLEEVE_URL);
  });
});
