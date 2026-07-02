/**
 * Reviewed effect template assignments — Starter Deck ST05 (FILM Edition).
 *
 * Coverage notes:
 *   SKIPPED (not yet supported in IR):
 *     ST05-001 (leader) — DON!! −3 + modifyPower all FILM Characters: DON!! cost (TODO).
 *     ST05-004 — [Blocker] [On Block] DON!! −1 rest opponent ≤5: DON!! cost (TODO).
 *     ST05-005 — [Activate: Main] rest+trash cost + conditional DON!! ramp: complex (TODO).
 *     ST05-006 — [When Attacking] DON!! −2 draw 2: DON!! cost (TODO).
 *     ST05-008 — continuous immunity (cannot be K.O.'d in battle if ≥8 DON!!): (TODO).
 *     ST05-009 — [Trigger] Play this card: triggerPlaySelf (TODO).
 *     ST05-010 — battle-attribute condition + DON!! −1 power boost: (TODO).
 *     ST05-011 — [Activate: Main] DON!! −4 rest 2 + grant Double Attack: DON!! cost (TODO).
 *     ST05-016 (event) — DON!! −2 K.O. + [Trigger] DON!! ramp: event + DON!! cost (TODO).
 *     ST05-017 (event) — conditional [Counter] + [Trigger] DON!! ramp: (TODO).
 */
import type { CardEffectAssignment } from '../assembler';

export const ST05_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST05-002 — [On Play] Add 1 DON!! from DON!! deck (rested).
  { cardNumber: 'ST05-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // ST05-014 — [On Play] Look at 5; add up to 1 FILM type (excl. same name).
  {
    cardNumber: 'ST05-014',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM', excludeSelfName: true } }] },
  },
];
