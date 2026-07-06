/**
 * Reviewed effect template assignments - Starter Deck ST17 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST17_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST17-002 — [On Play] If Leader {Warlords}: return 1 of your Characters to hand, then return up to 1 Character cost ≤4 to hand.
  { cardNumber: 'ST17-002', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Seven Warlords of the Sea' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  // ST17-003 — [On Play] Look at 3, place at top/bottom of deck in any order.
  { cardNumber: 'ST17-003', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 3, reveal: false, destination: 'deckTopOrBottom' }] } },
  // ST17-004 — [Blocker][On Play] Look 3, reorder top/bottom, then give up to 1 rested DON!! to Leader/1 Char.
  { cardNumber: 'ST17-004', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 3, reveal: false, destination: 'deckTopOrBottom' }, { fn: 'giveDon', count: 1 }] } },
];
