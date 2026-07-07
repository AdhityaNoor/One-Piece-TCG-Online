/**
 * Reviewed effect template assignments - Starter Deck ST19.
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST19_ASSIGNMENTS: CardEffectAssignment[] = [

  // ST19-002 — [On Play] trash 2 black {Navy} cards from hand: If Leader {Navy}, draw 3.
  { cardNumber: 'ST19-002', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'trashTypeFromHand', count: 2, filter: { color: 'black', typeIncludes: 'Navy' } }, { fn: 'draw', amount: 3 }] } },

];
