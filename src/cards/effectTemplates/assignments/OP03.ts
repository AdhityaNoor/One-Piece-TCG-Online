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

  // --- Batch: OP03 cards expressible with existing primitives ---

  // OP03-014 — [When Attacking] Play up to 1 red Character (cost 1) from hand.
  { cardNumber: 'OP03-014', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', exactCost: 1 } }] } },

  // OP03-015 — [Blocker] [Opponent's Turn] When this Character is K.O.'d, give up to 1 opp Leader/Character −2000 this turn.
  { cardNumber: 'OP03-015', templateId: 'ability', params: { timing: 'onKO', condition: { turn: 'opponent' }, functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP03-016 — (Event) [Main] If Leader [Portgas.D.Ace], K.O. up to 1 opp Character (8000 power or less); Leader gains [Double Attack] and +3000 this turn. [Trigger] K.O. up to 1 opp Character (6000 power or less).
  {
    cardNumber: 'OP03-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Portgas.D.Ace' }], functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 8000 } }, optional: true },
        { fn: 'addKeyword', target: { group: 'leader', player: 'controller' }, keyword: 'doubleAttack', duration: 'duringThisTurn' },
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisTurn' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true }] } },
    ],
  },

  // OP03-033 — [Trigger] If Leader {East Blue}, play this card.
  { cardNumber: 'OP03-033', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP03-042 — [On Play] Add up to 1 blue [Usopp] from trash to hand.
  { cardNumber: 'OP03-042', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { color: 'blue', name: 'Usopp' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP03-054 — (Event) [Counter] +2000 battle, then trash 1 from top of deck. [Trigger] draw 1 and trash 1 from top of deck.
  {
    cardNumber: 'OP03-054',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'trashTopDeck', count: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'trashTopDeck', count: 1 }] } },
    ],
  },

  // OP03-055 — (Event) [Counter] trash 1 from hand: Leader +4000 battle, then trash 2 from top of deck. [Trigger] return up to 1 Character cost<=4 to hand.
  {
    cardNumber: 'OP03-055',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
        { fn: 'trashTopDeck', count: 2 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP03-057 — (Event) [Main] Place up to 1 Character cost<=5 at bottom of deck. [Trigger] Place up to 1 Character cost<=3 at bottom of deck.
  {
    cardNumber: 'OP03-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP03-059 — [When Attacking] DON!! −1: this Character gains [Banish] during this battle.
  { cardNumber: 'OP03-059', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'banish', duration: 'duringThisBattle' }] } },

  // OP03-066 — [On Play] rest 2 DON!!: add 1 DON!! from deck active; then if 8+ DON!! on field, K.O. up to 1 opp Character cost<=4.
  { cardNumber: 'OP03-066', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], functions: [
    { fn: 'addDonFromDeck', count: 1, rested: false },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'selfDonFieldCount', atLeast: 8 }] },
  ] } },

  // OP03-068 — [Banish] [On K.O.] If Leader {Impel Down}, add 1 DON!! from deck rested.
  { cardNumber: 'OP03-068', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP03-072 — (Event) [Counter] trash 1 from hand: +3000 battle. [Trigger] add 1 DON!! from deck active.
  {
    cardNumber: 'OP03-072',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP03-074 — (Event) [Main] DON!! −2: place up to 1 opp Character cost<=4 at bottom of deck. [Trigger] Activate [Main].
  {
    cardNumber: 'OP03-074',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP03-095 — (Event) [Main] Give up to 2 opp Characters −2 cost this turn. [Trigger] opponent trashes 1 from hand.
  {
    cardNumber: 'OP03-095',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
    ],
  },

  // OP03-097 — (Event) [Counter] trash 1 from hand: +3000 battle. [Trigger] draw 1, then K.O. up to 1 opp Character cost<=1.
  {
    cardNumber: 'OP03-097',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true },
      ] } },
    ],
  },

  // OP03-099 — (Leader) [DON!! x1] [When Attacking] look at top of your or opponent's Life, place top/bottom; then this Leader +1000 battle.
  { cardNumber: 'OP03-099', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle' },
  ] } },

  // OP03-104 — [Blocker] [On Play] Look at top of your or opponent's Life, place it top or bottom.
  { cardNumber: 'OP03-104', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },

  // OP03-113 — [On K.O.] look 3, reveal up to 1 {Big Mom Pirates}, add to hand, rest to bottom. [Trigger] trash 1 from hand: play this.
  {
    cardNumber: 'OP03-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Big Mom Pirates' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // OP03-118 — (Event) [Counter] +5000 battle. [Trigger] trash 2 from hand: add 1 top of deck to top of Life.
  {
    cardNumber: 'OP03-118',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 5000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
      ] } },
    ],
  },


  // OP03-122 — [On Play] Return up to 1 Character cost<=6 to hand; then draw 2 and trash 2 from hand.
  { cardNumber: 'OP03-122', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'drawAndTrash', drawCount: 2, trashCount: 2 },
  ] } },

  // OP03-022 — (Leader) [DON!! x2] [When Attacking] rest 1 DON!!: play up to 1 Character cost<=4 with a [Trigger] from hand.
  { cardNumber: 'OP03-022', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 4, hasTrigger: true } }] } },

  // OP03-027 — [On Play] If Leader {East Blue}, rest up to 1 opp Character cost<=2; and if you don't have [Buchi], play up to 1 [Buchi] from hand.
  { cardNumber: 'OP03-027', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true },
    { fn: 'playFromHand', filter: { category: 'character', name: 'Buchi' }, ifGate: [{ kind: 'selfDoesNotControlNamed', name: 'Buchi' }] },
  ] } },

  // OP03-119 — (Event) [Main] If less Life than opponent, K.O. up to 1 opp Character cost<=4. [Trigger] play up to 1 Character cost<=4 with a [Trigger] from hand.
  {
    cardNumber: 'OP03-119',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfLifeLessThanOpponent' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 4, hasTrigger: true } }] } },
    ],
  },


  // OP03-105 — [DON!! x1] [When Attacking] you may trash 1 card with a [Trigger] from hand: this Character +3000 battle.
  { cardNumber: 'OP03-105', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
    { fn: 'addPowerSelf', amount: 3000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP03-115 — [On Play] you may trash 1 card with a [Trigger] from hand: K.O. up to 1 opp Character cost<=1.
  { cardNumber: 'OP03-115', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },


  // OP03-123 — [On Play] Add up to 1 Character cost<=8 to the top or bottom of owner's Life face-up.
  { cardNumber: 'OP03-123', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 8 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },

];
