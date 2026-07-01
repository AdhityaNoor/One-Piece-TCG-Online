/**
 * Reviewed effect template assignments - Starter Deck ST30.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST30_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST30-002 - [On Play] Look at 5; add Character card with exactly 6000 power.
  {
    cardNumber: 'ST30-002',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { category: 'character', exactPower: 6000 } },
  },
];
