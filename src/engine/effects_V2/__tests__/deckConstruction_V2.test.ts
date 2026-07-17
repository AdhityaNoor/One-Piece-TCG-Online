import { describe, expect, it } from 'vitest';
import type { CardDefinition } from '../../state/card';
import type { EffectRuntimeBundle_V2 } from '../runtime_V2';
import { validateDeckConstruction_V2 } from '../deckConstruction_V2';

function def(cardNumber: string, category: CardDefinition['category'], baseCost?: number): CardDefinition {
  return {
    cardDefinitionId: cardNumber,
    cardNumber,
    name: cardNumber,
    category,
    colors: ['black'],
    types: [],
    text: '',
    baseCost,
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
  };
}

function runtimeForLeader(leader: CardDefinition): EffectRuntimeBundle_V2 {
  return {
    programsByCardNumber: {
      [leader.cardNumber]: {
        schemaVersion: 'op-tcg-effect-v2.0.0',
        cardNumber: leader.cardNumber,
        canonicalEffects: [],
        abilities: [{
          abilityId: `${leader.cardNumber}#deck`,
          timing: { kind: 'STANDARD_TIMING', timing: 'ON_ENTER_PLAY' },
          resolution: {
            kind: 'ACTION',
            action: {
              type: 'MODIFY_DECK_CONSTRUCTION',
              modifier: {
                scope: 'DECK_CONSTRUCTION',
                validFrom: 'DECK_REGISTRATION',
                modifier: {
                  type: 'RULE_MODIFIER',
                  scope: 'DECK_CONSTRUCTION',
                  expression: {
                    rule: 'CANNOT_INCLUDE_CATEGORY_COST_OR_MORE',
                    cardCategory: 'EVENT',
                    cost: 2,
                  },
                },
              },
            },
          },
        }],
      },
    },
    compatibilityWarnings: [],
    summary: { cardCount: 1, assignmentCount: 1, v2AbilityCount: 1 },
  };
}

describe('validateDeckConstruction_V2', () => {
  it('rejects OP13-079-style forbidden Events by category and cost', () => {
    const leader = def('OP13-079', 'leader');
    const result = validateDeckConstruction_V2(leader, [
      { definition: def('EVENT-1', 'event', 1), quantity: 4 },
      { definition: def('EVENT-2', 'event', 2), quantity: 4 },
      { definition: def('CHAR-4', 'character', 4), quantity: 4 },
    ], runtimeForLeader(leader));

    expect(result.legal).toBe(false);
    expect(result.reasons).toEqual([
      'Leader OP13-079 V2 deck construction forbids event cards with cost 2 or more; EVENT-2 (EVENT-2) is cost 2.',
    ]);
  });

  it('accepts cards outside the V2 modifier predicate', () => {
    const leader = def('OP13-079', 'leader');
    const result = validateDeckConstruction_V2(leader, [
      { definition: def('EVENT-1', 'event', 1), quantity: 4 },
      { definition: def('CHAR-9', 'character', 9), quantity: 4 },
    ], runtimeForLeader(leader));

    expect(result).toEqual({ legal: true, reasons: [] });
  });
});
