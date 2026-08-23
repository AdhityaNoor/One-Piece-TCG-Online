/**
 * Regression: a field choice carrying a COMBINED budget ("a total cost of 4 or
 * less") was unusable in the UI.
 *
 * The engine compiles OP17-119 to `max: 4` cards + `maxCombinedCost: 4`, and
 * validates the sum in resolvePendingChoice. The board only ever read `min`/
 * `max`, so it:
 *   - showed "0-4", which the player reads as a COST budget when it is a CARD count,
 *   - let four 3-cost Characters be selected (sum 12) and only failed on submit,
 *   - auto-submitted the instant the 4th card was tapped, so a legal smaller
 *     selection could not be confirmed.
 *
 * These helpers are what the board now consults, so they are tested directly
 * rather than through the hook.
 */
import { describe, expect, it } from 'vitest';
import { fieldChoiceAdditionExceedsBudget, fieldChoiceHasBudget } from '../fieldChoiceUtils';
import { fieldChoiceDimmed, fieldChoiceSelected } from '../PlayerBoardPanel';
import type { BoardSelectionMode } from '../useBoardSelection';

const COSTS: Record<string, number> = { a3: 3, b2: 2, c1: 1, d4: 4 };
const POWERS: Record<string, number> = { a3: 3000, b2: 2000, c1: 1000, d4: 4000 };
const NAMES: Record<string, string> = { a3: 'Alpha', b2: 'Beta', c1: 'Gamma', d4: 'Alpha' };

const helpers = {
  costOf: (id: string) => COSTS[id] ?? 0,
  powerOf: (id: string) => POWERS[id] ?? 0,
  nameOf: (id: string) => NAMES[id],
};

describe('combined-cost budget on a field choice (OP17-119)', () => {
  const budget = { maxCombinedCost: 4 };

  it('allows a selection UNDER the budget — the reported bug', () => {
    // One 3-cost Character totals 3, which "4 or less" plainly permits.
    expect(fieldChoiceAdditionExceedsBudget(budget, [], 'a3', helpers)).toBe(false);
    // And a 1-cost on top of it totals exactly 4 — still legal.
    expect(fieldChoiceAdditionExceedsBudget(budget, ['a3'], 'c1', helpers)).toBe(false);
  });

  it('blocks the pick that would exceed the budget instead of failing on submit', () => {
    // 3 + 2 = 5.
    expect(fieldChoiceAdditionExceedsBudget(budget, ['a3'], 'b2', helpers)).toBe(true);
    // 4 + 1 = 5.
    expect(fieldChoiceAdditionExceedsBudget(budget, ['d4'], 'c1', helpers)).toBe(true);
  });

  it('never blocks deselecting or re-checking an already-selected card', () => {
    expect(fieldChoiceAdditionExceedsBudget(budget, ['a3', 'c1'], 'a3', helpers)).toBe(false);
  });

  it('treats a budgeted choice as manual-confirm so a smaller selection can be submitted', () => {
    // This is what stops the board auto-submitting on the 4th tap.
    expect(fieldChoiceHasBudget(budget)).toBe(true);
    expect(fieldChoiceHasBudget({ maxCombinedPower: 4000 })).toBe(true);
    // A plain "choose up to N cards" choice keeps the old auto-submit behaviour.
    expect(fieldChoiceHasBudget({})).toBe(false);
    expect(fieldChoiceHasBudget({ distinctNames: true })).toBe(false);
  });
});

describe('combined-power budget on a field choice (OP05-007)', () => {
  // Same latent bug, and it predates the cost budget: "K.O. up to 2 of your
  // opponent's Characters with a total power of 4000 or less".
  const budget = { maxCombinedPower: 4000 };

  it('permits a single Character at or under the power budget', () => {
    expect(fieldChoiceAdditionExceedsBudget(budget, [], 'd4', helpers)).toBe(false);
    expect(fieldChoiceAdditionExceedsBudget(budget, [], 'b2', helpers)).toBe(false);
  });

  it('blocks a pair whose combined power overruns it', () => {
    expect(fieldChoiceAdditionExceedsBudget(budget, ['a3'], 'b2', helpers)).toBe(true);
  });
});

describe('distinct-name rule (OP17-118)', () => {
  it('blocks a second copy of an already-selected NAME, not just the same instance', () => {
    // a3 and d4 are different instances that share the printed name "Alpha".
    const budget = { distinctNames: true };
    expect(fieldChoiceAdditionExceedsBudget(budget, ['a3'], 'd4', helpers)).toBe(true);
    expect(fieldChoiceAdditionExceedsBudget(budget, ['a3'], 'b2', helpers)).toBe(false);
  });

  it('applies alongside a cost budget, as OP17-118 needs (2 distinct names, total cost 9)', () => {
    const budget = { maxCombinedCost: 9, distinctNames: true };
    expect(fieldChoiceAdditionExceedsBudget(budget, ['a3'], 'b2', helpers)).toBe(false);
    expect(fieldChoiceAdditionExceedsBudget(budget, ['a3'], 'd4', helpers)).toBe(true); // duplicate name
  });
});

/**
 * Board presentation for a field choice: selected cards carry the ring, and
 * anything that cannot be picked right now is dimmed — including candidates the
 * CURRENT selection has priced out of the combined budget.
 */
describe('field-choice board presentation', () => {
  const card = (instanceId: string) => ({ instanceId }) as unknown as Parameters<typeof fieldChoiceDimmed>[1];
  const mode = (over: Partial<Extract<BoardSelectionMode, { kind: 'resolvingFieldChoice' }>>) => ({
    kind: 'resolvingFieldChoice' as const,
    choiceId: 'c1',
    playerId: 'p1',
    prompt: 'Choose.',
    attribution: null,
    min: 0,
    max: 4,
    candidateInstanceIds: ['a', 'b', 'c'],
    selectedIds: [],
    blockedInstanceIds: [],
    ...over,
  });

  it('rings the selected cards and never dims them', () => {
    const m = mode({ selectedIds: ['a'] });
    expect(fieldChoiceSelected(m, card('a'))).toBe(true);
    expect(fieldChoiceDimmed(m, card('a'))).toBe(false);
    expect(fieldChoiceSelected(m, card('b'))).toBe(false);
  });

  it('dims non-candidates', () => {
    expect(fieldChoiceDimmed(mode({}), card('zzz'))).toBe(true);
    expect(fieldChoiceDimmed(mode({}), card('b'))).toBe(false);
  });

  it('dims candidates that the current selection has pushed over the budget', () => {
    // 'c' is still a candidate, but picking it would break the cap.
    const m = mode({ selectedIds: ['a'], blockedInstanceIds: ['c'] });
    expect(fieldChoiceDimmed(m, card('c'))).toBe(true);
    expect(fieldChoiceDimmed(m, card('b'))).toBe(false);
  });

  it('keeps a selected card tappable so it can be deselected, even if listed blocked', () => {
    const m = mode({ selectedIds: ['a'], blockedInstanceIds: ['a', 'c'] });
    expect(fieldChoiceDimmed(m, card('a'))).toBe(false);
  });
});
