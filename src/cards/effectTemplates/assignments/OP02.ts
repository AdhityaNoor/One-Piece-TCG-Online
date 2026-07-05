/**
 * Reviewed effect template assignments - Main Booster OP02.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP02_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP02-011 — [On Play] K.O. up to 1 of your opponent's Characters with 3000 power or less.
  // OP02-005 - [On Play] Look at up to 5; add red cost-1 Character.
  {
    cardNumber: 'OP02-005',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', color: 'red', exactCost: 1 } }] },
  },
  { cardNumber: 'OP02-011', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
  // OP02-016 - [On Play] Give red cost-1 Character +3000 power.
  { cardNumber: 'OP02-016', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { color: 'red', exactCost: 1 } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },
  // OP02-017 - [DON!! x2] [When Attacking] K.O. opponent Character with 2000 power or less.
  { cardNumber: 'OP02-017', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
  // OP02-022 - [Main] Search Whitebeard Pirates Character. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP02-022',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates' } }] } },
    ],
  },
  // OP02-034 - [DON!! x1] [When Attacking] Rest opponent Character with cost 2 or less.
  { cardNumber: 'OP02-034', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
  // OP02-047 - [Main] Rest cost <=4. [Trigger] K.O. rested cost <=3.
  {
    cardNumber: 'OP02-047',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
    ],
  },
  // OP02-096 - [On Play] Draw 1. [When Attacking] Give opponent Character -4 cost this turn.
  {
    cardNumber: 'OP02-096',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, optional: true }] } },
    ],
  },
  // OP02-058 - [On Play] Look at 5; add blue Impel Down card other than this card's name.
  {
    cardNumber: 'OP02-058',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'blue', typeIncludes: 'Impel Down', excludeSelfName: true } }] },
  },
  // OP02-083 - [On Play] Look at 5; add purple Impel Down card other than this card's name.
  {
    cardNumber: 'OP02-083',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'purple', typeIncludes: 'Impel Down', excludeSelfName: true } }] },
  },
  // OP02-086 - [On K.O.] If Leader has Impel Down, add 1 DON!! rested.
  // OP02-072 - [When Attacking] DON!! -4: K.O. cost <=3, then this Leader +1000.
  { cardNumber: 'OP02-072', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 4 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }, { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' }] } },
  // OP02-076 - [On Play] DON!! -1: K.O. cost <=1.
  { cardNumber: 'OP02-076', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  // OP02-079 - [On Play] DON!! -1: Rest cost <=4.
  { cardNumber: 'OP02-079', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  { cardNumber: 'OP02-086', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP02-087 - [On K.O.] If Leader has Impel Down, add 1 DON!! rested.
  { cardNumber: 'OP02-087', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP02-103 - [DON!! x1] [When Attacking] Give opponent Character -2 cost.
  { cardNumber: 'OP02-103', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true }] } },
  // OP02-105 - [DON!! x1] [When Attacking] Give opponent Character -3 cost.
  { cardNumber: 'OP02-105', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, optional: true }] } },
  // OP02-106 - [On Play] Give opponent Character -2 cost.
  { cardNumber: 'OP02-106', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true }] } },
  // OP02-112 - [Activate: Main] Rest this: give opponent Character -1 cost, then your Leader/Character +1000.
  { cardNumber: 'OP02-112', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
  // OP02-115 - [DON!! x2] [When Attacking] K.O. opponent Character with cost 0.
  { cardNumber: 'OP02-115', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true }] } },
  // OP02-067 - [Main] Return cost 4 or less Character to hand. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP02-067',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  // OP02-117 - [Main] Give opponent Character -5 cost. [Trigger] K.O. cost 3 or less.
  {
    cardNumber: 'OP02-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -5, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },
  // OP02-119 - [Main] K.O. cost 1 or less. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'OP02-119',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
  // OP02 coverage batch: trigger-play plus sequenced cost-modifier payoff.
  { cardNumber: 'OP02-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
  {
    cardNumber: 'OP02-113',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          functions: [
            { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true },
            { fn: 'addPowerSelf', amount: 2000, duration: 'duringThisBattle', ifGate: [{ kind: 'anyCharacterExactCost', exactCost: 0 }] },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
];
