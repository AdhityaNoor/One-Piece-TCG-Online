/**
 * Reviewed effect template assignments — Starter Deck ST11 (Uta, green/special).
 *
 * A FILM-focused deck. Most cards parameterize existing search and activation templates.
 * ST11-002 requires [Blocker] as card data + conditional setActive.
 *
 * Key patterns:
 * - searchTopDeck with FILM type filter
 * - chooseOne for conditional targeting (rest vs ko)
 * - setActive with type filters
 */
import type { CardEffectAssignment } from '../assembler';

export const ST11_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST11-001 (leader) Uta — [DON!! x1] [When Attacking] [Once Per Turn] Reveal 1 card from the top of your deck
  //   and add up to 1 {FILM} type card to your hand. Then, place the rest at the bottom of your deck.
  {
    cardNumber: 'ST11-001',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      oncePerTurn: true,
      functions: [
        {
          fn: 'searchTopDeck',
          look: 1,
          pick: 1,
          reveal: true,
          destination: 'hand',
          filter: { typeIncludes: 'FILM' },
          remainder: 'bottom',
        },
      ],
    },
  },

  // ST11-002 (character) Uta — [Blocker] (card data) + [End of Your Turn] You may trash 1 Event from your hand:
  //   Set up to 1 of your {FILM} type Characters as active.
  // [Blocker] is modeled as card data (hasBlocker flag in definition).
  {
    cardNumber: 'ST11-002',
    templateId: 'ability',
    params: {
      timing: 'endOfTurn',
      functions: [
        {
          fn: 'optionalTrashFromHand',
          count: 1,
        },
        {
          fn: 'setActiveControllerCharacter',
          filter: { typeIncludes: 'FILM' },
          maxTargets: 1,
        },
      ],
    },
  },

  // ST11-003 (event) Backlight — [Main] If your Leader is [Uta], choose one:
  //   • Rest up to 1 of your opponent's Characters with a cost of 5 or less.
  //   • K.O. up to 1 of your opponent's rested Characters with a cost of 5 or less.
  // NOTE: This effect requires chooseOne with suspending operations (rest/ko),
  // which is not yet supported by the engine. Skipped pending engine enhancement.
  // {
  //   cardNumber: 'ST11-003',
  //   templateId: 'ability',
  //   params: { ... }
  // },

  // ST11-004 (event) New Genesis — [Main] If your Leader is [Uta], look at 3 cards from the top of your deck;
  //   reveal up to 1 {FILM} type card other than [New Genesis] and add it to your hand. Then, place the rest
  //   at the bottom of your deck and set up to 1 of your DON!! cards as active.
  {
    cardNumber: 'ST11-004',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      gate: [{ kind: 'leaderName', name: 'Uta' }],
      functions: [
        {
          fn: 'searchTopDeck',
          look: 3,
          pick: 1,
          reveal: true,
          destination: 'hand',
          filter: { typeIncludes: 'FILM', excludeSelfName: true },
          remainder: 'bottom',
        },
        {
          fn: 'setActiveControllerDon',
          maxTargets: 1,
        },
      ],
    },
  },

  // ST11-005 (event) I'm invincible — [Main] Set up to 1 of your [Uta] Leader as active.
  //   [Trigger] Up to 1 of your Leader or Character cards gains +1000 power during this turn.
  {
    cardNumber: 'ST11-005',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            {
              fn: 'setActiveSelf',
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
              fn: 'addPower',
              target: { group: 'leaderOrCharacters', player: 'controller' },
              amount: 1000,
              duration: 'duringThisTurn',
              optional: true,
            },
          ],
        },
      },
    ],
  },
];
