/**
 * Unit tests for the deck-return ordering helpers (see cardOrdering.ts).
 * Pure functions only — no React, no engine bootstrap, so this file runs fast.
 */
import { describe, expect, it } from 'vitest';
import { defaultOrder, isOrderingChoice, moveInOrder, targetIndexForPointer } from '../cardOrdering';
import type { PendingChoice } from '../../../../engine/events/pendingChoice';

function choice(partial: Partial<PendingChoice['constraints']> & { kind?: PendingChoice['kind'] } = {}): PendingChoice {
  const { kind = 'SELECT_CARDS', ...constraints } = partial;
  return {
    id: 'c1',
    playerId: 'p1',
    kind,
    prompt: 'Choose the order for the remaining looked card(s).',
    constraints: { min: 0, max: 0, ...constraints },
    sourceInstanceId: 'src',
    sourceEffectId: 'ir',
  } as PendingChoice;
}

describe('isOrderingChoice', () => {
  it('detects a select-all-with-order prompt', () => {
    expect(isOrderingChoice(choice({ min: 3, max: 3, candidateInstanceIds: ['a', 'b', 'c'] }))).toBe(true);
  });

  it('ignores prompts that leave a real subset choice', () => {
    // "look at 5, pick 1" — order is not the question being asked.
    expect(isOrderingChoice(choice({ min: 1, max: 1, candidateInstanceIds: ['a', 'b', 'c'] }))).toBe(false);
    expect(isOrderingChoice(choice({ min: 0, max: 2, candidateInstanceIds: ['a', 'b', 'c'] }))).toBe(false);
  });

  it('ignores a single candidate — nothing to order', () => {
    expect(isOrderingChoice(choice({ min: 1, max: 1, candidateInstanceIds: ['a'] }))).toBe(false);
  });

  it('ignores non-card choices', () => {
    expect(isOrderingChoice(choice({ kind: 'SELECT_OPTION', min: 2, max: 2, candidateInstanceIds: ['a', 'b'] }))).toBe(false);
  });
});

describe('defaultOrder', () => {
  it('is the engine candidate order (deck order, top-most first)', () => {
    expect(defaultOrder(choice({ min: 3, max: 3, candidateInstanceIds: ['top', 'mid', 'bottom'] }))).toEqual([
      'top',
      'mid',
      'bottom',
    ]);
  });

  it('returns a copy so callers cannot mutate the choice', () => {
    const c = choice({ min: 2, max: 2, candidateInstanceIds: ['a', 'b'] });
    const order = defaultOrder(c);
    order.reverse();
    expect(c.constraints.candidateInstanceIds).toEqual(['a', 'b']);
  });
});

describe('moveInOrder', () => {
  const base = ['a', 'b', 'c', 'd'];

  it('moves an item later', () => {
    expect(moveInOrder(base, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item earlier', () => {
    expect(moveInOrder(base, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('moves to the ends', () => {
    expect(moveInOrder(base, 2, 0)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveInOrder(base, 1, 3)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('never drops or duplicates a card', () => {
    const moved = moveInOrder(base, 0, 3);
    expect([...moved].sort()).toEqual([...base].sort());
    expect(moved).toHaveLength(base.length);
  });

  it('returns the same reference for no-op and out-of-range moves', () => {
    expect(moveInOrder(base, 1, 1)).toBe(base);
    expect(moveInOrder(base, -1, 2)).toBe(base);
    expect(moveInOrder(base, 0, 9)).toBe(base);
  });

  it('does not mutate the input', () => {
    const input = [...base];
    moveInOrder(input, 0, 3);
    expect(input).toEqual(base);
  });
});

describe('targetIndexForPointer', () => {
  // Four cards, 100px apart, centres at 50/150/250/350.
  const centers = [50, 150, 250, 350];

  it('keeps the index while the pointer stays over its own slot', () => {
    expect(targetIndexForPointer(centers, 1, 150)).toBe(1);
  });

  it('targets the slot the pointer has been dragged left past', () => {
    expect(targetIndexForPointer(centers, 2, 40)).toBe(0);
    expect(targetIndexForPointer(centers, 2, 140)).toBe(1);
  });

  it('targets the slot the pointer has been dragged right past', () => {
    expect(targetIndexForPointer(centers, 0, 260)).toBe(2);
    expect(targetIndexForPointer(centers, 0, 360)).toBe(3);
  });

  it('clamps to the list when dragged far outside it', () => {
    expect(targetIndexForPointer(centers, 1, -999)).toBe(0);
    expect(targetIndexForPointer(centers, 1, 9999)).toBe(3);
  });

  it('skips items whose element could not be measured', () => {
    expect(targetIndexForPointer([50, Number.POSITIVE_INFINITY, 250], 0, 260)).toBe(2);
  });
});
