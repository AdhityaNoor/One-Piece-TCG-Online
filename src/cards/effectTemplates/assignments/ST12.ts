/**
 * Reviewed effect template assignments — Starter Deck ST12 (Zoro & Sanji, green/blue).
 *
 * A control-heavy deck with character tutoring and conditional activation.
 * Key patterns:
 * - moveCards + setActive
 * - playFromHand with cost/type filters
 * - chooseOne for conditional targeting (rest vs ko)
 * - Multiple timings on same card (onPlay + whenAttacking)
 * - searchTopDeck with reveal + order
 *
 * Cards with no effects: ST12-004, ST12-005, ST12-009, ST12-015
 */
import type { CardEffectAssignment } from '../assembler';

export const ST12_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST12-001 (leader) Roronoa Zoro & Sanji — [DON!! x1] [When Attacking] [Once Per Turn] You may return 1 of your
  //   Characters with a cost of 2 or more to the owner's hand: Set up to 1 of your Characters with 7000 power or less as active.
  // Note: Filter limitations - moveCards doesn't support minCost filter, setActiveControllerCharacter doesn't support power filter.
  // Player will select eligible character (cost ≥2 and power ≤7000 handled by UI/player choice).
  {
    cardNumber: 'ST12-001',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      oncePerTurn: true,
      functions: [
        {
          fn: 'moveCards',
          from: { zone: 'characters', player: 'controller' },
          to: { zone: 'hand', player: 'owner' },
          optional: true,
          maxTargets: 1,
        },
        {
          fn: 'setActiveControllerCharacter',
          maxTargets: 1,
        },
      ],
    },
  },

  // ST12-002 (character) Kuina — [Activate: Main] You may rest this Character:
  //   Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  //   [Trigger] Play this card.
  {
    cardNumber: 'ST12-002',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restThis' }],
          functions: [
            {
              fn: 'rest',
              target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } },
              optional: true,
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
              fn: 'triggerPlaySelf',
            },
          ],
        },
      },
    ],
  },

  // ST12-003 (character) Dracule Mihawk — [On Play] If you have 2 or less Characters, play up to 1
  //   {Muggy Kingdom} type or <Slash> attribute Character card with a cost of 4 or less other than [Dracule Mihawk] from your hand rested.
  // Note: "rested" placement is implicit in playFromHand or needs special handling. For now, we express it with a filter and gate.
  {
    cardNumber: 'ST12-003',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'selfCharacterCount', atMost: 2 }],
      functions: [
        {
          fn: 'playFromHand',
          filter: { maxCost: 4, typeIncludes: 'Muggy Kingdom', excludeSelfName: true },
          maxTargets: 1,
        },
      ],
    },
  },

  // ST12-004 (character) Humandrill — (no effect)
  // ST12-005 (character) Perona — (no effect)

  // ST12-006 (character) Yosaku & Johnny — [DON!! x1] [When Attacking] Choose one:
  //   • Rest up to 1 of your opponent's Characters with a cost of 2 or less.
  //   • K.O. up to 1 of your opponent's rested Characters with a cost of 2 or less.
  {
    cardNumber: 'ST12-006',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'rest', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] },
          { label: 'ko', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 2 } }, optional: true }] },
        ],
      }],
    },
  },

  // ST12-007 (character) Rika — [On Play] ➁ (You may rest the specified number of DON!! cards in your cost area.):
  //   If your opponent has 3 or more Life cards, set up to 1 of your <Slash> attribute Characters with a cost of 4 or less as active.
  // Note: <Slash> attribute filtering would require custom selector. Using typeIncludes as proxy where possible.
  // For now, we skip attribute filtering and just filter by cost.
  {
    cardNumber: 'ST12-007',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      cost: [{ kind: 'restDon', count: 2 }],
      gate: [{ kind: 'opponentLife', atLeast: 3 }],
      functions: [
        {
          fn: 'setActiveControllerCharacter',
          filter: { maxCost: 4 },
          maxTargets: 1,
        },
      ],
    },
  },

  // ST12-008 (character) Roronoa Zoro — [DON!! x1] [When Attacking]
  //   Rest up to 1 of your opponent's Characters with a cost of 6 or less.
  {
    cardNumber: 'ST12-008',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      functions: [
        {
          fn: 'rest',
          target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } },
          optional: true,
        },
      ],
    },
  },

  // ST12-009 (character) Elephant True Bluefin — (no effect)

  // ST12-010 (character) Emporio Ivankov — [On Play] Reveal 1 card from the top of your deck and play up to 1 Character
  //   card with a cost of 2. Then, place the rest at the top or bottom of your deck.
  //   [When Attacking] [Once Per Turn] Draw 1 card if you have 6 or less cards in your hand.
  {
    cardNumber: 'ST12-010',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            {
              fn: 'searchTopDeck',
              look: 1,
              pick: 1,
              reveal: true,
              destination: 'hand',
              filter: { exactCost: 2, category: 'character' },
              remainder: 'bottom',
            },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          oncePerTurn: true,
          gate: [{ kind: 'selfHand', atMost: 6 }],
          functions: [
            {
              fn: 'draw',
              amount: 1,
            },
          ],
        },
      },
    ],
  },

  // ST12-011 (character) Sanji — [DON!! x1] [When Attacking] If you have 5 or less cards in your hand,
  //   this Character gains +2000 power until the start of your next turn.
  {
    cardNumber: 'ST12-011',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      gate: [{ kind: 'selfHand', atMost: 5 }],
      functions: [
        {
          fn: 'addPowerSelf',
          amount: 2000,
          duration: 'untilStartOfNextTurn',
        },
      ],
    },
  },

  // ST12-012 (character) Charlotte Pudding — [Activate: Main] Return this Character to the owner's hand.
  {
    cardNumber: 'ST12-012',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      functions: [
        {
          fn: 'moveCards',
          from: { zone: 'characters', player: 'controller' },
          to: { zone: 'hand', player: 'owner' },
          optional: true,
        },
      ],
    },
  },

  // ST12-013 (character) Zeff — [On Play] Look at 3 cards from the top of your deck and place them at the top or bottom
  //   of the deck in any order.
  //   [When Attacking] Reveal 1 card from the top of your deck and play up to 1 Character card with a cost of 2 rested.
  //   Then, place the rest at the top or bottom of your deck.
  {
    cardNumber: 'ST12-013',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            {
              fn: 'searchTopDeck',
              look: 3,
              pick: 0,
              reveal: false,
              destination: 'deckTopOrBottom',
            },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          functions: [
            {
              fn: 'searchTopDeck',
              look: 1,
              pick: 1,
              reveal: true,
              destination: 'hand',
              filter: { exactCost: 2, category: 'character' },
              remainder: 'bottom',
            },
          ],
        },
      },
    ],
  },

  // ST12-014 (character) Duval — [Blocker] (card data) + [End of Your Turn] You may trash 1 <Slash> attribute Character
  //   from your hand: Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  // [Blocker] is modeled as card data. For now, we model this without attribute filtering.
  {
    cardNumber: 'ST12-014',
    templateId: 'ability',
    params: {
      timing: 'endOfTurn',
      functions: [
        {
          fn: 'optionalTrashFromHand',
          count: 1,
        },
        {
          fn: 'rest',
          target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } },
          optional: true,
        },
      ],
    },
  },

  // ST12-015 (character) Patty & Carne — (no effect)

  // ST12-016 (event) Lion Strike — [Main]/[Counter] Rest up to 1 of your opponent's Leader or Character cards
  //   with {Muggy Kingdom} type or <Slash> attribute and a cost of 4 or less.
  {
    cardNumber: 'ST12-016',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            {
              fn: 'rest',
              target: {
                group: 'union',
                targets: [
                  { group: 'leaderOrCharacters', player: 'opponent', filter: { maxCost: 4, typeIncludes: 'Muggy Kingdom' } },
                  { group: 'leaderOrCharacters', player: 'opponent', filter: { maxCost: 4, attribute: 'slash' } },
                ],
              },
              optional: true,
            },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            {
              fn: 'rest',
              target: {
                group: 'union',
                targets: [
                  { group: 'leaderOrCharacters', player: 'opponent', filter: { maxCost: 4, typeIncludes: 'Muggy Kingdom' } },
                  { group: 'leaderOrCharacters', player: 'opponent', filter: { maxCost: 4, attribute: 'slash' } },
                ],
              },
              optional: true,
            },
          ],
        },
      },
    ],
  },

  // ST12-017 (event) Plastic Surgery Shot — [Counter] Up to 1 of your Leader or Character cards gains +2000 power
  //   during this battle.
  {
    cardNumber: 'ST12-017',
    templateId: 'ability',
    params: {
      timing: 'counter',
      functions: [
        {
          fn: 'addPower',
          target: { group: 'leaderOrCharacters', player: 'controller' },
          amount: 2000,
          duration: 'duringThisBattle',
          optional: true,
        },
      ],
    },
  },
];
