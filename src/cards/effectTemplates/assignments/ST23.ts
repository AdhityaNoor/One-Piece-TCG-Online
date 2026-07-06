/**
 * Reviewed effect template assignments - Starter Deck ST23.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST23_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (ST23 expressible). ──
  // ST23-003 — [On Play] trash 1 → if Leader {Red-Haired Pirates}, K.O. up to 1 opp Character base power ≤4000.
  { cardNumber: 'ST23-003', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 4000 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  // ST23-004 — [Activate: Main] rest 1 DON!! + rest this: give up to 1 opp Character −1000.
  { cardNumber: 'ST23-004', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // ST23-005 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'ST23-005', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
];
