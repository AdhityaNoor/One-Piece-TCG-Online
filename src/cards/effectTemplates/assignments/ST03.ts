/**
 * Reviewed effect template assignments — Starter Deck ST03 (The Seven Warlords).
 */
import type { CardEffectAssignment } from '../assembler';

export const ST03_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST03-001 — [Activate: Main] [Once Per Turn] DON!! -4: return up to 1 cost <=5 Character to hand.
  {
    cardNumber: 'ST03-001',
    templateId: 'ability',
    params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 4 }], functions: [{ fn: 'returnToHand', maxCost: 5, target: 'any' }] },
  },

  // ST03-003 — [Blocker] is static card data. [DON!! x1] [On Block] bottom-deck cost <=2 Character.
  { cardNumber: 'ST03-003', templateId: 'ability', params: { timing: 'onBlock', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveToBottomDeck', maxCost: 2, target: 'any' }] } },

  // ST03-004 — [On Play] Add Warlords/Thriller Bark Character cost <=4 other than self from trash to hand.
  {
    cardNumber: 'ST03-004',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        {
          fn: 'moveFromTrashToHand',
          filter: {
            category: 'character',
            maxCost: 4,
            excludeSelfName: true,
            anyOf: [{ typeIncludes: 'The Seven Warlords of the Sea' }, { typeIncludes: 'Thriller Bark Pirates' }],
          },
        },
      ],
    },
  },

  // ST03-005 — [DON!! x1] [When Attacking] Draw 2 cards and trash 2 cards from your hand.
  {
    cardNumber: 'ST03-005',
    templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] },
  },

  // ST03-007 — [DON!! x1] [Activate: Main] [Once Per Turn] rest 2 DON!!: play cost <=4 [Pacifista] from deck, then shuffle.
  {
    cardNumber: 'ST03-007',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      condition: { donAttachedAtLeast: 1 },
      oncePerTurn: true,
      cost: [{ kind: 'restDon', count: 2 }],
      functions: [{ fn: 'playFromDeck', filter: { category: 'character', name: 'Pacifista', maxCost: 4 } }],
    },
  },

  // ST03-009 — [On Play] Return up to 1 Character with a cost of 7 or less to the owner's hand.
  { cardNumber: 'ST03-009', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'returnToHand', maxCost: 7, target: 'any' }] } },

  // ST03-010 — [On Play] look top 3, return them top or bottom in any order. [Trigger] Play this card.
  {
    cardNumber: 'ST03-010',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 0, reveal: false, destination: 'deckTopOrBottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // ST03-013 — [Blocker] is static card data. [Trigger] Play this card.
  { cardNumber: 'ST03-013', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // ST03-014 — [On Play] Return up to 1 Character with a cost of 3 or less to the owner's hand.
  { cardNumber: 'ST03-014', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'returnToHand', maxCost: 3, target: 'any' }] } },

  // ST03-015 — [Main] return cost <=7 Character to hand. [Trigger] activates the same Main effect.
  {
    cardNumber: 'ST03-015',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'returnToHand', maxCost: 7, target: 'any' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'returnToHand', maxCost: 7, target: 'any' }] } },
    ],
  },

  // ST03-016 — [Counter] return cost <=3 Character to hand. [Trigger] activates the same Counter effect.
  {
    cardNumber: 'ST03-016',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'returnToHand', maxCost: 3, target: 'any' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'returnToHand', maxCost: 3, target: 'any' }] } },
    ],
  },

  // ST03-017 — [Counter] +4000, then draw 1 if hand has 3 or fewer cards.
  {
    cardNumber: 'ST03-017',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPowerController', amount: 4000, duration: 'duringThisBattle' }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfHand', atMost: 3 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
];
