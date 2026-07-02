/**
 * Reviewed effect template assignments — Starter Deck ST06 (Navy).
 *
 * Coverage notes:
 *   SKIPPED (not yet supported in IR):
 *     ST06-001 (leader) — [Activate: Main] ③ DON!! cost + optional trash + K.O. ≤0: DON!! cost (TODO).
 *     ST06-002 — [On Play] optional trash + K.O. ≤0: optional cost payment (TODO).
 *     ST06-004 — "cannot be K.O.'d by effects" + conditional Double Attack: continuous immunity (TODO).
 *     ST06-006 — [Activate: Main] rest-self cost + modify cost: activate cost (TODO).
 *     ST06-012 — [Activate: Main] trash+rest cost + K.O. ≤4: complex activate cost (TODO).
 *     ST06-014 (event) — [Counter] +4000 + K.O. active ≤3 / [Trigger] K.O. ≤4: event timing (TODO).
 *     ST06-015 (event) — [Main] draw + modify cost / [Trigger] opponent discards: event (TODO).
 *     ST06-016 (event) — [Counter] + no-KO immunity + [Trigger] draw: event (TODO).
 *     ST06-017 (stage) — dual timing (On Play + Activate Main) cost reduce: complex (TODO).
 */
import type { CardEffectAssignment } from '../assembler';

export const ST06_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST06-005 — [When Attacking] Give up to 1 of your opponent's Characters −4 cost during this turn.
  { cardNumber: 'ST06-005', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'modifyCostOpponent', amount: -4 }] } },

  // ST06-008 — [On Play] Give up to 1 of your opponent's Characters −4 cost during this turn.
  { cardNumber: 'ST06-008', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -4 }] } },

  // ST06-010 — [On Play] Give up to 1 of your opponent's Characters −3 cost during this turn.
  { cardNumber: 'ST06-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -3 }] } },
];
