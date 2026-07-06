/**
 * Reviewed effect template assignments - Starter Deck ST25 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST25_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST25-001 — [On Play] If Leader [Buggy], draw 3, trash 2. PARTIAL: static typed-count +1 cost deferred.
  { cardNumber: 'ST25-001', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Buggy' }], functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },

  // ST25-002 — [Opponent's Turn] this Character +5000. PARTIAL: static typed-count [Blocker]/+1 cost deferred.
  { cardNumber: 'ST25-002', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 5000, duration: 'permanent', condition: { turn: 'opponent' } }] } },

  // ST25-003 — [On Play] Draw 2, trash 1, then play up to 1 {Cross Guild} cost ≤4 from hand. PARTIAL: removal-replacement deferred.
  { cardNumber: 'ST25-003', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Cross Guild', maxCost: 4 } }] } },

  // ST25-004 (character) Buggy —
  //   [Activate: Main] You may trash 1 card from your hand and trash this Character: If your Leader is
  //   [Buggy], play up to 1 {Cross Guild} type Character card with a cost of 6 or less from your hand.
  // NOTE: not yet implemented (needs template).

  // ST25-005 — [On K.O.] If Leader [Buggy] and ≤3 hand, draw 1. PARTIAL: static typed-count [Blocker]/+1 cost deferred.
  { cardNumber: 'ST25-005', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderName', name: 'Buggy' }, { kind: 'selfHand', atMost: 3 }], functions: [{ fn: 'draw', amount: 1 }] } },
];
