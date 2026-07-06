/**
 * Reviewed effect template assignments - Main Booster OP10.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP10_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (OP10 expressible). Opponent type-filtered targeting isn't supported, so those are deferred. ──
  // OP10-005 — [Your Turn] this Character +3000. [On K.O.] Draw 1.
  {
    cardNumber: 'OP10-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'your' } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP10-011 — [Blocker][Opponent's Turn] this Character +2000.
  { cardNumber: 'OP10-011', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { turn: 'opponent' } }] } },
  // OP10-016 — [Activate: Main] rest this: give up to 2 rested DON!! to Leader/1 Char, then give up to 1 opp Character −1000.
  { cardNumber: 'OP10-016', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'giveDon', count: 2 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
  // OP10-018 — [Counter] +3000 battle, then give up to 1 opp Leader/Char −2000. [Trigger] up to 1 Leader/Char +1000.
  {
    cardNumber: 'OP10-018',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP10-019 — [Main] rest 5 DON!!: K.O. up to 1 opp Character 8000 power or less. [Counter] your Leader +3000 this battle.
  {
    cardNumber: 'OP10-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 5 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 8000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },
  // OP10-021 (stage) — [Activate: Main] rest this: If Leader [Caesar Clown], give 1 rested DON!! to Leader/1 Char.
  { cardNumber: 'OP10-021', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderName', name: 'Caesar Clown' }], functions: [{ fn: 'giveDon', count: 1 }] } },
  // OP10-030 — [Activate: Main] Set up to 1 DON!! active. PARTIAL: the "cannot set DON!! active via Character effects this turn" restriction is deferred.
  { cardNumber: 'OP10-030', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
  // OP10-035 — [On K.O.] Rest up to 1 opp Character cost ≤5 (the "or Leader" option is dropped).
  { cardNumber: 'OP10-035', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  // OP10-037 — [End of Your Turn] Set up to 1 of your {ODYSSEY} Characters active. PARTIAL: the removal-replacement clause is deferred.
  { cardNumber: 'OP10-037', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'ODYSSEY' } }] } },
  // OP10-052 — [Blocker][On Play] Place up to 1 Character cost ≤1 at bottom of deck.
  { cardNumber: 'OP10-052', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  // OP10-055 — [Blocker][On K.O.] Return up to 1 opp Character cost ≤4 to hand.
  { cardNumber: 'OP10-055', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP10-062 — [Blocker][On K.O.] DON!! −1: If Leader {Donquixote Pirates}, add up to 1 purple Event from trash to hand.
  { cardNumber: 'OP10-062', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'event', color: 'purple' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP10-063 — [On Play] If Leader includes "GERMA": Look 5, reveal up to 1 GERMA-type to hand, rest to bottom.
  { cardNumber: 'OP10-063', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'GERMA' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA' }, remainder: 'bottom' }] } },
  // OP10-065 — [Activate: Main] rest 1 DON!! + rest this: Look 5, reveal up to 1 {Donquixote Pirates} to hand, rest to bottom.
  { cardNumber: 'OP10-065', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' }, remainder: 'bottom' }] } },
  // OP10-067 — [On Play] DON!! −1: add up to 1 purple Event cost ≤5 from trash to hand, then set up to 1 DON!! active.
  { cardNumber: 'OP10-067', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'event', color: 'purple', maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'setActiveControllerDon', maxTargets: 1 }] } },
  // OP10-069 — [DON!! x1][When Attacking] DON!! −1: K.O. up to 1 opp Character cost ≤1.
  { cardNumber: 'OP10-069', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  // OP10-071 — [On Play] DON!! −1: Play up to 1 {Donquixote Pirates} cost ≤5 from hand. PARTIAL: [On Opponent's Attack] ramp deferred.
  { cardNumber: 'OP10-071', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Donquixote Pirates', maxCost: 5 } }] } },
  // OP10-072 — [End of Your Turn] If 7+ DON!!, set up to 2 DON!! active. PARTIAL: the [On Play] "trash 1 Event → draw 2" is deferred (Event-category hand filter).
  { cardNumber: 'OP10-072', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfDonFieldCount', atLeast: 7 }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },
  // OP10-080 — [Counter] +4000 battle, then if 7+ DON!! and ≤5 hand draw 1. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP10-080',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfDonFieldCount', atLeast: 7 }, { kind: 'selfHand', atMost: 5 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP10-082 — static: cannot be removed by opp effects (modeled as effect-K.O. immunity). PARTIAL: the trash-self activate ability is deferred.
  { cardNumber: 'OP10-082', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent' }] } },
  // OP10-086 — [Opponent's Turn] this Character +2000. PARTIAL: the "played this turn" activated K.O. is deferred.
  { cardNumber: 'OP10-086', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { turn: 'opponent' } }] } },
  // OP10-094 — [DON!! x1] This Character gains [Double Attack].
  { cardNumber: 'OP10-094', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },
  // OP10-097 — [Main] up to 1 {Dressrosa} Character +2000 this turn. [Trigger] Draw 2, trash 1. PARTIAL: the trash-count-gated [Banish] rider is deferred.
  {
    cardNumber: 'OP10-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
  // OP10-104 — [DON!! x1] If Leader {Supernovas} and opp has 3+ Life, this Character cannot be K.O.'d in battle.
  { cardNumber: 'OP10-104', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'leaderType', type: 'Supernovas' }, { kind: 'opponentLife', atLeast: 3 }] } }] } },
  // OP10-106 — [On K.O.] If Leader {Supernovas}: Look 3, reveal up to 1 {Supernovas}/{Kid Pirates} to hand, rest to bottom.
  { cardNumber: 'OP10-106', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Supernovas' }, { typeIncludes: 'Kid Pirates' }] }, remainder: 'bottom' }] } },
  // OP10-109 — [On K.O.] Trash up to 1 of opp's top Life. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'OP10-109',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top' }, to: { zone: 'trash', player: 'owner' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
  // OP10-112 — [On Play] rest this: trash 1 of opp's top Life. [End of Your Turn] if opp ≤2 Life, draw 1 trash 1.
  {
    cardNumber: 'OP10-112',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restThis' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top' }, to: { zone: 'trash', player: 'owner' } }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'opponentLife', atMost: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },
  // OP10-113 — static: if fewer Life than opp, this Character gains [Rush]. [Trigger] trash 1 → if Leader {Supernovas} play this.
  {
    cardNumber: 'OP10-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfLifeLessThanOpponent' }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  // OP10-116 — [Main] peek 1 of your/opp's top Life, place top or bottom; then K.O. up to 1 opp Character cost ≤5. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'OP10-116',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
  // OP10-117 — [Counter] If ≤1 Life: up to 1 Leader/Char +3000 this battle, then set up to 1 own Character cost ≤5 active. [Trigger] Draw 1.
  {
    cardNumber: 'OP10-117',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfLife', atMost: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }, { fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { maxCost: 5 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP10-119 — [On Play] add 1 {Supernovas} from hand to top of Life face-down, then give 1 rested DON!! to Leader/1 Char.
  { cardNumber: 'OP10-119', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'controller', filter: { typeIncludes: 'Supernovas' } }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }, { fn: 'giveDon', count: 1 }] } },

  // OP10-090 — [Blocker] [On K.O.] Play up to 1 {Dressrosa} Character cost<=3 from your trash rested.
  { cardNumber: 'OP10-090', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Dressrosa', maxCost: 3 }, rested: true }] } },

  // OP10-075 — [Activate: Main] Trash this: if your DON!! <= opponent's, draw 1.
  { cardNumber: 'OP10-075', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'draw', amount: 1 }] } },
  // OP10-093 — [Activate: Main] Trash this: up to 1 of your black Characters gains +3 cost until end of opp next turn.
  { cardNumber: 'OP10-093', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'controller', filter: { color: 'black' } }, amount: 3, duration: 'endOfOpponentsTurn', optional: true }] } },
  // OP10-076 — [On Play] You may trash 1 from hand: if Leader {Donquixote Pirates}, add 1 DON!! from deck and set it active.
  { cardNumber: 'OP10-076', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny' },
  ] } },

  // --- Batch: OP10 expressible with existing primitives (+ rested-char gate) ---

  // OP10-006 — [On Play] Search [Smiley] to hand, rest to bottom.
  { cardNumber: 'OP10-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Smiley' }, remainder: 'bottom' }] } },
  // OP10-007 — [On Play] Play up to 1 {Punk Hazard} Character with a cost of 2 or less from your hand.
  { cardNumber: 'OP10-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Punk Hazard', maxCost: 2 } }] } },
  // OP10-009 — [On Play] If Leader {Punk Hazard}, give up to 1 opp Character −3000 during this turn.
  { cardNumber: 'OP10-009', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Punk Hazard' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
  // OP10-015 — [On Play] Give up to 1 opp Character −1000 during this turn.
  { cardNumber: 'OP10-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
  // OP10-020 — [Main] Give opp Character −4000; if 2 or less Life, +1000 to a Leader/Character. [Trigger] K.O. opp power<=3000.
  {
    cardNumber: 'OP10-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
    ],
  },
  // OP10-023 — [On Play] If Leader {Navy}, rest up to 2 opp Characters cost<=5.
  { cardNumber: 'OP10-023', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, maxTargets: 2 }] } },
  // OP10-024 — [On Play] If 2+ rested Characters, rest opp cost<=5, then K.O. opp rested cost<=3.
  { cardNumber: 'OP10-024', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true },
  ] } },
  // OP10-025 — [On Play] If 2+ rested Characters, draw 3 & trash 2.
  { cardNumber: 'OP10-025', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },
  // OP10-029 — [On Play] If 2+ rested Characters, set up to 1 rested {ODYSSEY} Character cost<=5 as active.
  { cardNumber: 'OP10-029', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'ODYSSEY', rested: true, maxCost: 5 } }] } },
  // OP10-039 — [Main] If Leader {ODYSSEY}, search up to 2 {ODYSSEY} Characters. [Trigger] Rest opp cost<=5.
  {
    cardNumber: 'OP10-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'ODYSSEY' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'ODYSSEY' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },
  // OP10-041 — [Main] Rest opp cost<=6, then K.O. opp rested cost<=5. [Trigger] Rest opp cost<=4.
  {
    cardNumber: 'OP10-041',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP10-045 — [When Attacking] [OPT] Draw 2 & trash 1.
  { cardNumber: 'OP10-045', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
  // OP10-046 — [On Play] Return up to 1 Character with a cost of 5 or less to the owner's hand.
  { cardNumber: 'OP10-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP10-051 — [DON!! x1] [When Attacking] Search up to 1 {Revolutionary Army} Character.
  { cardNumber: 'OP10-051', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Revolutionary Army' }, remainder: 'bottom' }] } },
  // OP10-059 — [Main] Search {Dressrosa} Character. [Trigger] same.
  {
    cardNumber: 'OP10-059',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Dressrosa' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Dressrosa' }, remainder: 'bottom' }] } },
    ],
  },
  // OP10-060 — [Main] Place opp Character power<=6000 at bottom of deck. [Trigger] same.
  {
    cardNumber: 'OP10-060',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },
  // OP10-061 — [Main] Draw 1, then return opp cost<=2 to hand. [Trigger] Return Character cost<=2 to hand.
  {
    cardNumber: 'OP10-061',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  // OP10-078 — [Main]/[Counter] Search {Donquixote Pirates} (excl. self).
  {
    cardNumber: 'OP10-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates', excludeSelfName: true }, remainder: 'bottom' }] } },
    ],
  },
  // OP10-079 — [Main] K.O. opp cost<=5, then add 1 DON!! active. [Trigger] Add 1 DON!! active.
  {
    cardNumber: 'OP10-079',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true },
        { fn: 'addDonFromDeck', count: 1, rested: false },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP10-102 — [Activate: Main] [OPT] Up to 3 {Revolutionary Army} Characters +1000, then add top Life card to hand.
  { cardNumber: 'OP10-102', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, amount: 1000, duration: 'duringThisTurn', optional: true, maxTargets: 3 },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP10-004 — [On Play] Look at 5; add up to 1 Punk Hazard (excl. same name).
  {
    cardNumber: 'OP10-004',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Punk Hazard', excludeSelfName: true } }] },
  },
  // OP10-111 — [On Play] Look at 5; add up to 1 Supernovas (excl. same name).
  {
    cardNumber: 'OP10-111',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas', excludeSelfName: true } }] },
  },
];
