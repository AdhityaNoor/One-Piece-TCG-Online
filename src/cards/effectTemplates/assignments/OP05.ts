/**
 * Reviewed effect template assignments - Main Booster OP05.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP05_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP05-010 — [On Play] K.O. up to 1 of your opponent's Characters with 1000 power or less.
  { cardNumber: 'OP05-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 1000 } }, optional: true }] } },
  // OP05-014 — [DON!! x1] [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  { cardNumber: 'OP05-014', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP05-015 — [On Play] Look at 5; add up to 1 Revolutionary Army (excl. same name).
  {
    cardNumber: 'OP05-015',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army', excludeSelfName: true } }] },
  },
  // OP05-025 — [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  {
    cardNumber: 'OP05-025',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] },
  },
  // OP05-064 — [On Play] Look at 5; add up to 1 Kid Pirates (excl. same name).
  {
    cardNumber: 'OP05-064',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Kid Pirates', excludeSelfName: true } }] },
  },
  // OP05-117 — [On Play] Look at 5; add up to 1 Sky Island type.
  {
    cardNumber: 'OP05-117',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island' } }] },
  },
  // OP05 coverage batch: movement, search, DON!! -N, play-from-hand, and gated draw.
  {
    cardNumber: 'OP05-018',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxPower: 5000 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxPower: 5000 } }] } },
    ],
  },
  {
    cardNumber: 'OP05-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  { cardNumber: 'OP05-048', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  { cardNumber: 'OP05-049', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  { cardNumber: 'OP05-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 1 }] } },
  { cardNumber: 'OP05-051', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  {
    cardNumber: 'OP05-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  {
    cardNumber: 'OP05-059',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },
  {
    cardNumber: 'OP05-076',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Straw Hat Crew' }, { typeIncludes: 'Kid Pirates' }, { typeIncludes: 'Heart Pirates' }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Straw Hat Crew' }, { typeIncludes: 'Kid Pirates' }, { typeIncludes: 'Heart Pirates' }] } }] } },
    ],
  },
  {
    cardNumber: 'OP05-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -5000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  {
    cardNumber: 'OP05-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Kid Pirates' } }, amount: 5000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  { cardNumber: 'OP05-112', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Sky Island', exactCost: 1 } }] } },
  {
    cardNumber: 'OP05-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 2 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  { cardNumber: 'OP05-118', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'draw', amount: 4 }] } },

  // ── Triage batch (OP05 expressible): Revolutionary Army / Donquixote / Kid / DON!!-ramp lines. ──
  // OP05-005 Belo Betty — [On Play] If Leader {Revolutionary Army}: give up to 1 opp Leader/Char −1000 this turn.
  //   PARTIAL: the [When Attacking] "if this Character has 7000+ power" rider needs a self-power gate (deferred).
  { cardNumber: 'OP05-005', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
  // OP05-006 — [On Play] If Leader {Revolutionary Army}: give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP05-006', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
  // OP05-008 — [DON!! x1][Activate: Main][Once Per Turn] Give up to 2 rested DON!! to your Leader or 1 Character.
  { cardNumber: 'OP05-008', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'giveDon', count: 2 }] } },
  // OP05-011 — [On Play] K.O. up to 1 opp Character with 2000 power or less. [Trigger] If Leader multicolored, play this card.
  {
    cardNumber: 'OP05-011',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP05-019 Fire Fist — [Main]/[Trigger] give up to 1 opp Char −4000 this turn, then if ≤2 Life K.O. one at 0 power or less.
  {
    cardNumber: 'OP05-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
    ],
  },
  // OP05-021 (stage) — [Activate: Main] rest this Stage + trash 1 hand: Look 3, reveal up to 1 {Revolutionary Army} to hand, rest to bottom.
  { cardNumber: 'OP05-021', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army' }, ifPrevious: 'previousMovedAny' }] } },
  // OP05-023 — [DON!! x1][When Attacking] K.O. up to 1 opp rested Character cost ≤3.
  { cardNumber: 'OP05-023', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
  // OP05-033 — [Activate: Main] rest 1 DON!! + rest this: play up to 1 {Donquixote Pirates} Character cost ≤2 from hand.
  { cardNumber: 'OP05-033', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Donquixote Pirates', maxCost: 2 } }] } },
  // OP05-034 — [Activate: Main] rest 1 DON!! + rest this: Look 5, reveal up to 1 {Donquixote Pirates} to hand, rest to bottom.
  { cardNumber: 'OP05-034', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },
  // OP05-036 — [Blocker][On Block] Rest up to 1 opp Character cost ≤4.
  { cardNumber: 'OP05-036', templateId: 'ability', params: { timing: 'onBlock', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  // OP05-037 — [Counter] trash 1 → +3000 battle. [Trigger] Rest up to 1 opp Character cost ≤4.
  {
    cardNumber: 'OP05-037',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP05-038 — [Counter] +4000 battle, then trash 1 → set up to 3 DON!! active. [Trigger] Rest up to 1 opp Character cost ≤3.
  //   PARTIAL: trigger narrowed to opp Characters (the "or Leader" option is dropped — opp-leaderOrCharacters has no cost filter).
  {
    cardNumber: 'OP05-038',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'optionalTrashFromHand', count: 1 }, { fn: 'setActiveControllerDon', maxTargets: 3, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },
  // OP05-039 — [Counter] +4000 battle, then K.O. up to 1 opp rested Char cost ≤3. [Trigger] K.O. up to 1 opp rested Char cost ≤5.
  {
    cardNumber: 'OP05-039',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true }] } },
    ],
  },
  // OP05-041 (leader) — [Activate: Main][OPT] trash 1 → draw 1. [When Attacking] give up to 1 opp Char −1 cost this turn.
  {
    cardNumber: 'OP05-041',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP05-045 — [Activate: Main] rest this + trash 1 hand: place up to 1 Character cost ≤2 at bottom of deck.
  { cardNumber: 'OP05-045', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  // OP05-046 — [On K.O.] Draw 1, then place 1 card from hand at bottom of deck.
  { cardNumber: 'OP05-046', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' } }] } },
  // OP05-047 — [Blocker][On Block] Draw 1 if ≤3 hand, then this Character +1000 this battle.
  { cardNumber: 'OP05-047', templateId: 'ability', params: { timing: 'onBlock', functions: [{ fn: 'draw', amount: 1, ifGate: [{ kind: 'selfHand', atMost: 3 }] }, { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle' }] } },
  // OP05-054 — [On Play] Draw 2, then place 2 cards from hand at bottom of deck.
  { cardNumber: 'OP05-054', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 2 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 }] } },
  // OP05-055 — [Blocker][On Play] Look at 5, place them at top or bottom of deck in any order.
  { cardNumber: 'OP05-055', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },
  // OP05-061 — [DON!! x1][When Attacking] If 8+ DON!!: rest up to 1 opp Character cost ≤4.
  { cardNumber: 'OP05-061', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  // OP05-063 — [On Play] If 8+ DON!!: K.O. up to 1 opp Character cost ≤3.
  { cardNumber: 'OP05-063', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  // OP05-066 — [Blocker][Opponent's Turn] If 10 DON!!: this Character +1000 (continuous, opponent's turn only).
  { cardNumber: 'OP05-066', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfDonFieldCount', atLeast: 10 }] } }] } },
  // OP05-069 — [When Attacking] If opp has more DON!! than you: Look 5, reveal up to 1 {Heart Pirates} to hand, rest to bottom.
  { cardNumber: 'OP05-069', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentDonMoreThanSelf' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Heart Pirates' } }] } },
  // OP05-070 — [DON!! x1] If 8+ DON!!: this Character gains [Rush].
  { cardNumber: 'OP05-070', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }] } }] } },
  // OP05-071 — [When Attacking] If opp has more DON!! than you: give up to 1 opp Character −2000 this turn.
  { cardNumber: 'OP05-071', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentDonMoreThanSelf' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP05-072 — [On Play] If 8+ DON!!: give up to 2 opp Characters −2000 this turn.
  { cardNumber: 'OP05-072', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
  // OP05-073 — [On Play] trash 1 → add 1 DON!! (rested). [Trigger] DON!! −1: play this card.
  {
    cardNumber: 'OP05-073',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addDonFromDeck', count: 1, rested: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP05-085 — [Blocker][On Play] Trash 1 card from the top of your deck.
  { cardNumber: 'OP05-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 1 }] } },
  // OP05-090 — [Blocker][On Play]/[On K.O.] up to 1 {Dressrosa} Character +2000 this turn.
  {
    cardNumber: 'OP05-090',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP05-094 Overheat — [Main] give up to 1 opp Character −3 cost this turn. [Trigger] Draw 2, trash 1.
  //   PARTIAL: the "cost-0 opp Character won't become active next Refresh" rider (preventRefresh) is deferred.
  {
    cardNumber: 'OP05-094',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
  // OP05-095 — [Counter] up to 1 Leader/Char +4000 this battle.
  //   PARTIAL: the "if 15+ trash, K.O. 1 opp Char cost ≤4" rider needs a trash-count gate (deferred).
  { cardNumber: 'OP05-095', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
  // OP05-101 — static: if ≤2 Life, +1000. [On Play] Look 5, reveal up to 1 [Holly] to hand (rest to bottom), then play up to 1 [Holly].
  {
    cardNumber: 'OP05-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 2 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Holly' } }, { fn: 'playFromHand', filter: { category: 'character', name: 'Holly' } }] } },
    ],
  },
  // OP05-105 — [Trigger] trash 1 → play this card.
  { cardNumber: 'OP05-105', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
  // OP05-106 — [On Play] Look 5, reveal up to 1 {Sky Island} to hand, rest to bottom. [Trigger] play this card.
  //   PARTIAL: "other than [Shura]" exclusion is dropped (arbitrary-name exclusion not modeled).
  {
    cardNumber: 'OP05-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP05-029 — [On Your Opponent's Attack] [Once Per Turn] rest 1 DON!!: rest up to 1 opp Character cost<=6.
  { cardNumber: 'OP05-029', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },

  // OP05-075 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: play up to 1 {Baroque Works} Character cost<=3 from hand.
  { cardNumber: 'OP05-075', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 3 } }] } },

];
