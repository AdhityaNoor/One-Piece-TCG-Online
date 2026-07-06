/**
 * Reviewed effect template assignments - Main Booster OP07.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP07_ASSIGNMENTS: CardEffectAssignment[] = [

  // ── Triage batch (OP07 expressible): Warlords/Fish-Man/Foxy/Egghead lines. ──
  // OP07-017 Bombardment — [Main]/[Trigger] K.O. up to 1 opp Character with 3000 power or less.
  //   PARTIAL: the "and up to 1 opp Stage cost ≤1" clause needs a Stage target (no Stage selector yet).
  {
    cardNumber: 'OP07-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
    ],
  },
  // OP07-020 — [Blocker][On K.O.] If Leader {Fish-Man}: play up to 1 {Fish-Man}/{Merfolk} Character cost ≤3 from hand.
  { cardNumber: 'OP07-020', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },
  // OP07-023 — static: if 6+ rested DON!!, this Character +1000 (Blocker is card data).
  { cardNumber: 'OP07-023', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfRestedDonCount', atLeast: 6 }] } }] } },
  // OP07-036 — [Main] up to 1 Leader/Char +3000 this turn. [Trigger] Rest up to 1 opp Character cost ≤4.
  //   PARTIAL: the "rest your cost-3+ Character → rest opp cost ≤5" mid-clause needs a min-cost in-play filter (deferred).
  {
    cardNumber: 'OP07-036',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP07-055 — [Counter] +4000 battle, then return up to 1 of your Characters to hand. [Trigger] return own → return 1 opp Character cost ≤5.
  {
    cardNumber: 'OP07-055',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  // OP07-058 (stage) — [Activate: Main] rest this Stage + trash 1: If Leader {Kuja Pirates}, return up to 1 {Amazon Lily}/{Kuja Pirates} Character to hand.
  { cardNumber: 'OP07-058', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { anyOfTypes: ['Amazon Lily', 'Kuja Pirates'] } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  // OP07-061 — [On Play] DON!! −1: If Leader {The Vinsmoke Family}, draw 1.
  { cardNumber: 'OP07-061', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'The Vinsmoke Family' }], functions: [{ fn: 'draw', amount: 1 }] } },
  // OP07-071 — [Activate: Main][Once Per Turn] Add 1 DON!! and rest it.
  //   PARTIAL: the [Opponent's Turn] "give all opp Characters −1000" aura needs an opponent-group power aura (deferred).
  { cardNumber: 'OP07-071', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP07-072 — [On Play] DON!! −1: Look 5, reveal up to 1 {Foxy Pirates} to hand (rest to bottom), then play up to 1 purple Character (≤4000 base power) from hand.
  { cardNumber: 'OP07-072', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Foxy Pirates' }, remainder: 'bottom' }, { fn: 'playFromHand', filter: { category: 'character', color: 'purple', maxPower: 4000 } }] } },
  // OP07-073 — [Activate: Main][Once Per Turn] DON!! −3: If opp has 3+ Characters, set this active.
  { cardNumber: 'OP07-073', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 3 }], gate: [{ kind: 'opponentCharacterCount', atLeast: 3 }], functions: [{ fn: 'setActiveSelf' }] } },
  // OP07-076 — [Counter] DON!! −1: +2000 battle, then rest up to 1 opp Character. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP07-076',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP07-079 (leader) — [When Attacking] trash 2 from top of deck: give up to 1 opp Character −1 cost this turn.
  { cardNumber: 'OP07-079', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true }] } },
  // OP07-094 — [Counter] up to 1 Leader/Char +2000 this battle. [Trigger] Return up to 1 of your Characters to hand.
  //   PARTIAL: the "if 10+ trash, return your CP-type Character" rider needs a trash-count gate (deferred).
  {
    cardNumber: 'OP07-094',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  // OP07-096 — [Main] Draw 1. [Trigger] K.O. up to 1 opp Character cost ≤3.
  //   PARTIAL: the "if 10+ trash, give opp −3 cost" rider needs a trash-count gate (deferred).
  {
    cardNumber: 'OP07-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },
  // OP07-098 — static: if fewer Life than opponent, cannot be K.O.'d in battle. [Trigger] If Leader [Vegapunk], play this.
  {
    cardNumber: 'OP07-098',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { gate: [{ kind: 'selfLifeLessThanOpponent' }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP07-102 — [Trigger] Return up to 1 opp Character cost ≤4 to hand.
  //   PARTIAL: the "and add this card to your hand" self-return clause is deferred (trigger-returns-to-hand family).
  { cardNumber: 'OP07-102', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP07-106 — [DON!! x1][When Attacking] If ≤1 Life, K.O. up to 1 opp Character cost ≤3.
  { cardNumber: 'OP07-106', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfLife', atMost: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  // OP07-110 — [On Play] add 1 top/bottom Life to hand → K.O. up to 1 opp Character cost ≤2. [Trigger] If Leader [Vegapunk], play this.
  {
    cardNumber: 'OP07-110',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP07-112 — [When Attacking][Once Per Turn] add 1 top/bottom Life to hand → rest up to 1 opp Character cost ≤4, then if ≤1 Life add top of deck to top of Life.
  { cardNumber: 'OP07-112', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 1 }] }] } },
  // OP07-117 (stage) — [End of Your Turn] If ≤3 Life, set up to 1 {Egghead} Character cost ≤5 active. [Trigger] Play this.
  {
    cardNumber: 'OP07-117',
    templates: [
      { templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfLife', atMost: 3 }], functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'Egghead', maxCost: 5 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP07-105 — [On K.O.] If <=2 Life, play {Egghead} cost<=4 from trash rested. [Trigger] If Leader [Vegapunk], play this.
  {
    cardNumber: 'OP07-105',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Egghead', maxCost: 4 }, rested: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP07-115 — [Counter] If <=2 Life, +3000 to a Leader/Character. [Trigger] Play {Egghead} Character cost<=5 from trash.
  {
    cardNumber: 'OP07-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Egghead', maxCost: 5 } }] } },
    ],
  },

  // OP07-003 — [Activate: Main] Trash this: give up to 2 opp Characters −2000 during this turn.
  { cardNumber: 'OP07-003', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
  // OP07-074 — [Activate: Main] Trash this: if Leader {Foxy Pirates}, add 1 DON!! from deck and rest it.
  { cardNumber: 'OP07-074', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP07-109 — [Activate: Main] Trash this: if <=2 Life, K.O. opp cost<=4 then draw 1. [Trigger] K.O. opp cost<=4.
  {
    cardNumber: 'OP07-109',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'selfLife', atMost: 2 }], functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true },
        { fn: 'draw', amount: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP07-004 — [On Play] You may trash 1 from hand: search up to 1 Character with 2000 power or less.
  { cardNumber: 'OP07-004', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', maxPower: 2000 }, remainder: 'bottom', ifPrevious: 'previousMovedAny' },
  ] } },

  // --- Batch: OP07 cards expressible with existing primitives (no new capability) ---

  // OP07-062 — [On Play] If your DON!! ≤ opponent's, return up to 1 {The Vinsmoke Family} Character with cost 1 to hand.
  { cardNumber: 'OP07-062', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'The Vinsmoke Family', exactCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP07-065 — [On Play] If Leader {Foxy Pirates} and DON!! ≤ opponent's, add 1 DON!! from deck and set it active.
  { cardNumber: 'OP07-065', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }, { kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
  // OP07-066 — [Blocker] [On Play] If your DON!! ≤ opponent's, add 1 DON!! from deck and rest it.
  { cardNumber: 'OP07-066', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP07-068 — [DON!! x1] [When Attacking] If your DON!! ≤ opponent's, add 1 DON!! from deck and rest it.
  { cardNumber: 'OP07-068', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP07-070 — [On Play] If your DON!! ≤ opponent's, play up to 1 {Foxy Pirates} card with a cost of 4 or less from hand.
  { cardNumber: 'OP07-070', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'playFromHand', filter: { typeIncludes: 'Foxy Pirates', maxCost: 4 } }] } },
  // OP07-118 — [On Play] You may trash 1 from hand: K.O. up to 1 opp Character cost<=5 and up to 1 opp Character cost<=3.
  { cardNumber: 'OP07-118', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP07-005 — [Blocker] [On Play] Give up to 1 of your opponent's Characters −2000 power during this turn.
  { cardNumber: 'OP07-005', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP07-012 — [On Play] Give up to 1 of your opponent's Characters −1000 power during this turn.
  { cardNumber: 'OP07-012', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
  // OP07-009 — [On Play] Up to 1 of your red Characters with a cost of 1 gains [Double Attack] during this turn.
  { cardNumber: 'OP07-009', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { color: 'red', exactCost: 1 } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true }] } },
  // OP07-011 — [DON!! x1] [When Attacking] K.O. up to 1 of your opponent's Characters with 2000 power or less.
  { cardNumber: 'OP07-011', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
  // OP07-014 — [On Play] Up to 1 of your [Portgas.D.Ace] cards gains +2000 power during this turn.
  { cardNumber: 'OP07-014', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Portgas.D.Ace' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
  // OP07-043 — [On Play] Up to 1 of your [Boa Hancock] cards gains +2000 power during this turn.
  { cardNumber: 'OP07-043', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Boa Hancock' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
  // OP07-088 — [On Play] Up to 1 of your [Rob Lucci] cards gains +2000 power during this turn.
  { cardNumber: 'OP07-088', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Rob Lucci' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
  // OP07-016 — [Main] +2000 to a {Revolutionary Army} Character, then −1000 to an opponent Character. [Trigger] same.
  {
    cardNumber: 'OP07-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, amount: 2000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, amount: 2000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true },
      ] } },
    ],
  },
  // OP07-034 — [When Attacking] If you have 3 or more Characters, this Character gains +2000 power during this turn.
  { cardNumber: 'OP07-034', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfCharacterCount', atLeast: 3 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },
  // OP07-035 — [Counter] +2000 to a Leader/Character; if 3+ Characters, +1000 more to that card. [Trigger] K.O. opp rested cost<=4.
  {
    cardNumber: 'OP07-035',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { ref: 'previous' }, amount: 1000, duration: 'duringThisBattle', ifGate: [{ kind: 'selfCharacterCount', atLeast: 3 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP07-037 — [Main] Look at 5; reveal up to 1 {Supernovas} (other than self), add to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP07-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP07-039 — [DON!! x1] [When Attacking] Look at 3 and place them at the top or bottom of the deck in any order.
  { cardNumber: 'OP07-039', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'searchTopDeck', look: 3, pick: 0, reveal: false, destination: 'deckTopOrBottom' }] } },
  // OP07-040 — [On Play] ① : Return up to 1 Character with a cost of 2 or less to the owner's hand.
  { cardNumber: 'OP07-040', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP07-045 — [On Play] Play up to 1 {The Seven Warlords of the Sea} Character with a cost of 4 or less other than [Jinbe] from hand.
  { cardNumber: 'OP07-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'The Seven Warlords of the Sea', maxCost: 4, excludeSelfName: true } }] } },
  // OP07-021 — [Blocker] [End of Your Turn] Set up to 1 of your DON!! cards as active.
  { cardNumber: 'OP07-021', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
  // OP07-082 — [On Play] Trash 2 from the top of your deck and give up to 1 opponent Character −1 cost during this turn.
  { cardNumber: 'OP07-082', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }] } },
  // OP07-086 — [On Play] Trash 2 from the top of your deck and give up to 1 opponent Character −2 cost during this turn.
  { cardNumber: 'OP07-086', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true }] } },
  // OP07-100 — [On Play] If 2 or less Life, draw 2 & trash 2. [Trigger] If Leader is [Vegapunk], play this card.
  {
    cardNumber: 'OP07-100',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP07-101 — [Blocker] [Trigger] If Leader is [Vegapunk], play this card.
  { cardNumber: 'OP07-101', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
  // OP07-104 — [Trigger] If your Leader has the {Egghead} type, draw 2 cards.
  { cardNumber: 'OP07-104', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [{ fn: 'draw', amount: 2 }] } },
  // OP07-107 — [Trigger] Draw 1. Then, if you have 1 or less Life cards, play this card.
  { cardNumber: 'OP07-107', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'triggerPlaySelf', ifGate: [{ kind: 'selfLife', atMost: 1 }] }] } },
  // OP07-111 — [On Play] Search {Egghead} (other than [Lilith]). [Trigger] If Leader is [Vegapunk], play this card.
  {
    cardNumber: 'OP07-111',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Egghead', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP07-113 — [Trigger] If your Leader has the {Egghead} type, rest up to 1 of your opponent's Leader or Character cards.
  { cardNumber: 'OP07-113', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }] } },
  // OP07-114 — [Main] Look at 5; reveal up to 1 {Egghead} (other than self), add to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP07-114',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Egghead', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP07-116 — [Main]/[Counter] +1000 to a Leader/Character; if opp has 2 or less Life, rest opp cost<=4. [Trigger] rest opp cost<=4.
  {
    cardNumber: 'OP07-116',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true },
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'opponentLife', atMost: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true },
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'opponentLife', atMost: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP07-119 — [On Play] Add up to 1 card from top of deck to top of Life. Then, if 2 or less Life, this Character gains [Rush] this turn.
  {
    cardNumber: 'OP07-119',
    templateId: 'ability', params: { timing: 'onPlay', functions: [
      { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
      { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
    ] },
  },

  // OP07-044 — [On Play] Draw 1 card.
  { cardNumber: 'OP07-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
  // OP07-054 - [Blocker] [On Play] Draw 1 card.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw is templated.
  { cardNumber: 'OP07-054', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
  // OP07-013 - [On Play] If Leader is Portgas.D.Ace, look at 5; add Portgas.D.Ace or red Event.
  {
    cardNumber: 'OP07-013',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Portgas.D.Ace' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Portgas.D.Ace' }, { category: 'event', color: 'red' }] } }] },
  },
  // OP07-015 - [Rush] [On Play] Give up to 2 rested DON!! to Leader/Character.
  // Note: [Rush] is an engine keyword flag. Only the on-play DON!! attach is templated.
  { cardNumber: 'OP07-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 2 }] } },
  // OP07-046 — [On Play] Look at 5; add up to 1 The Seven Warlords of the Sea.
  {
    cardNumber: 'OP07-046',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'The Seven Warlords of the Sea' } }] },
  },
  // OP07-022 - [On Play] Look at 5; add green Land of Wano other than this card's name.
  {
    cardNumber: 'OP07-022',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'green', typeIncludes: 'Land of Wano', excludeSelfName: true } }] },
  },
  // OP07-041 - [On Play] Look at 5; add Amazon Lily or Kuja Pirates other than this card's name.
  {
    cardNumber: 'OP07-041',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Amazon Lily' }, { typeIncludes: 'Kuja Pirates' }], excludeSelfName: true } }] },
  },

  // OP07-010 — [Blocker] [On Your Opponent's Attack] [Once Per Turn] trash 1 from hand: up to 1 Leader/Character +2000 battle.
  { cardNumber: 'OP07-010', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP07-019 — (Leader) [On Your Opponent's Attack] [Once Per Turn] rest 1 DON!!: rest up to 1 opp Leader/Character.
  { cardNumber: 'OP07-019', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }] } },

  // OP07-024 — [On Your Opponent's Attack] rest this: up to 1 {Fish-Man} Character cost<=5 gains [Blocker] this turn.
  { cardNumber: 'OP07-024', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Fish-Man', maxCost: 5 } }, keyword: 'blocker', duration: 'duringThisTurn', optional: true }] } },


  // --- codegen batch ---
  { cardNumber: 'OP07-008', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

];
