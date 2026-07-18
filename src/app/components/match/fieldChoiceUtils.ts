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
