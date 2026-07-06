/**
 * Reviewed effect template assignments - Main Booster OP12.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP12_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (OP12 expressible). "reveal 2 Events from hand" cost, "give active DON!! to [named]", and Events-in-trash gates are deferred. ──
  // OP12-007 — [On Play] up to 1 {Roger Pirates} Character gains [Rush] this turn (exclude-[Shanks] dropped).
  { cardNumber: 'OP12-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Roger Pirates' } }, keyword: 'rush', duration: 'duringThisTurn', optional: true }] } },
  // OP12-029 — [On Play] Rest up to 1 opp Character cost ≤2, then K.O. up to 1 opp rested Character with base cost ≤1.
  { cardNumber: 'OP12-029', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxBaseCost: 1 } }, optional: true }] } },
  // OP12-030 — [Blocker][On Play] Set up to 4 DON!! active. PARTIAL: the "cannot play base-cost-7+ Characters this turn" restriction is deferred.
  { cardNumber: 'OP12-030', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 4 }] } },
  // OP12-033 — [Blocker][On Block] Rest up to 1 opp Character cost ≤5.
  { cardNumber: 'OP12-033', templateId: 'ability', params: { timing: 'onBlock', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  // OP12-038 — [Main] rest 2 DON!!: K.O. up to 2 opp rested Characters base cost ≤4. [Counter] your Leader +3000 this battle.
  {
    cardNumber: 'OP12-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxBaseCost: 4 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },
  // OP12-039 — [Trigger] up to 1 Leader/Char +1000 this turn. PARTIAL: the [Main] "set your Zoro Leader active" needs a set-Leader-active op (deferred).
  { cardNumber: 'OP12-039', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
  // OP12-041 (leader) — [When Attacking] If your DON!! ≤ opponent's, add 1 DON!! (rested). PARTIAL: the "activate Event from hand" main is deferred.
  { cardNumber: 'OP12-041', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP12-042 — [On Play] Place up to 1 opp Character with base cost ≤1 at bottom of deck. PARTIAL: the static +1 cost clause is deferred.
  { cardNumber: 'OP12-042', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxBaseCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  // OP12-044 — [On Play] If Leader {Navy}, draw 2. [Activate: Main][OPT] trash 1 → give 1 rested DON!! to Leader/1 Char.
  {
    cardNumber: 'OP12-044',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  // OP12-046 — [On Play] Trash 2 from hand. PARTIAL: the trash-self activate bounce is deferred.
  { cardNumber: 'OP12-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 2 }] } },
  // OP12-047 — [On Play] trash 1 → Look 5, reveal up to 2 {Navy} to hand (exclude-[Sengoku] dropped), rest to bottom.
  { cardNumber: 'OP12-047', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' }, remainder: 'bottom', ifPrevious: 'previousMovedAny' }] } },
  // OP12-054 — [On Play] If Leader {The Seven Warlords of the Sea}: return up to 1 Character cost ≤1 to hand (exclude-self dropped).
  { cardNumber: 'OP12-054', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Seven Warlords of the Sea' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP12-056 — [On Play] trash 1 → play up to 1 blue {Navy} Character (≤8000 base power) from hand (exclude-[Garp] dropped).
  { cardNumber: 'OP12-056', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'playFromHand', filter: { category: 'character', color: 'blue', typeIncludes: 'Navy', maxPower: 8000 } }] } },
  // OP12-057 — [Counter] up to 1 Leader/Char +4000 this battle, then trash 1 from hand. [Trigger] trash 1 → draw 1.
  {
    cardNumber: 'OP12-057',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'trashFromHand', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  // OP12-059 — [Main] If Leader [Sanji], draw 1. PARTIAL: the [Counter] Events-in-trash buff is deferred.
  { cardNumber: 'OP12-059', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'draw', amount: 1 }] } },
  // OP12-062 — [On Play] If Leader [Sanji] and your DON!! ≤ opponent's, add 1 DON!! (rested), then draw 1.
  { cardNumber: 'OP12-062', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Sanji' }, { kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'draw', amount: 1 }] } },
  // OP12-075 — [On Play] K.O. up to 1 opp Character cost ≤3. [Trigger] DON!! −1: Play this card. PARTIAL: opponent's DON!! ramp drawback deferred.
  {
    cardNumber: 'OP12-075',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP12-078 — [Main] If your DON!! ≤ opponent's, draw 1, then give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP12-078', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
  // OP12-079 — [Main] If Leader [Sanji]: Look 3, add up to 1 card to hand, rest to bottom.
  { cardNumber: 'OP12-079', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: false, destination: 'hand', remainder: 'bottom' }] } },
  // OP12-084 — [Blocker][On Play] If Leader {Revolutionary Army}, trash 3 from top of deck.
  { cardNumber: 'OP12-084', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'trashTopDeck', count: 3 }] } },
  // OP12-087 — [On Play] trash 1 → if opp 5+ hand, opp trashes 2. PARTIAL: static [Blocker]/+3 cost clause deferred.
  { cardNumber: 'OP12-087', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentHand', atLeast: 5 }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'trashFromOpponentHandChosenByOpponent', count: 2, ifPrevious: 'previousMovedAny' }] } },
  // OP12-089 — [On K.O.] If Leader {Revolutionary Army}, K.O. up to 1 opp Character base cost ≤4. PARTIAL: static [Blocker]/+4 cost deferred.
  { cardNumber: 'OP12-089', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, optional: true }] } },
  // OP12-090 — [When Attacking] trash 2 from top of deck: give up to 1 opp Character −2 cost this turn.
  { cardNumber: 'OP12-090', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true }] } },
  // OP12-095 — [On Play] Draw 1, trash 1. PARTIAL: static +4 cost clause deferred.
  { cardNumber: 'OP12-095', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
  // OP12-096 — [Main] K.O. up to 1 opp Character cost ≤4. [Trigger] Draw 1, trash 1 from top of deck. PARTIAL: the 8-cost upgrade is deferred.
  {
    cardNumber: 'OP12-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'trashTopDeck', count: 1 }] } },
    ],
  },
  // OP12-097 — [Main]/[Trigger] Look 3, reveal up to 1 {Revolutionary Army} to hand, trash the rest (exclude-name dropped).
  {
    cardNumber: 'OP12-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army' }, remainder: 'trash' }] } },
    ],
  },
  // OP12-100 — [On Play] add 1 top Life to hand → Draw 2, trash 1. PARTIAL: static [Blocker]/+3 cost clause deferred.
  { cardNumber: 'OP12-100', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'drawAndTrash', drawCount: 2, trashCount: 1, ifPrevious: 'previousMovedAny' }] } },
  // OP12-107 — static: if ≤2 Life, this Character gains [Rush]. [On K.O.] add top of deck to top of Life.
  {
    cardNumber: 'OP12-107',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 2 }] } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
    ],
  },
  // OP12-109 — [Trigger] K.O. up to 1 opp Character cost ≤1. PARTIAL: "add this card to your hand" self-return deferred.
  { cardNumber: 'OP12-109', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  // OP12-112 — [Trigger] If Leader multicolored, draw 2.
  { cardNumber: 'OP12-112', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 2 }] } },
  // OP12-113 — [Trigger] K.O. up to 1 opp Character cost ≤1. PARTIAL: [On K.O.] play-rested and self-return are deferred.
  { cardNumber: 'OP12-113', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  // OP12-115 — [Counter] up to 1 Leader/Char +2000 this battle. PARTIAL: the "≤2 Life → recur [Law]" rider is deferred.
  { cardNumber: 'OP12-115', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] } },
  // OP12-116 — [Main] Look 5, reveal up to 2 {Shandian Warrior}/[Mont Blanc Noland] to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP12-116',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Shandian Warrior' }, { name: 'Mont Blanc Noland' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP12-104 — [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or less.
  { cardNumber: 'OP12-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  // OP12-108 - [On Play] Look at 5; add up to 1 [Trafalgar Law].
  {
    cardNumber: 'OP12-108',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Trafalgar Law' } }] },
  },
  // OP12-006 - [On Play] Look at 5; add [Monkey.D.Luffy] or red Event.
  {
    cardNumber: 'OP12-006',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { category: 'event', color: 'red' }] } }] },
  },
  // OP12-071 - [On Play] Look at 4; add [Sanji] or Event.
  {
    cardNumber: 'OP12-071',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Sanji' }, { category: 'event' }] } }] },
  },
  // OP12-086 - [On Play] If Leader has Revolutionary Army, look at 3; add Revolutionary Army other than self or [Nico Robin], trash rest.
  {
    cardNumber: 'OP12-086',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'searchTopDeck', look: 3,
      pick: 1,
      reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Revolutionary Army', excludeSelfName: true }, { name: 'Nico Robin' }] },
      remainder: 'trash' }] },
  },

  // OP12-008 — [Blocker] [On Your Opponent's Attack] [Once Per Turn] trash 1 from hand: give up to 1 opp Leader/Character −2000 this turn.
  { cardNumber: 'OP12-008', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP12-069 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: If Leader {Baroque Works}, up to 1 Leader/Character +2000 battle.
  { cardNumber: 'OP12-069', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] } },

];
