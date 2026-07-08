/**
 * Reviewed effect template assignments - Main Booster OP08.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP08_ASSIGNMENTS: CardEffectAssignment[] = [

  // --- Batch: OP08 cards expressible with existing primitives (+ new selfDonAtMostOpponent gate) ---
  // OP08-001 — PARTIAL: "up to 2 total DON to 1 Character" and {Animal}/{Drum Kingdom} filter approximated.
  { cardNumber: 'OP08-001', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 2, targetTypeIncludes: 'Animal' }] } },

  // ── Triage batch (OP08 expressible). "top or bottom of deck" placement is approximated as bottom. ──
  // OP08-002 (leader) — [DON!! x1][Activate: Main][OPT] Draw 1, place 1 from hand at bottom of deck, then give up to 1 opp Character −2000.
  { cardNumber: 'OP08-002', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'draw', amount: 1 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' } }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP08-004 — [On Play] If you have [Chess], K.O. up to 1 opp Character with 3000 power or less.
  { cardNumber: 'OP08-004', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfControlsNamed', name: 'Chess' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },

  // OP08-005 — [On Play] Give up to 1 opp Character −2000 this turn. PARTIAL: "if you don't have [Kuromarimo], play it" needs a named-absence gate (deferred).
  { cardNumber: 'OP08-005', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP08-006 — PARTIAL: requires [Kuromarimo] and [Chess] in trash (named-trash AND gate not modeled).
  { cardNumber: 'OP08-006', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { turn: 'your' } }] } },

  // OP08-007 — [Your Turn] [On Play]/[When Attacking] Look 5, play up to 1 {Animal} power<=4000 rested, rest to bottom.
  //   PARTIAL: rested play from deck is deferred; mapped as reveal-and-play chain.
  {
    cardNumber: 'OP08-007',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'revealTopThen', filter: { category: 'character', typeIncludes: 'Animal', maxPower: 4000 }, then: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Animal', maxPower: 4000 }, maxTargets: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', condition: { turn: 'your' }, functions: [{ fn: 'revealTopThen', filter: { category: 'character', typeIncludes: 'Animal', maxPower: 4000 }, then: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Animal', maxPower: 4000 }, maxTargets: 1 }] }] } },
    ],
  },

  // OP08-008 — [On Play] give up to 1 opp Character −1000. [DON!! x1][Activate: Main][OPT] add 1 top Life to hand → this gains [Rush] this turn.
  {
    cardNumber: 'OP08-008',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP08-010 — [DON!! x1][Activate: Main][OPT] up to 1 of your {Animal} Characters +1000 this turn (self-exclusion dropped).
  { cardNumber: 'OP08-010', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Animal' } }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },

  // OP08-012 — [DON!! x2] [When Attacking] If Leader is {Drum Kingdom}, K.O. up to 1 opp Character with 4000 power or less.
  { cardNumber: 'OP08-012', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, gate: [{ kind: 'leaderType', type: 'Drum Kingdom' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },

  // OP08-013 — [DON!! x2] This Character gains [Rush].
  { cardNumber: 'OP08-013', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },

  // OP08-014 — [DON!! x1] [When Attacking] Give opp Character −2000; this Character gains +2000 until end of opp next turn.
  { cardNumber: 'OP08-014', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
    { fn: 'addPowerSelf', amount: 2000, duration: 'endOfOpponentsTurn' },
  ] } },

  // OP08-015 - [On Play] Look at 4; add [Tony Tony.Chopper] or Drum Kingdom other than this card's name.
  {
    cardNumber: 'OP08-015',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Tony Tony.Chopper' }, { typeIncludes: 'Drum Kingdom' }], excludeSelfName: true } }] },
  },

  // OP08-016 — [Activate: Main] rest this: if Leader [Tony Tony.Chopper], all your [Tony Tony.Chopper] +2000 this turn.
  { cardNumber: 'OP08-016', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderName', name: 'Tony Tony.Chopper' }], functions: [{ fn: 'addPowerAuraControllerTypes', amount: 2000, duration: 'duringThisTurn', anyOfNames: ['Tony Tony.Chopper'] }] } },

  // OP08-017 — [Counter] +4000 to a Leader/Character, then −1000 to an opp Leader/Character. [Trigger] +1000.
  {
    cardNumber: 'OP08-017',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP08-018 — [Main] up to 3 of your Characters +1000, then opp Character −2000. [Trigger] opp Leader/Character −3000.
  {
    cardNumber: 'OP08-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, maxTargets: 3 },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP08-019 — [Main]/[Counter] opp Character −3000, then your Character +3000. [Trigger] K.O. opp Character power<=5000.
  {
    cardNumber: 'OP08-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
    ],
  },

  // OP08-021 — [Activate: Main] [OPT] If you have a {Minks} Character, rest up to 1 opp Character cost<=5.
  { cardNumber: 'OP08-021', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Minks', atLeast: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },

  // OP08-022 — [On Play] If Leader {Minks}, up to 2 opp rested Characters cost<=5 won't become active next Refresh.
  { cardNumber: 'OP08-022', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Minks' }], functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true, maxTargets: 2 }] } },

  // OP08-023 — [On Play]/[When Attacking] Up to 1 opp rested Character cost<=7 won't become active next Refresh.
  {
    cardNumber: 'OP08-023',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 7 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 7 } }, optional: true }] } },
    ],
  },

  // OP08-024 — [When Attacking] Up to 1 opp rested Character cost<=4 won't become active next Refresh.
  { cardNumber: 'OP08-024', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },

  // OP08-025 — [On Play] Up to 1 opp rested Character cost<=3 won't become active next Refresh.
  { cardNumber: 'OP08-025', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },

  // OP08-026 — [DON!! x1] [When Attacking] Up to 1 opp rested Character cost<=1 won't become active next Refresh.
  { cardNumber: 'OP08-026', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 1 } }, optional: true }] } },

  // OP08-028 — [On Play] If opponent has 7+ rested cards, this Character gains [Rush] this turn.
  { cardNumber: 'OP08-028', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentRestedCharacterCount', atLeast: 7 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },

  // OP08-029 — If this Character is active, your {Minks} cost≤3 Characters other than [Pekoms] cannot be K.O.'d by effects.
  { cardNumber: 'OP08-029', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunityAuraControllerCharacters', scope: 'effect', duration: 'permanent', anyOfTypes: ['Minks'], excludeSource: true, targetCondition: { maxCost: 3 }, sourceCondition: { rested: false } }] } },

  // OP08-030 — [On K.O.] choose one: rest 1 opp DON!! or K.O. 1 rested opp Character cost<=6.
  {
    cardNumber: 'OP08-030',
    templateId: 'ability',
    params: {
      timing: 'onKO',
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'restOpponentDon', functions: [{ fn: 'restOpponentDon', maxTargets: 1, optional: true }] },
          { label: 'koRested', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true }] },
        ],
      }],
    },
  },

  // OP08-031 — [On Play] Set up to 1 of your {Minks} Characters with a cost of 2 or less as active.
  { cardNumber: 'OP08-031', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Minks', maxCost: 2 } }] } },

  // OP08-032 — [Activate: Main] Rest this: If Leader is {Minks}, set up to 1 of your DON!! cards as active.
  { cardNumber: 'OP08-032', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Minks' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP08-033 — [On Play] If Leader {Minks} and opponent has 7+ rested cards, K.O. up to 1 opp rested Character cost<=2.
  { cardNumber: 'OP08-033', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Minks' }, { kind: 'opponentRestedCharacterCount', atLeast: 7 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 2 } }, optional: true }] } },

  // OP08-034 — [On Play] Look at 5; add up to 1 Minks (excl. same name).
  {
    cardNumber: 'OP08-034',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Minks', excludeSelfName: true } }] },
  },

  // OP08-037 — (Event) [Main] rest 1 {Minks} Character: rest up to 1 opp Character. [Trigger] draw 1.
  {
    cardNumber: 'OP08-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'rest', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Minks' } }, optional: true },
        { fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, ifPrevious: 'previousSelectedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP08-036 — [Main] All opp rested Characters cost<=7 won't become active next Refresh. [Trigger] rest up to 1 opp Character.
  {
    cardNumber: 'OP08-036',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 7 } } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
    ],
  },

  // OP08-038 — [Main] rest 2 Characters: your Characters can't be K.O.'d by opp effects until start of opp next turn. [Trigger] rest opp cost<=3.
  {
    cardNumber: 'OP08-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'rest', target: { group: 'characters', player: 'controller' }, optional: true, maxTargets: 2 },
        { fn: 'koImmunityControllerCharactersAll', scope: 'effect', duration: 'untilStartOfNextTurn', ifPrevious: 'previousSelectedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP08-039 — [Activate: Main] Rest this: if Leader {Minks}, set 1 DON active. [End of Your Turn] Set up to 1 {Minks} Character active.
  {
    cardNumber: 'OP08-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Minks' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Minks' } }] } },
    ],
  },

  // OP08-040 — [On Play] reveal 2 {Whitebeard Pirates} from hand + Leader WB: return up to 1 opp Character cost<=4 to hand.
  //   PARTIAL: reveal-from-hand not modeled; gate approximates holding 2 WB cards in hand.
  { cardNumber: 'OP08-040', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifGate: [{ kind: 'selfHandMatching', typeIncludes: 'Whitebeard Pirates', atLeast: 2 }, { kind: 'leaderType', type: 'Whitebeard Pirates' }] }] } },

  // OP08-041 — [Activate: Main] return this to hand + Leader {Kuja Pirates}: place up to 1 opp Character cost<=1 at bottom of deck.
  //   PARTIAL: self-return approximated as optional return 1 of your Characters (instance exclusion not modeled).
  { cardNumber: 'OP08-041', templateId: 'ability', params: { timing: 'activateMain', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'leaderType', type: 'Kuja Pirates' }] },
  ] } },

  // OP08-042 — [DON!! x1] [When Attacking] Return up to 1 Character with a cost of 3 or less to the owner's hand.
  { cardNumber: 'OP08-042', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP08-043 (character) Edward.Newgate —
  //   [On Play] If your Leader's type includes "Whitebeard Pirates" and you have 2 or less Life cards,
  //   select all of your opponent's Characters on their field. Until the end of your opponent's next turn,
  //   none of the selected Characters can attack unless your opponent trashes 2 cards from their hand
  //   whenever they attack.
  // NOTE: not yet implemented (needs template).

  // OP08-044 — [Activate: Main] [OPT] reveal 2 {Whitebeard Pirates} cards from hand: this Character +2000 this turn.
  { cardNumber: 'OP08-044', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfHandMatching', typeIncludes: 'Whitebeard Pirates', atLeast: 2 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },

  // OP08-045 (character) Thatch —
  //   If this Character would be removed from the field by your opponent's effect or K.O.'d, trash this
  //   Character and draw 1 card instead.
  // NOTE: not yet implemented (needs template).

  // OP08-046 (character) Shakuyaku —
  //   [Your Turn] [Once Per Turn] When a Character is removed from the field by your effect, if your
  //   opponent has 5 or more cards in their hand, your opponent places 1 card from their hand at the bottom
  //   of their deck. Then, rest this Character.
  // NOTE: not yet implemented (needs template).

  // OP08-047 — [On Play] you may return 1 of your Characters to hand: return up to 1 Character with a cost of 6 or less to hand.
  //   NOTE: the cost's "other than this Character" self-exclusion is dropped (name-based exclusion would over-match; instance exclusion isn't modeled on move costs).
  { cardNumber: 'OP08-047', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP08-049 — [On Play] Reveal top of deck; if {Whitebeard Pirates}, this Character gains [Rush] this turn.
  { cardNumber: 'OP08-049', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'revealTopThen', filter: { typeIncludes: 'Whitebeard Pirates' }, then: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] }] } },

  // OP08-050 — [Blocker][On Play] Draw 2, place 2 from hand at bottom of deck.
  { cardNumber: 'OP08-050', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 2 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 }] } },

  // OP08-051 — [On Play] Up to 1 of your [Edward Weevil] cards gains +2000 power during this turn.
  { cardNumber: 'OP08-051', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Edward Weevil' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP08-052 — [On Play] Reveal top of deck; play up to 1 {Whitebeard Pirates} Character cost<=4.
  { cardNumber: 'OP08-052', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'revealTopThen', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', maxCost: 4 }, then: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', maxCost: 4 }, maxTargets: 1 }] }] } },

  // OP08-053 — [Main] If Leader {Whitebeard Pirates}: Look 3, reveal up to 1 {Whitebeard Pirates}/[Monkey.D.Luffy] to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP08-053',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Whitebeard Pirates' }, { name: 'Monkey.D.Luffy' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP08-055 — (Event) [Main] reveal 2 {Whitebeard Pirates} cards from hand: place up to 1 Character cost<=6 at bottom of deck.
  { cardNumber: 'OP08-055', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfHandMatching', typeIncludes: 'Whitebeard Pirates', atLeast: 2 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP08-054 — [Counter] +3000 battle, then reveal top and play up to 1 {Whitebeard Pirates} Character cost<=3.
  { cardNumber: 'OP08-054', templateId: 'ability', params: { timing: 'counter', functions: [
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true },
    { fn: 'revealTopThen', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', maxCost: 3 }, then: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', maxCost: 3 }, maxTargets: 1 }] },
  ] } },

  // OP08-056 (stage) Moby Dick —
  //   [Your Turn] [Once Per Turn] When your Character with a type including "Whitebeard Pirates" is removed
  //   from the field by an effect, draw 1 card. Then, place 1 card from your hand at the top or bottom of
  //   your deck. [Trigger] Play this card.
  // NOTE: not yet implemented (needs template).

  // OP08-057 — [Activate: Main] [OPT] DON!! −2: choose one — draw 1 if hand<=5, or give up to 1 opp Character −2 cost this turn.
  { cardNumber: 'OP08-057', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 2 }], functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Choose one:',
    options: [
      { label: 'drawIfLowHand', functions: [{ fn: 'draw', amount: 1, ifGate: [{ kind: 'selfHand', atMost: 5 }] }] },
      { label: 'minus2Cost', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] },
    ],
  }] } },

  // OP08-058 — [When Attacking] turn 2 top Life face-up: add 1 DON!! from deck and rest it.
  //   PARTIAL: only 1-card turnTopLifeFace primitive; chained twice to approximate turning 2 Life face-up.
  { cardNumber: 'OP08-058', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'turnTopLifeFace', faceUp: true },
    { fn: 'turnTopLifeFace', faceUp: true, ifPrevious: 'previousSelectedAny' },
    { fn: 'addDonFromDeck', count: 1, rested: true, ifPrevious: 'previousSelectedAny' },
  ] } },

  // OP08-059 — [Activate: Main] Trash this: if Leader {Animal Kingdom Pirates} and 10 DON!!, play [King] cost<=7 from hand.
  { cardNumber: 'OP08-059', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }, { kind: 'selfDonFieldCount', atLeast: 10 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'King', maxCost: 7 } }] } },

  // OP08-060 — [On Play] DON!! −1: if opponent has 5+ DON!! on field, this Character gains [Rush] this turn.
  //   PARTIAL: opponent DON>=5 field gate deferred; rush granted whenever DON!! −1 is paid.
  { cardNumber: 'OP08-060', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },

  // OP08-061 — [When Attacking] DON!! −1: K.O. up to 1 opp Character with a cost of 3 or less.
  { cardNumber: 'OP08-061', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  // OP08-062 — PARTIAL: dynamic max cost from opponent DON!! count deferred; mapped static minCost 3 maxCost 10.
  { cardNumber: 'OP08-062', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Charlotte Katakuri', minCost: 3, maxCost: 10 } }] } },

  // OP08-063 — [On Play] turn 1 top Life face-down: add 1 DON!! from deck active.
  { cardNumber: 'OP08-063', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'turnTopLifeFace', faceUp: false }, { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousSelectedAny' }] } },

  // OP08-064 — [Activate: Main] DON!! −1: Play up to 1 [Biscuit Warrior] from your hand.
  { cardNumber: 'OP08-064', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Biscuit Warrior' } }] } },

  // OP08-066 — [Blocker] [On K.O.] Add up to 1 DON!! card from your DON!! deck and rest it.
  { cardNumber: 'OP08-066', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  { cardNumber: 'OP08-067', templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'your' }, gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP08-068 — [On K.O.] Add DON!! rested. [Trigger] DON!! −1: Play this card.
  {
    cardNumber: 'OP08-068',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP08-069 — [On Play] DON!! −1, trash 1 → add top of deck to top of Life. PARTIAL: "add opp Character to their Life face-up" is deferred.
  { cardNumber: 'OP08-069', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP08-070 — [Blocker] [On K.O.] DON!! −1: Play up to 1 [Viscount Hiyoko] with a cost of 5 or less from your hand.
  { cardNumber: 'OP08-070', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Viscount Hiyoko', maxCost: 5 } }] } },

  // OP08-071 — [Opponent's Turn] [On K.O.] DON!! −1: Play up to 1 [Baron Tamago] cost<=4 from deck, then shuffle.
  { cardNumber: 'OP08-071', templateId: 'ability', params: { timing: 'onKO', condition: { turn: 'opponent' }, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromDeck', filter: { category: 'character', name: 'Baron Tamago', maxCost: 4 } }] } },

  // OP08-072 (character) Biscuit Warrior —
  //   Under the rules of this game, you may have any number of this card in your deck.[Blocker] (After your
  //   opponent declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP08-073 — [Opponent's Turn] [On K.O.] DON!! −1: Play up to 1 [Count Niwatori] cost<=6 from deck, then shuffle.
  { cardNumber: 'OP08-073', templateId: 'ability', params: { timing: 'onKO', condition: { turn: 'opponent' }, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromDeck', filter: { category: 'character', name: 'Count Niwatori', maxCost: 6 } }] } },

  // OP08-074 (character) Black Maria —
  //   [Activate: Main] [Once Per Turn] If you have no other [Black Maria] Characters, add up to 5 DON!!
  //   cards from your DON!! deck and rest them. Then, at the end of this turn, return DON!! cards from your
  //   field to your DON!! deck until you have the same number of DON!! cards on your field as your
  //   opponent.
  // NOTE: not yet implemented (needs template).

  // OP08-075 — [Main] DON!! −1: Rest up to 1 opp Character cost ≤2. [Trigger] add 1 DON!! (active). PARTIAL: "turn all your Life face-down" deferred.
  {
    cardNumber: 'OP08-075',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP08-076 — [Main] add 1 DON!! active; if opp has 6000+ power Character, add 1 more active. [Trigger] add 1 DON!! active.
  {
    cardNumber: 'OP08-076',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addDonFromDeck', count: 1, rested: false },
        { fn: 'addDonFromDeck', count: 1, rested: false, ifGate: [{ kind: 'opponentHasCharacterBasePowerAtLeast', power: 6000 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP08-077 — [Main] DON!! −2: if Leader {Animal Kingdom Pirates} or {Big Mom Pirates}, K.O. up to 2 opp Characters cost<=6.
  { cardNumber: 'OP08-077', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }, { kind: 'leaderType', type: 'Big Mom Pirates' }] }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, maxTargets: 2 }] } },

  // OP08-079 (character) Kaido —
  //   [Activate: Main] [Once Per Turn] You may trash 1 card from your hand: If this Character was played on
  //   this turn, trash up to 1 of your opponent's Characters with a cost of 7 or less. Then, your opponent
  //   trashes 1 card from their hand.
  // NOTE: not yet implemented (needs template).

  // OP08-080 — [On Play] Look at 5; add up to 1 Animal Kingdom Pirates (excl. same name).
  {
    cardNumber: 'OP08-080',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Animal Kingdom Pirates', excludeSelfName: true } }] },
  },

  // OP08-081 — [When Attacking] place 3 CP from trash at bottom: K.O. up to 1 opp Character cost 0.
  { cardNumber: 'OP08-081', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'CP' } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 }, { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true }] } },

  // OP08-082 — [Activate: Main] rest 1 DON!! and you may rest this: give up to 1 opp Character −2 cost this turn.
  { cardNumber: 'OP08-082', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], functions: [
    { fn: 'rest', target: { ref: 'self' }, optional: true },
    { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true },
  ] } },

  // OP08-083 (character) Sheepshead —
  //   [DON!! x1] [Your Turn] Give all of your opponent's Characters −1 cost.
  { cardNumber: 'OP08-083', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraOpponentCharacters', amount: -1, duration: 'permanent', sourceCondition: { donAttachedAtLeast: 1, turn: 'your' } }] } },

  // OP08-084 — static: this Character +4 cost. [Activate: Main] rest this: draw 1, trash 1, then K.O. up to 1 opp Character cost ≤3.
  {
    cardNumber: 'OP08-084',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 4, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP08-085 — [DON!! x1] [When Attacking] If you have a Character with cost 8+, K.O. up to 1 opp Character cost<=4.
  { cardNumber: 'OP08-085', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP08-086 — [On Play] If opponent has a cost-0 Character, draw 2 and trash 2.
  { cardNumber: 'OP08-086', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentHasCharacterExactCost', exactCost: 0 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  // OP08-087 — [Blocker] [Activate: Main] [Once Per Turn] Give up to 1 of your opponent's Characters −1 cost.
  // Note: [Blocker] is an engine keyword flag, not an IR ability. Only the activate effect is templated.
  {
    cardNumber: 'OP08-087',
    templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }] },
  },

  // OP08-088 — [On Play] Up to 1 of your Characters gains +1 cost until the end of your opponent's next turn.
  { cardNumber: 'OP08-088', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'controller' }, amount: 1, duration: 'endOfOpponentsTurn', optional: true }] } },

  // OP08-090 — [On Play] Play up to 1 {SMILE} Character with a cost of 2 or less from your trash.
  { cardNumber: 'OP08-090', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'SMILE', maxCost: 2 } }] } },

  // OP08-091 — [On Play] You may trash 1 from hand: K.O. opp Character cost<=3. [Trigger] K.O. opp Character cost<=3.
  {
    cardNumber: 'OP08-091',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP08-092 — [On Play] Play up to 1 [Ulti] with a cost of 4 or less from your trash.
  { cardNumber: 'OP08-092', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', name: 'Ulti', maxCost: 4 } }] } },

  // OP08-093 — [DON!! x1] This Character gains +2 cost (continuous).
  { cardNumber: 'OP08-093', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 2, duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },

  // OP08-094 — (Event) [Main]/[Counter] place 3 from trash at bottom: K.O. up to 1 opp Character cost<=2. [Trigger] Activate [Main].
  {
    cardNumber: 'OP08-094',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP08-095 — [Main] if 10+ trash, up to 1 Character +2000 until end of opp next turn. [Trigger] Leader/Character +2000 this turn.
  {
    cardNumber: 'OP08-095',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfTrashCount', atLeast: 10 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 2000, duration: 'endOfOpponentsTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP08-096 — PARTIAL: +5000 only if milled card cost>=6 not gated; trigger playFromTrash mapped.
  {
    cardNumber: 'OP08-096',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'trashTopDeck', count: 1 },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 5000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', color: 'black', maxCost: 3 } }] } },
    ],
  },

  // OP08-097 — [Main] If Leader {Animal Kingdom Pirates}, −2 cost to opp then K.O. opp cost 0. [Trigger] K.O. opp cost<=3.
  {
    cardNumber: 'OP08-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [
        { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP08-098 — [DON!! x1] [When Attacking] play up to 1 {Shandian Warrior} from hand cost <= DON count; if you do, add 1 top Life to hand.
  //   PARTIAL: dynamic maxCost from DON count and life-to-hand rider deferred; mapped as flat maxCost play.
  { cardNumber: 'OP08-098', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Shandian Warrior', maxCost: 10 } }] } },

  // OP08-100 — [On Play] Look 7, play up to 1 [Upper Yard], rest to bottom.
  { cardNumber: 'OP08-100', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'searchTopDeck', look: 7, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Upper Yard' }, remainder: 'bottom' },
    { fn: 'playFromHand', filter: { category: 'character', name: 'Upper Yard' } },
  ] } },

  // OP08-101 — PARTIAL: end-of-turn deck→life not linked to the life-trash cost; fires every end of turn.
  {
    cardNumber: 'OP08-101',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'trash', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
    ],
  },

  // OP08-102 — PARTIAL: maxCost should scale with your Life count (maxCostFromSelfLife not modeled); mapped maxCost 5.
  { cardNumber: 'OP08-102', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP08-103 — [Activate: Main] [OPT] add 1 top Life to hand: up to 1 Character +1000 until end of opp next turn.
  { cardNumber: 'OP08-103', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 1000, duration: 'endOfOpponentsTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP08-104 — [Trigger] You may trash 1 from hand: Play this card. Then, draw 1 card.
  { cardNumber: 'OP08-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
    { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP08-105 — [Trigger] Draw 2, trash 1. PARTIAL: the [DON!! x1] custom "when a card leaves opp Life" trigger is deferred.
  { cardNumber: 'OP08-105', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },

  // OP08-106 — [On Play] trash 1 [Trigger] from hand: K.O. opp cost<=5; if hand<=3 draw 1. [Trigger] Activate [On Play].
  {
    cardNumber: 'OP08-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' },
        { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfHand', atMost: 3 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' },
        { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfHand', atMost: 3 }] },
      ] } },
    ],
  },

  // OP08-107 — [Activate: Main] Rest this: Up to 1 of your [Charlotte Pudding] cards gains +2000 power during this turn.
  { cardNumber: 'OP08-107', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Charlotte Pudding' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP08-109 — [On Play] if Leader {Shandian Warrior} and [Kalgara] on field, add 1 top of deck to top of Life.
  { cardNumber: 'OP08-109', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Shandian Warrior' }, { kind: 'selfControlsNamed', name: 'Kalgara' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },

  // OP08-110 — [On Play] Search {reveal [Upper Yard]} to hand, rest to bottom, then play up to 1 [Upper Yard] from hand.
  { cardNumber: 'OP08-110', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Upper Yard' }, remainder: 'bottom' },
    { fn: 'playFromHand', filter: { category: 'character', name: 'Upper Yard' } },
  ] } },

  // OP08-111 — [DON!! x1] [When Attacking] Opp can't Blocker this battle. [Trigger] trash 1: if <=2 Life, play this.
  {
    cardNumber: 'OP08-111',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'preventBlockers', duration: 'duringThisBattle' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
      ] } },
    ],
  },

  // OP08-112 (character) S-Snake —
  //   [On Play] Up to 1 of your opponent's Characters with a cost of 6 or less other than [Monkey.D.Luffy]
  //   cannot attack until the end of your opponent's next turn. [Trigger] Activate this card's [On Play]
  //   effect.
  // NOTE: not yet implemented (needs opponent Character target filters with negative-name exclusion, e.g. "other than [Monkey.D.Luffy]").

  // OP08-113 — [Trigger] You may trash 1: if <=2 Life, play this and K.O. up to 1 opp Character cost<=3.
  { cardNumber: 'OP08-113', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
  ] } },

  // OP08-114 — [DON!! x1] If fewer Life than opp, this Character +2000. [Trigger] trash 1 → if ≤2 Life play this.
  //   PARTIAL: the "cannot be K.O.'d in battle by <Slash>" attribute immunity is deferred.
  {
    cardNumber: 'OP08-114',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfLifeLessThanOpponent' }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP08-115 — [Counter] If Leader {Shandian Warrior}: up to 1 Leader/Char +3000 this battle. [Trigger] Draw 2, trash 1.
  //   PARTIAL: "then play [Upper Yard]" (a Stage) is deferred — playFromHand plays Characters only.
  {
    cardNumber: 'OP08-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderType', type: 'Shandian Warrior' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // OP08-116 — [Counter] up to 1 Leader/Char +4000 this battle, then add 1 top/bottom Life to hand → add 1 {Shandian Warrior} from hand to top of Life face-up.
  { cardNumber: 'OP08-116', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller', filter: { typeIncludes: 'Shandian Warrior' } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP08-117 — [Main] trash 1 top Life → K.O. opp cost≤7; [Trigger] Life top to hand → hand to Life top.
  {
    cardNumber: 'OP08-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'trash', player: 'owner' }, optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 7 } }, optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // OP08-118 — PARTIAL: −3000/−2000 split on two targets approximated as sequential −3000 then −2000.
  { cardNumber: 'OP08-118', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 1 },
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 1 },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true },
  ] } },

  // OP08-119 — PARTIAL: koAllCharacters cannot exclude self; DON!!−10 + life add/trash mapped.
  { cardNumber: 'OP08-119', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 10 }], functions: [
    { fn: 'koAllCharacters' },
    { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
    { fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top' }, to: { zone: 'trash', player: 'owner' }, optional: true },
  ] } },

];
