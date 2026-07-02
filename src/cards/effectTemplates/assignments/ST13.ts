/**
 * Reviewed effect template assignments - Starter Deck ST13.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST13_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST13-013 - [On Play] Look at 5; add [Sabo], [Portgas.D.Ace], or [Monkey.D.Luffy] with cost 5 or less.
  {
    cardNumber: 'ST13-013',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5,
      pick: 1,
      reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Sabo' }, { name: 'Portgas.D.Ace' }, { name: 'Monkey.D.Luffy' }], maxCost: 5 } }] },
  },
];
