/**
 * Reviewed effect template assignments - Main Booster OP10.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP10_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP10-004 — [On Play] Look at 5; add up to 1 Punk Hazard (excl. same name).
  {
    cardNumber: 'OP10-004',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Punk Hazard', excludeSelfName: true } }] },
  },
  // OP10-111 — [On Play] Look at 5; add up to 1 Supernovas (excl. same name).
  {
    cardNumber: 'OP10-111',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas', excludeSelfName: true } }] },
  },
];
