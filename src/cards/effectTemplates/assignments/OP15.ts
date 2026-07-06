/**
 * Reviewed effect template assignments - Main Booster OP15.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP15_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (OP15 expressible). Opponent-DON manipulation, name-target buffs, turn-Life-face costs, and trash-count gates are deferred. ──
  { cardNumber: 'OP15-007', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5 } }] } },
  { cardNumber: 'OP15-010', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
  // OP15-011 — [On K.O.] If Leader {East Blue}, K.O. up to 1 opp Character base power ≤6000. PARTIAL: conditional [Blocker]/+2000 deferred.
  { cardNumber: 'OP15-011', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] } },
  {
    cardNumber: 'OP15-012',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP15-021 — [Main]/[Counter] give up to 1 opp Character −3000. PARTIAL: static Events-in-trash −cost is deferred.
  {
    cardNumber: 'OP15-021',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP15-026 — [On Play] Look 3, reveal up to 1 {East Blue} to hand, rest to bottom. PARTIAL: trash-self opp-DON activate deferred.
  { cardNumber: 'OP15-026', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'East Blue' }, remainder: 'bottom' }] } },
  // OP15-032 — [On Play] Rest up to 1 opp Character. PARTIAL: trash-self activate deferred.
  { cardNumber: 'OP15-032', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
  {
    cardNumber: 'OP15-036',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },
  {
    cardNumber: 'OP15-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'East Blue' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP15-041 — [On K.O.] Draw 1. [Activate: Main][OPT] place 1 own Char at bottom of deck → this gains [Rush].
  {
    cardNumber: 'OP15-041',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  // OP15-042 — [On Play] trash 1 → if Leader [Rebecca], this gains [Rush]. PARTIAL: [On K.O.] self-recur deferred.
  { cardNumber: 'OP15-042', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Rebecca' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },
  { cardNumber: 'OP15-043', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Bobby Funk' } }] } },
  // OP15-045 — [Blocker][On Play] trash 1 → Draw 2 (Event-category filter approximated as any card).
  { cardNumber: 'OP15-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' }] } },
  { cardNumber: 'OP15-051', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderType', type: 'Dressrosa' }] } }] } },
  // OP15-053 — [On Play] Look 3, reveal up to 1 {Dressrosa} to hand, rest to bottom. PARTIAL: conditional [Blocker] deferred.
  { cardNumber: 'OP15-053', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa' }, remainder: 'bottom' }] } },
  // OP15-056 — [Main] Draw 2. [Trigger] Draw 2. PARTIAL: the "[Lucy] Leader gains [Double Attack]/+3000" clause is deferred.
  {
    cardNumber: 'OP15-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },
  // OP15-057 (stage) — [On Play] If Leader {Dressrosa}, draw 1. PARTIAL: [On Opponent's Attack] clause deferred.
  { cardNumber: 'OP15-057', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Dressrosa' }], functions: [{ fn: 'draw', amount: 1 }] } },
  {
    cardNumber: 'OP15-066',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'searchTopDeck', look: 2, pick: 2, reveal: false, destination: 'deckTopOrBottom' }] } },
    ],
  },
  {
    cardNumber: 'OP15-067',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP15-073 — [Blocker][On Play] play up to 1 [Heavenly Warriors] cost 1 or {Vassals} cost 1 from hand.
  { cardNumber: 'OP15-073', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', exactCost: 1, anyOf: [{ name: 'Heavenly Warriors' }, { typeIncludes: 'Vassals' }] } }] } },
  // OP15-075 — [Main] DON!! −1: If Leader [Enel], up to 1 Leader/Char +1000 this turn, K.O. opp ≤3000 power. PARTIAL: [Counter] [Enel] buff deferred.
  { cardNumber: 'OP15-075', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderName', name: 'Enel' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
  // OP15-076 — [Main] DON!! −1: If Leader [Enel], draw 1, give up to 1 opp Character −1000. PARTIAL: [Counter] [Enel] buff deferred.
  { cardNumber: 'OP15-076', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderName', name: 'Enel' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
  // OP15-077 — [Main] DON!! −1: Draw 1. PARTIAL: the preventRefresh rider is deferred.
  { cardNumber: 'OP15-077', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
  { cardNumber: 'OP15-081', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },
  {
    cardNumber: 'OP15-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', maxCost: 8 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  // OP15-083 — [On Play] Trash 3 from top of deck. PARTIAL: trash-self 15-trash activate deferred.
  { cardNumber: 'OP15-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
  {
    cardNumber: 'OP15-084',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfHand', atMost: 6 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP15-085 — [On Play] Trash 3 from top of deck. PARTIAL: trash-self recur activate deferred.
  { cardNumber: 'OP15-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
  // OP15-086 — [On Play] If Leader {Straw Hat Crew}, play {Straw Hat Crew} cost ≤7 from trash (granted [Rush] dropped).
  { cardNumber: 'OP15-086', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 7 } }] } },
  // OP15-087 — [On Play] Draw 2, trash 2. PARTIAL: static 10-trash [Blocker] deferred.
  { cardNumber: 'OP15-087', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
  // OP15-088 — static: this Character +6 cost. [On Play] trash 3 from top of deck → play {Straw Hat Crew} cost ≤2 from trash.
  {
    cardNumber: 'OP15-088',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 6, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 2 } }] } },
    ],
  },
  {
    cardNumber: 'OP15-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  { cardNumber: 'OP15-101', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Mont Blanc Noland' }, { typeIncludes: 'Shandian Warrior' }] }, remainder: 'bottom', ifPrevious: 'previousMovedAny' }] } },
  // OP15-103 — [Trigger] Draw 1, then if ≤2 Life play this card.
  { cardNumber: 'OP15-103', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'triggerPlaySelf', ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
  {
    cardNumber: 'OP15-104',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLifeLessThanOpponent' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
  // OP15-106 — [Trigger] Draw 1, then play up to 1 yellow Character cost ≤2 from hand (Stage option dropped).
  { cardNumber: 'OP15-106', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', color: 'yellow', maxCost: 2 } }] } },
  // OP15-109 — [On Play] If Leader {Straw Hat Crew}: add 1 top Life to hand → add top of deck to top of Life → play {Sky Island} cost ≤5 from hand.
  { cardNumber: 'OP15-109', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Sky Island', maxCost: 5 } }] } },
  { cardNumber: 'OP15-112', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Shandian Warrior', maxCost: 3 } }] } },
  { cardNumber: 'OP15-113', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  // OP15-114 — [Activate: Main][OPT] give up to 1 rested DON!! to Leader/1 Char. PARTIAL: the turn-Life-face-up mass-debuff [On Play] is deferred.
  { cardNumber: 'OP15-114', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
  {
    cardNumber: 'OP15-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }, { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP15-116 — [Counter] your Leader +4000 this battle. PARTIAL: the Straw-Hat [Main] Life-trash/refill is deferred.
  { cardNumber: 'OP15-116', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisBattle' }] } },
  {
    cardNumber: 'OP15-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 1 }, { fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Sky Island' }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },
  // OP15-118 — static: if ≤6 DON!!, cannot be removed by opp effects and +2000. [On Play] DON!! −1: Look 5, add up to 1, rest to bottom, trash 1.
  {
    cardNumber: 'OP15-118',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }, { fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: false, destination: 'hand', remainder: 'bottom' }, { fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  // OP15-040 — [On Play] Look at 3; add up to 1 Dressrosa type.
  {
    cardNumber: 'OP15-040',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa' } }] },
  },
  // OP15-044 - [Blocker] [On K.O.] Look at 3; add up to 1 Dressrosa Event.
  // Note: [Blocker] is an engine keyword flag. Only the on-K.O. search is templated.
  {
    cardNumber: 'OP15-044',
    templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event', typeIncludes: 'Dressrosa' } }] },
  },
  // OP15-108 — [On Play] Look at 3; add up to 1 Sky Island type.
  {
    cardNumber: 'OP15-108',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island' } }] },
  },

  // OP15-061 - [On Play] DON!! -1: draw 1. [When Attacking] if <=6 DON!!, -1000 opponent Character.
  {
    cardNumber: 'OP15-061',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP15-063 - [On Play] DON!! -1: draw 1. [On K.O.] if <=6 DON!!, K.O. power <=2000.
  {
    cardNumber: 'OP15-063',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
    ],
  },
  // OP15-078 - [Main] DON!! -2: draw 1, then rest power <=5000. [Counter] +1000, then if <=6 DON!! draw 1.
  {
    cardNumber: 'OP15-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-064 — [Activate: Main] DON!! −2 + rest this: If you have [Satori] and [Hotori], rest up to 1 opp Character with 5000 power or less.
  { cardNumber: 'OP15-064', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }, { kind: 'restThis' }], gate: [{ kind: 'selfControlsNamed', name: 'Satori' }, { kind: 'selfControlsNamed', name: 'Hotori' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },

  // OP15-072 — [Activate: Main] DON!! −2 + rest this: If you have [Kotori] and [Satori], give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP15-072', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }, { kind: 'restThis' }], gate: [{ kind: 'selfControlsNamed', name: 'Kotori' }, { kind: 'selfControlsNamed', name: 'Satori' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

];
