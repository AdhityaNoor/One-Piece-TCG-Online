/**
 * Reviewed effect template assignments - Starter Deck ST34.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST34_ASSIGNMENTS: CardEffectAssignment[] = [
  {
    cardNumber: 'ST34-001',
    templates: [
      { templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'your' }, gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }, { kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 2, rested: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxBasePower: 8000 } }] } },
    ],
  },

  { cardNumber: 'ST34-002', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  { cardNumber: 'ST34-003', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Big Mom Pirates' }, remainder: 'bottom' }] } },

  // PARTIAL: ST34-004 base-power-to-0 rider is mapped; the DON!! -4 plus optional trash compound cost remains a richer optional cost primitive.
  { cardNumber: 'ST34-004', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 4 }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'setBasePower', target: { group: 'characters', player: 'opponent' }, value: 0, duration: 'duringThisTurn', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'ST34-005', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 2000 } }, optional: true }] } },
];
