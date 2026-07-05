/**
 * Reviewed effect template assignments - Main Booster OP15.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP15_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP15-040 — [On Play] Look at 3; add up to 1 Dressrosa type.
  {
    cardNumber: 'OP15-040',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa' } }] },
  },
  // OP15-044 - [Blocker] [On K.O.] Look at 3; add up to 1 Dressrosa Event.
  // Note: [Blocker] is an engine keyword flag. Only the on-K.O. search is templated.
  {
    cardNumber: 'OP15-044',
    templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event', typeIncludes: 'Dressrosa' } }] },
  },
  // OP15-108 — [On Play] Look at 3; add up to 1 Sky Island type.
  {
    cardNumber: 'OP15-108',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island' } }] },
  },

  // OP15-061 - [On Play] DON!! -1: draw 1. [When Attacking] if <=6 DON!!, -1000 opponent Character.
  {
    cardNumber: 'OP15-061',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP15-063 - [On Play] DON!! -1: draw 1. [On K.O.] if <=6 DON!!, K.O. power <=2000.
  {
    cardNumber: 'OP15-063',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
    ],
  },
  // OP15-078 - [Main] DON!! -2: draw 1, then rest power <=5000. [Counter] +1000, then if <=6 DON!! draw 1.
  {
    cardNumber: 'OP15-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
];
