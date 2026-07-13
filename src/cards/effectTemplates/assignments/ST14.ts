/**
 * Reviewed effect template assignments — Starter Deck ST14 (Straw Hat Crew "big-cost", black).
 *
 * A cost-matters deck: most abilities gate on "if you have a Character with a cost of N or more"
 * (new `selfHasCharacterCostAtLeast` gate) and buff/debuff cost via the generic `addCost` function.
 *
 * DEFERRED (need engine capability not yet present):
 *   ST14-001 (leader) / ST14-017 (stage) — "All of your Characters gain +1 cost": a continuous COST
 *            AURA over a dynamic group (must also cover Characters played later). NEW (cost-side of addPowerAura).
 *
 * PARTIAL (the mid-ability "Then, if <board state>, …" second clause is board-gated separately and is
 *   deferred; the first clause is implemented):
*   ST14-017 — its [On Play] draw IS implemented; the cost aura is deferred.
 *
 * Vanilla: ST14-005 Chopper, ST14-010 Brook, ST14-013 Zoro. ST14-006's [Blocker] is card data.
 */
import type { CardEffectAssignment } from '../assembler';

const BIG_COST_8 = { kind: 'selfHasCharacterCostAtLeast', atLeast: 8 } as const;

export const ST14_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST14-001 — [DON!! x1] all Characters +1 cost; +1000 Leader if cost-8+ Character on field.
  {
    cardNumber: 'ST14-001',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraControllerCharacters', amount: 1, duration: 'permanent', sourceCondition: { donAttachedAtLeast: 1 } }] } },
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }] } }] } },
    ],
  },

  // ST14-002 Usopp — [DON!! x1] [When Attacking] If you have a cost-8+ Character, K.O. up to 1 opponent Character cost <=4.
  {
    cardNumber: 'ST14-002',
    templateId: 'ability',
    params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [BIG_COST_8], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] },
  },

  // ST14-003 Sanji — [On Play] If you have a cost-6+ Character, K.O. up to 1 opponent Character cost <=5.
  {
    cardNumber: 'ST14-003',
    templateId: 'ability',
    params: { timing: 'onPlay', gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 6 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] },
  },

  // ST14-004 Jinbe — [Activate: Main] [Once Per Turn] Up to 1 of your black {Straw Hat Crew} Character gains +2 cost until end of opponent's next turn.
  {
    cardNumber: 'ST14-004',
    templateId: 'ability',
    params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'addCost', target: { group: 'characters', player: 'controller', filter: { color: 'black', typeIncludes: 'Straw Hat Crew' } }, amount: 2, duration: 'endOfOpponentsTurn', optional: true }] },
  },

  // ST14-006 Nami — [Blocker] (card data) + [On Play] If hand <=6 and you have a cost-8+ Character, draw 1.
  {
    cardNumber: 'ST14-006',
    templateId: 'ability',
    params: { timing: 'onPlay', gate: [{ kind: 'selfHand', atMost: 6 }, BIG_COST_8], functions: [{ fn: 'draw', amount: 1 }] },
  },

  // ST14-007 Nico Robin — [On Play]/[When Attacking] If you have a cost-8+ Character, give up to 1 opponent Character −5 cost this turn.
  {
    cardNumber: 'ST14-007',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [BIG_COST_8], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -5, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [BIG_COST_8], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -5, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // ST14-008 Haredas — [Activate: Main] rest this: +2 cost to a black {Straw Hat Crew} Character; draw/trash if cost-8+ Character exists.
  {
    cardNumber: 'ST14-008',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [
        { fn: 'addCost', target: { group: 'characters', player: 'controller', filter: { color: 'black', typeIncludes: 'Straw Hat Crew' } }, amount: 2, duration: 'endOfOpponentsTurn', optional: true },
        { fn: 'drawAndTrash', drawCount: 1, trashCount: 1, ifGate: [BIG_COST_8] },
      ],
    },
  },

  // ST14-009 Franky — [DON!! x1] [Opponent's Turn] If you have a cost-6+ Character, this cannot be K.O.'d by effects and gains +2000 power.
  {
    cardNumber: 'ST14-009',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [
        { fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'opponent', gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 6 }] } },
        { fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'opponent', gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 6 }] } },
      ],
    },
  },

  // ST14-011 Heracles — [Activate: Main] rest this: +2 cost to a black {Straw Hat Crew} Character until end of opponent's next turn.
  {
    cardNumber: 'ST14-011',
    templateId: 'ability',
    params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'controller', filter: { color: 'black', typeIncludes: 'Straw Hat Crew' } }, amount: 2, duration: 'endOfOpponentsTurn', optional: true }] },
  },

  // ST14-012 Luffy — If you have a cost-10+ Character, this Character gains [Rush].
  {
    cardNumber: 'ST14-012',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 10 }] } }] },
  },

  // ST14-014 (event) Gum-Gum Giant Rifle — [Counter] If cost-8+ Character, +3000 to your Leader/Character this battle.
  //   [Trigger] Add up to 1 of your Character cards (cost <=2) from your trash to your hand.
  {
    cardNumber: 'ST14-014',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [BIG_COST_8], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // ST14-015 (event) — [Main] +3000 to your Leader/Character this turn, then gated K.O.
  //   [Trigger] If you have a cost-8+ Character, K.O. up to 1 opponent Character cost <=5.
  {
    cardNumber: 'ST14-015',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifGate: [BIG_COST_8] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [BIG_COST_8], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },

  // ST14-016 (event) I Have My Crew!! — [Main] Draw 1, then +3 cost to a Character until end of opponent's next turn.
  //   [Trigger] K.O. up to 1 opponent Character cost <=3.
  {
    cardNumber: 'ST14-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 1 }, { fn: 'addCost', target: { group: 'characters', player: 'controller' }, amount: 3, duration: 'endOfOpponentsTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },

  // ST14-017 (stage) Thousand Sunny — [On Play] If your Leader has {Straw Hat Crew}, draw 1. (Cost aura deferred.)
  {
    cardNumber: 'ST14-017',
    templateId: 'ability',
    params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'draw', amount: 1 }] },
  },
];
