/**
 * Reviewed effect template assignments - Main Booster OP09.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP09_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (OP09 expressible). "return 1 or more DON!!" is approximated as DON!! −1. ──
  // OP09-007 — [Blocker][On Play] your Leader +1000 this turn (the "4000 power or less" leader filter is dropped).
  { cardNumber: 'OP09-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'duringThisTurn' }] } },
  // OP09-010 — [On Play] Play up to 1 [Monster] from hand. [DON!! x1][When Attacking] +2000 this turn.
  {
    cardNumber: 'OP09-010',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Monster' } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },
    ],
  },
  // OP09-011 — [Activate: Main] rest this: If Leader {Red-Haired Pirates}, give up to 1 opp Character −2000.
  { cardNumber: 'OP09-011', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP09-015 — [Blocker][On K.O.] If Leader {Red-Haired Pirates}, K.O. up to 1 opp Character with base power 6000 or less.
  { cardNumber: 'OP09-015', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] } },
  // OP09-019 — [Main] If Leader {Red-Haired Pirates}, give up to 1 opp Character −3000. [Trigger] Draw 1.
  //   PARTIAL: the "if opp has a 5000+ power Character, draw 1" rider needs a power-based gate (deferred).
  {
    cardNumber: 'OP09-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP09-021 (stage) — [Activate: Main] rest this: If Leader {Red-Haired Pirates}, give up to 1 opp Character −1000.
  { cardNumber: 'OP09-021', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
  // OP09-023 — [On Play] If Leader {ODYSSEY}, set up to 3 DON!! active. PARTIAL: the [On Opponent's Attack] rest-DON buff is deferred.
  { cardNumber: 'OP09-023', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'ODYSSEY' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 3 }] } },
  // OP09-039 — [Trigger] K.O. up to 1 opp rested Character cost ≤4. PARTIAL: the [Counter] buff needs a rested-Character-count gate (deferred).
  { cardNumber: 'OP09-039', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
  // OP09-042 (leader) — [Activate: Main] rest 5 DON!! + trash 1: Play up to 1 {Cross Guild} Character from hand.
  { cardNumber: 'OP09-042', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 5 }], functions: [{ fn: 'trashFromHand', count: 1 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Cross Guild' } }] } },
  // OP09-051 — [On Play] Place up to 1 opp Character at bottom of deck. PARTIAL: the conditional "place this Character at bottom" self-clause is deferred.
  { cardNumber: 'OP09-051', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  // OP09-059 — [Counter] up to 1 Leader/Char +3000 this battle. [Trigger] Draw 1. PARTIAL: the "trash up to 2 → mill same number" clause needs dynamic-count mill (deferred).
  {
    cardNumber: 'OP09-059',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP09-060 (stage) — [Activate: Main] place 2 from hand at bottom + rest this: If Leader {Cross Guild}, draw 2.
  { cardNumber: 'OP09-060', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Cross Guild' }], functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 }, { fn: 'draw', amount: 2 }] } },
  // OP09-065 — [On Play] DON!! −1: this gains [Rush] this turn, then rest up to 1 opp Character cost ≤6.
  { cardNumber: 'OP09-065', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },
  // OP09-070 — [On Play] DON!! −1: give up to 2 rested DON!! to your Leader or 1 Character.
  { cardNumber: 'OP09-070', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'giveDon', count: 2 }] } },
  // OP09-073 — [When Attacking] DON!! −1: give up to 2 opp Characters −2000 this turn.
  { cardNumber: 'OP09-073', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
  // OP09-075 — [On Play] If Leader {Kid Pirates}: add 1 top Life to hand → add 1 DON!! (active).
  { cardNumber: 'OP09-075', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Kid Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny' }] } },
  // OP09-083 — [Activate: Main] rest this: If Leader {Blackbeard Pirates}, give up to 1 opp Character −3 cost. [On K.O.] Draw 1.
  {
    cardNumber: 'OP09-083',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP09-088 — [DON!! x1][When Attacking] trash 2 from hand: Draw 2.
  { cardNumber: 'OP09-088', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'trashFromHand', count: 2 }, { fn: 'draw', amount: 2 }] } },
  // OP09-090 — [Activate: Main] rest this: If Leader {Blackbeard Pirates}, K.O. up to 1 opp Character cost ≤1. [On K.O.] Draw 1.
  {
    cardNumber: 'OP09-090',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP09-095 — [Activate: Main] rest 1 DON!! + rest this: Look 5, reveal up to 1 {Blackbeard Pirates} to hand, rest to bottom.
  { cardNumber: 'OP09-095', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Blackbeard Pirates' }, remainder: 'bottom' }] } },
  // OP09-099 (stage) — [Activate: Main] rest this + trash 1: Look 3, reveal up to 1 {Blackbeard Pirates} to hand, rest to bottom.
  { cardNumber: 'OP09-099', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Blackbeard Pirates' }, remainder: 'bottom', ifPrevious: 'previousMovedAny' }] } },
  // OP09-103 — [Blocker][On Play] add 1 top/bottom Life to hand → play up to 1 {Revolutionary Army} cost ≤4 from hand; if you do, draw 1.
  { cardNumber: 'OP09-103', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxCost: 4 } }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },
  // OP09-104 — [On Play] add 1 {Revolutionary Army} from hand to top of Life face-up, then if 2+ Life add 1 top/bottom Life to hand. [Trigger] If Leader multicolored, draw 2.
  {
    cardNumber: 'OP09-104',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true }, { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true, ifGate: [{ kind: 'selfLife', atLeast: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },
  // OP09-105 — [Trigger] If Leader {Egghead}, add top of deck to top of Life, then trash 2 from hand.
  { cardNumber: 'OP09-105', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }, { fn: 'trashFromHand', count: 2 }] } },
  // OP09-106 — [On Play] your Leader +3000 this turn. [Trigger] If Leader [Nico Robin], draw 3, trash 2.
  {
    cardNumber: 'OP09-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Nico Robin' }], functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },
    ],
  },
  // OP09-107 — [On Play] If opp has 3+ Life, trash up to 1 of opp's top Life. [Trigger] Play up to 1 yellow Character cost ≤3 from hand.
  {
    cardNumber: 'OP09-107',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atLeast: 3 }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top' }, to: { zone: 'trash', player: 'owner' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'yellow', maxCost: 3 } }] } },
    ],
  },
  // OP09-112 — [On Play] If ≤2 Life, draw 1. PARTIAL: the [Trigger] needs a combined-Life gate (deferred).
  { cardNumber: 'OP09-112', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'draw', amount: 1 }] } },
  // OP09-116 — [Counter] up to 1 Leader/Char +2000 this battle. [Trigger] Play up to 1 {Revolutionary Army} cost ≤4 from hand.
  {
    cardNumber: 'OP09-116',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxCost: 4 } }] } },
    ],
  },
  // OP09-119 — [On Play] DON!! −1: Draw 1 and this Character gains [Rush] this turn.
  { cardNumber: 'OP09-119', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },

  // OP09-085 — [On Play] Play up to 1 {Thriller Bark Pirates} Character cost<=2 from your trash rested.
  { cardNumber: 'OP09-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 2 }, rested: true }] } },
  // OP09-028 — [On K.O.] You may add 1 Life (top/bottom) to hand: play {ODYSSEY}/{Straw Hat Crew} cost<=4 from trash rested.
  { cardNumber: 'OP09-028', templateId: 'ability', params: { timing: 'onKO', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'playFromTrash', filter: { category: 'character', anyOf: [{ typeIncludes: 'ODYSSEY' }, { typeIncludes: 'Straw Hat Crew' }], maxCost: 4 }, rested: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP09-072 — [Blocker] [On Play] DON!! −2, you may trash 1 from hand: draw 2.
  { cardNumber: 'OP09-072', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' },
  ] } },
  // OP09-078 — [Counter] DON!! −2, you may trash 1: if Leader {Straw Hat Crew}, +4000 battle then draw 2.
  { cardNumber: 'OP09-078', templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 2 }], gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
    { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' },
  ] } },

  // --- Batch: OP09 expressible with existing primitives (+ selfRestedCharacterCount gate) ---

  // OP09-020 — [Main] If Leader {Red-Haired Pirates}, search {Red-Haired Pirates} (excl. self). [Trigger] Draw 1.
  {
    cardNumber: 'OP09-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Red-Haired Pirates', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP09-037 — [On Play] Search {ODYSSEY} (excl. self). [End of Your Turn] If 3+ rested Characters, set this active.
  {
    cardNumber: 'OP09-037',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'ODYSSEY', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 3 }], functions: [{ fn: 'setActiveSelf' }] } },
    ],
  },
  // OP09-044 — [When Attacking] Search ({Land of Wano} or Whitebeard Pirates), then trash 1 from hand.
  { cardNumber: 'OP09-044', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Land of Wano' }, { typeIncludes: 'Whitebeard Pirates' }] }, remainder: 'bottom' },
    { fn: 'trashFromHand', count: 1 },
  ] } },
  // OP09-050 — [When Attacking] Look at 5; reveal up to 1 blue Event and add it to hand.
  { cardNumber: 'OP09-050', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event', color: 'blue' }, remainder: 'bottom' }] } },
  // OP09-053 — [On Play] Search [Richie], then play up to 1 [Richie] from hand.
  { cardNumber: 'OP09-053', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Richie' }, remainder: 'bottom' },
    { fn: 'playFromHand', filter: { category: 'character', name: 'Richie' } },
  ] } },
  // OP09-057 — [Main] Search {Cross Guild}. [Trigger] same.
  {
    cardNumber: 'OP09-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Cross Guild' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Cross Guild' }, remainder: 'bottom' }] } },
    ],
  },
  // OP09-096 — [Main] Search {Blackbeard Pirates} (excl. self), trash the rest. [Trigger] same.
  {
    cardNumber: 'OP09-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Blackbeard Pirates', excludeSelfName: true }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Blackbeard Pirates', excludeSelfName: true }, remainder: 'trash' }] } },
    ],
  },
  // OP09-024 — [On Play] If 2+ rested Characters, draw 2 & trash 2.
  { cardNumber: 'OP09-024', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
  // OP09-026 — [On Play] If 2+ rested Characters, K.O. up to 1 opp Character cost<=5.
  { cardNumber: 'OP09-026', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  // OP09-027 — [When Attacking] [OPT] If 3+ rested Characters, draw 1.
  { cardNumber: 'OP09-027', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, gate: [{ kind: 'selfRestedCharacterCount', atLeast: 3 }], functions: [{ fn: 'draw', amount: 1 }] } },
  // OP09-035 — [On Play] If 2+ rested Characters, rest up to 1 opp Character cost<=5.
  { cardNumber: 'OP09-035', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  // OP09-040 — [Main] If 2+ rested Characters, K.O. opp cost<=4. [Trigger] Rest opp cost<=4.
  {
    cardNumber: 'OP09-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP09-041 — [Counter] +2000; if Leader {ODYSSEY} and 2+ rested, set up to 2 of your Characters active. [Trigger] Rest opp cost<=4.
  {
    cardNumber: 'OP09-041',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'setActiveControllerCharacter', maxTargets: 2, ifGate: [{ kind: 'leaderType', type: 'ODYSSEY' }, { kind: 'selfRestedCharacterCount', atLeast: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP09-029 — [End of Your Turn] Set up to 1 of your {ODYSSEY} Characters with a cost of 4 or less as active.
  { cardNumber: 'OP09-029', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'ODYSSEY', maxCost: 4 } }] } },
  // OP09-066 — [On Play] If opponent has more DON!! than you, K.O. up to 1 opp Character cost<=3.
  { cardNumber: 'OP09-066', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentDonMoreThanSelf' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  // OP09-077 — [Main] DON!! −2: K.O. opp Character power<=6000. [Trigger] Add 1 DON!! active.
  {
    cardNumber: 'OP09-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP09-079 — [Main] DON!! −2: Rest opp Character cost<=5, then draw 1. [Trigger] Add 1 DON!! active.
  {
    cardNumber: 'OP09-079',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true },
        { fn: 'draw', amount: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP09-046 — [On Play] Play up to 1 {Cross Guild} or "Baroque Works" Character with cost<=5 from hand.
  { cardNumber: 'OP09-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Cross Guild' }, { typeIncludes: 'Baroque Works' }], maxCost: 5 } }] } },
  // OP09-043 — [On K.O.] If Leader {Cross Guild}, play up to 1 Character cost<=5 other than [Alvida] from hand.
  { cardNumber: 'OP09-043', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Cross Guild' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5, excludeSelfName: true } }] } },
  // OP09-047 — [Double Attack] [On K.O.] Draw 2 cards and trash 1 card from your hand.
  { cardNumber: 'OP09-047', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
  // OP09-087 — [On Play] If opponent has 5+ cards in hand, they trash 1 from hand.
  { cardNumber: 'OP09-087', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentHand', atLeast: 5 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
  // OP09-110 — [On Play] Draw 2 & trash 2. [Trigger] Play this card.
  {
    cardNumber: 'OP09-110',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP09-002 — [On Play] Look at 5; add up to 1 Red-Haired Pirates.
  {
    cardNumber: 'OP09-002',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Red-Haired Pirates' } }] },
  },
  // OP09-003 — [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  { cardNumber: 'OP09-003', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP09-048 - [Blocker] [On Play] Draw 2 cards and trash 1 card from hand.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw/trash is templated.
  { cardNumber: 'OP09-048', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
  // OP09-056 - [On Play] Look at 4; add Cross Guild or type including Baroque Works other than this card's name.
  {
    cardNumber: 'OP09-056',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Cross Guild' }, { typeIncludes: 'Baroque Works' }], excludeSelfName: true } }] },
  },
  // OP09-069 - [On Play] Look at 4; add Straw Hat Crew or Heart Pirates with cost 2+.
  {
    cardNumber: 'OP09-069',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Straw Hat Crew' }, { typeIncludes: 'Heart Pirates' }], minCost: 2 } }] },
  },
  // OP09-034 - [On Play] Look at 5; add [Dracule Mihawk] or Thriller Bark Pirates, bottom rest, then trash 1 from hand.
  {
    cardNumber: 'OP09-034',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Dracule Mihawk' }, { typeIncludes: 'Thriller Bark Pirates' }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
    ],
  },
];
