/**
 * Reviewed effect template assignments - Main Booster OP10.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP10_ASSIGNMENTS: CardEffectAssignment[] = [

  // --- Batch: OP10 expressible with existing primitives (+ rested-char gate) ---



  // OP10-004 — [On Play] Look at 5; add up to 1 Punk Hazard (excl. same name).
  {
    cardNumber: 'OP10-004',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Punk Hazard', excludeSelfName: true } }] },
  },

  // ── Triage batch (OP10 expressible). Opponent type-filtered targeting isn't supported, so those are deferred. ──
  // OP10-005 — [Your Turn] this Character +3000. [On K.O.] Draw 1.
  {
    cardNumber: 'OP10-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'your' } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP10-006 — [On Play] Search [Smiley] to hand, rest to bottom.
  { cardNumber: 'OP10-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Smiley' }, remainder: 'bottom' }] } },

  // OP10-007 — [On Play] Play up to 1 {Punk Hazard} Character with a cost of 2 or less from your hand.
  { cardNumber: 'OP10-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Punk Hazard', maxCost: 2 } }] } },

  // OP10-008 — [Blocker] [On Play] If you don't have [Rock], play up to 1 [Rock] from hand.
  { cardNumber: 'OP10-008', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDoesNotControlNamed', name: 'Rock' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Rock' } }] } },

  // OP10-009 — [On Play] If Leader {Punk Hazard}, give up to 1 opp Character −3000 during this turn.
  { cardNumber: 'OP10-009', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Punk Hazard' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },


  // OP10-011 — [Blocker][Opponent's Turn] this Character +2000.
  { cardNumber: 'OP10-011', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { turn: 'opponent' } }] } },

  // OP10-015 — [On Play] Give up to 1 opp Character −1000 during this turn.
  { cardNumber: 'OP10-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP10-016 — [Activate: Main] rest this: give up to 2 rested DON!! to Leader/1 Char, then give up to 1 opp Character −1000.
  { cardNumber: 'OP10-016', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'giveDon', count: 2 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP10-017 — [On Play] If you don't have [Scotch], play up to 1 [Scotch] from hand.
  { cardNumber: 'OP10-017', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDoesNotControlNamed', name: 'Scotch' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Scotch' } }] } },

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

  // OP10-021 (stage) — [Activate: Main] rest this: If Leader [Caesar Clown], give 1 rested DON!! to Leader/1 Char.
  { cardNumber: 'OP10-021', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderName', name: 'Caesar Clown' }], functions: [{ fn: 'giveDon', count: 1 }] } },

  // OP10-022 — [DON!! x1][Activate: Main][Once Per Turn] if total Character cost ≥5, return 1 Char → reveal top Life → play Supernovas ≤5. PARTIAL: Life reveal approximated via move-to-hand.
  {
    cardNumber: 'OP10-022',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      condition: { donAttachedAtLeast: 1 },
      gate: [{ kind: 'selfCharactersTotalCostAtLeast', atLeast: 5 }],
      functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
        { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Supernovas', maxCost: 5 }, optional: true },
      ],
    },
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

  // OP10-028 — [Activate: Main] rest 2 DON!! + trash this: look 5, reveal up to 2 {The Akazaya Nine}, add to hand, rest to bottom.
  { cardNumber: 'OP10-028', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }, { kind: 'trashThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { typeIncludes: 'The Akazaya Nine' }, remainder: 'bottom' }] } },

  // OP10-026 — PARTIAL: "this Character" deck-bottom uses name filter (may pick wrong Kin'emon on field).
  { cardNumber: 'OP10-026', templateId: 'ability', params: { timing: 'activateMain', functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { name: "Kin'emon", exactBasePower: 0 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { name: "Kin'emon" } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
    { fn: 'playFromHand', filter: { name: "Kin'emon", exactCost: 6 }, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP10-027 — PARTIAL: same Kin'emon self-target approximation as OP10-026.
  { cardNumber: 'OP10-027', templateId: 'ability', params: { timing: 'activateMain', functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { name: "Kin'emon", exactBasePower: 1000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { name: "Kin'emon" } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
    { fn: 'playFromHand', filter: { name: "Kin'emon", exactCost: 6 }, ifPrevious: 'previousMovedAny' },
  ] } },


  // OP10-029 — [On Play] If 2+ rested Characters, set up to 1 rested {ODYSSEY} Character cost<=5 as active.
  { cardNumber: 'OP10-029', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'ODYSSEY', rested: true, maxCost: 5 } }] } },

  // OP10-030 — [Activate: Main] Set up to 1 DON!! active. PARTIAL: the "cannot set DON!! active via Character effects this turn" restriction is deferred.
  { cardNumber: 'OP10-030', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP10-032 (character) Tashigi —
  //   If you have a green Character other than [Tashigi] that would be removed from the field by your
  //   opponent's effect, you may rest this Character instead.
  // NOTE: not yet implemented (needs template).

  // OP10-033 (character) Nami —
  //   [On Play] If you have 2 or more rested {ODYSSEY} type Characters, up to 1 of your opponent's rested
  //   DON!! cards will not become active in your opponent's next Refresh Phase.
  // NOTE: not yet implemented (needs template).

  // OP10-034 — [Once Per Turn] battle K.O. replacement (top Life → hand).
  {
    cardNumber: 'OP10-034',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementSelf',
        scope: 'battle',
        oncePerTurn: true,
        lifeToHand: { position: 'top' },
        duration: 'permanent',
      }],
    },
  },

  // OP10-035 — [On K.O.] Rest up to 1 opp Character cost ≤5 (the "or Leader" option is dropped).
  { cardNumber: 'OP10-035', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },


  // OP10-037 — [End of Your Turn] Set up to 1 of your {ODYSSEY} Characters active. PARTIAL: the removal-replacement clause is deferred.
  { cardNumber: 'OP10-037', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'ODYSSEY' } }] } },

  // OP10-038 — [Opponent's Turn] If you have 2 or more rested Characters, this Character gains +2000 power.
  { cardNumber: 'OP10-038', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }] } }] } },


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

  // OP10-043 — [On Play] rest 1 {Dressrosa} Leader/Stage: up to 1 [Monkey.D.Luffy] gains [Banish] this turn.
  { cardNumber: 'OP10-043', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' }, { fn: 'addKeyword', ifPrevious: 'previousSelectedAny', target: { group: 'characters', player: 'controller', filter: { name: 'Monkey.D.Luffy' } }, keyword: 'banish', duration: 'duringThisTurn', optional: true }] } },

  // OP10-044 — [On Play] rest 1 {Dressrosa} Leader/Stage: return up to 1 opp Character cost<=1 to hand.
  { cardNumber: 'OP10-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' }, { fn: 'moveCards', ifPrevious: 'previousSelectedAny', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP10-042 (leader) Usopp —
  //   All of your {Dressrosa} type Characters with a cost of 2 or more gain +1 cost.[Opponent's Turn] [Once
  //   Per Turn] This effect can be activated when your {Dressrosa} type Character is removed from the field
  //   by your opponent's effect or K.O.'d. If you have 5 or less cards in your hand, draw 1 card.
  // NOTE: not yet implemented (needs template).



  // OP10-045 — [When Attacking] [OPT] Draw 2 & trash 1.
  { cardNumber: 'OP10-045', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },

  // OP10-046 — [On Play] Return up to 1 Character with a cost of 5 or less to the owner's hand.
  { cardNumber: 'OP10-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP10-048 — [On Play] rest 1 {Dressrosa} Leader/Stage: return up to 1 opp Character cost<=1 to hand.
  { cardNumber: 'OP10-048', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' }, { fn: 'moveCards', ifPrevious: 'previousSelectedAny', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },



  // OP10-049 (character) Sabo —
  //   If your Character with a base cost of 7 or less other than [Sabo] would be removed from the field by
  //   your opponent's effect, you may return this Character to the owner's hand instead.
  // NOTE: not yet implemented (needs template).

  // OP10-051 — [DON!! x1] [When Attacking] Search up to 1 {Revolutionary Army} Character.
  { cardNumber: 'OP10-051', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Revolutionary Army' }, remainder: 'bottom' }] } },

  // OP10-052 — [Blocker][On Play] Place up to 1 Character cost ≤1 at bottom of deck.
  { cardNumber: 'OP10-052', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP10-053 — If you have a {The Tontattas} Character other than [Bian], this Character gains [Blocker].
  { cardNumber: 'OP10-053', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'The Tontattas', atLeast: 2 }] } }] } },


  // OP10-055 — [Blocker][On K.O.] Return up to 1 opp Character cost ≤4 to hand.
  { cardNumber: 'OP10-055', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },



  // OP10-058 (character) Rebecca —
  //   [On Play] If there is a Character with a cost of 8 or more, draw 1 card. Then, reveal up to 2
  //   {Dressrosa} type Character cards with a cost of 7 or less other than [Rebecca] from your hand. Play 1
  //   of the revealed cards and play the other card rested if it has a cost of 4 or less.
  // NOTE: not yet implemented (needs template).

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

  // OP10-062 — [Blocker][On K.O.] DON!! −1: If Leader {Donquixote Pirates}, add up to 1 purple Event from trash to hand.
  { cardNumber: 'OP10-062', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'event', color: 'purple' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP10-063 — [On Play] If Leader includes "GERMA": Look 5, reveal up to 1 GERMA-type to hand, rest to bottom.
  { cardNumber: 'OP10-063', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'GERMA' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA' }, remainder: 'bottom' }] } },

  // OP10-065 — [Activate: Main] rest 1 DON!! + rest this: Look 5, reveal up to 1 {Donquixote Pirates} to hand, rest to bottom.
  { cardNumber: 'OP10-065', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' }, remainder: 'bottom' }] } },

  // OP10-066 — [On Your Opponent's Attack] [Once Per Turn] rest 2 DON!!: rest up to 1 opp Character cost<=4.
  { cardNumber: 'OP10-066', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP10-067 — [On Play] DON!! −1: add up to 1 purple Event cost ≤5 from trash to hand, then set up to 1 DON!! active.
  { cardNumber: 'OP10-067', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'event', color: 'purple', maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP10-069 — [DON!! x1][When Attacking] DON!! −1: K.O. up to 1 opp Character cost ≤1.
  { cardNumber: 'OP10-069', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  // OP10-070 (character) Trebol —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] All of your Characters with 1000 base power or less cannot be K.O.'d by your
  //   opponent's effects until the end of your opponent's next turn.
  // NOTE: not yet implemented (needs template).

  // OP10-071 — [On Play] DON!! −1: Play up to 1 {Donquixote Pirates} cost ≤5 from hand. PARTIAL: [On Opponent's Attack] ramp deferred.
  { cardNumber: 'OP10-071', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Donquixote Pirates', maxCost: 5 } }] } },

  // OP10-072 — [End of Your Turn] If 7+ DON!!, set up to 2 DON!! active. PARTIAL: the [On Play] "trash 1 Event → draw 2" is deferred (Event-category hand filter).
  { cardNumber: 'OP10-072', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfDonFieldCount', atLeast: 7 }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP10-074 — [Once Per Turn] K.O. replacement: rest 2 active DON!! (effect scope only).
  {
    cardNumber: 'OP10-074',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementSelf',
        scope: 'effect',
        oncePerTurn: true,
        restDon: { count: 2 },
        duration: 'permanent',
      }],
    },
  },
  // OP10-075 — [Activate: Main] Trash this: if your DON!! <= opponent's, draw 1.
  { cardNumber: 'OP10-075', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP10-076 — [On Play] You may trash 1 from hand: if Leader {Donquixote Pirates}, add 1 DON!! from deck and set it active.
  { cardNumber: 'OP10-076', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny' },
  ] } },


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

  // OP10-080 — [Counter] +4000 battle, then if 7+ DON!! and ≤5 hand draw 1. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP10-080',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfDonFieldCount', atLeast: 7 }, { kind: 'selfHand', atMost: 5 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP10-081 — [On Play] rest 1 {Dressrosa} Leader/Stage: K.O. up to 1 opp Character cost<=2, then trash 2 from top of deck.
  { cardNumber: 'OP10-081', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' },
    { fn: 'trashTopDeck', count: 2, ifPrevious: 'previousSelectedAny' },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },


  // OP10-082 — static: cannot be removed by opp effects (modeled as effect-K.O. immunity). PARTIAL: the trash-self activate ability is deferred.
  { cardNumber: 'OP10-082', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent' }] } },

  // OP10-085 — [DON!! x1] if 8+ cards in trash, [Rush]
  { cardNumber: 'OP10-085', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfTrashCount', atLeast: 8 }] } }] } },



  // OP10-086 — [Opponent's Turn] this Character +2000. [Activate: Main][OPT] If Leader {Blackbeard Pirates}
  //   and this Character was played this turn, K.O. up to 1 opponent Character with base cost 3 or less.
  {
    cardNumber: 'OP10-086',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { turn: 'opponent' } }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }, { kind: 'selfPlayedThisTurn' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 3 } }, optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP10-088 — [Activate: Main] rest this + 1 {Dressrosa} Leader/Stage: draw 1, then trash 2 from top of deck.
  { cardNumber: 'OP10-088', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' },
    { fn: 'draw', amount: 1, ifPrevious: 'previousSelectedAny' },
    { fn: 'trashTopDeck', count: 2, ifPrevious: 'previousMovedAny' },
  ] } },



  // OP10-090 — [Blocker] [On K.O.] Play up to 1 {Dressrosa} Character cost<=3 from your trash rested.
  { cardNumber: 'OP10-090', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Dressrosa', maxCost: 3 }, rested: true }] } },

  // OP10-091 — [Activate: Main] rest this + 1 {Dressrosa} Leader/Stage: K.O. up to 1 opp Character cost<=1, then trash 2 from top of deck.
  { cardNumber: 'OP10-091', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' },
    { fn: 'trashTopDeck', count: 2, ifPrevious: 'previousSelectedAny' },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP10-092 — [Activate: Main] [OPT] place 2 {Thriller Bark Pirates} from trash at bottom: up to 1 Character (other than self) +2000 this turn.
  { cardNumber: 'OP10-092', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates' } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }, { fn: 'addPower', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'controller', filter: { excludeSelf: true } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },



  // OP10-093 — [Activate: Main] Trash this: up to 1 of your black Characters gains +3 cost until end of opp next turn.
  { cardNumber: 'OP10-093', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'controller', filter: { color: 'black' } }, amount: 3, duration: 'endOfOpponentsTurn', optional: true }] } },

  // OP10-094 — [DON!! x1] This Character gains [Double Attack].
  { cardNumber: 'OP10-094', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },

  // OP10-095 — [On Play] rest 1 {Dressrosa} Leader/Stage: K.O. up to 1 opp Character cost<=4, then trash 2 from top of deck.
  { cardNumber: 'OP10-095', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' },
    { fn: 'trashTopDeck', count: 2, ifPrevious: 'previousSelectedAny' },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP10-096 — (Event) [Main] K.O. up to 1 opp {Seven Warlords} Character cost<=8. [Trigger] cost<=4.
  {
    cardNumber: 'OP10-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { typeIncludes: 'The Seven Warlords of the Sea', maxCost: 8 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { typeIncludes: 'The Seven Warlords of the Sea', maxCost: 4 } }, optional: true }] } },
    ],
  },



  // OP10-097 — [Main] up to 1 {Dressrosa} Character +2000 this turn. [Trigger] Draw 2, trash 1. PARTIAL: the trash-count-gated [Banish] rider is deferred.
  {
    cardNumber: 'OP10-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // PARTIAL: [Main] dual-K.O. with character-count gate deferred; mapped [Trigger] negate bundle.
  {
    cardNumber: 'OP10-098',
    templates: [
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'negateEffect', target: { group: 'leaderOrCharacters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
        { fn: 'negateEffect', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
      ] } },
    ],
  },

  // OP10-100 — PARTIAL: [Blocker] is a printed keyword; [DON!! x1][When Attacking] rest + [Trigger] mapped.
  {
    cardNumber: 'OP10-100',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCostFromCombinedLife: true } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }, { kind: 'combinedLifeTotal', atMost: 5 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP10-102 — [Activate: Main] [OPT] Up to 3 {Revolutionary Army} Characters +1000, then add top Life card to hand.
  { cardNumber: 'OP10-102', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, amount: 1000, duration: 'duringThisTurn', optional: true, maxTargets: 3 },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },


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


  // OP10-111 — [On Play] Look at 5; add up to 1 Supernovas (excl. same name).
  {
    cardNumber: 'OP10-111',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas', excludeSelfName: true } }] },
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

  { cardNumber: 'OP10-001', templates: [{ templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'permanent', anyOfTypes: ['Navy', 'Punk Hazard'], sourceCondition: { turn: 'opponent' } }] } }, { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfCharacterCurrentPowerCount', power: 7000, atLeast: 1 }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } }] },

  // --- Batch: OP10 expressible with existing primitives (+ rested-char gate) ---
  // OP10-001 (leader) Smoker —
  //   [Opponent's Turn] All of your {Navy} or {Punk Hazard} type Characters gain +1000 power.[Activate:
  //   Main] [Once Per Turn] If you have a Character with 7000 power or more, set up to 2 of your DON!!
  //   cards as active.
  // NOTE: not yet implemented (needs template).

  // OP10-002 (leader) Caesar Clown —
  //   [DON!! x2] [When Attacking] You may return 1 of your {Punk Hazard} type Characters with a cost of 2
  //   or more to the owner's hand: K.O. up to 1 of your opponent's Characters with 4000 power or less.
  // NOTE: not yet implemented (needs template).

  // OP10-003 (leader) Sugar —
  //   [End of Your Turn] If you have a {Donquixote Pirates} type Character with 6000 power or more, set up
  //   to 1 of your DON!! cards as active.[Opponent's Turn] [Once Per Turn] When you activate an Event, add
  //   up to 1 DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // OP10-010 (character) Chadros.Higelyges (Brownbeard) —
  //   [When Attacking] If you have 1 or less Characters with 6000 power or more, this Character gains +1000
  //   power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP10-036 (character) Perona —
  //   [Your Turn] [Once Per Turn] If a Character is rested by your effect, set up to 1 of your DON!! cards
  //   as active.
  // NOTE: not yet implemented (needs template).

  // OP10-047 (character) Koala —
  //   [When Attacking] You may return 1 of your {Revolutionary Army} type Characters with a cost of 3 or
  //   more to the owner's hand: This Character gains +3000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP10-056 (character) Mansherry —
  //   [On Play] You may rest 1 of your {Dressrosa} type Leader or Stage cards, and return 1 of your
  //   {Dressrosa} type Characters with a cost of 4 or more to the owner's hand: Return up to 1 of your
  //   opponent's Characters with a cost of 4 or less to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // OP10-057 (character) Leo —
  //   [On Play] You may rest your Leader or 1 of your Stage cards: If your Leader is [Usopp], look at 5
  //   cards from the top of your deck; reveal up to 2 {Dressrosa} type cards other than [Leo] and add them
  //   to your hand. Then, place the rest at the bottom of your deck in any order, and trash 1 card from
  //   your hand.
  // NOTE: not yet implemented (needs template).

  // OP10-077 (character) Bellamy —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Block] You may rest 2 of your DON!! cards: Add up to 1 DON!! card from your DON!!
  //   deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // OP10-083 (character) Kouzuki Momonosuke —
  //   [Activate: Main] You may rest this Character and 1 of your {Dressrosa} type Leader or Stage cards:
  //   Give up to 1 of your opponent's Characters -2 cost during this turn.
  // NOTE: not yet implemented (needs template).

  // OP10-087 (character) Tony Tony.Chopper —
  //   [Activate: Main] You may rest this Character and 1 of your {Dressrosa} type Leader or Stage cards: If
  //   your opponent has 5 or more cards in their hand, your opponent trashes 1 card from their hand. Then,
  //   trash 2 cards from the top of your deck.
  // NOTE: not yet implemented (needs template).

  // OP10-099 (leader) Eustass"Captain"Kid —
  //   [End of Your Turn] You may turn 1 card from the top of your Life cards face-up: Set up to 1 of your
  //   {Supernovas} type Characters with a cost of 3 to 8 as active. That Character gains [Blocker] until
  //   the end of your opponent's next turn.
  // NOTE: not yet implemented (needs template).

  // OP10-103 (character) Capone"Gang"Bege —
  //   [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1
  //   {Supernovas} type Character card from your hand to the top of your Life cards face-up.
  // NOTE: not yet implemented (needs template).

  // OP10-107 (character) Jewelry Bonney —
  //   [Blocker][On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Add up
  //   to 1 {Supernovas} type Character card with a cost of 5 from your hand to the top of your Life cards
  //   face-up.
  // NOTE: not yet implemented (needs template).

  // OP10-108 (character) Scratchmen Apoo —
  //   If you have a yellow {Supernovas} type Character other than [Scratchmen Apoo], this Character gains
  //   [Blocker].
  // NOTE: not yet implemented (needs template).

  // OP10-110 (character) Heat & Wire —
  //   [On Play] Rest up to 1 of your opponent's Characters with a cost equal to or less than the number of
  //   your opponent's Life cards. [Trigger] If you have 2 or less Life cards, play this card.
  // NOTE: not yet implemented (needs template).

  // OP10-114 (character) X.Drake —
  //   [Activate: Main] You may rest this Character: If the number of your Life cards is equal to or less
  //   than the number of your opponent's Life cards, rest up to 1 of your opponent's Characters with a cost
  //   of 4 or less.
  // NOTE: not yet implemented (needs template).

  // OP10-115 (event) Let's Meet Again in the New World —
  //   [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if
  //   you have 0 Life cards, draw 1 card. [Trigger] K.O. up to 1 of your opponent's Characters with a cost
  //   equal to or less than the number of your opponent's Life cards.
  // NOTE: not yet implemented (needs template).

  // OP10-118 (character) Monkey.D.Luffy —
  //   Once per turn, this Character cannot be K.O.'d by your opponent's effects.[When Attacking] You may
  //   place 3 cards from your trash at the bottom of your deck in any order: If your opponent has 5 or more
  //   cards in their hand, your opponent trashes 1 card from their hand.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP10-002', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'Punk Hazard', minBaseCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // PARTIAL: end-of-turn DON refresh deferred; mapped immediate setActive on gate.
  { cardNumber: 'OP10-003', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfTypedCharacterPowerAtLeast', typeIncludes: 'Donquixote Pirates', power: 6000 }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  { cardNumber: 'OP10-010', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfCharacterCurrentPowerCount', power: 6000, atMost: 1 }], functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' }] } },

  // PARTIAL: on-rested-by-your-effect DON setActive deferred; mapped onRested setActive DON as weak stand-in.
  { cardNumber: 'OP10-036', templateId: 'ability', params: { timing: 'onRested', oncePerTurn: true, condition: { turn: 'your' }, functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  { cardNumber: 'OP10-047', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army', minBaseCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPowerSelf', amount: 3000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP10-056', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' }, { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa', minBaseCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousSelectedAny' }, { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP10-057', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' }, { fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa', excludeSelfName: true }, remainder: 'bottom', ifGate: [{ kind: 'leaderName', name: 'Usopp' }] }, { fn: 'trashFromHand', count: 1, ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP10-077', templateId: 'ability', params: { timing: 'onBlock', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

  { cardNumber: 'OP10-083', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousSelectedAny' }] } },

  { cardNumber: 'OP10-087', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' }, { fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifGate: [{ kind: 'opponentHand', atLeast: 5 }], ifPrevious: 'previousSelectedAny' }, { fn: 'trashTopDeck', count: 2, ifPrevious: 'previousMovedAny' }] } },

  // PARTIAL: Event-trigger DON return deferred.
  // PARTIAL: cost 3–8 filter dropped (setActiveControllerCharacter filter has no minCost).
  { cardNumber: 'OP10-099', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'turnTopLifeFace', faceUp: true }, { fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'Supernovas', maxCost: 8 }, ifPrevious: 'previousSelectedAny' }, { fn: 'addKeyword', target: { ref: 'previous' }, keyword: 'blocker', duration: 'endOfOpponentsTurn', ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP10-103', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller', filter: { category: 'character', typeIncludes: 'Supernovas' } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP10-107', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller', filter: { category: 'character', typeIncludes: 'Supernovas', maxCost: 5 } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP10-108', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Supernovas', atLeast: 2 }] } }] } },

  // PARTIAL: combined-Life Trigger play deferred.
  { cardNumber: 'OP10-110', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }] } },

  { cardNumber: 'OP10-114', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'selfLifeLessThanOpponent' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  { cardNumber: 'OP10-115', templates: [{ templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfLife', atMost: 0 }] }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }] } }] },

  // PARTIAL: once-per-turn effect-KO immunity approximated as permanent effect immunity.
  { cardNumber: 'OP10-118', templates: [{ templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent' }] } }, { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 }, { fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifGate: [{ kind: 'opponentHand', atLeast: 5 }], ifPrevious: 'previousMovedAny' }] } }] },

];
