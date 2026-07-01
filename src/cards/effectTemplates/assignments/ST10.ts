/**
 * Reviewed effect template assignments — Starter Deck ST10 (Heart Pirates / Law+Luffy+Kid).
 *
 * Coverage notes:
 *   SKIPPED (not yet supported in IR):
 *     ST10-001 (leader) — DON!! −3 + placeAtBottom + playFromHand: DON!! cost (TODO).
 *     ST10-002 (leader) — conditional DON!! ramp (gate on field count): gate (TODO).
 *     ST10-003 (leader) — conditional power debuff + DON!! −1 self-boost: DON!! cost (TODO).
 *     ST10-006 — [Rush] + once-per-turn blocker-response K.O.: reactive trigger (TODO).
 *     ST10-007 — reactive K.O. when DON!! returned to deck: reactive trigger (TODO).
 *     ST10-008 — [On Play] conditional DON!! ramp (if ≤3 DON!!): gate (TODO).
 *     ST10-009 — [On Play] ➀ DON!! cost + DON!! ramp: DON!! cost (TODO).
 *     ST10-010 — [Blocker] [On Play] DON!! −1 + conditional trash opponent hand: DON!! cost (TODO).
 *     ST10-011 — reactive power boost when DON!! returned: reactive trigger (TODO).
 *     ST10-012 — [On Play]/[When Attacking] conditional DON!! ramp: gate + DON!! cost (TODO).
 *     ST10-013 — [On Play]/[When Attacking] DON!! −1 + leader power boost: DON!! cost (TODO).
 *     ST10-014 — [Blocker] reactive draw+trash on DON!! return: reactive (TODO).
 *     ST10-015 (event) — [Counter] +2000 + K.O. ≤2000 power: event (TODO).
 *     ST10-016 (event) — [Main] K.O. ≤7000 / [Trigger] leader power boost: event (TODO).
 *     ST10-017 (event) — [Main] rest ≤2 + DON!! ramp / [Trigger] DON!! ramp: DON!! cost (TODO).
 */
import type { CardEffectAssignment } from '../assembler';

export const ST10_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST10-005 — [DON!! x1] [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  {
    cardNumber: 'ST10-005',
    templateId: 'whenAttackingModifyPowerOpponent',
    params: { amount: -2000, donRequired: 1 },
  },
];
