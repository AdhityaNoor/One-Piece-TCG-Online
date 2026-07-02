import { describe, expect, it } from 'vitest';
import { buildCuratedEffectRegistry, CURATED_EFFECT_PROGRAMS } from '../curatedPrograms';
import type { CardDefinition } from '../../../engine/state/card';
import type { CardDefinitionLookup } from '../../../engine/rules/shared';
import { ALL_ASSIGNMENTS } from '../assignments';

function def(cardNumber: string): CardDefinition {
  return {
    cardDefinitionId: cardNumber,
    cardNumber,
    name: cardNumber,
    category: 'character',
    colors: ['red'],
    types: [],
    text: 'raw display text only',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
  };
}

describe('curated effect programs', () => {
  it('are assembled from reviewed assignments, not raw card text', () => {
    const assignedCardNumbers = new Set(ALL_ASSIGNMENTS.map((a) => a.cardNumber));
    for (const cn of Object.keys(CURATED_EFFECT_PROGRAMS)) {
      expect(assignedCardNumbers.has(cn), `${cn} in registry but not in any assignment file`).toBe(true);
    }
  });

  it('has no duplicate card numbers across assignment files', () => {
    const seen = new Map<string, number>();
    for (const a of ALL_ASSIGNMENTS) {
      seen.set(a.cardNumber, (seen.get(a.cardNumber) ?? 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([cn]) => cn);
    expect(duplicates).toEqual([]);
  });

  it('contains exactly the reviewed assignment card numbers', () => {
    const assigned = [...new Set(ALL_ASSIGNMENTS.map((a) => a.cardNumber))].sort();
    expect(Object.keys(CURATED_EFFECT_PROGRAMS).sort()).toEqual(assigned);
    expect(assigned).toHaveLength(157);
  });

  it('are JSON-serializable engine IR, not executable functions', () => {
    const roundTripped = JSON.parse(JSON.stringify(CURATED_EFFECT_PROGRAMS));
    expect(roundTripped).toEqual(CURATED_EFFECT_PROGRAMS);
  });

  it('builds a match registry only from curated card-number mappings', () => {
    const defs: CardDefinitionLookup = {
      'OP01-016': def('OP01-016'),
      UNSUPPORTED: def('UNSUPPORTED'),
    };
    expect(Object.keys(buildCuratedEffectRegistry(defs))).toEqual(['OP01-016']);
  });
});
