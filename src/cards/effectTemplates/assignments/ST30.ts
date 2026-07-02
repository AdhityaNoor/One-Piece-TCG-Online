/**
 * Reviewed effect template assignments - Starter Deck ST30.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST30_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST30-002 - [On Play] Look at 5; add Character card with exactly 6000 power.
  {
    cardNumber: 'ST30-002',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', exactPower: 6000 } }] },
  },
];
