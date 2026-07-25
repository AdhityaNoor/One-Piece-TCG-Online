/**
 * Reviewed effect template assignments - Starter Deck ST36.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST36_ASSIGNMENTS: CardEffectAssignment[] = [
  { cardNumber: 'ST36-001', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },

  {
    cardNumber: 'ST36-002',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, gate: [{ kind: 'leaderType', type: 'Kid Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  { cardNumber: 'ST36-003', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 7000, duration: 'duringThisTurn' }] } },

  { cardNumber: 'ST36-004', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Supernovas' }, optional: true }, { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' }] } },

  {
    cardNumber: 'ST36-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [
        { fn: 'turnTopLifeFace', faceUp: false, position: 'topOrBottom' },
        { fn: 'redirectAttackTarget', target: { group: 'characters', player: 'controller', filter: { name: 'Eustass"Captain"Kid', minBasePower: 5000 } }, ifPrevious: 'previousSelectedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
        { fn: 'turnTopLifeFace', faceUp: true, position: 'topOrBottom' },
        { fn: 'giveDonControllerLeader', count: 1, ifPrevious: 'previousSelectedAny' },
      ] } },
    ],
  },
];
