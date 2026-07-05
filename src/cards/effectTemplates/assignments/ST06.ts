/**
 * Reviewed effect template assignments - Starter Deck ST06 (Navy).
 *
 * Coverage notes:
 *   ST06 is fully curated. Keyword-only cards remain covered by normalized flags.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST06_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST06-001 - [Activate: Main] [Once Per Turn] rest 3 DON!!; may trash 1 card: K.O. cost 0.
  {
    cardNumber: 'ST06-001',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      cost: [{ kind: 'restDon', count: 3 }],
      functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'koOpponentCharacter', filter: { exactCost: 0 }, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST06-002 - [On Play] may trash 1 card: K.O. cost 0.
  {
    cardNumber: 'ST06-002',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'koOpponentCharacter', filter: { exactCost: 0 }, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST06-004 - effect-only K.O. immunity; [DON!! x1] + any Character cost 0 grants Double Attack.
  {
    cardNumber: 'ST06-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent' }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [
            {
              fn: 'addKeywordSelf',
              keyword: 'doubleAttack',
              duration: 'permanent',
              condition: { donAttachedAtLeast: 1, gate: [{ kind: 'anyCharacterExactCost', exactCost: 0 }] },
            },
          ],
        },
      },
    ],
  },

  // ST06-005 - [When Attacking] Give up to 1 of your opponent's Characters -4 cost during this turn.
  { cardNumber: 'ST06-005', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'modifyCostOpponent', amount: -4 }] } },

  // ST06-006 - [Activate: Main] rest this Character: give up to 1 opponent Character -2 cost.
  { cardNumber: 'ST06-006', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'modifyCostOpponent', amount: -2 }] } },

  // ST06-008 - [On Play] Give up to 1 of your opponent's Characters -4 cost during this turn.
  { cardNumber: 'ST06-008', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -4 }] } },

  // ST06-010 - [On Play] Give up to 1 of your opponent's Characters -3 cost during this turn.
  { cardNumber: 'ST06-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -3 }] } },

  // ST06-012 - [Activate: Main] may trash 1 and rest this Character: K.O. cost <=4.
  {
    cardNumber: 'ST06-012',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'restSelf', ifPrevious: 'previousMovedAny' },
        { fn: 'koOpponentCharacter', filter: { maxCost: 4 }, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST06-014 - [Counter] +4000 then K.O. active cost <=3. [Trigger] K.O. cost <=4.
  {
    cardNumber: 'ST06-014',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'addPowerController', amount: 4000, duration: 'duringThisBattle' },
            { fn: 'koOpponentCharacter', filter: { maxCost: 3, rested: false } },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 4 } }] } },
    ],
  },

  // ST06-015 - [Main] draw 1, then cost -2. [Trigger] opponent chooses 1 card from hand and trashes it.
  {
    cardNumber: 'ST06-015',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 1 }, { fn: 'modifyCostOpponent', amount: -2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
    ],
  },

  // ST06-016 - [Counter] +2000. [Trigger] draw 1; current own Characters cannot be K.O.'d this turn.
  {
    cardNumber: 'ST06-016',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPowerController', amount: 2000, duration: 'duringThisBattle' }] } },
      {
        templateId: 'ability',
        params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'koImmunityControllerCharactersAll', scope: 'any', duration: 'duringThisTurn' }] },
      },
    ],
  },

  // ST06-017 - [On Play] cost -1. [Activate: Main] rest this Stage + Navy Leader gate: cost -1.
  {
    cardNumber: 'ST06-017',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'modifyCostOpponent', amount: -1 }] } },
    ],
  },
];
