/**
 * Reviewed effect template assignments - Starter Deck ST31.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST31_ASSIGNMENTS: CardEffectAssignment[] = [
  {
    cardNumber: 'ST31-001',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 5, excludeSelfName: true } }] } },
    ],
  },

  { cardNumber: 'ST31-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { typeIncludes: 'Straw Hat Crew', exactCost: 1 } }] } },

  {
    cardNumber: 'ST31-003',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfGivenDonCount', atLeast: 3 }] } },
        { fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfGivenDonCount', atLeast: 3 }] } },
      ],
    },
  },

  // PARTIAL: ST31-004 maps one -1000 target; the full "for every {Straw Hat Crew} on your field" multi-target scaling needs a richer primitive.
  {
    cardNumber: 'ST31-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfGivenDonCount', atLeast: 3 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  {
    cardNumber: 'ST31-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'giveDon', count: 1, optional: true, targetName: 'Monkey.D.Luffy' }] } },
    ],
  },
];
