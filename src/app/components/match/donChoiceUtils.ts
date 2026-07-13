/**
 * Shared detector for the interpreter's donMinus ability-cost pending choice
 * (see engine/effects/interpreter.ts's suspendOrPayAbilityCost — it raises a
 * SELECT_CARDS choice with sourceEffectId 'ir' whose candidates are every
 * DON!! card on the controller's field, active cost-area or attached to a
 * Leader/Character). DON!! tokens have no distinguishing art, so listing
 * them in the generic card-gallery modal (PendingChoicePrompt.tsx's 'ir'
 * branch) is meaningless — the player needs to see WHERE each DON!! actually
 * sits on the field, not a grid of identical tokens.
 *
 * Both PendingChoicePrompt.tsx (to suppress its generic modal for this case)
 * and useBoardSelection.ts (to auto-enter the board-native selection mode)
 * need the exact same test, so it lives here once rather than drifting.
 */
import type { GameState } from '../../../engine/state/game';
import type { PendingChoice } from '../../../engine/events/pendingChoice';
import type { CardDefinitionLookup } from '../../../engine/rules/shared';

export function isDonReturnChoice(state: GameState, defs: CardDefinitionLookup, choice: PendingChoice): boolean {
  if (choice.sourceEffectId !== 'ir' || choice.kind !== 'SELECT_CARDS') return false;
  const candidates = choice.constraints.candidateInstanceIds ?? [];
  if (candidates.length === 0) return false;
  return candidates.every((id) => {
    const inst = state.cardsById[id];
    return !!inst && defs[inst.cardDefinitionId]?.category === 'don';
  });
}
