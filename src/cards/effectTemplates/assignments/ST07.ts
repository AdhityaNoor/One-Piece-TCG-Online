/**
 * Reviewed effect template assignments - Starter Deck ST07 (Big Mom Pirates / yellow).
 *
 * Set-first coverage analysis:
 *   Supported now:
 *     - [Trigger] Play this card.
 *     - [Activate: Main] rest-self, grant Banish/Double Attack to Charlotte Linlin cards.
 *     - Yellow Life peek: look at top Life from either player, place top/bottom.
 *     - [DON!! xN] [When Attacking] optional top/bottom Life to hand, then self Banish/power or deck-top-to-Life.
 *     - Counter/Trigger compositions using Life peek + battle power/draw.
 *     - Rested Character/Stage activation with mandatory Life payment into K.O. or own Character-to-Life face-up.
 *     - Opponent chooses one modal branch (trash opponent Life or add controller deck top to Life).
 *     - Conditional mid-sequence Life gates checked after payment.
 *
 *   Still needs reusable yellow primitives:
 *     - Trigger play-self for Stage/Event cards (current triggerPlaySelf handles Characters).
 */
import type { CardEffectAssignment } from '../assembler';

export const ST07_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST07-001 - [DON!! x2] When Attacking, may take Life: if now at <=2 Life, add up to 1 hand card to Life.
  {
    cardNumber: 'ST07-001',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 2 },
      functions: [
        { fn: 'moveLifeToHand', from: 'topOrBottom', optional: true },
        { fn: 'moveHandToLife', position: 'top', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
      ],
    },
  },

  // ST07-003 - On Play Life peek, then Rush if controller has less Life.
  {
    cardNumber: 'ST07-003',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' },
        { fn: 'addKeywordSelf', keyword: 'rush', duration: 'duringThisTurn', condition: { gate: [{ kind: 'selfLifeLessThanOpponent' }] } },
      ],
    },
  },

  // ST07-004 - [DON!! x1] [When Attacking] may take top/bottom Life: Banish and +1000 this battle.
  {
    cardNumber: 'ST07-004',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      functions: [
        { fn: 'moveLifeToHand', from: 'topOrBottom', optional: true },
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
        { fn: 'moveLifeToHand', from: 'topOrBottom', optional: true },
        { fn: 'moveDeckTopToLife', position: 'top', optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST07-007 - [Blocker] is static card data. [Trigger] Play this card.
  { cardNumber: 'ST07-007', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // ST07-008 - On Play Life peek.
  { cardNumber: 'ST07-008', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },

  // ST07-009 - rest self + mandatory Life payment: K.O. cost <=3. Trigger is deferred until source-safe trigger costs exist.
  {
    cardNumber: 'ST07-009',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      gate: [{ kind: 'selfLife', atLeast: 1 }],
      functions: [
        { fn: 'moveLifeToHand', from: 'topOrBottom', optional: false },
        { fn: 'koOpponentCharacter', filter: { maxCost: 3 }, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST07-010 - Opponent chooses whether to lose their Life or give you a Life from deck top.
  {
    cardNumber: 'ST07-010',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        {
          fn: 'chooseOne',
          chooser: 'opponent',
          prompt: 'Choose one effect to resolve.',
          options: [
            { label: 'Trash 1 card from the top of your Life cards.', functions: [{ fn: 'trashOpponentLife', count: 1 }] },
            { label: "Add 1 card from the top of your opponent's deck to the top of their Life cards.", functions: [{ fn: 'moveDeckTopToLife', position: 'top', optional: false }] },
          ],
        },
      ],
    },
  },

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

  // ST07-015 - Main and Trigger both resolve the same opponent-choice modal effect.
  {
    cardNumber: 'ST07-015',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            {
              fn: 'chooseOne',
              chooser: 'opponent',
              prompt: 'Choose one effect to resolve.',
              options: [
                { label: 'Trash 1 card from the top of your Life cards.', functions: [{ fn: 'trashOpponentLife', count: 1 }] },
                { label: "Add 1 card from the top of your opponent's deck to the top of their Life cards.", functions: [{ fn: 'moveDeckTopToLife', position: 'top', optional: false }] },
              ],
            },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [
            {
              fn: 'chooseOne',
              chooser: 'opponent',
              prompt: 'Choose one effect to resolve.',
              options: [
                { label: 'Trash 1 card from the top of your Life cards.', functions: [{ fn: 'trashOpponentLife', count: 1 }] },
                { label: "Add 1 card from the top of your opponent's deck to the top of their Life cards.", functions: [{ fn: 'moveDeckTopToLife', position: 'top', optional: false }] },
              ],
            },
          ],
        },
      },
    ],
  },

  // ST07-016 - Counter Life peek, then +2000; Trigger draw 1 and Life peek.
  {
    cardNumber: 'ST07-016',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' },
            { fn: 'addPowerController', amount: 2000, duration: 'duringThisBattle' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [
            { fn: 'draw', amount: 1 },
            { fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' },
          ],
        },
      },
    ],
  },

  // ST07-017 - rest Stage + mandatory Life payment: put up to 1 own cost-3 Character on top of Life face-up.
  {
    cardNumber: 'ST07-017',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restThis' }],
          gate: [{ kind: 'selfLife', atLeast: 1 }],
          functions: [
            { fn: 'moveLifeToHand', from: 'topOrBottom', optional: false },
            { fn: 'moveControllerCharacterToLifeTopFaceUp', filter: { exactCost: 3 }, maxTargets: 1, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
];
