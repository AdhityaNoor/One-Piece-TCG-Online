import { describe, expect, it } from 'vitest';
import type { CardDefinition, Color } from '../../../engine/state/card';
import { validateDeckConstruction, type DeckConstructionEntry } from '../deckValidation';

function makeDef(cardNumber: string, category: CardDefinition['category'], colors: Color[]): CardDefinition {
  return {
    cardDefinitionId: cardNumber,
    name: cardNumber,
    category,
    colors,
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

const redLeader = makeDef('LEAD-01', 'leader', ['red']);
const blackYellowLeader = makeDef('LEAD-BY', 'leader', ['black', 'yellow']);

/** 13 distinct card numbers, 4 copies each except the last (2), summing to exactly 50 — satisfies both 5-1-2 and 5-1-2-3 simultaneously. */
function legalMainDeck(colors: Color[] = ['red']): DeckConstructionEntry[] {
  const entries: DeckConstructionEntry[] = [];
  for (let i = 1; i <= 12; i++) {
    entries.push({ definition: makeDef(`C-${i}`, 'character', colors), quantity: 4 });
  }
  entries.push({ definition: makeDef('C-13', 'character', colors), quantity: 2 });
  return entries;
}

describe('validateDeckConstruction', () => {
  it('accepts a deck with exactly 50 cards, max 4 copies per number, all leader-colored', () => {
    const result = validateDeckConstruction(redLeader, legalMainDeck());
    expect(result.legal).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('rejects a deck that is not exactly 50 cards (5-1-2)', () => {
    const tooFew = legalMainDeck().slice(0, 5);
    const result = validateDeckConstruction(redLeader, tooFew);
    expect(result.legal).toBe(false);
    expect(result.reasons.some((r) => r.includes('exactly 50'))).toBe(true);
  });

  it('rejects more than 4 copies of the same card number, even split across entries (5-1-2-3)', () => {
    const deck = legalMainDeck();
    // Replace the last (qty 2) entry with a SECOND entry for an already-maxed card number, pushing it to 6.
    deck[12] = { definition: deck[0].definition, quantity: 2 };
    const result = validateDeckConstruction(redLeader, deck);
    expect(result.legal).toBe(false);
    expect(result.reasons.some((r) => r.includes('at most 4'))).toBe(true);
  });

  it('allows more than 4 copies of a card in UNLIMITED_COPY_CARD_NUMBERS (5-1-2-3 exception, e.g. Pacifista OP01-075)', () => {
    // OP01-075 x10 (exempt) + 10 normal numbers x4 = 50; the 10 copies must be legal.
    const deck: DeckConstructionEntry[] = [{ definition: makeDef('OP01-075', 'character', ['red']), quantity: 10 }];
    for (let i = 1; i <= 10; i++) deck.push({ definition: makeDef(`C-${i}`, 'character', ['red']), quantity: 4 });
    const result = validateDeckConstruction(redLeader, deck);
    expect(result.legal).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('still caps a normal card at 4 even when an unlimited-copy card is also present', () => {
    const deck: DeckConstructionEntry[] = [
      { definition: makeDef('OP01-075', 'character', ['red']), quantity: 6 }, // unlimited-copy card: legal at 6
      { definition: makeDef('C-NORMAL', 'character', ['red']), quantity: 6 }, // illegal: normal card over 4
    ];
    for (let i = 1; i <= 12; i++) deck.push({ definition: makeDef(`C-f${i}`, 'character', ['red']), quantity: i === 12 ? 2 : 3 });
    const result = validateDeckConstruction(redLeader, deck);
    expect(result.reasons.some((r) => r.includes('C-NORMAL') && r.includes('at most 4'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('OP01-075'))).toBe(false);
  });

  it('rejects a Leader or DON!! card placed in the main deck (5-1-2-1)', () => {
    const deck = legalMainDeck();
    deck[0] = { definition: makeDef('LEAD-02', 'leader', ['red']), quantity: deck[0].quantity };
    const result = validateDeckConstruction(redLeader, deck);
    expect(result.legal).toBe(false);
    expect(result.reasons.some((r) => r.includes('cannot be placed in the main deck'))).toBe(true);
  });

  it('rejects a single-color card whose color is not on the Leader (5-1-2-2)', () => {
    const deck = legalMainDeck();
    deck[0] = { definition: makeDef('C-OFFCOLOR', 'character', ['blue']), quantity: deck[0].quantity };
    const result = validateDeckConstruction(redLeader, deck);
    expect(result.legal).toBe(false);
    const reason = result.reasons.find((r) => r.includes('not a legal color'));
    expect(reason).toBeDefined();
    expect(reason).not.toContain('TODO');
  });

  it('rejects a multicolor card not fully contained in Leader colors', () => {
    const deck = legalMainDeck(['red']);
    deck[0] = { definition: makeDef('C-MULTI', 'character', ['red', 'blue']), quantity: deck[0].quantity };
    const result = validateDeckConstruction(redLeader, deck);
    expect(result.legal).toBe(false);
    expect(result.reasons.some((r) => r.includes('not a legal color'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('TODO'))).toBe(false);
  });

  it('accepts a black/yellow Leader with black and yellow cards in the main deck', () => {
    const deck = legalMainDeck(['black']);
    deck[0] = { definition: makeDef('C-YELLOW-1', 'character', ['yellow']), quantity: deck[0].quantity };
    deck[1] = { definition: makeDef('C-BLACK-YELLOW-1', 'character', ['black', 'yellow']), quantity: deck[1].quantity };

    const result = validateDeckConstruction(blackYellowLeader, deck);

    expect(result.legal).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('rejects a card with any color outside a multicolor Leader color set', () => {
    const deck = legalMainDeck(['black']);
    deck[0] = { definition: makeDef('C-BLACK-BLUE-1', 'character', ['black', 'blue']), quantity: deck[0].quantity };

    const result = validateDeckConstruction(blackYellowLeader, deck);

    expect(result.legal).toBe(false);
    expect(result.reasons.some((r) => r.includes('not a legal color'))).toBe(true);
  });

  it('flags a non-Leader card in the Leader slot', () => {
    const fakeLeader = makeDef('NOT-A-LEADER', 'character', ['red']);
    const result = validateDeckConstruction(fakeLeader, legalMainDeck());
    expect(result.legal).toBe(false);
    expect(result.reasons.some((r) => r.includes('Leader slot must contain'))).toBe(true);
  });

  it('OP13-079 rejects Events with cost ≥2 and allows cost-1 Events', () => {
    const imu = makeDef('OP13-079', 'leader', ['black']);
    const eventCost2 = { ...makeDef('EV-2', 'event', ['black']), baseCost: 2 };
    const eventCost1 = { ...makeDef('EV-1', 'event', ['black']), baseCost: 1 };
    const illegal = legalMainDeck(['black']);
    illegal[0] = { definition: eventCost2, quantity: illegal[0].quantity };
    const illegalResult = validateDeckConstruction(imu, illegal);
    expect(illegalResult.legal).toBe(false);
    expect(illegalResult.reasons.some((r) => r.includes('cost of 2 or more'))).toBe(true);

    const legal = legalMainDeck(['black']);
    legal[0] = { definition: eventCost1, quantity: legal[0].quantity };
    const legalResult = validateDeckConstruction(imu, legal);
    expect(legalResult.legal).toBe(true);
  });

  it('P-117 rejects main-deck cards without East Blue type and accepts typed decks', () => {
    const nami = { ...makeDef('P-117', 'leader', ['blue']), types: ['East Blue'] };
    const illegal = legalMainDeck(['blue']);
    const illegalResult = validateDeckConstruction(nami, illegal);
    expect(illegalResult.legal).toBe(false);
    expect(illegalResult.reasons.some((r) => r.includes('{East Blue}'))).toBe(true);

    const legal: DeckConstructionEntry[] = [];
    for (let i = 1; i <= 12; i++) {
      legal.push({
        definition: { ...makeDef(`EB-${i}`, 'character', ['blue']), types: ['East Blue'] },
        quantity: 4,
      });
    }
    legal.push({
      definition: { ...makeDef('EB-13', 'character', ['blue']), types: ['East Blue'] },
      quantity: 2,
    });
    const legalResult = validateDeckConstruction(nami, legal);
    expect(legalResult.legal).toBe(true);
    expect(legalResult.reasons).toEqual([]);
  });
});
