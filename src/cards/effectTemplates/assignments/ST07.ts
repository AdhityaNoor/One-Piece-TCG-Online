/**
 * Reviewed effect template assignments - Starter Deck ST07 (Big Mom Pirates / yellow).
 *
 * Set-first coverage analysis:
 *   Supported now:
 *     - [Trigger] Play this card.
 *     - [Activate: Main] rest-self, grant Banish/Double Attack to Charlotte Linlin cards.
 *     - [DON!! xN] [When Attacking] optional top/bottom Life to hand, then self Banish/power or deck-top-to-Life.
 *
 *   Still needs reusable yellow primitives:
 *     - Look at top Life from either player and return it top/bottom.
 *     - Opponent chooses one modal branch.
 *     - Conditional mid-sequence board gates for "if you have 2 or less Life" after paying Life.
 *     - Move own Character to owner's Life face-up as an activation effect.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST07_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST07-004 - [DON!! x1] [When Attacking] may take top/bottom Life: Banish and +1000 this battle.
  {
    cardNumber: 'ST07-004',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      functions: [
        { fn: 'optionalTakeLifeTopOrBottomToHand' },
        { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
        { fn: 'addKeywordSelf', keyword: 'banish', duration: 'duringThisBattle', ifPrevious: 'previousSelectedAny' },
      ],
    },
  },

  // ST07-005 - [DON!! x1] [When Attacking] may take top/bottom Life: add top deck to top Life.
  {
    cardNumber: 'ST07-005',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      functions: [
        { fn: 'optionalTakeLifeTopOrBottomToHand' },
        { fn: 'optionalAddDeckTopToLifeTop', ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST07-007 - [Blocker] is static card data. [Trigger] Play this card.
  { cardNumber: 'ST07-007', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // ST07-011 - rest self: up to 1 of your Charlotte Linlin cards gains Banish. [Trigger] Play this card.
  {
    cardNumber: 'ST07-011',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restThis' }],
          functions: [{ fn: 'addKeywordControllerLeaderOrCharacter', keyword: 'banish', duration: 'duringThisTurn', filter: { name: 'Charlotte Linlin' } }],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // ST07-013 - rest self: up to 1 of your Charlotte Linlin cards gains Double Attack. [Trigger] Play this card.
  {
    cardNumber: 'ST07-013',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restThis' }],
          functions: [{ fn: 'addKeywordControllerLeaderOrCharacter', keyword: 'doubleAttack', duration: 'duringThisTurn', filter: { name: 'Charlotte Linlin' } }],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
];
