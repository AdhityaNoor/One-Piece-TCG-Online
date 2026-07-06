/**
 * Reviewed effect template assignments - Main Booster OP11.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP11_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (OP11 expressible). "Choose a cost + reveal opp deck" and "turn Life face-down" families are deferred. ──
  // OP11-007 — [Activate: Main] rest this: If Leader {Navy}, up to 1 {Navy} Character +2000 this turn.
  { cardNumber: 'OP11-007', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Navy' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
  // OP11-021 (leader) — [End of Your Turn] If ≤6 hand: set up to 1 {Fish-Man}/{Merfolk} Character and up to 1 DON!! active.
  { cardNumber: 'OP11-021', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfHand', atMost: 6 }], functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { anyOfTypes: ['Fish-Man', 'Merfolk'] } }, { fn: 'setActiveControllerDon', maxTargets: 1 }] } },
  // OP11-023 — [Trigger] Rest up to 1 opp Character cost ≤4. PARTIAL: the static in-hand −cost clause is deferred.
  { cardNumber: 'OP11-023', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  // OP11-030 — [Activate: Main] rest 1 DON!! + rest this: Look 5, reveal up to 1 {Neptunian}/{Fish-Man Island} to hand, rest to bottom.
  { cardNumber: 'OP11-030', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Neptunian' }, { typeIncludes: 'Fish-Man Island' }] }, remainder: 'bottom' }] } },
  // OP11-035 — [On Play] Rest up to 1 opp Character. PARTIAL: the K.O.-triggered play-from-hand is deferred.
  { cardNumber: 'OP11-035', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
  // OP11-036 — [On Play] If Leader [Shirahoshi]: Look 5, reveal up to 1 {Neptunian}/[Shirahoshi] to hand, rest to bottom.
  { cardNumber: 'OP11-036', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Shirahoshi' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Neptunian' }, { name: 'Shirahoshi' }] }, remainder: 'bottom' }] } },
  // OP11-038 — [Main] rest 1 DON!!: rest up to 1 opp Character cost ≤5. [Counter] your Leader +3000 this battle.
  {
    cardNumber: 'OP11-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },
  // OP11-039 — [Counter] up to 1 Leader/Char +3000 this battle (Fish-Man/Merfolk filter dropped), then rest up to 1 opp Char cost ≤3. [Trigger] rest cost ≤4.
  {
    cardNumber: 'OP11-039',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP11-049 — [On Play] Look at 3, place at top or bottom of deck in any order. PARTIAL: [On Opponent's Attack] clause deferred.
  { cardNumber: 'OP11-049', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 3, reveal: false, destination: 'deckTopOrBottom' }] } },
  // OP11-054 — [Blocker][On Play] If Leader multicolored: Draw 3, place 2 from hand at bottom of deck.
  { cardNumber: 'OP11-054', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 3 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 }] } },
  // OP11-056 — [Blocker][On Play] Place up to 1 Character with a base cost of 1 at the bottom of the deck.
  { cardNumber: 'OP11-056', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { exactBaseCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  // OP11-063 — [On Play] DON!! −1: If Leader {Impel Down}, rest up to 1 opp Character cost ≤3.
  { cardNumber: 'OP11-063', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  // OP11-067 — [Blocker][End of Your Turn] Set up to 2 {Big Mom Pirates} Characters active (cost ≥3 filter dropped), then add 1 DON!! (rested).
  { cardNumber: 'OP11-067', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 2, filter: { typeIncludes: 'Big Mom Pirates' } }, { fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP11-069 — [On Play] If Leader {Big Mom Pirates}: add 1 top Life to hand → add 1 DON!! (active).
  { cardNumber: 'OP11-069', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny' }] } },
  // OP11-070 — [On Play] Look 5, reveal up to 1 {Big Mom Pirates} cost ≥2 to hand, rest to bottom. PARTIAL: the peek-opp-deck activate is deferred.
  { cardNumber: 'OP11-070', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Big Mom Pirates', minCost: 2 }, remainder: 'bottom' }] } },
  // OP11-076 — [Blocker][On Play] If Leader {Impel Down}: play up to 1 {Impel Down} cost ≤3 from hand.
  { cardNumber: 'OP11-076', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Impel Down', maxCost: 3 } }] } },
  // OP11-080 — [Counter] your Leader +3000 this battle. PARTIAL: the [Main] "rest 2 DON!!: if blue leader, ramp" needs a leader-color gate (deferred).
  { cardNumber: 'OP11-080', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  // OP11-083 — [Blocker][On Play] Trash 2 cards from your hand.
  { cardNumber: 'OP11-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 2 }] } },
  // OP11-097 — [Counter] up to 1 Leader/Char +1000 this battle. PARTIAL: the "10+ trash → recur black Char" rider needs a trash-count gate (deferred).
  { cardNumber: 'OP11-097', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },
  // OP11-098 — [Main] trash 3 from top of deck: K.O. up to 1 opp Character cost ≤2. [Trigger] up to 1 Leader/Char +1000 this turn.
  {
    cardNumber: 'OP11-098',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashTopDeck', count: 3 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP11-110 — [On Play] add 1 top/bottom Life to hand → K.O. up to 1 opp Character cost ≤1. PARTIAL: the K.O.-replacement clause is deferred.
  { cardNumber: 'OP11-110', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  // OP11-112 — [Blocker][Opponent's Turn] If Leader [Shirahoshi], this Character +4000.
  { cardNumber: 'OP11-112', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 4000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderName', name: 'Shirahoshi' }] } }] } },
  // OP11-114 — [Counter] your Leader +3000 this battle. PARTIAL: the [Main] combined-Life-gated K.O. is deferred.
  { cardNumber: 'OP11-114', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  // OP11-115 — [Counter] If Leader [Shirahoshi], up to 1 Leader/Char +4000 this battle. [Trigger] K.O. up to 1 opp Character cost ≤2.
  {
    cardNumber: 'OP11-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderName', name: 'Shirahoshi' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
    ],
  },

  // OP11-028 — [On Play] Up to 1 opp rested Character won't become active next Refresh. [Trigger] K.O. opp rested cost<=3.
  {
    cardNumber: 'OP11-028',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP11-004 — [On Play] Search {Navy} (excl. self). [Activate: Main] Trash this: up to 1 of your Characters +1000.
  {
    cardNumber: 'OP11-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP11-008 — [Blocker] [On Play] You may trash 1 from hand: if Leader {Navy}, give up to 1 opp Character −6000.
  { cardNumber: 'OP11-008', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -6000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },
  // OP11-118 — [Rush] [When Attacking] You may trash 1 from hand: return Character cost<=4 to hand, then give 1 rested DON!!.
  { cardNumber: 'OP11-118', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' },
    { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // --- Batch: OP11 expressible with existing primitives ---

  // OP11-002 — [On Play] Give opp Character −1000, then K.O. opp Character with 0 power or less.
  { cardNumber: 'OP11-002', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true },
  ] } },
  // OP11-009 — [DON!! x2] [When Attacking] Give opp Character −2000 until end of opponent's next turn.
  { cardNumber: 'OP11-009', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'endOfOpponentsTurn', optional: true }] } },
  // OP11-010 — [On Play] Give opp Character −2000. [When Attacking] this Character +1000.
  {
    cardNumber: 'OP11-010',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' }] } },
    ],
  },
  // OP11-018 — [Main] Give opp −4000, then K.O. opp power<=6000. [Trigger] K.O. opp power<=6000.
  {
    cardNumber: 'OP11-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true }] } },
    ],
  },
  // OP11-020 — [Main] Give up to 2 opp −2000, then a {Navy} Character +1000. [Trigger] K.O. opp power<=4000.
  {
    cardNumber: 'OP11-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 },
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Navy' } }, amount: 1000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },
  // OP11-037 — [Main] Search ({Neptunian} or {Fish-Man Island}) Character. [Trigger] Draw 1.
  {
    cardNumber: 'OP11-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Neptunian' }, { typeIncludes: 'Fish-Man Island' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP11-044 — [Activate: Main] [OPT] You may trash 1 from hand: all your {GERMA 66} Characters +1000.
  { cardNumber: 'OP11-044', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPowerControllerCharactersAll', amount: 1000, duration: 'duringThisTurn', filter: { typeIncludes: 'GERMA 66' }, ifPrevious: 'previousMovedAny' },
  ] } },
  // OP11-060 — [Main] If Leader multicolored, search {Straw Hat Crew} (excl. self). [Trigger] same.
  {
    cardNumber: 'OP11-060',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true }, remainder: 'bottom' }] } },
    ],
  },
  // OP11-061 — [Main] Place opp Character with base cost 4 or less at bottom of deck. [Trigger] Place Character cost<=1 at bottom.
  {
    cardNumber: 'OP11-061',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },
  // OP11-075 — [On Play] If Leader is [Nico Robin] and 7+ DON!! on field, draw 2. [Trigger] same.
  {
    cardNumber: 'OP11-075',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Nico Robin' }, { kind: 'selfDonFieldCount', atLeast: 7 }], functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Nico Robin' }, { kind: 'selfDonFieldCount', atLeast: 7 }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },
  // OP11-085 — [On Play] Add up to 1 {SMILE} card with a cost of 5 or less from your trash to your hand.
  { cardNumber: 'OP11-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'SMILE', maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP11-086 — [On Play] Trash 1 from hand. [Activate: Main] Trash this: play up to 1 [Caribou] cost<=4 from trash.
  {
    cardNumber: 'OP11-086',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', name: 'Caribou', maxCost: 4 } }] } },
    ],
  },
  // OP11-099 — [Main] Search {Navy} (excl. self), trash the rest. [Trigger] same.
  {
    cardNumber: 'OP11-099',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'trash' }] } },
    ],
  },
  // OP11-106 — [On Play] You may add 1 Life card (top/bottom) to hand: K.O. up to 1 opp Character cost<=5.
  { cardNumber: 'OP11-106', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP11-016 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP11-016', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
  // OP11-029 - [Blocker] [On Play] Rest up to 1 opponent Character with cost 1 or less.
  // Note: [Blocker] is an engine keyword flag. Only the on-play rest is templated.
  { cardNumber: 'OP11-029', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  // OP11-048 - [On Play] Look at 4; add Firetank Pirates or Straw Hat Crew with cost 2+.
  {
    cardNumber: 'OP11-048',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Firetank Pirates' }, { typeIncludes: 'Straw Hat Crew' }], minCost: 2 } }] },
  },
  // OP11-047 - [On Play] If Leader has The Vinsmoke Family, look at 5; add GERMA, trash rest.
  {
    cardNumber: 'OP11-047',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Vinsmoke Family' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA' }, remainder: 'trash' }] },
  },
];
