/**
 * Reviewed effect template assignments - Main Booster OP16.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP16_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (OP16 expressible). "reveal 8000-power Char from hand" cost, "base power becomes same as..." swaps, named-present gates, and opp-Life-to-opponent's-hand are deferred. ──
  { cardNumber: 'OP16-006', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
  { cardNumber: 'OP16-013', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 8000 } }, optional: true }] } },
  {
    cardNumber: 'OP16-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', exactPower: 8000 }, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'duringThisTurn' }] } },
    ],
  },
  // OP16-021 (stage) — [On Play] If Leader {Whitebeard Pirates}, Look 3, add up to 1, rest to bottom. PARTIAL: trash-self give-DON activate deferred.
  { cardNumber: 'OP16-021', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: false, destination: 'hand', remainder: 'bottom' }] } },
  { cardNumber: 'OP16-026', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Impel Down' }, remainder: 'bottom' }, { fn: 'playFromHand', filter: { category: 'character', maxCost: 2 } }] } },
  { cardNumber: 'OP16-027', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },
  { cardNumber: 'OP16-031', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Prisoner of Impel Down' } }] } },
  { cardNumber: 'OP16-035', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }, { fn: 'optionalTrashFromHand', count: 1 }, { fn: 'giveDon', count: 3, ifPrevious: 'previousMovedAny' }] } },
  // OP16-036 — [On Play] Rest up to 1 opp Character cost ≤4. PARTIAL: base-power-swap [When Attacking] deferred.
  { cardNumber: 'OP16-036', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  { cardNumber: 'OP16-037', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  // OP16-038/040 — [Counter] Leader +3000. PARTIAL: named-count/preventRefresh [Main] clauses deferred.
  { cardNumber: 'OP16-038', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  { cardNumber: 'OP16-040', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  // OP16-048 — [On Play] If Leader {Impel Down}, draw 1, play [Prisoner of Impel Down] from hand. PARTIAL: opp-attack Blocker grant deferred.
  { cardNumber: 'OP16-048', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', name: 'Prisoner of Impel Down' } }] } },
  { cardNumber: 'OP16-049', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'draw', amount: 1 }] } },
  { cardNumber: 'OP16-051', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] } },
  { cardNumber: 'OP16-053', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfHand', atMost: 6 }], functions: [{ fn: 'draw', amount: 1 }] } },
  {
    cardNumber: 'OP16-054',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [{ kind: 'selfHand', atLeast: 5 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP16-055 — [On Play] Draw 1. PARTIAL: base-power-swap [When Attacking] deferred.
  { cardNumber: 'OP16-055', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
  // OP16-057 — [Trigger] Draw 2, trash 1. PARTIAL: the [Prisoner]-count [Counter] buff is deferred.
  { cardNumber: 'OP16-057', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
  { cardNumber: 'OP16-059', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  // OP16-063 — [On Play] Add up to 2 DON!! (rested). PARTIAL: DON!! −1 disable-opp-Blocker activate deferred.
  { cardNumber: 'OP16-063', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 2, rested: true }] } },
  { cardNumber: 'OP16-066', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'addDonFromDeck', count: 2, rested: true }, { fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
  {
    cardNumber: 'OP16-068',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'duringThisTurn' }] } },
    ],
  },
  {
    cardNumber: 'OP16-071',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addDonFromDeck', count: 1, rested: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
    ],
  },
  // OP16-076 — [Main] rest 3 DON!!: up to 3 {Admiral} Characters +2000 this turn. PARTIAL: [Counter] typed-present buff deferred.
  { cardNumber: 'OP16-076', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 3 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Admiral' } }, amount: 2000, duration: 'duringThisTurn', optional: true, maxTargets: 3 }] } },
  { cardNumber: 'OP16-077', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' }, remainder: 'bottom' }, { fn: 'trashFromHand', count: 1 }] } },
  { cardNumber: 'OP16-081', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  {
    cardNumber: 'OP16-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 3, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Land of Wano' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Land of Wano' }, remainder: 'trash' }] } },
    ],
  },
  // OP16-085 — [Blocker][On Play] Play {Land of Wano} cost ≤6 from trash (exclude-[Momonosuke] dropped).
  { cardNumber: 'OP16-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Land of Wano', maxCost: 6 } }] } },
  { cardNumber: 'OP16-089', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, duration: 'duringThisTurn', optional: true }] } },
  { cardNumber: 'OP16-090', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  { cardNumber: 'OP16-093', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }, { fn: 'giveDon', count: 1 }] } },
  {
    cardNumber: 'OP16-094',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 2 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
    ],
  },
  // OP16-096 — [On K.O.] Play up to 1 [Yamato] cost ≤6 from trash.
  { cardNumber: 'OP16-096', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', name: 'Yamato', maxCost: 6 } }] } },
  { cardNumber: 'OP16-097', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Land of Wano', maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'playFromHand', filter: { category: 'character', maxCost: 2 } }] } },
  // OP16-098 — [On Play] Draw 1, trash 1. PARTIAL: trash-self play-[Yamato] activate deferred.
  { cardNumber: 'OP16-098', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
  {
    cardNumber: 'OP16-099',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 6 }], functions: [{ fn: 'trashTopDeck', count: 5 }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Land of Wano', maxCost: 6 } }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },
  { cardNumber: 'OP16-100', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  // OP16-101 — [Main] up to 1 Leader/Char +3000 this turn. [Trigger] add [Yamato] from trash to hand. PARTIAL: trash-count-gated K.O. deferred.
  {
    cardNumber: 'OP16-101',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { name: 'Yamato' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  // OP16-103 — [On K.O.] If Leader {Blackbeard Pirates}, draw 1, give up to 1 opp Leader/Char −3000. [Trigger] same.
  {
    cardNumber: 'OP16-103',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP16-104 — [Trigger] Draw 1, play up to 1 {Blackbeard Pirates} cost 1 from trash. PARTIAL: base-power-swap [When Attacking] deferred.
  { cardNumber: 'OP16-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Blackbeard Pirates', exactCost: 1 } }] } },
  // OP16-105 — [Trigger] If ≤1 Life, play up to 1 each of [Absalom]/[Dr. Hogback]/[Perona] cost ≤4 from trash.
  { cardNumber: 'OP16-105', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 1 }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', name: 'Absalom', maxCost: 4 } }, { fn: 'playFromTrash', filter: { category: 'character', name: 'Dr. Hogback', maxCost: 4 } }, { fn: 'playFromTrash', filter: { category: 'character', name: 'Perona', maxCost: 4 } }] } },
  // OP16-106 — [On K.O.]/[Trigger] If Leader {Blackbeard Pirates}, draw 1. PARTIAL: base-power-set rider deferred.
  {
    cardNumber: 'OP16-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP16-107 — [Trigger] trash 1 → play this. PARTIAL: [On K.O.] opp-Life-to-hand is deferred.
  { cardNumber: 'OP16-107', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
  { cardNumber: 'OP16-108', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Blackbeard Pirates', maxCost: 6 } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  {
    cardNumber: 'OP16-109',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, maxTargets: 2 }] } },
    ],
  },
  {
    cardNumber: 'OP16-110',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },
    ],
  },
  // OP16-113 — [Trigger] If Leader {Kuja Pirates}, play this. PARTIAL: conditional [Blocker] deferred.
  { cardNumber: 'OP16-113', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'triggerPlaySelf' }] } },
  {
    cardNumber: 'OP16-114',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP16-116 — [Main] If 10 DON!!, play [Marshall.D.Teach] from hand. [Trigger] Draw 2, trash 1. PARTIAL: opp-Life-to-hand deferred.
  {
    cardNumber: 'OP16-116',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonFieldCount', atLeast: 10 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Marshall.D.Teach' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
  // OP16-118 — [On Play]/[On K.O.] Look 5, reveal up to 1 [Monkey.D.Luffy]/{Whitebeard Pirates} to hand, rest to bottom. PARTIAL: static hand-counter buff deferred.
  {
    cardNumber: 'OP16-118',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { typeIncludes: 'Whitebeard Pirates' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { typeIncludes: 'Whitebeard Pirates' }] }, remainder: 'bottom' }] } },
    ],
  },

  // OP16-052 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP16-052', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // OP16-064 — [On Play] Look at 5; add up to 1 Navy (excl. same name).
  {
    cardNumber: 'OP16-064',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true } }] },
  },
  // OP16-072 — [On Play] Look at 5; add up to 1 Impel Down type.
  {
    cardNumber: 'OP16-072',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Impel Down' } }] },
  },
  // OP16-078 - [On Play] Search Navy. [Activate: Main] DON!! -1, rest this Stage: draw 1, trash 1.
  {
    cardNumber: 'OP16-078',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' } }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },
  // OP16-067 - [On Play] Look at 5; add Navy, bottom rest, then trash 1 from hand.
  {
    cardNumber: 'OP16-067',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
    ],
  },
  // OP16-091 - [On Play] If Leader has Land of Wano, look at 4; add Land of Wano other than self, trash rest.
  {
    cardNumber: 'OP16-091',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Land of Wano' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Land of Wano', excludeSelfName: true }, remainder: 'trash' }] },
  },

  // OP16-025 — [When Attacking] If you have [Antlerkov], play up to 1 Character cost<=2 from hand.
  { cardNumber: 'OP16-025', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfControlsNamed', name: 'Antlerkov' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 2 } }] } },

  // OP16-029 — [When Attacking] If you have [Bunkov], play up to 1 Character cost<=2 from hand.
  { cardNumber: 'OP16-029', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfControlsNamed', name: 'Bunkov' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 2 } }] } },


  // --- codegen batch ---
  {
    cardNumber: 'OP16-069',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },


  // --- codegen batch ---
  { cardNumber: 'OP16-111', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'triggerPlaySelf' }] } },

];
