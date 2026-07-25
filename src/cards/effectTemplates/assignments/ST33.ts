/**
 * Reviewed effect template assignments - Starter Deck ST33.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST33_ASSIGNMENTS: CardEffectAssignment[] = [
  { cardNumber: 'ST33-001', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },

  {
    cardNumber: 'ST33-002',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'opponentHand', atLeast: 6 }] }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Navy', maxCost: 4 } }] } },
    ],
  },

  { cardNumber: 'ST33-003', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }] } },

  { cardNumber: 'ST33-004', templateId: 'ability', params: { timing: 'onHandTrashed', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: -3, duration: 'duringThisTurn' }] } },

  { cardNumber: 'ST33-005', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'blue', typeIncludes: 'Navy', maxBasePower: 8000, excludeSelfName: true } }] } },
];
