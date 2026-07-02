/**
 * Reviewed effect template assignments - Starter Deck ST18.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST18_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST18-004 - [On Play] Look at 5; add purple Straw Hat Crew.
  {
    cardNumber: 'ST18-004',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'purple', typeIncludes: 'Straw Hat Crew' } }] },
  },
];
