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

const OPPONENT_TRASH_LIFE_OR_ADD_DECK_TOP_TO_LIFE = {
  fn: 'chooseOne' as const,
  chooser: 'opponent' as const,
  prompt: 'Choose one effect to resolve.',
  options: [
    {
      label: 'trashOpponentLifeTop',
      functions: [{ fn: 'moveCards' as const, from: { zone: 'life' as const, player: 'opponent' as const, position: 'top' as const, count: 1 }, to: { zone: 'trash' as const, player: 'owner' as const } }],
    },
    {
      label: 'moveControllerDeckTopToLifeTop',
      functions: [{ fn: 'moveCards' as const, from: { zone: 'deck' as const, player: 'controller' as const, position: 'top' as const }, to: { zone: 'life' as const, player: 'controller' as const, position: 'top' as const } }],
    },
  ],
};

export const ST07_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST07-001 - [DON!! x2] When Attacking, may take Life: if now at <=2 Life, add up to 1 hand card to Life.
  {
    cardNumber: 'ST07-001',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 2 },
      functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'life', player: 'owner', position: 'top' }, optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
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
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', condition: { gate: [{ kind: 'selfLifeLessThanOpponent' }] } },
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
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'banish', duration: 'duringThisBattle', ifPrevious: 'previousSelectedAny' },
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
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST07-007 - [Blocker] is static card data. [Trigger] Play this card.
  { cardNumber: 'ST07-007', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // ST07-008 - On Play Life peek.
  { cardNumber: 'ST07-008', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },

  // ST07-009 - rest self + Life→hand: K.O. cost <=3. [Trigger] trash 1 from hand: play this.
  {
    cardNumber: 'ST07-009',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restThis' }],
          gate: [{ kind: 'selfLife', atLeast: 1 }],
          functions: [
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' } },
            { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // ST07-010 - Opponent chooses whether to lose their Life or give you a Life from deck top.
  {
    cardNumber: 'ST07-010',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        OPPONENT_TRASH_LIFE_OR_ADD_DECK_TOP_TO_LIFE,
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
          functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Charlotte Linlin' } }, keyword: 'banish', duration: 'duringThisTurn', optional: true }],
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
          functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Charlotte Linlin' } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true }],
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
            OPPONENT_TRASH_LIFE_OR_ADD_DECK_TOP_TO_LIFE,
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [
            OPPONENT_TRASH_LIFE_OR_ADD_DECK_TOP_TO_LIFE,
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
            { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
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
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' } },
            { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { exactCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'top', faceUp: true }, optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
];
