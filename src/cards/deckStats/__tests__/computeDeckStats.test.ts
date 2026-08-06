import { describe, expect, it } from 'vitest';
import { computeDeckStats } from '../computeDeckStats';
import { computeCostCurve, computePowerCurve } from '../curves';
import { computeCounterStat, extractCounterAbilityPower } from '../counterStats';
import {
  computeAttributeDistribution,
  computeKeywordDistribution,
  computeTypeDistribution,
} from '../distributions';
import { computeSearcherStat } from '../searcher';
import { def, snap } from './fixtures';

describe('curves', () => {
  const cards = [
    snap(def({ cardNumber: 'A', baseCost: 2, basePower: 3000 }), 4),
    snap(def({ cardNumber: 'B', baseCost: 5, basePower: 6000 }), 2),
    snap(def({ cardNumber: 'E', baseCost: 1, category: 'event', text: '' }), 3), // event: no power
  ];

  it('cost curve is copy-weighted and ascending', () => {
    const curve = computeCostCurve(cards);
    expect(curve.buckets).toEqual([
      { key: '1', count: 3 },
      { key: '2', count: 4 },
      { key: '5', count: 2 },
    ]);
    // (2*4 + 5*2 + 1*3) / 9
    expect(curve.average).toBeCloseTo(21 / 9, 6);
    expect(curve.contributingCards).toBe(9);
  });

  it('power curve counts characters only', () => {
    const curve = computePowerCurve(cards);
    expect(curve.buckets).toEqual([
      { key: '3000', count: 4 },
      { key: '6000', count: 2 },
    ]);
    expect(curve.contributingCards).toBe(6);
  });
});

describe('distributions', () => {
  const cards = [
    snap(def({ cardNumber: 'A', types: ['Straw Hat Crew'], attributes: ['slash'], hasRush: true }), 4),
    snap(def({ cardNumber: 'B', types: ['Straw Hat Crew', 'Navy'], attributes: ['strike'], hasBlocker: true }), 2),
  ];

  it('types count once per type, copy-weighted, descending', () => {
    expect(computeTypeDistribution(cards)).toEqual([
      { key: 'Straw Hat Crew', count: 6 },
      { key: 'Navy', count: 2 },
    ]);
  });

  it('attributes follow canonical order', () => {
    expect(computeAttributeDistribution(cards)).toEqual([
      { key: 'slash', count: 4 },
      { key: 'strike', count: 2 },
    ]);
  });

  it('keywords are copy-weighted and only present ones appear', () => {
    expect(computeKeywordDistribution(cards)).toEqual([
      { key: 'Rush', count: 4 },
      { key: 'Blocker', count: 2 },
    ]);
  });
});

describe('counter stats', () => {
  it('sums printed counter values and detects [Counter] ability power', () => {
    const cards = [
      snap(def({ cardNumber: 'A', counter: 1000 }), 4),
      snap(def({ cardNumber: 'B', counter: 2000 }), 3),
      snap(def({ cardNumber: 'C', counter: 0 }), 2),
      snap(def({ cardNumber: 'EV', category: 'event', text: '[Counter] +2000. Draw 1 card.' }), 2),
    ];
    const stat = computeCounterStat(cards);
    expect(stat.counterCards).toBe(7); // 4 + 3
    expect(stat.totalCounterPower).toBe(1000 * 4 + 2000 * 3); // 10000
    expect(stat.counterEventCards).toBe(2);
    expect(stat.estimatedEventCounterPower).toBe(4000); // 2000 * 2
    // Card C (0, x2) + event EV (no counter -> 0, x2) both fall in the 0 bucket.
    expect(stat.distribution).toContainEqual({ key: '0', count: 4 });
  });

  it('extractCounterAbilityPower ignores +power that is not tied to [Counter]', () => {
    expect(extractCounterAbilityPower('[On Play] Give +1000 power.')).toBeNull();
    expect(extractCounterAbilityPower('[Counter] +4000 power.')).toBe(4000);
  });
});

describe('searcher heuristics', () => {
  it('parses a type searcher and computes a hypergeometric hit chance', () => {
    const searcher = def({
      cardNumber: 'SRCH',
      types: ['Straw Hat Crew'],
      text: 'Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card and add it to your hand. Place the rest at the bottom.',
    });
    const targets = def({ cardNumber: 'T', types: ['Straw Hat Crew'] });
    const cards = [snap(searcher, 4), snap(targets, 8)];

    const stat = computeSearcherStat(cards, 50);
    expect(stat.entries).toHaveLength(1);
    const entry = stat.entries[0];
    expect(entry.lookCount).toBe(5);
    expect(entry.targetDescription).toContain('Straw Hat Crew');
    // Pool = 4 (searcher copies, they are Straw Hat too) + 8 = 12.
    expect(entry.targetPool).toBe(12);
    expect(entry.hitChance).toBeGreaterThan(0.7);
    expect(entry.hitChance).toBeLessThanOrEqual(1);
  });

  it('flags a look-at-deck card whose target cannot be parsed', () => {
    const cards = [
      snap(
        def({
          cardNumber: 'MYST',
          text: 'Look at 3 cards from the top of your deck and rearrange them.',
        }),
        1,
      ),
    ];
    const stat = computeSearcherStat(cards, 50);
    expect(stat.entries).toHaveLength(0);
    expect(stat.unparsed).toHaveLength(1);
    expect(stat.unparsed[0].cardNumber).toBe('MYST');
  });

  it('ignores cards that do not look at the deck', () => {
    const cards = [snap(def({ cardNumber: 'X', text: 'Draw 1 card.' }), 4)];
    const stat = computeSearcherStat(cards, 50);
    expect(stat.entries).toHaveLength(0);
    expect(stat.unparsed).toHaveLength(0);
  });
});

describe('computeDeckStats integration', () => {
  it('assembles all sections and excludes the leader from the draw universe', () => {
    const leader = snap(def({ cardNumber: 'LDR', category: 'leader', life: 5, basePower: 5000 }), 1);
    const cards = [
      snap(def({ cardNumber: 'A', baseCost: 2, basePower: 3000, counter: 1000, types: ['Navy'], attributes: ['slash'] }), 4),
      snap(def({ cardNumber: 'B', baseCost: 4, basePower: 5000, counter: 2000, types: ['Navy'], attributes: ['strike'], hasBlocker: true }), 3),
    ];
    const stats = computeDeckStats({ leader, cards });
    expect(stats.deckSize).toBe(7);
    expect(stats.costCurve.contributingCards).toBe(7);
    expect(stats.onCurve.rows.length).toBeGreaterThan(0);
    expect(stats.counter.counterCards).toBe(7);
    expect(stats.types).toContainEqual({ key: 'Navy', count: 7 });
    expect(stats.keywords).toContainEqual({ key: 'Blocker', count: 3 });
  });
});
