/**
 * Reviewed effect template assignments - Main Booster OP04.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP04_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP04-001 — Cannot attack; [Activate: Main] [Once Per Turn] rest 2 DON!!: draw 1 and up to 1 Character gains [Rush] this turn.
  {
    cardNumber: 'OP04-001',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { group: 'leader', player: 'controller' }, duration: 'permanent' }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          cost: [{ kind: 'restDon', count: 2 }],
          functions: [
            { fn: 'draw', amount: 1 },
            { fn: 'addKeyword', target: { group: 'characters', player: 'controller' }, keyword: 'rush', duration: 'duringThisTurn', optional: true },
          ],
        },
      },
    ],
  },

  // OP04 coverage batch: base-power targeting, trigger-play, and simple activated draw.
  { cardNumber: 'OP04-003', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 5000 } }, optional: true }] } },

  // OP04-002 — [Activate: Main] You may rest this and give your active Leader −5000: search Alabasta from top 5.
  {
    cardNumber: 'OP04-002',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: -5000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'leaderActive' }] },
        { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Alabasta' }, remainder: 'bottom', ifPrevious: 'previousSelectedAny' },
      ],
    },
  },

  // OP04-005 — gains [Blocker] while you have another [Kung Fu Jugon].
  { cardNumber: 'OP04-005', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfOtherNamedCharacterCount', name: 'Kung Fu Jugon', atLeast: 1 }] } }] } },

  // OP04-006 — [When Attacking] You may give your active Leader −5000: this Character +2000 until your next turn.
  { cardNumber: 'OP04-006', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: -5000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'leaderActive' }] },
    { fn: 'addPowerSelf', amount: 2000, duration: 'untilStartOfNextTurn', ifPrevious: 'previousSelectedAny' },
  ] } },

  // ── Triage batch (OP04 expressible): Alabasta/Dressrosa/Wano lines. ────────
  { cardNumber: 'OP04-008', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderName', name: 'Nefeltari Vivi' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true }] } },

  // OP04-009 — [When Attacking] may give active Leader −5000: return this Character to hand at end of turn.
  { cardNumber: 'OP04-009', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: -5000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'leaderActive' }] },
    { fn: 'returnSelfToHandAtEndOfTurn', ifPrevious: 'previousSelectedAny' },
  ] } },

  { cardNumber: 'OP04-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { typeIncludes: 'Animal', maxPower: 3000 } }] } },

  // OP04-011 (character) Nami —
  {
    cardNumber: 'OP04-011',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      functions: [
        { fn: 'revealTopThen', filter: { category: 'character', minPower: 6000 }, then: [{ fn: 'addPowerSelf', amount: 3000, duration: 'duringThisTurn' }] },
        { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'deck', player: 'owner', position: 'bottom' } },
      ],
    },
  },

  // OP04-013 Pell — [DON!! x1][When Attacking] K.O. up to 1 opp Character with 4000 power or less.
  { cardNumber: 'OP04-013', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },

  // OP04-015 Roronoa Zoro — [On Play] Give up to 1 opp Character −2000 power this turn.
  { cardNumber: 'OP04-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP04-016 Bad Manners Kick Course — [Counter] trash 1 → +3000 battle. [Trigger] give 1 opp Leader/Char −3000 this turn.
  {
    cardNumber: 'OP04-016',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP04-017 — [Counter] up to 1 opp Leader/Character −2000; −1000 more if your Leader is active.
  { cardNumber: 'OP04-017', templateId: 'ability', params: { timing: 'counter', functions: [
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'leaderActive' }] },
  ] } },

  {
    cardNumber: 'OP04-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Alabasta' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Alabasta' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
    ],
  },

  // OP04-019 Donquixote Doflamingo (leader) — [End of Your Turn] Set up to 2 DON!! active.
  { cardNumber: 'OP04-019', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP04-020 (leader) Issho —
  //   [DON!! x1] [Your Turn] Give all of your opponent's Characters −1 cost.[End of Your Turn] ➀ (You may
  //   rest the specified number of DON!! cards in your cost area.): Set up to 1 of your Characters with a
  //   cost of 5 or less as active.
  {
    cardNumber: 'OP04-020',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraOpponentCharacters', amount: -1, duration: 'permanent', sourceCondition: { donAttachedAtLeast: 1, turn: 'your' } }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { maxCost: 5 }, optional: true }] } },
    ],
  },

  // OP04-021 — [On Your Opponent's Attack] rest 2 DON!!: rest up to 1 of opponent's DON!!.
  { cardNumber: 'OP04-021', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'restOpponentDon', maxTargets: 1 }] } },

  // OP04-022 — [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a cost of 1 or less.
  {
    cardNumber: 'OP04-022',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] },
  },

  // OP04-024 (character) Sugar —
  //   [Opponent's Turn] [Once Per Turn] When your opponent plays a Character, if your Leader has the
  //   {Donquixote Pirates} type, rest up to 1 of your opponent's Characters. Then, rest this Character.
  //   [On Play] Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  // OP04-024 — [Opponent's Turn][OPT] When your opponent plays a Character, if your Leader has {Donquixote Pirates},
  //   rest up to 1 opponent Character, then rest this Character. [On Play] Rest up to 1 opponent Character cost ≤4.
  {
    cardNumber: 'OP04-024',
    templates: [
      { templateId: 'ability', params: { timing: 'onOpponentCharacterPlayedFromHand', oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [
        { fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 1 },
        { fn: 'restSelf' },
      ] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP04-025 — [On Your Opponent's Attack] rest 2 DON!!: rest up to 1 opp Character cost<=4.
  { cardNumber: 'OP04-025', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  //   or less. Then, set up to 1 of your DON!! cards as active at the end of this turn.
  { cardNumber: 'OP04-026', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'restDon', count: 1 }], gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true },
    { fn: 'setActiveControllerDonAtEndOfTurn', maxTargets: 1 },
  ] } },

  // OP04-027 Daddy Masterson — [DON!! x1][End of Your Turn] Set this Character active.
  { cardNumber: 'OP04-027', templateId: 'ability', params: { timing: 'endOfTurn', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'setActiveSelf' }] } },

  // OP04-028 (character) Diamante — [DON!! x1][End of Your Turn] If 2+ active DON!!, set active.
  {
    cardNumber: 'OP04-028',
    templateId: 'ability',
    params: {
      timing: 'endOfTurn',
      condition: { donAttachedAtLeast: 1 },
      gate: [{ kind: 'selfActiveDonCount', atLeast: 2 }],
      functions: [{ fn: 'setActiveSelf' }],
    },
  },

  // OP04-029 Dellinger — [End of Your Turn] Set up to 1 DON!! active.
  { cardNumber: 'OP04-029', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP04-030 Trebol — [On Play] K.O. up to 1 opp rested Character cost<=5.
  //   [On Your Opponent's Attack] rest 2 DON!!: rest up to 1 opp Character cost<=4.
  {
    cardNumber: 'OP04-030',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP04-118 — All red Characters with cost 3+ other than this Character gain [Rush].
  { cardNumber: 'OP04-118', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeywordAuraControllerCharacters', keyword: 'rush', duration: 'permanent', anyOfColors: ['red'], excludeSource: true, targetCondition: { minCost: 3 } }] } },

  // OP04-119 — [Opponent's Turn] if rested, active allies base cost 5 immune to effects; [On Play] rest this → play green cost==5 from hand.
  {
    cardNumber: 'OP04-119',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'koImmunityAuraControllerCharacters',
            scope: 'effect',
            duration: 'permanent',
            targetCondition: { minBaseCost: 5, maxBaseCost: 5, rested: false },
            sourceCondition: { rested: true, turn: 'opponent' },
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'rest', target: { ref: 'self' }, optional: true },
            { fn: 'playFromHand', filter: { category: 'character', color: 'green', exactCost: 5 }, ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
    ],
  },

  // --- codegen batch ---
  { cardNumber: 'OP04-031', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'leaderOrCharacters', player: 'opponent', filter: { rested: true } }, optional: true, maxTargets: 3 }] } },

  { cardNumber: 'OP04-032', templateId: 'ability', params: { timing: 'endOfTurn', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  //   Characters with a cost of 5 or less. Then, set up to 1 of your DON!! cards as active at the end of
  //   this turn.
  { cardNumber: 'OP04-033', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true },
    { fn: 'setActiveControllerDonAtEndOfTurn', maxTargets: 1 },
  ] } },

  // OP04-034 — [End of Your Turn] If 3+ active DON!!, K.O. up to 1 opp rested Character cost ≤3.
  { cardNumber: 'OP04-034', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfActiveDonCount', atLeast: 3 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },

  // OP04-035 Spiderweb — [Counter] +4000 battle, then set up to 1 of your Characters active. [Trigger] Leader +2000 this turn.
  {
    cardNumber: 'OP04-035',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'setActiveControllerCharacter', maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'duringThisTurn' }] } },
    ],
  },

  {
    cardNumber: 'OP04-036',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },
    ],
  },

  {
    cardNumber: 'OP04-037',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP04-038 The Weak Do Not Have the Right... — [Main]/[Counter] Rest 1 opp Leader/Char, then K.O. 1 opp rested Char cost ≤6. [Trigger] Set up to 5 DON!! active.
  {
    cardNumber: 'OP04-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'setActiveControllerDon', maxTargets: 5 }] } },
    ],
  },

  //   in any order.
  // NOTE: not yet implemented (needs template).

  // OP04-039 (leader) Rebecca — cannot attack; [Activate: Main] rest 1 DON!!, if hand <=6, look 2 for Dressrosa and trash rest.
  {
    cardNumber: 'OP04-039',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { group: 'leader', player: 'controller' }, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], gate: [{ kind: 'selfHand', atMost: 6 }], functions: [{ fn: 'searchTopDeck', look: 2, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa' }, remainder: 'trash' }] } },
    ],
  },

  // OP04-040 — [DON!! x1][When Attacking] If Life+hand ≤4, draw 1; if you also have a cost-8+ Character,
  //   you may add deck top to Life instead of drawing.
  {
    cardNumber: 'OP04-040',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      gate: [{ kind: 'selfLifeAndHand', atMost: 4 }],
      functions: [
        {
          fn: 'chooseOne',
          chooser: 'controller',
          prompt: 'Draw 1, or add the top of your deck to Life instead?',
          ifGate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }],
          options: [
            { label: 'draw', functions: [{ fn: 'draw', amount: 1 }] },
            { label: 'deckToLife', functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] },
          ],
        },
        { fn: 'draw', amount: 1, ifGate: [{ kind: 'noneOf', gates: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }] }] },
      ],
    },
  },

  // OP04-041 (character) Apis —
  {
    cardNumber: 'OP04-041',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'East Blue' }, remainder: 'bottom', ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // OP04-042 — Closed 2026-07-16: <Slash> attribute filter wired into the controllerCharacters selector.
  { cardNumber: 'OP04-042', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { attribute: 'slash' } }, amount: 3000, duration: 'duringThisTurn', optional: true }, { fn: 'trashTopDeck', count: 1 }] } },

  // OP04-043 — [When Attacking] [DON!! x1] Return up to 1 cost≤2 Character to owner's hand or deck bottom.
  { cardNumber: 'OP04-043', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Return to hand or deck bottom:',
    options: [
      { label: 'hand', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] },
      { label: 'deckBottom', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] },
    ],
  }] } },

  // OP04-044 Kaido — [On Play] Return up to 1 Character cost ≤8 and up to 1 Character cost ≤3 to the owner's hand.
  { cardNumber: 'OP04-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 8 } }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP04-045 — [On Play] Draw 1 card.
  { cardNumber: 'OP04-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },

  { cardNumber: 'OP04-046', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'searchTopDeck', look: 7, pick: 2, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Plague Rounds' }, { name: 'Ice Oni' }] }, remainder: 'bottom' }] } },

  //   deck; reveal a total of up to 2 [Plague Rounds] or [Ice Oni] cards and add them to your hand. Then,
  //   place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP04-047 — [Your Turn] [When Battling] You may place 1 opp Character cost ≤5 at bottom of deck at end of battle.
  {
    cardNumber: 'OP04-047',
    templateId: 'ability',
    params: {
      timing: 'onBattle',
      condition: { turn: 'your' },
      functions: [{ fn: 'moveBattleOpponentToBottomDeckAtEndOfBattle', maxCost: 5 }],
    },
  },

  // OP04-048 — [On Play] Return all hand to deck, shuffle, draw equal count.
  { cardNumber: 'OP04-048', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'returnHandShuffleDraw' }] } },

  // OP04-049 — [On K.O.] Draw 1 card.
  { cardNumber: 'OP04-049', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },

  // OP04-050 — [Activate: Main] trash 1 from hand + rest this: draw 1.
  { cardNumber: 'OP04-050', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'trashFromHand', count: 1 }, { fn: 'draw', amount: 1 }] } },

  // OP04-051 — [On Play] Look at 5; add up to 1 Animal Kingdom Pirates (excl. same name).
  {
    cardNumber: 'OP04-051',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Animal Kingdom Pirates', excludeSelfName: true } }] },
  },

  {
    cardNumber: 'OP04-052',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }, { kind: 'restThis' }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-053 (character) Page One —
  {
    cardNumber: 'OP04-053',
    templateId: 'ability',
    params: {
      timing: 'onYouEventActivated',
      oncePerTurn: true,
      condition: { donAttachedAtLeast: 1 },
      functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 1 },
      ],
    },
  },

  // OP04-055 — [Main]/[Trigger] trash 1 [Ice Oni] from hand + bottom-deck cost ≤4 Character → play [Ice Oni] from trash.
  {
    cardNumber: 'OP04-055',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { name: 'Ice Oni' }, optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, ifPrevious: 'previousMovedAny' }, { fn: 'playFromTrash', filter: { name: 'Ice Oni' }, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { name: 'Ice Oni' }, optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, ifPrevious: 'previousMovedAny' }, { fn: 'playFromTrash', filter: { name: 'Ice Oni' }, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP04-056 Gum-Gum Red Roc — [Main] Place up to 1 Character at bottom of owner's deck. [Trigger] cost ≤4.
  {
    cardNumber: 'OP04-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP04-057 Dragon Twister Demolition Breath — [Counter] +4000 battle, then place 1 Char cost ≤1 at bottom of deck. [Trigger] return 1 Char cost ≤6 to hand.
  {
    cardNumber: 'OP04-057',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  { cardNumber: 'OP04-059', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'duringThisTurn' }] } },

  { cardNumber: 'OP04-061', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  { cardNumber: 'OP04-063', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },

  // OP04-064 — [On Play] add 1 DON!! rested; then if 6+ DON!! draw 1. [Trigger] DON!! −2: play this.
  {
    cardNumber: 'OP04-064',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfDonFieldCount', atLeast: 6 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-066 — [On Play] look 5, reveal up to 1 "Baroque Works" type, add to hand, rest to bottom. [Trigger] DON!! −1: play this.
  {
    cardNumber: 'OP04-066',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-067 — [Blocker] [Trigger] DON!! −1: play this.
  { cardNumber: 'OP04-067', templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP04-065 (character) Miss.Goldenweek(Marianne) —
  //   [On Play] If your Leader's type includes "Baroque Works", up to 1 of your opponent's Characters with
  //   a cost of 5 or less cannot attack until the start of your next turn. [Trigger] DON!! −1 (You may
  //   return the specified number of DON!! cards from your field to your DON!! deck.): Play this card.
  { cardNumber: 'OP04-065', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, duration: 'untilStartOfNextTurn', optional: true }] } },

  // OP04-068 — [Blocker] is card data.
  { cardNumber: 'OP04-068', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP04-069 - [On Your Opponent's Attack] DON!! -1: copy attacker power. [Trigger] DON!! -1: play this.
  {
    cardNumber: 'OP04-069',
    templates: [
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'setBasePowerFromSource', target: { ref: 'self' }, source: { ref: 'battleOpponent' }, duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-070 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: give up to 1 opp Character −1000 this turn.
  { cardNumber: 'OP04-070', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP04-071 — [On Your Opponent's Attack] DON!! −1: this Character gains [Blocker] and +1000 battle.
  { cardNumber: 'OP04-071', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'donMinus', count: 1 }], functions: [
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'duringThisBattle' },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle' },
  ] } },

  // OP04-072 — [On Your Opponent's Attack] [Once Per Turn] DON!! −2 + rest this: K.O. up to 1 opp Character cost<=4.
  { cardNumber: 'OP04-072', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 2 }, { kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP04-073 — [Activate: Main] You may trash this and 1 {Baroque Works} Character: add 1 active DON!!.
  //   [Trigger] Play this card.
  {
    cardNumber: 'OP04-073',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Trash this and 1 {Baroque Works} Character to add 1 DON!!?',
        options: [
          { label: 'doNotPay', functions: [] },
          { label: 'pay', functions: [
            { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'Baroque Works', excludeSelf: true } }, to: { zone: 'trash', player: 'owner' }, minTargets: 1, maxTargets: 1 },
            { fn: 'trashSelf' },
            { fn: 'addDonFromDeck', count: 1, rested: false },
          ] },
        ],
      }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-074 Colors Trap — [Counter] DON!! −1: +1000 battle, then rest 1 opp Char cost ≤4. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP04-074',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP04-075 Nez-Palm Cannon — [Counter] +6000 battle, then if ≤2 Life add 1 DON!! (rested). [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP04-075',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 6000, duration: 'duringThisBattle', optional: true }, { fn: 'addDonFromDeck', count: 1, rested: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP04-076 Weakness...Is an Unforgivable Sin. — [Counter] DON!! −1: +1000 this turn. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP04-076',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP04-080 (character) Gyats —
  //   [On Play] Up to 1 of your {Dressrosa} type Characters can also attack active Characters during this turn.
  { cardNumber: 'OP04-080', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, keyword: 'canAttackActive', duration: 'duringThisTurn', optional: true }] } },

  // OP04-081 (character) Cavendish —
  // OP04-081 — [DON!! x1] This Character can also attack active Characters.
  //   [When Attacking] You may rest your Leader: K.O. up to 1 opponent Character cost ≤1, then trash 2 from the top of your deck.
  {
    cardNumber: 'OP04-081',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackActive', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'restLeader' }], functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true },
        { fn: 'trashTopDeck', count: 2 },
      ] } },
    ],
  },

  // OP04-083 — [Blocker] [On Play] none of your Characters can be K.O.'d by effects until start of next turn; then draw 2 and trash 2.
  { cardNumber: 'OP04-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'koImmunityControllerCharactersAll', scope: 'effect', duration: 'untilStartOfNextTurn' }, { fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  {
    cardNumber: 'OP04-085',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Dressrosa' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true }, { fn: 'trashTopDeck', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Dressrosa' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true }, { fn: 'trashTopDeck', count: 1 }] } },
    ],
  },

  // OP04-082 (character) Kyros — If this Character would be K.O.'d, you may rest your Leader or
  //   1 [Corrida Coliseum] instead. [On Play] If your Leader is [Rebecca], K.O. up to 1 opp
  //   Character cost<=1, then trash top of deck.
  {
    cardNumber: 'OP04-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementSelf', scope: 'any', restLeaderOrNamed: { cardName: 'Corrida Coliseum' }, duration: 'permanent' }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          gate: [{ kind: 'leaderName', name: 'Rebecca' }],
          functions: [
            { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true },
            { fn: 'trashTopDeck', count: 1 },
          ],
        },
      },
    ],
  },

  // OP04-090 (character) Monkey.D.Luffy —
  //   PARTIAL: the static active-Character attack grant is implemented below; the recycle-to-set-active line remains deferred.
  { cardNumber: 'OP04-090', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackActive', duration: 'permanent' }] } },

  // OP04-092 - [On Play] Look at 3; add Dressrosa other than this card's name, trash rest.
  {
    cardNumber: 'OP04-092',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa', excludeSelfName: true }, remainder: 'trash' }] },
  },

  // OP04-093 — [Main] Dressrosa Character +6000, then if trash >=15, that card gains [Double Attack]. [Trigger] Draw 3, trash 2.
  {
    cardNumber: 'OP04-093',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 6000, duration: 'duringThisTurn', optional: true },
        { fn: 'addKeyword', target: { ref: 'previous' }, keyword: 'doubleAttack', duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny', ifGate: [{ kind: 'selfTrashCount', atLeast: 15 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },
    ],
  },

  // OP04-094 — [Main] K.O. up to 1 opponent Character cost ≤4 (≤6 if you have 15+ cards in trash).
  //   [Trigger] You may rest your Leader: K.O. up to 1 opponent Character cost ≤5.
  {
    cardNumber: 'OP04-094',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'selfTrashCount', atMost: 14 }] },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, ifGate: [{ kind: 'selfTrashCount', atLeast: 15 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'restLeader' }], functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true },
      ] } },
    ],
  },

  // OP04-096 — If Leader {Dressrosa}, your {Dressrosa} Characters can attack Characters on the turn played.
  { cardNumber: 'OP04-096', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeywordAuraControllerCharacters', keyword: 'canAttackCharactersWhileSummoningSick', duration: 'permanent', anyOfTypes: ['Dressrosa'], gate: [{ kind: 'leaderType', type: 'Dressrosa' }] }] } },

  { cardNumber: 'OP04-097', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { anyOfTypes: ['Animal', 'SMILE'], maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'top', faceUp: true }, optional: true }] } },

  //   add 1 card from the top of your deck to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  // OP04-099 (character) Olin — alternate name [Charlotte Linlin] auto-extracted into def.aliasNames (nameMatches).
  {
    cardNumber: 'OP04-099',
    templateId: 'ability',
    params: {
      timing: 'lifeTrigger',
      gate: [{ kind: 'selfLife', atMost: 1 }],
      functions: [{ fn: 'triggerPlaySelf' }],
    },
  },

  // OP04-100 (character) Capone"Gang"Bege —
  //   [Trigger] Up to 1 of your opponent's Leader or Character cards cannot attack during this turn.
  { cardNumber: 'OP04-100', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'preventAttack', target: { group: 'leaderOrCharacters', player: 'opponent' }, duration: 'duringThisTurn', optional: true }] } },

  {
    cardNumber: 'OP04-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
    ],
  },

  // OP04-102 (character) Kin'emon —
  {
    cardNumber: 'OP04-102',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      cost: [{ kind: 'restDon', count: 1 }],
      functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'setActiveSelf', ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  {
    cardNumber: 'OP04-103',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-104 — [Blocker] [Trigger] trash 1 from hand: play this.
  { cardNumber: 'OP04-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },

  // OP04-105 — [Activate: Main] [Once Per Turn] you may trash 1 card with a [Trigger] from hand: rest up to 1 opp Character cost<=2.
  { cardNumber: 'OP04-105', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  { cardNumber: 'OP04-109', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },

  //   Character cards gains +3000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP04-108 — [DON!! x1] this Character gains [Banish]. [Trigger] trash 1 from hand: play this.
  {
    cardNumber: 'OP04-108',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'banish', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP04-110 — [Blocker] [On K.O.] Add up to 1 opp Character cost<=3 to the top or bottom of opponent's Life face-up.
  { cardNumber: 'OP04-110', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },

  // OP04-111 — assigned in expressible batch below.

  // OP04-112 (character) Yamato —
  { cardNumber: 'OP04-112', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCostFromCombinedLife: true } }, optional: true },
    { fn: 'moveCards', ifGate: [{ kind: 'selfLife', atMost: 1 }], from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
  ] } },

  { cardNumber: 'OP04-113', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  {
    cardNumber: 'OP04-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP04-116 Diable Jambe Joue Shot — [Counter] +6000 battle, then if combined Life <=4 K.O. cost <=2. [Trigger] draw 1.
  {
    cardNumber: 'OP04-116',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 6000, duration: 'duringThisBattle', optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifGate: [{ kind: 'combinedLifeTotal', atMost: 4 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP04-117 — (Event) [Main] Add up to 1 opp Character cost<=3 to top or bottom of opponent's Life face-up. [Trigger] add 1 top/bottom Life to hand: add up to 1 from hand to top of Life.
  {
    cardNumber: 'OP04-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'hand', player: 'controller' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
      ] } },
    ],
  },

  // ── Expressible batch (triage) ───────────────────────────────────────────
  // OP04-004 — [Activate: Main] rest this: Give up to 1 rested DON!! card to EACH of your {Alabasta} Characters.
  { cardNumber: 'OP04-004', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'giveDon', count: 1, maxTargets: -1, targetTypeIncludes: 'Alabasta', charactersOnly: true, optional: true }] } },

  { cardNumber: 'OP04-012', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'permanent', anyOfTypes: ['Alabasta'], sourceCondition: { turn: 'your' } }] } },

  { cardNumber: 'OP04-058', templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'opponent' }, gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

  {
    cardNumber: 'OP04-060',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  { cardNumber: 'OP04-079', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, duration: 'duringThisTurn', optional: true },
    { fn: 'trashTopDeck', count: 2 },
    { fn: 'ko', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, optional: true },
  ] } },

  { cardNumber: 'OP04-084', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'CP', excludeSelfName: true, maxCost: 2 }, remainder: 'trash' },
    { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'CP', excludeSelfName: true, maxCost: 2 }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP04-086 - [DON!! x1] When this battles and K.O.'s an opponent Character, draw 2 and trash 2.
  { cardNumber: 'OP04-086', templateId: 'ability', params: { timing: 'onBattle', requiresOpponentKoed: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  { cardNumber: 'OP04-088', templateId: 'ability', params: { timing: 'activateMain', functions: [
    { fn: 'restControllerLeaderOrStage' },
    { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousSelectedAny' },
  ] } },

  { cardNumber: 'OP04-091', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'restControllerLeaderOrStage' },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, ifPrevious: 'previousSelectedAny', ifGate: [{ kind: 'leaderType', type: 'Dressrosa' }] },
    { fn: 'trashTopDeck', count: 2, ifPrevious: 'previousSelectedAny' },
  ] } },

  {
    cardNumber: 'OP04-095',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifGate: [{ kind: 'selfTrashCount', atLeast: 15 }], ifPrevious: 'previousSelectedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  { cardNumber: 'OP04-098', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'trashTypeFromHand', count: 2, filter: { typeIncludes: 'Land of Wano' }, optional: true },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 1 }], from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
  ] } },

  {
    cardNumber: 'OP04-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfLifeLessThanOpponent' }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  { cardNumber: 'OP04-111', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'Homies', excludeSelf: true } }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 },
    { fn: 'setActiveControllerCharacter', filter: { name: 'Charlotte Linlin' }, maxTargets: 1, ifPrevious: 'previousMovedAny' },
  ] } },

];
