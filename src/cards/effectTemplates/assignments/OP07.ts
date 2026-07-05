/**
 * Reviewed effect template assignments - Main Booster OP07.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP07_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP07-044 — [On Play] Draw 1 card.
  { cardNumber: 'OP07-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
  // OP07-054 - [Blocker] [On Play] Draw 1 card.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw is templated.
  { cardNumber: 'OP07-054', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
  // OP07-013 - [On Play] If Leader is Portgas.D.Ace, look at 5; add Portgas.D.Ace or red Event.
  {
    cardNumber: 'OP07-013',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Portgas.D.Ace' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Portgas.D.Ace' }, { category: 'event', color: 'red' }] } }] },
  },
  // OP07-015 - [Rush] [On Play] Give up to 2 rested DON!! to Leader/Character.
  // Note: [Rush] is an engine keyword flag. Only the on-play DON!! attach is templated.
  { cardNumber: 'OP07-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 2 }] } },
  // OP07-046 — [On Play] Look at 5; add up to 1 The Seven Warlords of the Sea.
  {
    cardNumber: 'OP07-046',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'The Seven Warlords of the Sea' } }] },
  },
  // OP07-022 - [On Play] Look at 5; add green Land of Wano other than this card's name.
  {
    cardNumber: 'OP07-022',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'green', typeIncludes: 'Land of Wano', excludeSelfName: true } }] },
  },
  // OP07-041 - [On Play] Look at 5; add Amazon Lily or Kuja Pirates other than this card's name.
  {
    cardNumber: 'OP07-041',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Amazon Lily' }, { typeIncludes: 'Kuja Pirates' }], excludeSelfName: true } }] },
  },
];
