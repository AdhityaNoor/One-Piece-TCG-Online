/**
 * Reviewed effect template assignments - Starter Deck ST24 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST24_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST24-002 — [On Play] Look 5, reveal up to 1 {Supernovas} to hand, rest to bottom. PARTIAL: opp-attack trash-self ramp deferred.
  { cardNumber: 'ST24-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas' }, remainder: 'bottom' }] } },
  // ST24-003 — [End of Your Turn] Set up to 1 DON!! active.
  { cardNumber: 'ST24-003', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
];
