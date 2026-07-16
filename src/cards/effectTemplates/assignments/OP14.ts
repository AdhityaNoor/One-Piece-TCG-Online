/**
 * Reviewed effect template assignments - Main Booster OP14.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP14_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP14-001 (leader) Trafalgar Law — [Activate: Main] [Once Per Turn] swap base power of 2 {Supernovas}/{Heart Pirates} Characters.
  {
    cardNumber: 'OP14-001',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      functions: [{
        fn: 'swapBasePower',
        target: { group: 'characters', player: 'controller', filter: { anyOfTypes: ['Supernovas', 'Heart Pirates'] } },
        duration: 'duringThisTurn',
        minTargets: 2,
        maxTargets: 2,
      }],
    },
  },
  // OP14-002 — [When Attacking] If 5000+ power: draw 1 and K.O. up to 1 opp Character with 3000 base power or less.
  { cardNumber: 'OP14-002', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfInstancePowerAtLeast', power: 5000 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 3000 } }, optional: true }] } },

  // OP14-003 — Cannot be K.O.'d by effects of opponent Characters with 5000 base power or less.
  { cardNumber: 'OP14-003', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', effectSourceController: 'opponent', effectSourceMaxBasePower: 5000, effectSourceCategory: 'character' }] } },

  // OP14-004 — If 5000+ power, gains [Rush].
  { cardNumber: 'OP14-004', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfInstancePowerAtLeast', power: 5000 }] } }] } },

  // OP14-015 — [Rush] [When Attacking] Give up to 1 of your opponent's Characters −1000 power.
  // Note: [Rush] is an engine keyword flag. Only the when-attacking effect is templated.
  // OP14-005 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP14-005', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // OP14-011 — [DON!! x2] [Blocker]
  { cardNumber: 'OP14-011', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },

  // OP14-006 — [When Attacking] If 5000+ power: give up to 1 opp Character −2000 this turn.
  { cardNumber: 'OP14-006', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfInstancePowerAtLeast', power: 5000 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP14-009 — [Rush] [On Your Opponent's Attack] [Once Per Turn] optional trash 2: swap Leader + 1 Character base power during this battle.
  {
    cardNumber: 'OP14-009',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent' }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onOpponentsAttack',
          oncePerTurn: true,
          functions: [
            { fn: 'optionalTrashFromHand', count: 2 },
            {
              fn: 'swapBasePower',
              target: { group: 'leaderOrCharacters', player: 'controller' },
              duration: 'duringThisBattle',
              swapKind: 'leaderAndCharacter',
              ifPrevious: 'previousMovedAny',
            },
          ],
        },
      },
    ],
  },

  // OP14-010 (character) Basil Hawkins —
  //   [On K.O.] Look at 5 cards from the top of your deck; play up to 1 {Supernovas} type Character card
  //   with 2000 power or less other than [Basil Hawkins]. Then, place the rest at the bottom of your deck
  //   in any order.
  {
    cardNumber: 'OP14-010',
    templateId: 'ability',
    params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: false, destination: 'play', filter: { category: 'character', typeIncludes: 'Supernovas', maxPower: 2000, excludeSelfName: true }, remainder: 'bottom' }] },
  },


  // OP14-012 — [When Attacking] If 5000+ power: give up to 2 rested DON!! to Leader or 1 Character.
  { cardNumber: 'OP14-012', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfInstancePowerAtLeast', power: 5000 }], functions: [{ fn: 'giveDon', count: 2 }] } },

  // OP14-013 - [On Play] Search Supernovas other than self. [When Attacking] Give opponent Character -1000 power.
  {
    cardNumber: 'OP14-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas', excludeSelfName: true } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // ── Triage batch (OP14 expressible). Self-power gates, "becomes rested" triggers, and choice/target-swap effects are deferred. ──
  { cardNumber: 'OP14-014', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxPower: 2000 } }] } },

  { cardNumber: 'OP14-015', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP14-016 — Closed 2026-07-16 field-removal replacement pass: [DON!! x1][When Attacking] give up to 1 opp Character
  // −2000, plus the {Supernovas} field-removal replacement (Leader −2000 this turn) via registerKoReplacementAura.
  { cardNumber: 'OP14-016', templates: [
    { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', oncePerTurn: true, replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', anyOfTypes: ['Supernovas'], giveLeaderPowerPenalty: { amount: 2000, duration: 'duringThisTurn' }, duration: 'permanent' }] } },
  ] },

  // OP14-017 (event) Chambres — [Main] swap base power of 2 opponent Characters (≤9000 base power) this turn.
  {
    cardNumber: 'OP14-017',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{
        fn: 'swapBasePower',
        target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 9000 } },
        duration: 'duringThisTurn',
        minTargets: 2,
        maxTargets: 2,
      }],
    },
  },
  // OP14-018 — [Counter] +4000 if any Character has 8000+ base power. [Trigger] play up to 1 red Character ≤2000 power from hand.
  {
    cardNumber: 'OP14-018',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'anyCharacterBasePowerAtLeast', power: 8000 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxPower: 2000 } }] } },
    ],
  },

  {
    cardNumber: 'OP14-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Supernovas' }, { typeIncludes: 'Straw Hat Crew' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP14-022 — [End of Your Turn] If Leader {FILM} or {Straw Hat Crew}, set up to 2 DON!! active.
  { cardNumber: 'OP14-022', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'FILM' }, { kind: 'leaderType', type: 'Straw Hat Crew' }] }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP14-020 — opp <Slash> Leader: +1000 power. [Activate: Main] cost-5+ Character present: set 3 DON active, cannot play Characters this turn.
  {
    cardNumber: 'OP14-020',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'opponentLeaderAttribute', attribute: 'slash' }] } }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          cost: [{ kind: 'restThis' }],
          gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 5 }],
          functions: [
            { fn: 'setActiveControllerDon', maxTargets: 3 },
            { fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn' },
          ],
        },
      },
    ],
  },

  // OP14-021 (character) Issho —
  //   [Your Turn] When this Character becomes rested, you may add 1 card from the top of your Life cards to
  //   your hand. If you do, up to 1 of your opponent's rested Characters or Stages will not become active
  //   in your opponent's next Refresh Phase.
  {
    cardNumber: 'OP14-021',
    templateId: 'ability',
    params: {
      timing: 'onRested',
      condition: { turn: 'your' },
      functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'preventRefresh', target: { group: 'charactersOrStages', player: 'opponent', filter: { rested: true } }, duration: 'untilStartOfNextTurn', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
      ],
    },
  },


  { cardNumber: 'OP14-023', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveSelf' }] } },

  // OP14-024 — [On Play] Set up to 3 DON!! active, then cannot play Characters this turn. [On K.O.] Rest up to 1 opp Character.
  {
    cardNumber: 'OP14-024',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'setActiveControllerDon', maxTargets: 3 },
        { fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn' },
      ] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
    ],
  },

  { cardNumber: 'OP14-025', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Kuro' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'East Blue', maxCost: 6 } }] } },

  // OP14-026 (character) Kouzuki Oden —
  //   [Opponent's Turn] If this Character is rested, this Character gains +2000 power.
  { cardNumber: 'OP14-026', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { turn: 'opponent', rested: true } }] } },

  // OP14-027 (character) Shanks —
  //   [Your Turn] When this Character becomes rested, rest up to 1 of your opponent's Characters with 7000
  //   base power or less.[Opponent's Turn] If this Character is rested, give all of your opponent's
  //   Characters −1000 power.
  {
    cardNumber: 'OP14-027',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraOpponentCharacters', amount: -1000, duration: 'permanent', sourceCondition: { turn: 'opponent', rested: true } }] } },
      { templateId: 'ability', params: { timing: 'onRested', condition: { turn: 'your' }, functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 7000 } }, optional: true }] } },
    ],
  },

  // OP14-028 (character) Johnny —
  //   [Your Turn] When this Character becomes rested, K.O. up to 1 of your opponent's rested Characters
  //   with a cost of 2 or less.
  { cardNumber: 'OP14-028', templateId: 'ability', params: { timing: 'onRested', condition: { turn: 'your' }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 2 } }, optional: true }] } },

  // OP14-029 (character) Tashigi —
  //   [Opponent's Turn] If this Character would be removed from the field by your opponent's effect, you
  //   may rest 1 of your cards instead.[Activate: Main] [Once Per Turn] You may rest 2 of your cards: This
  //   Character gains +2000 power until the end of your opponent's next End Phase.
  {
    cardNumber: 'OP14-029',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementSelf',
            scope: 'effect',
            replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
            effectSourceController: 'opponent',
            restCards: { count: 1 },
            duration: 'permanent',
            sourceCondition: { turn: 'opponent' },
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          functions: [
            { fn: 'restControllerCards', count: 2, optional: true },
            { fn: 'addPowerSelf', amount: 2000, duration: 'endOfOpponentsTurn', ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
    ],
  },

  // OP14-031 (character) Nami —
  //   [Blocker][On Play] Rest up to 2 of your opponent's Characters with a cost of 8 or less. Then, set up
  //   to 5 of your DON!! cards as active at the end of this turn.
  { cardNumber: 'OP14-031', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, optional: true, maxTargets: 2 },
    { fn: 'setActiveControllerDonAtEndOfTurn', maxTargets: 5 },
  ] } },

  // OP14-032 (character) Humandrill —
  //   [Your Turn] When this Character becomes rested, rest up to 1 of your opponent's Characters with a
  //   cost of 4 or less.
  { cardNumber: 'OP14-032', templateId: 'ability', params: { timing: 'onRested', condition: { turn: 'your' }, functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP14-033 — [On Play] preventRest up to 2 opp cost≤5; [On K.O.] rest 1 of your cards → play green cost≤5 from hand.
  {
    cardNumber: 'OP14-033',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 2 }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onKO',
          functions: [
            { fn: 'rest', target: { group: 'leaderOrCharacters', player: 'controller' }, optional: true, maxTargets: 1 },
            { fn: 'playFromHand', filter: { category: 'character', color: 'green', maxCost: 5 }, ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
    ],
  },

  // OP14-034 — [Your Turn] green {Straw Hat Crew} base cost ≥4 +1000; [OPT] rest 1 Character to save ally from opp effect K.O.
  {
    cardNumber: 'OP14-034',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'addPowerAuraControllerCharacters',
            amount: 1000,
            duration: 'permanent',
            anyOfTypes: ['Straw Hat Crew'],
            sourceCondition: { turn: 'your' },
            targetCondition: { minBaseCost: 4, color: 'green' },
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementAura',
            scope: 'effect',
            oncePerTurn: true,
            anyOfTypes: ['Straw Hat Crew'],
            restCharacter: true,
            duration: 'permanent',
          }],
        },
      },
    ],
  },

  // OP14-035 (character) Yosaku —
  //   [Your Turn] When this Character becomes rested, up to 1 of your opponent's rested Characters with a
  //   cost of 4 or less will not become active in your opponent's next Refresh Phase.
  { cardNumber: 'OP14-035', templateId: 'ability', params: { timing: 'onRested', condition: { turn: 'your' }, functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true, maxTargets: 1 }] } },

  // OP14-036 — [Counter]/[Trigger] may rest 1 of your cards for the payoff.
  {
    cardNumber: 'OP14-036',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'restControllerCards', count: 1, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousSelectedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'restControllerCards', count: 1, optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 7000 } }, optional: true, ifPrevious: 'previousSelectedAny' }] } },
    ],
  },

  // OP14-037 — [Main] may rest 3 of your cards for a rested-character K.O.; [Counter] Leader +3000.
  {
    cardNumber: 'OP14-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'restControllerCards', count: 3, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxBasePower: 7000 } }, optional: true, ifPrevious: 'previousSelectedAny' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  { cardNumber: 'OP14-038', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  {
    cardNumber: 'OP14-039',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Dracule Mihawk' }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'leaderName', name: 'Dracule Mihawk' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
    ],
  },

  // OP14-040 (leader) - [Activate: Main] trash 1: give up to 2 rested DON!! to Fish-Man/Merfolk Leader/1 Char.
  { cardNumber: 'OP14-040', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'giveDon', count: 2, anyOfTypes: ['Fish-Man', 'Merfolk'], ifPrevious: 'previousMovedAny' }] } },

  // OP14-041 (leader) Boa Hancock —
  //   [Opponent's Turn] When you play a Character, draw 1 card.[DON!! x1] [Once Per Turn] When one of your
  //   {Amazon Lily} or {Kuja Pirates} type Characters with 5000 base power or more is K.O.'d, add up to 1
  //   card from the top of your opponent's Life cards to the owner's hand.
  // PARTIAL: ally K.O. uses onRemovedFromField proxy (battle K.O. + type/base-power filters deferred).
  {
    cardNumber: 'OP14-041',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onCharacterPlayedFromHand',
          condition: { turn: 'opponent' },
          functions: [{ fn: 'draw', amount: 1 }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onRemovedFromField',
          oncePerTurn: true,
          condition: { donAttachedAtLeast: 1 },
          gate: [
            { kind: 'removedFromFieldCategory', category: 'character' },
            { kind: 'removedFromFieldController', player: 'controller' },
          ],
          functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' }, optional: true }],
        },
      },
    ],
  },

  { cardNumber: 'OP14-042', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 2 }, remainder: 'bottom' }] } },

  {
    cardNumber: 'OP14-043',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  {
    cardNumber: 'OP14-118',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { rested: false } }, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxPower: 6000, hasTrigger: true } }] } },
    ],
  },

  // OP14-119 (character) Dracule Mihawk —
  //   [Your Turn] When this Character becomes rested, up to 1 of your opponent's Characters with a cost of
  //   9 or less cannot be rested until the end of your opponent's next End Phase.[On Your Opponent's
  //   Attack] [Once Per Turn] You may trash 1 card from your hand: Up to 1 of your Leader or Character
  //   cards gains +2000 power during this battle.
  {
    cardNumber: 'OP14-119',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onRested',
          condition: { turn: 'your' },
          functions: [{ fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 9 } }, duration: 'endOfOpponentsTurn', optional: true }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onOpponentsAttack',
          oncePerTurn: true,
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // OP14-120 (character) Crocodile —
  //   [On Play] Up to 1 of your opponent's Characters with a cost of 9 or less cannot attack until the end
  //   of your opponent's next End Phase. Then, if your opponent has a Character with a cost of 0 or with a
  //   cost of 8 or more, draw 1 card.[On K.O.] You may trash 1 card from your hand: Play this Character
  //   card from your trash.
  { cardNumber: 'OP14-120', templates: [
    { templateId: 'ability', params: { timing: 'onPlay', functions: [
      { fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 9 } }, duration: 'endOfOpponentsTurn', optional: true },
      { fn: 'draw', amount: 1, ifGate: [{ kind: 'anyOf', gates: [{ kind: 'anyCharacterExactCost', exactCost: 0 }, { kind: 'anyCharacterCostAtLeast', atLeast: 8 }] }] },
    ] } },
    { templateId: 'ability', params: { timing: 'onKO', functions: [
      { fn: 'optionalTrashFromHand', count: 1 },
      { fn: 'playSelfFromTrash', ifPrevious: 'previousMovedAny' },
    ] } },
  ] },


  { cardNumber: 'OP14-048', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'trashHandDownTo', handSize: 0 }] } },


  { cardNumber: 'OP14-062', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose one:', options: [{ label: 'ko', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] }, { label: 'rest', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] }] }] } },


  { cardNumber: 'OP14-082', templates: [{ templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addCostAuraControllerCharacters', amount: 4, duration: 'endOfOpponentsTurn', anyOfTypes: ['Thriller Bark Pirates'] }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 2 }, rested: true }] } }] },


  { cardNumber: 'OP14-086', templateId: 'ability', params: { timing: 'onEnterPlay', gate: [{ kind: 'selfTrashCount', atLeast: 7 }], functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent' }, { fn: 'addCostAuraControllerCharacters', amount: 2, duration: 'permanent', anyOfTypes: ['Baroque Works'] }] } },

  // OP14-093 (character) Mr.4(Babe) —
  //   [Blocker][On K.O.] Add up to 1 Character card with a type including "Baroque Works" and a cost of 8 or less from your trash to your hand.
  {
    cardNumber: 'OP14-093',
    templateId: 'ability',
    params: {
      timing: 'onKO',
      functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 8 } }, to: { zone: 'hand', player: 'owner' }, optional: true }],
    },
  },


  {
    cardNumber: 'OP14-068',
    templateId: 'ability',
    params: {
      timing: 'onDonReturned',
      oncePerTurn: true,
      condition: { turn: 'opponent' },
      gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }, { kind: 'selfDonReturnedThisAction', atLeast: 1 }],
      functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }],
    },
  },


  { cardNumber: 'OP14-094', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },


  {
    cardNumber: 'OP14-103',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },


  // --- codegen batch ---
  { cardNumber: 'OP14-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'revealTopThen', filter: { typeIncludes: 'Whitebeard Pirates' }, then: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] }] } },

  // OP14-045 — when a card is trashed from hand by an effect, this gains [Rush]. [On K.O.] Draw 1.
  {
    cardNumber: 'OP14-045',
    templates: [
      { templateId: 'ability', params: { timing: 'onHandTrashed', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP14-046 — [Activate: Main] trash this: up to 1 {Fish-Man}/{Merfolk} Leader/Character +2000 this turn.
  { cardNumber: 'OP14-046', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { anyOfTypes: ['Fish-Man', 'Merfolk'] } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },


  { cardNumber: 'OP14-047', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },


  // OP14-049 — hand-trash reaction grants [Rush]. [On Play] rest 2 DON!!: Draw 2, return cost<=7 Character.
  {
    cardNumber: 'OP14-049',
    templates: [
      { templateId: 'ability', params: { timing: 'onHandTrashed', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 7 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  { cardNumber: 'OP14-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'draw', amount: 1 }] } },

  { cardNumber: 'OP14-051', templateId: 'ability', params: { timing: 'onKO', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'draw', amount: 1 }] } },

  // OP14-052 — [Blocker][On Play] trash 3 from hand: play up to 1 {Impel Down} cost ≤6 from hand.
  { cardNumber: 'OP14-052', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 3 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Impel Down', maxCost: 6 } }] } },

  {
    cardNumber: 'OP14-053',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'setBasePowerFromLeader',
        target: { ref: 'self' },
        duration: 'endOfOpponentsTurn',
        sourceCondition: { turn: 'opponent' },
        condition: { gate: [{ kind: 'selfHand', atMost: 7 }] },
      }],
    },
  },

  // OP14-054 — [On Play] if Leader {Fish-Man}, draw 3. [End of Your Turn] trash hand down to 5.
  {
    cardNumber: 'OP14-054',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'draw', amount: 3 }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'trashHandDownTo', handSize: 5 }] } },
    ],
  },

  // OP14-056 (character) Wadatsumi —
  //   This Character cannot attack.When a card is trashed from your hand by an effect, this Character's
  //   effect is negated during this turn.
  //   PARTIAL: the static self attack lock is implemented below; the effect-negation trigger remains deferred.
  { cardNumber: 'OP14-056', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { ref: 'self' }, duration: 'permanent' }] } },

  {
    cardNumber: 'OP14-057',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPowerAuraControllerTypes', amount: 1000, duration: 'duringThisTurn', anyOfTypes: ['Fish-Man', 'Merfolk'] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

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

  // OP14-060 (leader) Donquixote Doflamingo — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: redirect attack to Leader or {Donquixote Pirates} Character.
  {
    cardNumber: 'OP14-060',
    templateId: 'ability',
    params: {
      timing: 'onOpponentsAttack',
      oncePerTurn: true,
      cost: [{ kind: 'donMinus', count: 1 }],
      functions: [{
        fn: 'redirectAttackTarget',
        target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Donquixote Pirates', typeFilterCharactersOnly: true } },
      }],
    },
  },
  // OP14-061 — Closed 2026-07-16 field-removal replacement pass: [When Attacking] DON!! −1: give up to 1 opp Character
  // −2000, plus the {Donquixote Pirates} field-removal replacement (return 1 DON!!) via registerKoReplacementAura.
  { cardNumber: 'OP14-061', templates: [
    { templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', oncePerTurn: true, replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', anyOfTypes: ['Donquixote Pirates'], returnDon: { count: 1 }, duration: 'permanent' }] } },
  ] },


  {
    cardNumber: 'OP14-063',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'opponentDonFieldCount', atLeast: 6 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Donquixote Pirates', maxCost: 5 } }] } },
    ],
  },

  { cardNumber: 'OP14-064', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 0 } }, optional: true }] } },

  // OP14-065 (character) Senor Pink —
  //   [On K.O.] Your opponent returns 1 DON!! card from their field to their DON!! deck.
  { cardNumber: 'OP14-065', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'returnOpponentDon', count: 1 }] } },

  { cardNumber: 'OP14-067', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' }, remainder: 'bottom' }] } },

  { cardNumber: 'OP14-071', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

  // OP14-068 (character) Trebol —
  //   [Opponent's Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, if
  //   your Leader has the {Donquixote Pirates} type, add up to 1 DON!! card from your DON!! deck and rest it.

  // OP14-069 (character) Donquixote Doflamingo —
  //   [On Play] DON!! −3: Choose one:• If your Leader has the {Donquixote Pirates} type, K.O. up to 1 of
  //   your opponent's Characters with a cost of 8 or less.• Up to 3 of your opponent's Characters with a
  //   cost of 7 or less cannot be rested until the end of your opponent's next End Phase.
  { cardNumber: 'OP14-069', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 3 }], functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Choose one.',
    options: [
      { label: 'ko', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, optional: true, ifGate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }] }] },
      { label: 'preventRest', functions: [{ fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 7 } }, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 3 }] },
    ],
  }] } },

  // OP14-070 (character) Buffalo —
  //   When this Character becomes rested by your opponent's Character's effect, you may return 1 DON!! card
  //   from your field to your DON!! deck. If you do, set this Character as active.[Blocker]
  // PARTIAL: opponent-Character-effect rested gate + DON return cost deferred; mapped setActiveSelf on onRested.
  { cardNumber: 'OP14-070', templateId: 'ability', params: { timing: 'onRested', oncePerTurn: true, functions: [{ fn: 'setActiveSelf' }] } },

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

  // OP14-077 (event) Penta-Chromatic String —
  //   [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if
  //   your opponent has a Character with 6000 power or more, add up to 1 DON!! card from your DON!! deck
  //   and rest it.
  {
    cardNumber: 'OP14-077',
    templateId: 'ability',
    params: {
      timing: 'counter',
      functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, maxTargets: 1 },
        { fn: 'addDonFromDeck', count: 1, rested: true, ifGate: [{ kind: 'opponentHasCharacterBasePowerAtLeast', power: 6000 }], ifPrevious: 'previousSelectedAny' },
      ],
    },
  },

  // OP14-078 (event) Bullet String —
  //   [Counter] DON!! −1: If your Leader has the {Donquixote Pirates} type, up to 1 of your Leader or
  //   Character cards gains +2000 power during this battle. Then, that card gains an additional +2000 power
  //   during this turn.
  {
    cardNumber: 'OP14-078',
    templateId: 'ability',
    params: {
      timing: 'counter',
      cost: [{ kind: 'donMinus', count: 1 }],
      gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }],
      functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, maxTargets: 1 },
        { fn: 'addPower', target: { ref: 'previous' }, amount: 2000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousSelectedAny' },
      ],
    },
  },

  // OP14-079 — PARTIAL: "opp Characters cannot be removed by your effects" static rule deferred; mapped activate KO Baroque Works → opp −10 cost + trash 2 deck.
  {
    cardNumber: 'OP14-079',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      functions: [
        { fn: 'ko', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Baroque Works' } }, optional: true, maxTargets: 1 },
        { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -10, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
        { fn: 'trashTopDeck', count: 2, optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // OP14-080 (leader) Gecko Moria —
  //   [Activate: Main] [Once Per Turn] You may K.O. 1 of your {Thriller Bark Pirates} type Characters: Your
  //   Leader and all of your Characters gain +1000 power during this turn.[When Attacking] You may trash 3
  //   cards from your hand: Add up to 1 card from the top of your deck to the top of your Life cards.
  {
    cardNumber: 'OP14-080',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'K.O. 1 Thriller Bark Pirates Character?',
        options: [
          { label: 'skip', functions: [] },
          { label: 'pay', functions: [
            { fn: 'ko', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates' } }, maxTargets: 1 },
            { fn: 'addPowerAuraControllerTypes', amount: 1000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
          ] },
        ],
      }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Trash 3 cards from hand?',
        options: [
          { label: 'skip', functions: [] },
          { label: 'pay', functions: [
            { fn: 'trashFromHand', count: 3 },
            { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' },
          ] },
        ],
      }] } },
    ],
  },

  {
    cardNumber: 'OP14-081',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { exactBaseCost: 1 } }, optional: true }] } },
    ],
  },

  // OP14-083 — [Activate: Main] trash this: give up to 1 opp 0-cost Character −3000 this turn.
  { cardNumber: 'OP14-083', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },



  // OP14-084 — [On Play] If Leader "Baroque Works": play 1 {Baroque Works} cost ≤4 and 1 cost 1 from trash.
  { cardNumber: 'OP14-084', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 4 } }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Baroque Works', exactCost: 1 } }] } },

  { cardNumber: 'OP14-085', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },


  // OP14-087 - [On Play] If Leader type includes Baroque Works, look at 4; add Baroque Works other than self, trash rest.
  {
    cardNumber: 'OP14-087',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works', excludeSelfName: true }, remainder: 'trash' }] },
  },

  { cardNumber: 'OP14-088', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'moveCards', from: { zone: 'stages', player: 'opponent', filter: { exactCost: 1 } }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 }] } },

  {
    cardNumber: 'OP14-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
    ],
  },

  // OP14-090 — if any Character costs 0 or 8+, can attack Characters when played. [On Play] rest opp cost 0.
  {
    cardNumber: 'OP14-090',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackCharactersWhileSummoningSick', duration: 'permanent', condition: { gate: [{ kind: 'anyOf', gates: [{ kind: 'anyCharacterExactCost', exactCost: 0 }, { kind: 'anyCharacterCostAtLeast', atLeast: 8 }] }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, optional: true }] } },
    ],
  },

  // OP14-091 — [On K.O.] Play up to 1 Baroque Works Character cost≤5 (other than Bentham) from hand or trash.
  {
    cardNumber: 'OP14-091',
    templateId: 'ability',
    params: {
      timing: 'onKO',
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Play Baroque Works Character from:',
        options: [
          { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 5, excludeSelfName: true } }] },
          { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 5, excludeSelfName: true } }] },
        ],
      }],
    },
  },

  {
    cardNumber: 'OP14-092',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementSelf',
        scope: 'effect',
        oncePerTurn: true,
        sourceCondition: { turn: 'opponent' },
        trashTrashToDeckBottom: { count: 3 },
        duration: 'permanent',
      }],
    },
  },

  {
    cardNumber: 'OP14-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'negateEffect', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfTrashCount', atLeast: 10 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] } },
    ],
  },

  {
    cardNumber: 'OP14-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Thriller Bark Pirates' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Thriller Bark Pirates' }, remainder: 'trash' }] } },
    ],
  },

  {
    cardNumber: 'OP14-098',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyOf', gates: [{ kind: 'anyCharacterExactCost', exactCost: 0 }, { kind: 'anyCharacterCostAtLeast', atLeast: 8 }] }], functions: [{ fn: 'addCostAuraControllerCharacters', amount: 3, duration: 'endOfOpponentsTurn', anyOfTypes: ['Baroque Works'] }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
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

  {
    cardNumber: 'OP14-104',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Resolve Thriller Bark Pirates card from trash:',
        options: [
          { label: 'playFromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 } }] },
          { label: 'addToLife', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true, maxTargets: 1 }] },
        ],
      }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', maxCost: 4 } }] } },
    ],
  },

  { cardNumber: 'OP14-106', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP14-105 (character) Gorgon Sisters —
  //   [Activate: Main] [Once Per Turn] You may reveal 3 {Amazon Lily} or {Kuja Pirates} type cards from
  //   your hand: Give your Leader and all of your Characters up to 1 rested DON!! card each. [Trigger] If
  //   your Leader has the {Kuja Pirates} type, play this card.
  // PARTIAL: reveal-3 hand cost and multi-target DON!! distribution remain deferred; Trigger is mapped.
  { cardNumber: 'OP14-105', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'triggerPlaySelf' }] } },

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

  {
    cardNumber: 'OP14-110',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', maxCost: 4, hasTrigger: true, excludeSelfName: true } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
    ],
  },

  // OP14-111 (character) Perona —
  //   [On Play]/[On K.O.] Up to 1 of your opponent's Characters with a cost of 6 or less cannot attack
  //   until the end of your opponent's next End Phase. [Trigger] Play up to 1 {Thriller Bark Pirates} type
  //   Character card with a cost of 4 or less from your trash rested.
  {
    cardNumber: 'OP14-111',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, duration: 'endOfOpponentsTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, duration: 'endOfOpponentsTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
    ],
  },

  {
    cardNumber: 'OP14-112',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Seven Warlords of the Sea' }], functions: [
        { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
        { fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxPower: 6000, hasTrigger: true } }] } },
    ],
  },

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

  // OP14-115 (character) Rindo —
  //   PARTIAL: "you take 1 damage" on K.O. deferred; mapped life ramp + Kuja trigger play.
  {
    cardNumber: 'OP14-115',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', condition: { turn: 'opponent' }, functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
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

];
