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
});
