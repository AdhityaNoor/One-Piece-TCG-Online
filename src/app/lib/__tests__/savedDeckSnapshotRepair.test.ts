/**
 * A match runs on the CardDefinition SNAPSHOTS stored inside each SavedDeck — nothing re-reads
 * the catalog at match start. So a card-data bug fixed later survives in every deck saved before
 * the fix, and only there, which is how it gets reported: one card misbehaving for one player.
 *
 * The real case (reported in play): until 2026-08-27 the scraper wrote
 *   hasRush: text.includes('[Rush]') || text.includes('[Rush: Character]')
 * so OP17-048 Shiki — a [Rush: Character] card, which may attack CHARACTERS on the turn it is
 * played but never the Leader — was saved with full [Rush]. `playCharacter` mints
 * `summoningSick: !def.hasRush`, so the stale snapshot made it non-sick and it attacked the
 * Leader on turn one. Fixing public/cards did nothing for decks already saved.
 */
import { describe, expect, it } from 'vitest';
import { SAVED_DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckCardSnapshot } from '../../../cards/decks/savedDeck';
import { defaultDeckAccessories } from '../../../cards/accessories/deckAccessories';
import type { CardDefinition } from '../../../engine/state/card';
import { buildCardDefinitionLookup, savedDeckToPlayerSetupInput } from '../savedDeckToSetupInput';

function definition(overrides: Partial<CardDefinition>): CardDefinition {
  return {
    cardDefinitionId: overrides.cardNumber ?? 'CARD',
    cardNumber: overrides.cardNumber ?? 'CARD',
    name: 'Test Card',
    category: 'character',
    colors: ['blue'],
    types: [],
    text: '',
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

/** OP17-048 exactly as a pre-2026-08-27 build saved it: [Rush: Character] text, hasRush true. */
const STALE_SHIKI = definition({
  cardNumber: 'OP17-048',
  name: 'Shiki',
  baseCost: 7,
  basePower: 9000,
  types: ['Rocks Pirates'],
  text: '[Rush: Character][When Attacking]/[On Your Opponent\'s Attack] [Once Per Turn] You may trash 1 card with a type including "Rocks Pirates" from your hand: Give up to 1 of your opponent\'s Characters −3000 power during this turn.',
  hasRush: true,
});

/** A conditional [Blocker] saved by the same old parser. */
const STALE_LAW = definition({
  cardNumber: 'OP13-031',
  name: 'Trafalgar Law',
  text: 'If you have 1 or less Life cards, this Character gains [Blocker].[On Play] You may return 1 of your Characters to the owner\'s hand: Play up to 1 Character card with a cost of 5 or less from your hand rested.',
  hasBlocker: true,
});

const LEADER = definition({
  cardNumber: 'OP17-039',
  name: 'Rocks.D.Xebec',
  category: 'leader',
  life: 5,
  text: '',
});

function deck(): SavedDeck {
  return {
    schemaVersion: SAVED_DECK_SCHEMA_VERSION,
    deckId: 'deck',
    name: 'Stale Deck',
    leader: snapshot(LEADER, 1),
    cards: [snapshot(STALE_SHIKI, 4), snapshot(STALE_LAW, 46)],
    donDeckSize: 10,
    accessories: defaultDeckAccessories(),
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    source: { provider: 'local-catalog', fetchedAt: '2026-08-01T00:00:00.000Z' },
  };
}

describe('stale SavedDeck snapshots are repaired before they reach the engine', () => {
  it('clears hasRush on a [Rush: Character] card saved by the old parser', () => {
    const setup = savedDeckToPlayerSetupInput(deck(), 'p1');
    const shiki = setup.deck.find((d) => d.cardNumber === 'OP17-048');

    expect(shiki, 'Shiki is in the expanded deck').toBeDefined();
    // hasRush true here is what let it attack the Leader the turn it was played.
    expect(shiki!.hasRush).toBe(false);
  });

  it('clears a conditional [Blocker] that the card only GAINS under a condition', () => {
    const setup = savedDeckToPlayerSetupInput(deck(), 'p1');
    const law = setup.deck.find((d) => d.cardNumber === 'OP13-031');

    expect(law!.hasBlocker).toBe(false);
  });

  it('repairs the CardDefinitionLookup the dispatcher reads, not just the deck list', () => {
    const lookup = buildCardDefinitionLookup([deck()]);

    expect(lookup['OP17-048'].hasRush).toBe(false);
    expect(lookup['OP13-031'].hasBlocker).toBe(false);
  });

  it('leaves a genuinely printed keyword alone', () => {
    const printed = definition({
      cardNumber: 'PRINTED-RUSH',
      text: '[Rush] (This card can attack on the turn in which it is played.)',
      hasRush: true,
    });
    const withPrinted: SavedDeck = { ...deck(), cards: [snapshot(printed, 50)] };

    expect(savedDeckToPlayerSetupInput(withPrinted, 'p1').deck[0].hasRush).toBe(true);
  });

  it('does not touch printed values it cannot re-derive (power, cost, text)', () => {
    const setup = savedDeckToPlayerSetupInput(deck(), 'p1');
    const shiki = setup.deck.find((d) => d.cardNumber === 'OP17-048')!;

    expect(shiki.basePower).toBe(9000);
    expect(shiki.baseCost).toBe(7);
    expect(shiki.types).toEqual(['Rocks Pirates']);
  });
});
