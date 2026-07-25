/**
 * Reviewed effect template assignments - Starter Deck ST35.
 */
import type { CardEffectAssignment } from '../assembler';

const playSmallRevolutionaryFromHandOrTrash = {
  fn: 'chooseOne' as const,
  chooser: 'controller' as const,
  prompt: 'Play a Revolutionary Army Character from:',
  options: [
    { label: 'fromHand', functions: [{ fn: 'playFromHand' as const, filter: { category: 'character' as const, typeIncludes: 'Revolutionary Army', maxBasePower: 4000 } }] },
    { label: 'fromTrash', functions: [{ fn: 'playFromTrash' as const, filter: { category: 'character' as const, typeIncludes: 'Revolutionary Army', maxBasePower: 4000 } }] },
  ],
};

export const ST35_ASSIGNMENTS: CardEffectAssignment[] = [
  { cardNumber: 'ST35-001', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 2000 } }, optional: true }] } },
  { cardNumber: 'ST35-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
  { cardNumber: 'ST35-003', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'trashTopDeck', count: 2, optional: true }, { fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'opponentHand', atLeast: 7 }] }] } },
  { cardNumber: 'ST35-004', templates: [
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent' }, { fn: 'addCost', target: { ref: 'self' }, amount: 1, duration: 'permanent' }] } },
    { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonControllerLeader', count: 1 }, playSmallRevolutionaryFromHandOrTrash] } },
  ] },
  { cardNumber: 'ST35-005', templates: [
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 3, duration: 'permanent' }] } },
    { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonControllerLeader', count: 1 }, playSmallRevolutionaryFromHandOrTrash] } },
  ] },
];
