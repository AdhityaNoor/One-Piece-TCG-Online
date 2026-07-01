/**
 * Reviewed effect template assignments — Starter Deck ST01 (Straw Hat Crew).
 *
 * Coverage notes:
 *   SKIPPED (not yet supported in IR):
 *     ST01-001 (leader) — activateMainGiveDon ✓ ... wait, actually covered below.
 *     ST01-002 — [Trigger] Play this card: needs triggerPlaySelf op (TODO).
 *     ST01-005 — [DON!! x1] [When Attacking] +1000 to a different Leader/Character:
 *                needs "controllerLeaderOrCharactersExcludingSelf" selector (TODO).
 *     ST01-012 — multi-ability ([Rush] + [DON!! x2] block suppression): needs
 *                blockSuppression op (TODO).
 *     ST01-014 (event) — [Counter] +3000 / [Trigger] +1000: event counter not modeled (TODO).
 *     ST01-015 (event) — [Main] K.O. ≤6000 + [Trigger] activate Main: event Main (TODO).
 *     ST01-016 (event) — complex blocker suppression + trigger: TODO.
 *     ST01-017 (stage) — [Activate: Main] rest this Stage: stage rest-cost (TODO).
 */
import type { CardEffectAssignment } from '../assembler';

export const ST01_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST01-001 (leader) — [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'ST01-001', templateId: 'activateMainGiveDon', params: { count: 1 } },

  // ST01-007 — [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'ST01-007', templateId: 'activateMainGiveDon', params: { count: 1 } },

  // ST01-011 — [On Play] Give up to 2 rested DON!! cards to your Leader or 1 of your Characters.
  { cardNumber: 'ST01-011', templateId: 'onPlayGiveDon', params: { count: 2 } },

  // ST01-013 — [DON!! x1] Permanent +1000 power when ≥1 DON!! attached.
  { cardNumber: 'ST01-013', templateId: 'donAttachedSelfPower', params: { donAttachedAtLeast: 1, amount: 1000 } },
];
