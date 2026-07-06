/**
 * Reviewed effect template assignments - Main Booster OP14.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP14_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (OP14 expressible). Self-power gates, "becomes rested" triggers, "rest N of your cards" cost, and choice/target-swap effects are deferred. ──
  { cardNumber: 'OP14-014', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxPower: 2000 } }] } },
  // OP14-016 — [DON!! x1][When Attacking] give up to 1 opp Character −2000. PARTIAL: removal-replacement deferred.
  { cardNumber: 'OP14-016', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP14-018 — [Trigger] play up to 1 red Character ≤2000 power from hand. PARTIAL: the power-gated [Counter] buff is deferred.
  { cardNumber: 'OP14-018', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxPower: 2000 } }] } },
  {
    cardNumber: 'OP14-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Supernovas' }, { typeIncludes: 'Straw Hat Crew' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  { cardNumber: 'OP14-023', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveSelf' }] } },
  // OP14-024 — [On Play] Set up to 3 DON!! active. [On K.O.] Rest up to 1 opp Character. PARTIAL: play restriction deferred.
  {
    cardNumber: 'OP14-024',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
    ],
  },
  { cardNumber: 'OP14-025', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Kuro' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'East Blue', maxCost: 6 } }] } },
  // OP14-037/038 — [Counter] Leader +3000. PARTIAL: "rest N of your cards" [Main] payoffs deferred.
  { cardNumber: 'OP14-037', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  { cardNumber: 'OP14-038', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  {
    cardNumber: 'OP14-039',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Dracule Mihawk' }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'leaderName', name: 'Dracule Mihawk' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
    ],
  },
  // OP14-040 (leader) — [Activate: Main] trash 1 → give up to 2 rested DON!! to Leader/1 Char (type filter dropped).
  { cardNumber: 'OP14-040', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'giveDon', count: 2, ifPrevious: 'previousMovedAny' }] } },
  { cardNumber: 'OP14-042', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 2 }, remainder: 'bottom' }] } },
  {
    cardNumber: 'OP14-043',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP14-045 — [On K.O.] Draw 1. PARTIAL: the "when a card is trashed from hand → [Rush]" trigger is deferred.
  { cardNumber: 'OP14-045', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
  { cardNumber: 'OP14-047', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },
  // OP14-049 — [On Play] rest 2 DON!!: Draw 2, return up to 1 Character cost ≤7 to hand. PARTIAL: static [Rush] trigger deferred.
  { cardNumber: 'OP14-049', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 7 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  { cardNumber: 'OP14-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'draw', amount: 1 }] } },
  // OP14-052 — [Blocker][On Play] trash 3 from hand: play up to 1 {Impel Down} cost ≤6 from hand.
  { cardNumber: 'OP14-052', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 3 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Impel Down', maxCost: 6 } }] } },
  // OP14-054 — [On Play] If Leader {Fish-Man}, draw 3. PARTIAL: the [End of Your Turn] trash-to-5 is deferred.
  { cardNumber: 'OP14-054', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'draw', amount: 3 }] } },
  // OP14-057 — [Trigger] Draw 2. PARTIAL: the OR-typed mass buff [Main] is deferred.
  { cardNumber: 'OP14-057', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },
  // OP14-058 — [Main] rest 3 DON!!: play {Fish-Man} ≤3 from hand, return 1 Char with 6000 base power. [Counter] draw 1 + Leader +3000.
  {
    cardNumber: 'OP14-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 3 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Fish-Man', maxCost: 3 } }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { exactBasePower: 6000 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },
  {
    cardNumber: 'OP14-059',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Jinbe' }, { kind: 'selfHand', atMost: 2 }], functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  // OP14-061 — [When Attacking] DON!! −1: give up to 1 opp Character −2000. PARTIAL: removal-replacement deferred.
  { cardNumber: 'OP14-061', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP14-063 — [On Play] Add 1 DON!! (active). PARTIAL: opp-DON-gated [On K.O.] play is deferred.
  { cardNumber: 'OP14-063', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
  { cardNumber: 'OP14-064', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 0 } }, optional: true }] } },
  { cardNumber: 'OP14-067', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' }, remainder: 'bottom' }] } },
  {
    cardNumber: 'OP14-072',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
    ],
  },
  {
    cardNumber: 'OP14-074',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }, { fn: 'addDonFromDeck', count: 2, rested: true }] } },
    ],
  },
  { cardNumber: 'OP14-075', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  {
    cardNumber: 'OP14-076',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },
  {
    cardNumber: 'OP14-081',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { exactBaseCost: 1 } }, optional: true }] } },
    ],
  },
  // OP14-084 — [On Play] If Leader "Baroque Works": play 1 {Baroque Works} cost ≤4 and 1 cost 1 from trash.
  { cardNumber: 'OP14-084', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 4 } }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Baroque Works', exactCost: 1 } }] } },
  { cardNumber: 'OP14-085', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
  // OP14-088 — [On K.O.] If Leader "Baroque Works", draw 1. PARTIAL: the Stage K.O. is deferred.
  { cardNumber: 'OP14-088', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'draw', amount: 1 }] } },
  {
    cardNumber: 'OP14-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
    ],
  },
  // OP14-090 — [On Play] Rest up to 1 opp Character cost 0. PARTIAL: the static "can attack Characters" clause is deferred.
  { cardNumber: 'OP14-090', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, optional: true }] } },
  {
    cardNumber: 'OP14-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Thriller Bark Pirates' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Thriller Bark Pirates' }, remainder: 'trash' }] } },
    ],
  },
  {
    cardNumber: 'OP14-099',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works' }, remainder: 'trash' }] } },
    ],
  },
  {
    cardNumber: 'OP14-100',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Thriller Bark Pirates' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
    ],
  },
  { cardNumber: 'OP14-102', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
  // OP14-104 — [Trigger] Play up to 1 Character cost ≤4 from trash. PARTIAL: the play-or-add-to-Life [On Play] choice is deferred.
  { cardNumber: 'OP14-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', maxCost: 4 } }] } },
  {
    cardNumber: 'OP14-107',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  {
    cardNumber: 'OP14-108',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }, { kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 7000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }, { kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 7000 } }, optional: true }] } },
    ],
  },
  { cardNumber: 'OP14-109', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
  // OP14-110 — [Trigger] Play up to 1 {Thriller Bark Pirates} cost ≤4 from trash rested. PARTIAL: the [On K.O.] trigger-filtered play is deferred.
  { cardNumber: 'OP14-110', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
  // OP14-112 — [On Play] If Leader {Warlords}, add top of deck to top of Life. PARTIAL: opp-Life-to-hand and trigger deferred.
  { cardNumber: 'OP14-112', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Seven Warlords of the Sea' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
  {
    cardNumber: 'OP14-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Amazon Lily' }, { typeIncludes: 'Kuja Pirates' }] }, remainder: 'bottom' }, { fn: 'trashFromHand', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  {
    cardNumber: 'OP14-114',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  {
    cardNumber: 'OP14-116',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }, { fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Amazon Lily' }, { typeIncludes: 'Kuja Pirates' }], maxCost: 4 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  {
    cardNumber: 'OP14-117',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates' } }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
    ],
  },

  // OP14-013 - [On Play] Search Supernovas other than self. [When Attacking] Give opponent Character -1000 power.
  {
    cardNumber: 'OP14-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas', excludeSelfName: true } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP14-015 — [Rush] [When Attacking] Give up to 1 of your opponent's Characters −1000 power.
  // Note: [Rush] is an engine keyword flag. Only the when-attacking effect is templated.
  // OP14-005 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP14-005', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  { cardNumber: 'OP14-015', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
  // OP14-087 - [On Play] If Leader type includes Baroque Works, look at 4; add Baroque Works other than self, trash rest.
  {
    cardNumber: 'OP14-087',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works', excludeSelfName: true }, remainder: 'trash' }] },
  },

  // --- codegen batch ---
  { cardNumber: 'OP14-051', templateId: 'ability', params: { timing: 'onKO', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'draw', amount: 1 }] } },
  { cardNumber: 'OP14-071', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },


  // --- codegen batch ---
  { cardNumber: 'OP14-106', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

];
