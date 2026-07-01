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

  it('contains the expected reviewed milestone cards (batch 1: 37 existing + 12 new starters = 49)', () => {
    expect(Object.keys(CURATED_EFFECT_PROGRAMS).sort()).toEqual([
      'EB01-015',
      'EB01-023',
      'EB01-049',
      'EB02-017',
      'OP01-016',
      'OP01-033',
      'OP01-048',
      'OP01-080',
      'OP01-113',
      'OP02-011',
      'OP03-062',
      'OP04-045',
      'OP04-049',
      'OP04-051',
      'OP05-010',
      'OP05-015',
      'OP05-064',
      'OP05-117',
      'OP06-007',
      'OP06-050',
      'OP07-044',
      'OP07-046',
      'OP08-034',
      'OP08-080',
      'OP09-002',
      'OP10-004',
      'OP10-111',
      'OP12-104',
      'OP13-013',
      'OP15-040',
      'OP15-108',
      'OP16-064',
      'OP16-072',
      'P-063',
      'ST01-001',
      'ST01-007',
      'ST01-011',
      'ST01-013',
      'ST03-005',
      'ST03-009',
      'ST03-014',
      'ST05-002',
      'ST05-014',
      'ST06-005',
      'ST06-008',
      'ST06-010',
      'ST08-006',
      'ST08-008',
      'ST10-005',
    ]);
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
