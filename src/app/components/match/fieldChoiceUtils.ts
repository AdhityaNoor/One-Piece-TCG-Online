/**
 * Shared detector for a pending SELECT_CARDS choice whose every candidate is
 * currently on the field (Leader/Character/Stage area, either player's —
 * e.g. "K.O. up to 1 opponent Character" or the 3-7-6-1 Character Area
 * overflow trash). These should be resolved by tapping the actual card on
 * the mat with the rest of the board dimmed around it, not a popup gallery —
 * the player already sees the card sitting on the field; listing it again in
 * a modal is redundant and hides the board state the choice is about.
 *
 * Deliberately zone-based rather than sourceEffectId-based: this must catch
 * every shape that raises a field-card SELECT_CARDS choice (the
 * 'rule:characterAreaOverflow' rule choice, 'rule:battleKoReplacement'
 * K.O.-replacement SELECT_CARDS, curated V1 'ir' chooseTargets, and V2
 * 'v2:'-prefixed target selection) rather than special-casing each one.
 *
 * Both PendingChoicePrompt.tsx (to suppress its generic modal for this case)
 * and useBoardSelection.ts (to auto-enter the board-native selection mode)
 * need the exact same test, so it lives here once rather than drifting —
 * same pattern as donChoiceUtils.ts's isDonReturnChoice.
 */
import type { GameState } from '../../../engine/state/game';
import type { PendingChoice } from '../../../engine/events/pendingChoice';

const FIELD_ZONES = new Set(['leaderArea', 'characterArea', 'stageArea']);

export function isFieldCardChoice(state: GameState, choice: PendingChoice): boolean {
  if (choice.kind !== 'SELECT_CARDS') return false;
  const candidates = choice.constraints.candidateInstanceIds ?? [];
  if (candidates.length === 0) return false;
  return candidates.every((id) => {
    const inst = state.cardsById[id];
    return !!inst && FIELD_ZONES.has(inst.currentZone);
  });
}

/**
 * Constraints on a field choice that the ENGINE validates in
 * resolvePendingChoice but that a card-count-only UI cannot see. Mirrored here
 * so the board can refuse an illegal pick up front instead of letting the
 * player assemble a selection the engine will bounce on submit.
 */
export interface FieldChoiceBudget {
  maxCombinedCost?: number;
  maxCombinedPower?: number;
  distinctNames?: boolean;
}

/**
 * True when adding `candidateId` to `selectedIds` would break a budget or the
 * distinct-name rule.
 *
 * `costOf` / `powerOf` take an instance id and return its CURRENT value, so the
 * check reads through continuous modifiers exactly like the engine's does — a
 * printed-3 Character discounted to 2 really does cost 2 against the budget.
 *
 * Why this exists: "K.O. your opponent's Characters with a total cost of 4 or
 * less" (OP17-119) compiles to max 4 CARDS plus a combined-cost cap of 4. A UI
 * that only knows `max` shows "0-4" and happily lets the player pick four
 * 3-cost Characters, then fails on submit. It also must not auto-submit on the
 * 4th tap, because a smaller selection is legal and usually the intended one.
 */
export function fieldChoiceAdditionExceedsBudget(
  budget: FieldChoiceBudget,
  selectedIds: string[],
  candidateId: string,
  helpers: { costOf: (id: string) => number; powerOf: (id: string) => number; nameOf: (id: string) => string | undefined },
): boolean {
  if (selectedIds.includes(candidateId)) return false;
  const next = [...selectedIds, candidateId];
  if (budget.maxCombinedCost !== undefined) {
    const total = next.reduce((sum, id) => sum + helpers.costOf(id), 0);
    if (total > budget.maxCombinedCost) return true;
  }
  if (budget.maxCombinedPower !== undefined) {
    const total = next.reduce((sum, id) => sum + helpers.powerOf(id), 0);
    if (total > budget.maxCombinedPower) return true;
  }
  if (budget.distinctNames) {
    const names = next.map(helpers.nameOf).filter((n): n is string => n !== undefined);
    if (new Set(names).size !== names.length) return true;
  }
  return false;
}

/** True when a field choice carries a combined budget, meaning it must end on an explicit Confirm rather than auto-submitting at `max` cards. */
export function fieldChoiceHasBudget(budget: FieldChoiceBudget): boolean {
  return budget.maxCombinedCost !== undefined || budget.maxCombinedPower !== undefined;
}
