/**
 * Reviewed effect template assignments - Premium Booster (PRB) sets.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const PRB_ASSIGNMENTS: CardEffectAssignment[] = [

  // PRB02-004 — [Blocker] [On Your Opponent's Attack] [Once Per Turn] Set up to 1 of your DON!! cards as active.
  { cardNumber: 'PRB02-004', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // --- codegen batch ---
  { cardNumber: 'PRB02-008', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 2 }] } },

];
