/**
 * Reviewed effect template assignments - Main Booster OP12.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP12_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP12-104 — [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or less.
  { cardNumber: 'OP12-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  // OP12-108 - [On Play] Look at 5; add up to 1 [Trafalgar Law].
  {
    cardNumber: 'OP12-108',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Trafalgar Law' } }] },
  },
  // OP12-006 - [On Play] Look at 5; add [Monkey.D.Luffy] or red Event.
  {
    cardNumber: 'OP12-006',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { category: 'event', color: 'red' }] } }] },
  },
  // OP12-071 - [On Play] Look at 4; add [Sanji] or Event.
  {
    cardNumber: 'OP12-071',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Sanji' }, { category: 'event' }] } }] },
  },
  // OP12-086 - [On Play] If Leader has Revolutionary Army, look at 3; add Revolutionary Army other than self or [Nico Robin], trash rest.
  {
    cardNumber: 'OP12-086',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'searchTopDeck', look: 3,
      pick: 1,
      reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Revolutionary Army', excludeSelfName: true }, { name: 'Nico Robin' }] },
      remainder: 'trash' }] },
  },
];
