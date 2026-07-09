/**
 * Reviewed effect template assignments - Main Booster OP15.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP15_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP15-005 — [When Attacking] If opponent has any given DON!!, this Character +2000 this turn.
  { cardNumber: 'OP15-005', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentGivenDonCount', atLeast: 1 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },

  // OP15-006 — if 4+ Events in trash, +2000
  { cardNumber: 'OP15-006', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }] } }] } },

  // OP15-001 (leader) Krieg — [DON!! x1][Opponent's Turn] if only {East Blue} Characters, opp Characters −2000. [Activate: Main][OPT] rest opp Character with 2+ given DON!!.
  {
    cardNumber: 'OP15-001',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'addPowerAuraOpponentCharacters',
            amount: -2000,
            duration: 'permanent',
            gate: [{ kind: 'selfAllCharactersTyped', typeIncludes: 'East Blue' }],
            sourceCondition: { turn: 'opponent', donAttachedAtLeast: 1 },
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { minDonAttached: 2 } }, optional: true }],
        },
      },
    ],
  },
  // OP15-002 — PARTIAL: variable Event/Stage trash scaling + event-cost-3+ draw gate deferred; mapped battle trash-1 → +1000 and once-per-turn draw.
  {
    cardNumber: 'OP15-002',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onOpponentsAttack',
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-003 — K.O. replacement (trash Char ≤6000 power from hand) + Morgan-style activate.
  {
    cardNumber: 'OP15-003',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementSelf',
            trashFromHand: { count: 1, filter: { category: 'character', maxCurrentPower: 6000 } },
            duration: 'permanent',
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          functions: [
            { fn: 'giveDonFromOpponentCostArea', count: 1, restedOnly: true, optional: true },
            { fn: 'giveDonFromPreviousTargetOwnerCostArea', count: 1, restedOnly: true, optional: true, ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
    ],
  },
  { cardNumber: 'OP15-004', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLeaderPowerAtMost', power: 0 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },


  // ── Triage batch (OP15 expressible). Opponent-DON manipulation, name-target buffs, turn-Life-face costs, and trash-count gates are deferred. ──
  { cardNumber: 'OP15-007', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5 } }] } },


  // OP15-009 (character) Koby —
  //   If your Character with 7000 base power or less would be removed from the field by your opponent's
  //   effect, you may give your Leader −2000 power during this turn instead.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP15-010', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // OP15-011 — [On K.O.] If Leader {East Blue}, K.O. up to 1 opp Character base power ≤6000. PARTIAL: conditional [Blocker]/+2000 deferred.
  { cardNumber: 'OP15-011', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] } },

  {
    cardNumber: 'OP15-012',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-013 — in-hand −2 cost if Leader ≤0 power + [Blocker] (printed on card).
  {
    cardNumber: 'OP15-013',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{ fn: 'addCostAuraSameCardInHand', amount: -2, duration: 'permanent', gate: [{ kind: 'selfLeaderPowerAtMost', power: 0 }] }],
    },
  },
  // OP15-014 — K.O. replacement (trash Event from hand). PARTIAL: onPlay activate Dressrosa Event deferred.
  {
    cardNumber: 'OP15-014',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementSelf',
        trashFromHand: { count: 1, filter: { category: 'event' } },
        duration: 'permanent',
      }],
    },
  },

  // OP15-015 — [On Play] give opp rested DON to opp Char, then −1000 to opp Char with DON given.
  {
    cardNumber: 'OP15-015',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'giveDonFromOpponentCostArea', count: 1, restedOnly: true, optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent', filter: { minDonAttached: 1 } }, amount: -1000, duration: 'duringThisTurn', optional: true },
      ],
    },
  },

  // OP15-017 — [Blocker] + [Activate: Main][OPT] opp rested DON → opp Char: rested DON to owner Leader/Char.
  {
    cardNumber: 'OP15-017',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      functions: [
        { fn: 'giveDonFromOpponentCostArea', count: 1, restedOnly: true, optional: true },
        { fn: 'giveDonFromPreviousTargetOwnerCostArea', count: 1, restedOnly: true, optional: true, ifPrevious: 'previousSelectedAny' },
      ],
    },
  },

  // OP15-014 (character) Bartolomeo —
  { cardNumber: 'OP15-018', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000, minDonAttached: 1 } }, optional: true }] } },

  {
    cardNumber: 'OP15-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'untilStartOfNextTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  {
    cardNumber: 'OP15-020',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      functions: [
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisTurn' },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -8000, duration: 'untilStartOfNextTurn', optional: true },
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },
  // OP15-021 — [Main]/[Counter] give up to 1 opp Character −3000. PARTIAL: static Events-in-trash −cost is deferred.
  {
    cardNumber: 'OP15-021',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP15-022 (leader) Brook —
  //   Under the rules of this game, you do not lose when your deck has 0 cards. You lose at the end of the
  //   turn in which your deck becomes 0 cards.[Activate: Main] [Once Per Turn] Trash 4 cards from the top
  //   of your deck. Then, if your deck has 0 cards, set up to 1 of your Characters as active.
  // NOTE: not yet implemented (needs template).


  // OP15-013 — curated above.
  // OP15-024 — [Opponent's Turn] [Blocker] + [On K.O.] rest opp Leader/Char cost ≤7. PARTIAL: rest-immunity deferred.
  {
    cardNumber: 'OP15-024',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { turn: 'opponent' } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent', filter: { maxCost: 7 } }, optional: true }] } },
    ],
  },

  // OP15-026 — [On Play] Look 3, reveal up to 1 {East Blue} to hand, rest to bottom. PARTIAL: trash-self opp-DON activate deferred.
  { cardNumber: 'OP15-026', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'East Blue' }, remainder: 'bottom' }] } },

  // OP15-027 — [On Play] Rest up to 1 opp Character with a DON!! card given.
  { cardNumber: 'OP15-027', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { minDonAttached: 1 } }, optional: true }] } },
  // OP15-028 — [On Play] if Leader {East Blue}: give up to 1 DON from opp cost area to opp Character.
  {
    cardNumber: 'OP15-028',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'leaderType', type: 'East Blue' }],
      functions: [{ fn: 'giveDonFromOpponentCostArea', count: 1, optional: true }],
    },
  },

  // OP15-029 (character) Bartholomew Kuma —
  //   [On Play] Up to 1 of your opponent's Characters with a cost of 5 or less cannot be rested until the
  //   end of your opponent's next End Phase.
  { cardNumber: 'OP15-029', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, duration: 'endOfOpponentsTurn', optional: true }] } },

  // OP15-031 (character) Purinpurin —
  //   [On Play] Select up to 1 of your opponent's rested Characters. If the chosen Character has a cost
  //   equal to the number of DON!! cards given to it, K.O. it.
  // NOTE: not yet implemented (needs template).

  // OP15-032 — [On Play] Rest up to 1 opp Character. PARTIAL: trash-self activate deferred.
  { cardNumber: 'OP15-032', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },

  // OP15-034 — [Your Turn] [On Play] up to 1 [Brook] +2000 this turn.
  { cardNumber: 'OP15-034', templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Brook' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP15-033 (character) Hody Jones —
  {
    cardNumber: 'OP15-033',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'leaderType', type: 'Fish-Man' }],
      functions: [
        { fn: 'setActiveControllerLeader' },
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true },
      ],
    },
  },


  // OP15-035 (character) Laboon —
  //   If your Character with 7000 base power or less would be removed from the field by your opponent's
  //   effect, you may rest 2 of your cards instead.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP15-036',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  {
    cardNumber: 'OP15-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'East Blue' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },


  // OP15-039 (leader) Rebecca —
  //   This Leader cannot attack.[Activate: Main] You may rest this Leader and return 1 of your {Dressrosa}
  //   type Characters to the owner's hand: Play up to 1 {Dressrosa} type Character card with a cost of 3
  //   from your hand.
  //   PARTIAL: the static "cannot attack" lock is implemented below; the activated bounce-then-play ability remains deferred.
  { cardNumber: 'OP15-039', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { group: 'leader', player: 'controller' }, duration: 'permanent' }] } },

  // OP15-040 — [On Play] Look at 3; add up to 1 Dressrosa type.
  {
    cardNumber: 'OP15-040',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa' } }] },
  },

  // OP15-041 — [On K.O.] Draw 1. [Activate: Main][OPT] place 1 own Char at bottom of deck → this gains [Rush].
  {
    cardNumber: 'OP15-041',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP15-042 — [On Play] trash 1 → if Leader [Rebecca], this gains [Rush]. PARTIAL: [On K.O.] self-recur deferred.
  { cardNumber: 'OP15-042', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Rebecca' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP15-043', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Bobby Funk' } }] } },

  // OP15-044 - [Blocker] [On K.O.] Look at 3; add up to 1 Dressrosa Event.
  // Note: [Blocker] is an engine keyword flag. Only the on-K.O. search is templated.
  {
    cardNumber: 'OP15-044',
    templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event', typeIncludes: 'Dressrosa' } }] },
  },

  // OP15-045 — [Blocker][On Play] trash 1 → Draw 2 (Event-category filter approximated as any card).
  { cardNumber: 'OP15-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' }] } },

  // OP15-047 — [Blocker] [On Play] up to 1 of your Characters gains [Unblockable] this turn.
  { cardNumber: 'OP15-047', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller' }, keyword: 'unblockable', duration: 'duringThisTurn', optional: true }] } },

  // OP15-050 — if you have [Kelly Funk], +3000
  { cardNumber: 'OP15-050', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { gate: [{ kind: 'selfControlsNamed', name: 'Kelly Funk' }] } }] } },

  // OP15-046 (character) Sabo —
  //   [Blocker][On Play] If your Leader has the {Dressrosa} type, activate up to 1 {Dressrosa} type Event
  //   from your hand.
  {
    cardNumber: 'OP15-046',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'leaderType', type: 'Dressrosa' }],
      functions: [{ fn: 'activateEventFromHand', filter: { category: 'event', typeIncludes: 'Dressrosa' }, maxTargets: 1 }],
    },
  },




  { cardNumber: 'OP15-051', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderType', type: 'Dressrosa' }] } }] } },

  // OP15-052 (character) Leo —
  //   If your Character with 7000 base power or less would be removed from the field by your opponent's
  //   effect, you may place 1 of your Characters at the bottom of the owner's deck instead.
  // NOTE: not yet implemented (needs template).

  // OP15-053 — [On Play] Look 3, reveal up to 1 {Dressrosa} to hand, rest to bottom. PARTIAL: conditional [Blocker] deferred.
  { cardNumber: 'OP15-053', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa' }, remainder: 'bottom' }] } },

  // OP15-028 — [On Play] If Leader {East Blue}, give up to 1 DON!! from opponent cost area to opp Character. PARTIAL: opponent-cost-area DON deferred.
  // OP15-054 — [Main] If Leader [Lucy], choose one: draw/trash/play Dressrosa OR return Stage.
  {
    cardNumber: 'OP15-054',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      gate: [{ kind: 'leaderName', name: 'Lucy' }],
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          {
            label: 'drawPlayDressrosa',
            functions: [
              { fn: 'draw', amount: 2 },
              { fn: 'trashFromHand', count: 1 },
              { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Dressrosa', maxCost: 4 } },
            ],
          },
          {
            label: 'returnStage',
            functions: [{ fn: 'moveCards', from: { zone: 'stages', player: 'any' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }],
          },
        ],
      }],
    },
  },

  {
    cardNumber: 'OP15-055',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'draw2', functions: [{ fn: 'draw', amount: 2 }] },
          { label: 'dressrosaBlocker', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, keyword: 'blocker', duration: 'endOfOpponentsTurn', optional: true }] },
        ],
      }],
    },
  },  // OP15-056 — [Main] Draw 2. [Trigger] Draw 2. PARTIAL: the "[Lucy] Leader gains [Double Attack]/+3000" clause is deferred.
  {
    cardNumber: 'OP15-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP15-057 (stage) — [On Play] If Leader {Dressrosa}, draw 1. PARTIAL: [On Opponent's Attack] clause deferred.
  { cardNumber: 'OP15-057', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Dressrosa' }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP15-058 — PARTIAL: 6-card DON deck rule + second-turn gate deferred; mapped add 1 active + 4 rested DON then give up to 4 DON.
  {
    cardNumber: 'OP15-058',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      functions: [
        { fn: 'addDonFromDeck', count: 1, rested: false },
        { fn: 'addDonFromDeck', count: 4, rested: true },
        { fn: 'giveDon', count: 4, ifPrevious: 'previousSelectedAny' },
      ],
    },
  },

  // OP15-059 — PARTIAL: opponent may return active DON!! modal deferred; mapped: rest self → opp Leader/Char −2000.
  {
    cardNumber: 'OP15-059',
    templateId: 'ability',
    params: {
      timing: 'onOpponentsAttack',
      cost: [{ kind: 'restThis' }],
      functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }],
    },
  },
  {
    cardNumber: 'OP15-060',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }, { fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'endOfOpponentsTurn' }, { fn: 'trashFromHand', count: 1 }] } },
    ],
  },
  // OP15-061 - [On Play] DON!! -1: draw 1. [When Attacking] if <=6 DON!!, -1000 opponent Character.
  {
    cardNumber: 'OP15-061',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP15-063 - [On Play] DON!! -1: draw 1. [On K.O.] if <=6 DON!!, K.O. power <=2000.
  {
    cardNumber: 'OP15-063',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
    ],
  },

  // OP15-064 — [Activate: Main] DON!! −2 + rest this: If you have [Satori] and [Hotori], rest up to 1 opp Character with 5000 power or less.
  { cardNumber: 'OP15-064', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }, { kind: 'restThis' }], gate: [{ kind: 'selfControlsNamed', name: 'Satori' }, { kind: 'selfControlsNamed', name: 'Hotori' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },

  // OP15-119 (character) Monkey.D.Luffy —
  //   If you have 6 or more DON!! cards on your field, this Character gains [Rush].When your opponent
  //   activates an Event or [Blocker], reveal up to 1 card from the top of your Life cards. This Character
  //   gains +1000 power during this turn per 1 cost on the revealed card.
  // NOTE: not yet implemented (needs template).


  // PARTIAL: [Activate: Main] DON-scaling debuff deferred; mapped onPlay give 3 opp rested DON + Rush.
  { cardNumber: 'OP15-008', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonFromOpponentCostArea', count: 3, restedOnly: true, optional: true }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },


  { cardNumber: 'OP15-023', templates: [{ templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'preventRefresh', target: { group: 'leaderOrCharacters', player: 'opponent', filter: { rested: true } }, optional: true, maxTargets: 2 }] } }, { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDonFromOpponentCostArea', count: 1, restedOnly: true, optional: true }, { fn: 'giveDonFromPreviousTargetOwnerCostArea', count: 1, restedOnly: true, optional: true, ifPrevious: 'previousSelectedAny' }] } }] },


  // PARTIAL: end-of-turn preventRefresh rider deferred.
  { cardNumber: 'OP15-025', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonFromOpponentCostArea', count: 2, optional: true }] } },


  { cardNumber: 'OP15-038', templates: [{ templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 8, minDonAttached: 2 } }, optional: true }] } }, { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Krieg' } }, amount: 4000, duration: 'duringThisBattle', optional: true }] } }] },


  // PARTIAL: [On K.O.] opp hand→deck-bottom deferred.
  { cardNumber: 'OP15-048', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { category: 'event' }, optional: true }, { fn: 'draw', amount: 2, ifPrevious: 'previousSelectedAny' }] } },


  // PARTIAL: "7000 base power or less" target filter dropped (no maxBasePower on targetCondition).
  { cardNumber: 'OP15-069', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', returnDon: { count: 1 }, duration: 'permanent' }] } },


  { cardNumber: 'OP15-079', templates: [{ templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } }] },


  // PARTIAL: "7000 base power or less" target filter dropped.
  { cardNumber: 'OP15-090', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', trashFromHand: { count: 1 }, duration: 'permanent' }] } },


  // PARTIAL: "7000 base power or less" target filter dropped.
  { cardNumber: 'OP15-098', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', anyOfTypes: ['Sky Island'], lifeToHand: { position: 'top' }, duration: 'permanent' }] } },


  // PARTIAL: "7000 base power or less" target filter dropped.
  { cardNumber: 'OP15-105', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', lifeToHand: { position: 'top' }, duration: 'permanent' }] } },

  // --- codegen batch ---
  { cardNumber: 'OP15-065', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'revealTopThen', filter: { maxCost: 2 }, then: [{ fn: 'addDonFromDeck', count: 1, rested: true }] }] } },

  {
    cardNumber: 'OP15-066',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'searchTopDeck', look: 2, pick: 2, reveal: false, destination: 'deckTopOrBottom' }] } },
    ],
  },

  {
    cardNumber: 'OP15-067',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-068 — if 6 or less DON!! on field, [Blocker]
  { cardNumber: 'OP15-068', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }] } },



  // OP15-070 — [On Play] [Shura] cards + self gain [Unblockable]; [Opponent's Turn] [Shura] + self base power become 6000.
  {
    cardNumber: 'OP15-070',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'unblockable', duration: 'permanent' },
        { fn: 'addKeywordAuraControllerTypes', keyword: 'unblockable', duration: 'permanent', anyOfNames: ['Shura'] },
        { fn: 'setBasePower', target: { ref: 'self' }, value: 6000, duration: 'permanent', condition: { turn: 'opponent' } },
        { fn: 'setBasePowerAuraControllerTypes', value: 6000, duration: 'permanent', anyOfNames: ['Shura'], sourceCondition: { turn: 'opponent' } },
      ],
    },
  },

  // OP15-071 — [On Play] [Ohm] cards + self gain [Double Attack]; [Opponent's Turn] [Ohm] + self base power become 6000.
  {
    cardNumber: 'OP15-071',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'permanent' },
        { fn: 'addKeywordAuraControllerTypes', keyword: 'doubleAttack', duration: 'permanent', anyOfNames: ['Ohm'] },
        { fn: 'setBasePower', target: { ref: 'self' }, value: 6000, duration: 'permanent', condition: { turn: 'opponent' } },
        { fn: 'setBasePowerAuraControllerTypes', value: 6000, duration: 'permanent', anyOfNames: ['Ohm'], sourceCondition: { turn: 'opponent' } },
      ],
    },
  },

  // OP15-072 — [Activate: Main] DON!! −2 + rest this: If you have [Kotori] and [Satori], give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP15-072', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }, { kind: 'restThis' }], gate: [{ kind: 'selfControlsNamed', name: 'Kotori' }, { kind: 'selfControlsNamed', name: 'Satori' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // OP15-073 — [Blocker][On Play] play up to 1 [Heavenly Warriors] cost 1 or {Vassals} cost 1 from hand.
  { cardNumber: 'OP15-073', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', exactCost: 1, anyOf: [{ name: 'Heavenly Warriors' }, { typeIncludes: 'Vassals' }] } }] } },

  {
    cardNumber: 'OP15-074',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderName', name: 'Enel' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addCost', target: { group: 'characters', player: 'controller' }, amount: 2, duration: 'endOfOpponentsTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Enel' } }, amount: 2000, duration: 'duringThisBattle', optional: true }] } },
    ],
  },
  // OP15-075 — [Main] DON!! −1: If Leader [Enel], up to 1 Leader/Char +1000 this turn, K.O. opp ≤3000 power. PARTIAL: [Counter] [Enel] buff deferred.
  { cardNumber: 'OP15-075', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderName', name: 'Enel' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },

  // OP15-076 — [Main] DON!! −1: If Leader [Enel], draw 1, give up to 1 opp Character −1000. PARTIAL: [Counter] [Enel] buff deferred.
  { cardNumber: 'OP15-076', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderName', name: 'Enel' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP15-077 — [Main] DON!! −1: Draw 1. PARTIAL: the preventRefresh rider is deferred.
  { cardNumber: 'OP15-077', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP15-078 - [Main] DON!! -2: draw 1, then rest power <=5000. [Counter] +1000, then if <=6 DON!! draw 1.
  {
    cardNumber: 'OP15-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },


  // OP15-080 — static +7000 if [Gecko Moria] ≥10000 power and no other [Oars]. PARTIAL: onKO recur deferred.
  {
    cardNumber: 'OP15-080',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      gate: [{ kind: 'selfControlsNamedWithPowerAtLeast', name: 'Gecko Moria', power: 10000 }, { kind: 'selfOtherNamedCharacterCount', name: 'Oars', atMost: 0 }],
      functions: [{ fn: 'addPowerSelf', amount: 7000, duration: 'permanent' }],
    },
  },
  { cardNumber: 'OP15-081', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },

  {
    cardNumber: 'OP15-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', maxCost: 8 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP15-083 — [On Play] Trash 3 from top of deck. PARTIAL: trash-self 15-trash activate deferred.
  { cardNumber: 'OP15-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },

  {
    cardNumber: 'OP15-084',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfHand', atMost: 6 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-085 — [On Play] Trash 3 from top of deck. PARTIAL: trash-self recur activate deferred.
  { cardNumber: 'OP15-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },

  // OP15-086 — [On Play] If Leader {Straw Hat Crew}, play {Straw Hat Crew} cost ≤7 from trash (granted [Rush] dropped).
  { cardNumber: 'OP15-086', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 7 } }] } },

  // OP15-087 — [On Play] Draw 2, trash 2. PARTIAL: static 10-trash [Blocker] deferred.
  { cardNumber: 'OP15-087', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  // OP15-088 — static: this Character +6 cost. [On Play] trash 3 from top of deck → play {Straw Hat Crew} cost ≤2 from trash.
  {
    cardNumber: 'OP15-088',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 6, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 2 } }] } },
    ],
  },


  // OP15-091 — [On Play] Place up to 1 card from opponent's trash at the bottom of the owner's deck.
  { cardNumber: 'OP15-091', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 }] } },
  {
    cardNumber: 'OP15-092',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [
        { fn: 'setBasePower', target: { ref: 'self' }, value: 9000, duration: 'permanent', condition: { gate: [{ kind: 'selfTrashCount', atLeast: 10 }] } },
        { fn: 'addCost', target: { ref: 'self' }, amount: 10, duration: 'permanent', condition: { gate: [{ kind: 'selfTrashCount', atLeast: 10 }] } },
        { fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 7000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfTrashCount', atLeast: 20 }] } },
        { fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfTrashCount', atLeast: 30 }] } },
      ],
    },
  },

  // OP15-093 — PARTIAL: [Rush: Character] and <Slash> attribute deferred; mapped as [Rush] on [Monkey.D.Luffy].
  {
    cardNumber: 'OP15-093',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'trashThis' }],
      gate: [{ kind: 'selfTrashCount', atLeast: 15 }],
      functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { name: 'Monkey.D.Luffy' } }, keyword: 'rush', duration: 'duringThisTurn', optional: true }],
    },
  },
  // OP15-094 — PARTIAL: field-removal clause deferred; [Blocker] is engine keyword.
  {
    cardNumber: 'OP15-094',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        anyOfTypes: ['Straw Hat Crew'],
        excludeSource: true,
        trashSource: true,
        duration: 'permanent',
      }],
    },
  },
  {
    cardNumber: 'OP15-095',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], gate: [{ kind: 'selfTrashCount', atLeast: 15 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Straw Hat Crew' } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfTrashCount', atLeast: 15 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
    ],
  },
  {
    cardNumber: 'OP15-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP15-097 (event) I Find It Embarrassing as a Human Being —
  //   [Main] If you have 10 or more cards in your trash, up to 1 of your opponent's Characters with a base
  //   cost of 5 or less cannot attack until the end of your opponent's next End Phase. [Trigger] Activate
  //   this card's [Main] effect.
  {
    cardNumber: 'OP15-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfTrashCount', atLeast: 10 }], functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, duration: 'endOfOpponentsTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfTrashCount', atLeast: 10 }], functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, duration: 'endOfOpponentsTurn', optional: true }] } },
    ],
  },


  // OP15-099 — [On Play] may trash 1 {Supernovas} from hand → [Rush]. PARTIAL: activate Main Life-face + giveDon deferred.
  {
    cardNumber: 'OP15-099',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Supernovas' }, optional: true },
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
      ],
    },
  },
  // OP15-100 — PARTIAL: optional trash-self on onPlay deferred; mapped: Life to hand → K.O. opp cost ≤6.
  {
    cardNumber: 'OP15-100',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },
  { cardNumber: 'OP15-101', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Mont Blanc Noland' }, { typeIncludes: 'Shandian Warrior' }] }, remainder: 'bottom', ifPrevious: 'previousMovedAny' }] } },

  // OP15-102 — in-hand −3 cost if {Sky Island} Char ≥7000 power + [On Play] rest opp Char cost ≤ opp Life.
  {
    cardNumber: 'OP15-102',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{ fn: 'addCostAuraSameCardInHand', amount: -3, duration: 'permanent', gate: [{ kind: 'selfTypedCharacterPowerAtLeast', typeIncludes: 'Sky Island', power: 7000 }] }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }],
        },
      },
    ],
  },
  // OP15-103 — [Trigger] Draw 1, then if ≤2 Life play this card.
  { cardNumber: 'OP15-103', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'triggerPlaySelf', ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },

  {
    cardNumber: 'OP15-104',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLifeLessThanOpponent' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },


  // OP15-106 — [Trigger] Draw 1, then play up to 1 yellow Character cost ≤2 from hand (Stage option dropped).
  { cardNumber: 'OP15-106', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', color: 'yellow', maxCost: 2 } }] } },

  // OP15-108 — [On Play] Look at 3; add up to 1 Sky Island type.
  {
    cardNumber: 'OP15-108',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island' } }] },
  },

  // OP15-109 — [On Play] If Leader {Straw Hat Crew}: add 1 top Life to hand → add top of deck to top of Life → play {Sky Island} cost ≤5 from hand.
  { cardNumber: 'OP15-109', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Sky Island', maxCost: 5 } }] } },

  // OP15-110 — [On K.O.] If Leader {Shandian Warrior}, add up to 1 top of deck to top of Life.
  { cardNumber: 'OP15-110', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Shandian Warrior' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },

  // OP15-111 — [DON!! x1] [When Attacking] up to 1 [Kalgara] gains [Rush] this turn.
  { cardNumber: 'OP15-111', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { name: 'Kalgara' } }, keyword: 'rush', duration: 'duringThisTurn', optional: true }] } },



  { cardNumber: 'OP15-112', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Shandian Warrior', maxCost: 3 } }] } },

  { cardNumber: 'OP15-113', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP15-114 — [Activate: Main][OPT] give up to 1 rested DON!! to Leader/1 Char. PARTIAL: the turn-Life-face-up mass-debuff [On Play] is deferred.
  { cardNumber: 'OP15-114', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  {
    cardNumber: 'OP15-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }, { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP15-116 — [Counter] your Leader +4000 this battle. PARTIAL: the Straw-Hat [Main] Life-trash/refill is deferred.
  { cardNumber: 'OP15-116', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisBattle' }] } },

  {
    cardNumber: 'OP15-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 1 }, { fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Sky Island' }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP15-118 — static: if ≤6 DON!!, cannot be removed by opp effects and +2000. [On Play] DON!! −1: Look 5, add up to 1, rest to bottom, trash 1.
  {
    cardNumber: 'OP15-118',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }, { fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: false, destination: 'hand', remainder: 'bottom' }, { fn: 'trashFromHand', count: 1 }] } },
    ],
  },

];
