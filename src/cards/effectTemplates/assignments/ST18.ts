/**
 * Reviewed effect template assignments - Starter Deck ST18.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST18_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST18-004 - [On Play] Look at 5; add purple Straw Hat Crew.
  {
    cardNumber: 'ST18-004',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { color: 'purple', typeIncludes: 'Straw Hat Crew' } },
  },
];
