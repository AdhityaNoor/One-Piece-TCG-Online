/**
 * Reviewed effect template assignments - Main Booster OP06.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP06_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP06-098 — [Activate: Main] Rest 1 DON!! + rest this Stage: if Leader {Thriller Bark Pirates}, play {Thriller Bark} cost<=2 from trash rested.
  { cardNumber: 'OP06-098', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 2 }, rested: true }] } },

  // OP06-112 — [When Attacking] You may trash 1 from hand: rest opp DON!!. [Trigger] If opp <=3 Life, play this.
  {
    cardNumber: 'OP06-112',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'restOpponentDon', maxTargets: 1, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // --- Batch: OP06 cards expressible with existing primitives (no new capability) ---

  // OP06-061 — [On Play] If your DON!! ≤ opponent's, give opp Character −2000 and this Character gains [Rush].
  { cardNumber: 'OP06-061', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' },
  ] } },
  // OP06-069 — [On Play] If your DON!! ≤ opponent's and you have 5 or less cards in hand, draw 2.
  { cardNumber: 'OP06-069', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }, { kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] } },
  // OP06-077 — [Main] If your DON!! ≤ opponent's, place opp Character cost<=5 at bottom of deck. [Trigger] opp Character cost<=4.
  {
    cardNumber: 'OP06-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP06-013 — [On Play] Look at 3; reveal up to 1 {FILM} card, add to hand, rest to bottom. [Trigger] Activate [On Play].
  {
    cardNumber: 'OP06-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM' }, remainder: 'bottom' }] } },
    ],
  },
  // OP06-027 — [On K.O.] Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  { cardNumber: 'OP06-027', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  // OP06-036 — [On Play]/[On K.O.] K.O. up to 1 of your opponent's rested Characters with a cost of 4 or less.
  {
    cardNumber: 'OP06-036',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP06-040 — [Main] K.O. up to 2 of your opponent's rested Characters with a cost of 3 or less. [Trigger] same.
  {
    cardNumber: 'OP06-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true, maxTargets: 2 }] } },
    ],
  },
  // OP06-046 — [On Play] Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck.
  { cardNumber: 'OP06-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  // OP06-053 — [On K.O.] Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck.
  { cardNumber: 'OP06-053', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  // OP06-056 — [Main] Place up to 1 opp Character cost<=2 and up to 1 opp Character cost<=1 at bottom of deck. [Trigger] same.
  {
    cardNumber: 'OP06-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
      ] } },
    ],
  },
  // OP06-058 — [Main] Place up to 2 Characters cost<=6 at bottom of deck. [Trigger] Place up to 1 Character cost<=5.
  {
    cardNumber: 'OP06-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },
  // OP06-075 — [On Play] DON!! −1: Rest up to 2 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'OP06-075', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },
  // OP06-078 — [Main] Look at 5; reveal up to 1 GERMA-type (other than self), add to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP06-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP06-084 — [On K.O.] Up to 1 of your Leader or Character cards gains +1000 power during this turn.
  { cardNumber: 'OP06-084', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
  // OP06-089 — [On Play]/[On K.O.] Trash 3 cards from the top of your deck.
  {
    cardNumber: 'OP06-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
    ],
  },
  // OP06-097 — [Main] Trash 1 card from your opponent's hand. [Trigger] same.
  {
    cardNumber: 'OP06-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
    ],
  },
  // OP06-101 — [On Play] Up to 1 of your Leader or Character gains [Banish] this turn. [Trigger] K.O. up to 1 opp Character cost<=5.
  {
    cardNumber: 'OP06-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller' }, keyword: 'banish', duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },
  // OP06-108 — [Trigger] Up to 1 of your {Land of Wano} Leader or Character gains +2000 power during this turn.
  { cardNumber: 'OP06-108', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP06-007 — [On Play] K.O. up to 1 of your opponent's Characters with 10000 power or less.
  { cardNumber: 'OP06-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 10000 } }, optional: true }] } },
  // OP06-019 - [Main] K.O. power <=5000. [Trigger] K.O. power <=4000.
  {
    cardNumber: 'OP06-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },
  // OP06-050 — [On Play] Look at 5; add up to 1 Navy (excl. same name).
  {
    cardNumber: 'OP06-050',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true } }] },
  },
  // OP06-025 - [On Play] Look at 4; add Fish-Man or Merfolk other than this card's name.
  {
    cardNumber: 'OP06-025',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], excludeSelfName: true } }] },
  },

  // --- Batch 2: further OP06 cards expressible with existing primitives ---

  // OP06-004 — [On Play] Play up to 1 [Lily Carnation] from your hand.
  { cardNumber: 'OP06-004', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Lily Carnation' } }] } },

  // OP06-022 — (Leader) [Activate: Main] [Once Per Turn] If opponent has 3 or less Life, give up to 2 rested DON!! to 1 of your Characters.
  { cardNumber: 'OP06-022', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'giveDon', count: 2 }] } },

  // OP06-024 — [On Play] If Leader {New Fish-Man Pirates}, play up to 1 {Fish-Man} cost<=4 from hand. Then add 1 top Life to hand.
  { cardNumber: 'OP06-024', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Fish-Man', maxCost: 4 } },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-028 — [DON!! x1] [When Attacking] If Leader {New Fish-Man Pirates}, set up to 1 DON!! active, this +1000, add 1 top Life to hand.
  { cardNumber: 'OP06-028', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'setActiveControllerDon', maxTargets: 1 },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-029 — [DON!! x1] [When Attacking] [Once Per Turn] If Leader {New Fish-Man Pirates}, set this active, +1000, add 1 top Life to hand.
  { cardNumber: 'OP06-029', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'setActiveSelf' },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-030 — [When Attacking] If Leader {New Fish-Man Pirates}, cannot be KO'd in battle + +2000 until start of next turn, add 1 top Life to hand.
  { cardNumber: 'OP06-030', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'koImmunitySelf', scope: 'battle', duration: 'untilStartOfNextTurn' },
    { fn: 'addPowerSelf', amount: 2000, duration: 'untilStartOfNextTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-031 — [Trigger] Play up to 1 {Fish-Man} or {Merfolk} Character cost<=3 from your hand.
  { cardNumber: 'OP06-031', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },

  // OP06-034 — [Activate: Main] [Once Per Turn] Rest up to 1 opp Character cost<=4, this +1000, add 1 top Life to hand.
  { cardNumber: 'OP06-034', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-045 — [On Play] Draw 2 cards and place 2 cards from your hand at the bottom of your deck.
  { cardNumber: 'OP06-045', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'draw', amount: 2 },
    { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 },
  ] } },

  // OP06-063 — [On Play] You may trash 1 from hand: if DON!! <= opponent's, add up to 1 {The Vinsmoke Family} Character (<=4000 power) from trash to hand.
  { cardNumber: 'OP06-063', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'The Vinsmoke Family', maxPower: 4000 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // OP06-071 — [On Play] DON!! −1: if Leader {FILM}, add up to 2 {FILM} Character cards cost<=4 from trash to hand.
  { cardNumber: 'OP06-071', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'FILM' }], functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'FILM', maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 2 },
  ] } },

  // OP06-073 — [Blocker] [On Play] If you have 8+ DON!! on field, draw 1 and trash 1 from hand.
  { cardNumber: 'OP06-073', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // OP06-079 — (Stage) [Activate: Main] trash 1 from hand + rest this Stage: look 3, reveal up to 1 "GERMA" type, add to hand, rest to bottom.
  { cardNumber: 'OP06-079', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA' }, remainder: 'bottom' },
  ] } },

  // OP06-080 — (Leader) [DON!! x1] [When Attacking] rest 2 DON!! + trash 1 from hand: trash 2 top of deck, play up to 1 {Thriller Bark Pirates} cost<=4 from trash.
  { cardNumber: 'OP06-080', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, cost: [{ kind: 'restDon', count: 2 }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'trashTopDeck', count: 2 },
    { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 } },
  ] } },

  // OP06-082 — [On Play]/[On K.O.] If Leader {Thriller Bark Pirates}, draw 2 and trash 2 from hand.
  {
    cardNumber: 'OP06-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
    ],
  },

  // OP06-091 — [On Play] If Leader {Thriller Bark Pirates}, trash 5 cards from the top of your deck.
  { cardNumber: 'OP06-091', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },

  // OP06-099 — [On Play] Look at up to 1 card from the top of your or your opponent's Life; place it at the top or bottom.
  { cardNumber: 'OP06-099', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },

  // OP06-104 — [On K.O.] If opponent has 3 or less Life, add up to 1 top of deck to top of Life. [Trigger] If opponent has 3 or less Life, play this.
  {
    cardNumber: 'OP06-104',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-118 — [When Attacking] [Once Per Turn] rest 1 DON!!: set this active. [Activate: Main] [Once Per Turn] rest 2 DON!!: set this active.
  {
    cardNumber: 'OP06-118',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'setActiveSelf' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'setActiveSelf' }] } },
    ],
  },

  // --- Batch 3: remaining OP06 cleanly-expressible cards (life-to-hand buffs, conditional immunity) ---

  // OP06-017 — [Main]/[Counter] add 1 top Life to hand → up to 1 Leader/Char +3000 this turn.
  {
    cardNumber: 'OP06-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  // OP06-052 — [DON!! x1] If ≤4 cards in hand, this Character cannot be K.O.'d in battle.
  { cardNumber: 'OP06-052', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfHand', atMost: 4 }] } }] } },
  // OP06-059 — [Counter] up to 1 Leader/Char +1000 this turn, and draw 1. [Trigger] Look at 5, place top or bottom in any order.
  {
    cardNumber: 'OP06-059',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }, { fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },
    ],
  },
  // OP06-067 — static: if your DON!! ≤ opponent's, this Character +1000 (Blocker is card data).
  { cardNumber: 'OP06-067', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfDonAtMostOpponent' }] } }] } },
  // OP06-109 — [DON!! x2] If opp ≤3 Life, cannot be K.O.'d by effects. [Trigger] If opp ≤3 Life, play this.
  {
    cardNumber: 'OP06-109',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { donAttachedAtLeast: 2, gate: [{ kind: 'opponentLife', atMost: 3 }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP06-115 — [Counter] trash 1 → +3000 battle. [Trigger] If 0 Life, add top of deck to top of Life, then trash 1 from hand.
  {
    cardNumber: 'OP06-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 0 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }, { fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  // OP06-103 — [When Attacking] trash 2 from hand: add up to 1 of your Characters with 0 power to top or bottom of owner's Life face-up. [Trigger] If opp <=3 Life, play this.
  {
    cardNumber: 'OP06-103',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'controller', filter: { maxPower: 0 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
];
