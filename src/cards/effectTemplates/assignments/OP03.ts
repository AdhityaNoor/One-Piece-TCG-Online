/**
 * Reviewed effect template assignments - Main Booster OP03.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP03_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP03-011 — [DON!! x1] [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  // OP03-003 - [On Play] Look at 5; add Whitebeard Pirates card other than this card's name.
  {
    cardNumber: 'OP03-003',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Whitebeard Pirates', excludeSelfName: true } }] },
  },

  // OP03-009 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP03-009', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  { cardNumber: 'OP03-011', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP03-017 - [Main]/[Counter] If Leader has Whitebeard Pirates, give opponent Character -4000. [Trigger] activates Main.
  {
    cardNumber: 'OP03-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP03-019 - [Main] Leader +4000. [Trigger] opponent Leader/Character -10000.
  {
    cardNumber: 'OP03-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -10000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP03-024 - [On Play] If Leader has East Blue, rest up to 2 opponent Characters cost 4 or less.
  { cardNumber: 'OP03-024', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, maxTargets: 2 }] } },
  // OP03-034 - [On Play] K.O. opponent rested Character with cost 2 or less.
  { cardNumber: 'OP03-034', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 2 } }, optional: true }] } },

  // OP03-062 — [On Play] Look at 5; add up to 1 Water Seven type (excl. same name).
  {
    cardNumber: 'OP03-062',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Water Seven', excludeSelfName: true } }] },
  },
  // OP03-044 - [On Play] Draw 2 cards, then trash 2 cards from hand.
  { cardNumber: 'OP03-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
  // OP03-038 - [Main] Rest up to 2 opponent Characters cost 2 or less. [Trigger] rest cost 5 or less.
  {
    cardNumber: 'OP03-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },
  // OP03-039 - [Main] Rest cost 1 or less, then your Character +1000. [Trigger] rest cost 4 or less.
  {
    cardNumber: 'OP03-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }, { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP03-048 - [On Play] If Leader is Nami, return opponent Character cost 5 or less.
  { cardNumber: 'OP03-048', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Nami' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP03-056 - [Main] Draw 2 cards. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP03-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },
  // OP03-060 - [When Attacking] DON!! -1: draw 2, then trash 1.
  { cardNumber: 'OP03-060', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
  // OP03-063 - [Blocker] [On Play] DON!! -1: if Leader has Water Seven, draw 1.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw is templated.
  { cardNumber: 'OP03-063', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'draw', amount: 1 }] } },
  // OP03-064 - [On K.O.] If Leader has Galley-La Company, add 1 DON!! rested.
  { cardNumber: 'OP03-064', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Galley-La Company' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP03-067 - [DON!! x1] [When Attacking] If Leader has Galley-La Company, add 1 DON!! rested.
  { cardNumber: 'OP03-067', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderType', type: 'Galley-La Company' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP03-069 - [On K.O.] If Leader has Impel Down, draw 2 then trash 1.
  { cardNumber: 'OP03-069', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
  // OP03-071 - [When Attacking] DON!! -1: rest opponent Character cost 5 or less.
  { cardNumber: 'OP03-071', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  // OP03-073 - [Main] DON!! -1: if Leader has Water Seven, K.O. cost 2 or less. [Trigger] activates Main.
  {
    cardNumber: 'OP03-073',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
    ],
  },
  // OP03-075 - [Activate: Main] Rest this Stage: if Leader is Iceburg, add 1 DON!! rested.
  { cardNumber: 'OP03-075', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderName', name: 'Iceburg' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP03-081 - [On Play] Draw 2, trash 2, then give opponent Character -2 cost.
  { cardNumber: 'OP03-081', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true }] } },
  // OP03-112 - [On Play] Look at 4; add [Sanji] or Big Mom Pirates other than this card's name.
  {
    cardNumber: 'OP03-112',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Sanji' }, { typeIncludes: 'Big Mom Pirates' }], excludeSelfName: true } }] },
  },
  // OP03-086 - [On Play] If Leader type includes CP, look at 3; add CP card other than this card's name, trash rest.
  {
    cardNumber: 'OP03-086',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'CP' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'CP', excludeSelfName: true }, remainder: 'trash' }] },
  },
  // OP03-089 - [On Play] Look at 3; add Navy other than this card's name, trash rest.
  {
    cardNumber: 'OP03-089',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'trash' }] },
  },
  // OP03 coverage batch: East Blue trigger-play characters and Big Mom trigger-play support.
  {
    cardNumber: 'OP03-026',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  {
    cardNumber: 'OP03-029',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  {
    cardNumber: 'OP03-030',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'green', typeIncludes: 'East Blue', excludeSelfName: true } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  {
    cardNumber: 'OP03-116',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  {
    cardNumber: 'OP03-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Charlotte Linlin' } }, amount: 1000, duration: 'untilStartOfNextTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
];
