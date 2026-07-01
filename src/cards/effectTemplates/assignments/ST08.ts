/**
 * Reviewed effect template assignments — Starter Deck ST08 (Monkey.D.Luffy / black).
 *
 * Coverage notes:
 *   SKIPPED (not yet supported in IR):
 *     ST08-001 (leader) — [Your Turn] reactive give DON!! on K.O.: reactive trigger (TODO).
 *     ST08-002 — "cannot be K.O.'d in battle by Leaders" + [Activate: Main] rest-cost
 *                modify cost: continuous immunity + activate cost (TODO).
 *     ST08-004 — [Activate: Main] rest-self + K.O. ≤2: activate cost (TODO).
 *     ST08-005 — [On Play] optional trash + K.O. all ≤1: optional cost + multi-KO (TODO).
 *     ST08-007 — [Blocker] [Trigger] play self: triggerPlaySelf (TODO).
 *     ST08-009 — [On Play] conditional draw (if Character with cost 0 exists): gate (TODO).
 *     ST08-013 — battle-end K.O. exchange: reaction trigger (TODO).
 *     ST08-014 (event) — [Main] life-sacrifice + modify cost / [Trigger] moveToHand: (TODO).
 *     ST08-015 (event) — [Main] K.O. ≤2 / [Trigger] draw: event (TODO).
 */
import type { CardEffectAssignment } from '../assembler';

export const ST08_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST08-006 — [Blocker] [On Play] Give up to 1 of your opponent's Characters −4 cost.
  // Note: [Blocker] is an engine keyword flag, not an IR ability. Only the on-play effect is templated.
  { cardNumber: 'ST08-006', templateId: 'onPlayModifyCostOpponent', params: { amount: -4 } },

  // ST08-008 — [On Play] Give up to 1 of your opponent's Characters −2 cost during this turn.
  { cardNumber: 'ST08-008', templateId: 'onPlayModifyCostOpponent', params: { amount: -2 } },
];
