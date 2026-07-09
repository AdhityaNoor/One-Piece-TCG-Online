/**
 * CAPABILITY REGISTRY — the single, machine-readable source of truth for what
 * the effect-template catalog can express, for both humans and agents.
 *
 * Why this file exists
 * --------------------
 * Authoring a card used to require grepping four files (`templateDefs.ts` for the
 * function union, `factories.ts` for IR lowering, `effectIr.ts` for gates/timings,
 * `game.ts` for keywords/durations) plus hunting the assignments for a precedent.
 * This registry collapses all of that into one place: every primitive, gate, cost,
 * timing, duration, and keyword is listed with its params, a one-line semantics
 * summary, the canonical card-text clauses it COVERS (and, where relevant, what it
 * explicitly EXCLUDES), and at least one real curated example.
 *
 * Self-validating
 * ---------------
 * The tables below are typed as `Record<Union, Spec>`, so TypeScript fails the
 * build (`npm run typecheck`) if a primitive/gate/cost/timing/duration/keyword is
 * ever added to the engine but omitted here — the registry cannot silently drift.
 * `registry.test.ts` additionally asserts every `fn` actually used in the curated
 * assignments has an entry, and that examples reference real capabilities.
 *
 * This file is DATA ONLY. It never executes anything and raw card text never
 * enters it — it describes the catalog, mirroring the project's inert-parser rule.
 */
import type { AbilityCost, AbilityGate, IrDuration, IrTiming } from '../../../../engine/effects/effectIr';
import type { ContinuousKeyword } from '../../../../engine/state/game';
import type { AbilityFunction } from '../templateDefs';

export interface ParamSpec {
  name: string;
  /** Human-readable type, e.g. "number", "TargetSpec", "IrDuration". */
  type: string;
  required: boolean;
  note?: string;
}

export interface CapabilitySpec {
  /** Stable id (matches the union member: fn name / gate kind / cost kind / etc.). */
  id: string;
  summary: string;
  params: ParamSpec[];
  /** Canonical English clauses this capability maps (used for docs + as a matching seed). */
  covers: string[];
  /** Clauses that LOOK related but are intentionally out of scope (route to a new primitive / defer). */
  excludes?: string[];
  /** Real curated examples: `<cardNumber>` + a short snippet of the assignment. */
  examples: { cardNumber: string; snippet: string }[];
}

// ---------------------------------------------------------------------------
// Effect functions (the `functions: [...]` you place inside an ability)
// ---------------------------------------------------------------------------

export const EFFECT_PRIMITIVES: Record<AbilityFunction['fn'], CapabilitySpec> = {
  draw: {
    id: 'draw',
    summary: 'Draw N cards for the controller.',
    params: [{ name: 'amount', type: 'number', required: true }],
    covers: ['Draw {N} cards', 'draw {N} card'],
    examples: [{ cardNumber: 'OP01-055', snippet: "{ fn: 'draw', amount: 2 }" }],
  },
  drawUntilHandCount: {
    id: 'drawUntilHandCount',
    summary: 'Draw only enough cards for the chosen player to reach N cards in hand.',
    params: [
      { name: 'targetCount', type: 'number', required: true },
      { name: 'player', type: "'controller' | 'opponent'", required: false },
    ],
    covers: ['draw cards so that you have {N} cards in your hand'],
    excludes: ['Draw a fixed number of cards', 'draw until deck/hand has a dynamic count not expressible as a fixed target'],
    examples: [{ cardNumber: 'OP02-069', snippet: "{ fn: 'drawUntilHandCount', targetCount: 2 }" }],
  },
  drawAndTrash: {
    id: 'drawAndTrash',
    summary: 'Draw N then trash M from hand as one atomic step ("draw N and trash M").',
    params: [
      { name: 'drawCount', type: 'number', required: true },
      { name: 'trashCount', type: 'number', required: true },
    ],
    covers: ['draw {N} card and trash {M} card from your hand'],
    examples: [{ cardNumber: 'EB04-032', snippet: "{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }" }],
  },
  drawAndTrashByTypedCharacterCount: {
    id: 'drawAndTrashByTypedCharacterCount',
    summary: 'Draw N then trash N from hand, where N = count of your in-play Characters with a matching type.',
    params: [{ name: 'typeIncludes', type: 'string', required: true }],
    covers: ['draw 1 card for each of your {type} type Characters', 'then trash the same number of cards from your hand'],
    examples: [{ cardNumber: 'EB04-011', snippet: "{ fn: 'drawAndTrashByTypedCharacterCount', typeIncludes: 'Neptunian' }" }],
  },
  addDonFromDeck: {
    id: 'addDonFromDeck',
    summary: 'Add N DON!! from the DON!! deck, active or rested.',
    params: [
      { name: 'count', type: 'number', required: true },
      { name: 'rested', type: 'boolean', required: true },
    ],
    covers: ['add up to {N} DON!! card from your DON!! deck and set it as active', '... and rest it'],
    examples: [{ cardNumber: 'OP12-062', snippet: "{ fn: 'addDonFromDeck', count: 1, rested: true }" }],
  },
  giveDon: {
    id: 'giveDon',
    summary: 'Prompt to give N DON!! to the controller\'s Leader or 1 Character (max 1 target).',
    params: [
      { name: 'count', type: 'number', required: true },
      { name: 'optional', type: 'boolean', required: false },
      { name: 'targetTypeIncludes', type: 'string', required: false },
      { name: 'anyOfTypes', type: 'string[]', required: false, note: 'OR filter on Leader/Character tribal types' },
      { name: 'charactersOnly', type: 'boolean', required: false },
      { name: 'activeDonOnly', type: 'boolean', required: false },
    ],
    covers: ['give up to {N} rested DON!! card to your Leader or 1 of your Characters', 'give {N} active DON!! card to your Leader or Character'],
    excludes: ['give THIS Character up to N (self-only, "up to")', 'give to EACH of your {type} Characters'],
    examples: [{ cardNumber: 'EB01-002', snippet: "{ fn: 'giveDon', count: 1 }" }],
  },
  giveGivenDon: {
    id: 'giveGivenDon',
    summary: 'Reassign up to N DON!! already given on your field onto 1 Character (optionally type-filtered).',
    params: [
      { name: 'count', type: 'number', required: false },
      { name: 'optional', type: 'boolean', required: false },
      { name: 'targetTypeIncludes', type: 'string', required: false },
    ],
    covers: ['give up to {N} of your currently given DON!! cards to 1 of your {type} type Characters'],
    examples: [{ cardNumber: 'EB02-009', snippet: "{ fn: 'giveGivenDon', count: 1, optional: true, targetTypeIncludes: 'Straw Hat Crew' }" }],
  },
  giveDonControllerLeader: {
    id: 'giveDonControllerLeader',
    summary: 'Give up to N rested DON!! to the controller\'s Leader (no target choice).',
    params: [{ name: 'count', type: 'number', required: true }],
    covers: ['give up to {N} rested DON!! card to your Leader', 'give ... to this Leader'],
    examples: [{ cardNumber: 'EB03-014', snippet: "{ fn: 'giveDonControllerLeader', count: 2 }" }],
  },
  giveDonSelf: {
    id: 'giveDonSelf',
    summary: 'Give up to N rested DON!! to the source card itself.',
    params: [{ name: 'count', type: 'number', required: true }],
    covers: ['give this Character up to {N} rested DON!! cards'],
    examples: [{ cardNumber: 'OP01-024', snippet: "{ fn: 'giveDonSelf', count: 2 }" }],
  },
  giveDonFromOpponentCostArea: {
    id: 'giveDonFromOpponentCostArea',
    summary: 'Give up to N DON!! from the opponent\'s cost area to 1 opponent Character.',
    params: [
      { name: 'count', type: 'number', required: true },
      { name: 'restedOnly', type: 'boolean', required: false, note: 'true when text says "rested DON!!"' },
      { name: 'optional', type: 'boolean', required: false, note: '"up to"' },
      { name: 'maxTargets', type: 'number', required: false },
    ],
    covers: ['give up to {N} of your opponent\'s rested DON!! cards to 1 of your opponent\'s Characters', 'give up to {N} DON!! card from your opponent\'s cost area to 1 of your opponent\'s Characters'],
    examples: [{ cardNumber: 'OP15-028', snippet: "{ fn: 'giveDonFromOpponentCostArea', count: 1, optional: true }" }],
  },
  giveDonFromPreviousTargetOwnerCostArea: {
    id: 'giveDonFromPreviousTargetOwnerCostArea',
    summary: 'After choosing an opponent Character (var t), give rested DON!! from that card owner\'s cost area to their Leader/Character.',
    params: [
      { name: 'count', type: 'number', required: true },
      { name: 'restedOnly', type: 'boolean', required: false },
      { name: 'optional', type: 'boolean', required: false },
    ],
    covers: ['Give up to {N} rested DON!! card to its owner\'s Leader or 1 of their Characters'],
    examples: [{ cardNumber: 'OP15-017', snippet: "{ fn: 'giveDonFromPreviousTargetOwnerCostArea', count: 1, optional: true, ifPrevious: 'previousSelectedAny' }" }],
  },
  ko: {
    id: 'ko',
    summary: 'K.O. targets (fires [On K.O.]). Use filters on the target for cost/power/type limits; maxCombinedPower caps total current power across a multi-select.',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'optional', type: 'boolean', required: false, note: '"up to"' },
      { name: 'maxTargets', type: 'number', required: false },
      { name: 'maxCombinedPower', type: 'number', required: false },
    ],
    covers: ['K.O. up to {N} of your opponent\'s Characters with a cost of {C} or less', 'K.O. up to {N} ... with a total power of {P} or less'],
    examples: [{ cardNumber: 'OP05-007', snippet: "{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 2, maxCombinedPower: 4000 }" }],
  },
  koAllCharacters: {
    id: 'koAllCharacters',
    summary: 'K.O. ALL characters (both players) matching a cost/power filter, no target choice.',
    params: [{ name: 'filter', type: '{ maxCost?; maxPower? }', required: false }],
    covers: ['K.O. all Characters with a cost of {C} or less'],
    examples: [{ cardNumber: 'OP06-117', snippet: "{ fn: 'koAllCharacters', filter: { maxCost: 2 } }" }],
  },
  rest: {
    id: 'rest',
    summary: 'Rest target characters. Filters on the target constrain cost/power/type.',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'optional', type: 'boolean', required: false },
      { name: 'maxTargets', type: 'number', required: false },
    ],
    covers: ['rest up to {N} of your opponent\'s Characters with a cost of {C} or less'],
    excludes: ['rest 1 of your opponent\'s DON!! cards OR Characters (mixed DON!!/Character target)'],
    examples: [{ cardNumber: 'OP11-031', snippet: "{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }" }],
  },
  restSelf: {
    id: 'restSelf',
    summary: 'Rest the source card (usually part of an activation cost expressed as a function).',
    params: [],
    covers: ['rest this Character', 'You may rest this card ...'],
    examples: [{ cardNumber: 'EB03-009', snippet: "{ fn: 'restSelf' }" }],
  },
  restOpponentDon: {
    id: 'restOpponentDon',
    summary: 'Rest up to N of the opponent\'s active DON!! (DON!! denial).',
    params: [{ name: 'maxTargets', type: 'number', required: false }],
    covers: ['rest up to {N} of your opponent\'s DON!! cards'],
    examples: [{ cardNumber: 'OP06-062', snippet: "{ fn: 'restOpponentDon', maxTargets: 1 }" }],
  },
  restControllerDon: {
    id: 'restControllerDon',
    summary: 'Rest up to N of the controller\'s active DON!! as an optional effect-chain payment.',
    params: [{ name: 'maxTargets', type: 'number', required: false }, { name: 'optional', type: 'boolean', required: false }],
    covers: ['you may rest {N} of your DON!! cards', 'rest {N} of your DON!! cards'],
    examples: [{ cardNumber: 'OP09-023', snippet: "{ fn: 'restControllerDon', maxTargets: 1, optional: true }" }],
  },
  returnOpponentDon: {
    id: 'returnOpponentDon',
    summary: 'Opponent chooses N DON!! from their field and returns them to their DON!! deck.',
    params: [{ name: 'count', type: 'number', required: true }],
    covers: ['your opponent returns {N} DON!! card from their field to their DON!! deck'],
    examples: [{ cardNumber: 'OP14-065', snippet: "{ fn: 'returnOpponentDon', count: 1 }" }],
  },
  restControllerLeaderOrStage: {
    id: 'restControllerLeaderOrStage',
    summary: 'Rest 1 chosen controller Leader/Stage (optionally type-filtered) — a "rest your {X} Leader/Stage:" cost. Binds var t.',
    params: [{ name: 'typeIncludes', type: 'string', required: false }],
    covers: ['You may rest 1 of your {type} Leader or Stage cards:'],
    examples: [{ cardNumber: 'OP10-057', snippet: "{ fn: 'restControllerLeaderOrStage' }" }],
  },
  preventRefresh: {
    id: 'preventRefresh',
    summary: 'Target rested cards will not become active in the owner\'s next Refresh Phase.',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'optional', type: 'boolean', required: false },
      { name: 'maxTargets', type: 'number', required: false },
    ],
    covers: ['up to {N} of your opponent\'s rested Characters will not become active in ... next Refresh Phase'],
    examples: [{ cardNumber: 'OP15-023', snippet: "{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true }" }],
  },
  preventAttack: {
    id: 'preventAttack',
    summary: 'Target Leader/Character cannot declare an attack for the duration. Optional attackUnlessGate inverts to "cannot attack unless …"; optional condition blocks only while it holds.',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'forbiddenTargetFilter', type: 'ForbiddenAttackTargetFilter', required: false },
      { name: 'attackUnlessGate', type: 'AbilityGate[]', required: false },
      { name: 'condition', type: 'IrCondition', required: false },
    ],
    covers: ['this Character cannot attack', '... cannot attack unless …', 'If you have {N}+ cards in your hand, this Character cannot attack', 'cannot attack your opponent\'s Characters with a base cost of {N} or less'],
    examples: [
      { cardNumber: 'OP04-065', snippet: "{ fn: 'preventAttack', target: { ref: 'self' }, duration: 'endOfOpponentsTurn' }" },
      { cardNumber: 'EB04-005', snippet: "{ fn: 'preventAttack', target: { ref: 'self' }, duration: 'permanent', attackUnlessGate: [{ kind: 'opponentCharacterBasePowerCount', power: 5000, atLeast: 2 }] }" },
      { cardNumber: 'OP12-020', snippet: "{ fn: 'preventAttack', target: { ref: 'self' }, duration: 'duringThisTurn', forbiddenTargetFilter: { zone: 'character', maxBaseCost: 7 } }" },
    ],
  },
  preventAttackAll: {
    id: 'preventAttackAll',
    summary: 'All of the controller\'s Leaders/Characters gain an attack restriction for the duration without a target choice.',
    params: [
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'forbiddenTarget', type: "'leader'", required: false, note: 'Omit for full cannot-attack; set to leader for "cannot attack a Leader".' },
    ],
    covers: ['you cannot attack a Leader during this turn', 'you cannot attack during this turn'],
    excludes: ['Up to 1 chosen Character cannot attack — use preventAttack with a target choice instead'],
    examples: [{ cardNumber: 'OP06-026', snippet: "{ fn: 'preventAttackAll', duration: 'duringThisTurn', forbiddenTarget: 'leader' }" }],
  },
  setForcedAttackTarget: {
    id: 'setForcedAttackTarget',
    summary: 'While active, the opponent may only attack this Character (taunt). Gated on source/target state via sourceCondition and condition.',
    params: [
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'condition', type: 'IrCondition', required: false },
    ],
    covers: ['your opponent cannot attack any card other than this Character'],
    examples: [{ cardNumber: 'OP01-051', snippet: "{ fn: 'setForcedAttackTarget', duration: 'permanent', sourceCondition: { donAttachedAtLeast: 1, turn: 'opponent' }, condition: { rested: true } }" }],
  },
  redirectAttackTarget: {
    id: 'redirectAttackTarget',
    summary: 'During an in-progress battle, change the current attack target to a chosen defender (Block-Step redirect).',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'optional', type: 'boolean', required: false },
      { name: 'maxTargets', type: 'number', required: false },
      { name: 'prompt', type: 'string', required: false },
    ],
    covers: ['change the target of that attack to this Leader or to one of your {type} type Character cards', 'change the attack target to the selected card'],
    excludes: ['opponent must attack this Character (taunt) — use setForcedAttackTarget'],
    examples: [
      { cardNumber: 'OP14-060', snippet: "{ fn: 'redirectAttackTarget', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Donquixote Pirates', typeFilterCharactersOnly: true } } }" },
      { cardNumber: 'OP16-080', snippet: "{ fn: 'redirectAttackTarget', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Blackbeard Pirates', typeFilterCharactersOnly: true } }, ifPrevious: 'previousMovedAny' }" },
    ],
  },
  swapBasePower: {
    id: 'swapBasePower',
    summary: 'Choose exactly two targets, then swap their printed base power for the duration (crosswise setBasePower).',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'minTargets', type: 'number', required: false },
      { name: 'maxTargets', type: 'number', required: false },
      { name: 'swapKind', type: "'anyTwo' | 'leaderAndCharacter'", required: false },
      { name: 'prompt', type: 'string', required: false },
    ],
    covers: ['swap the base power of the selected Characters with each other during this turn', 'select your Leader and 1 Character. Swap the base power of the selected cards with each other during this battle'],
    excludes: ['base power becomes the same as X (dynamic) — needs a different primitive'],
    examples: [
      { cardNumber: 'OP14-001', snippet: "{ fn: 'swapBasePower', target: { group: 'characters', player: 'controller', filter: { anyOfTypes: ['Supernovas', 'Heart Pirates'] } }, duration: 'duringThisTurn', minTargets: 2, maxTargets: 2 }" },
      { cardNumber: 'OP14-017', snippet: "{ fn: 'swapBasePower', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 9000 } }, duration: 'duringThisTurn', minTargets: 2, maxTargets: 2 }" },
    ],
  },
  preventRest: {
    id: 'preventRest',
    summary: 'Target Leader/Character cannot be rested by card effects for the duration.',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'optional', type: 'boolean', required: false },
      { name: 'maxTargets', type: 'number', required: false },
      { name: 'effectSourceController', type: "'opponent' | 'controller'", required: false, note: 'for "by your opponent\'s effects" / "by your effects"' },
      { name: 'condition', type: 'IrCondition', required: false },
    ],
    covers: ['up to {N} Characters cannot be rested until the end of your opponent\'s next End Phase', 'this Character cannot be rested by your opponent\'s effects'],
    examples: [
      { cardNumber: 'OP13-032', snippet: "{ fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, duration: 'endOfOpponentsTurn', optional: true }" },
      { cardNumber: 'OP12-021', snippet: "{ fn: 'preventRest', target: { ref: 'self' }, duration: 'permanent', effectSourceController: 'opponent', condition: { gate: [{ kind: 'leaderAttribute', attribute: 'slash' }, { kind: 'selfRestedDonCount', atLeast: 6 }] } }" },
    ],
  },
  negateEffect: {
    id: 'negateEffect',
    summary: 'Negate the effect(s) of chosen Leader/Character/Stage cards for the duration.',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'negatedTimings', type: 'IrTiming[]', required: false, note: 'omit to negate all timings; e.g. ["onPlay"] for "[On Play] effects are negated"' },
      { name: 'optional', type: 'boolean', required: false },
      { name: 'maxTargets', type: 'number', required: false },
    ],
    covers: ['Negate the effect of up to 1 of your opponent\'s Leader or Character cards', 'negate the effect of up to 1 of your opponent\'s Characters'],
    examples: [{ cardNumber: 'OP09-097', snippet: "{ fn: 'negateEffect', target: { group: 'leaderOrCharacters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 }" }],
  },
  negateControllerEffects: {
    id: 'negateControllerEffects',
    summary: 'Negate abilities on all cards controlled by a player (optionally limited to specific timings).',
    params: [
      { name: 'player', type: "'controller' | 'opponent'", required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'negatedTimings', type: 'IrTiming[]', required: false },
    ],
    covers: ['Your [On Play] effects are negated', 'Your opponent\'s [On Play] effects are negated until the end of your opponent\'s next turn'],
    examples: [{ cardNumber: 'OP09-081', snippet: "{ fn: 'negateControllerEffects', player: 'controller', negatedTimings: ['onPlay'], duration: 'permanent' }" }],
  },
  preventControllerLifeToHand: {
    id: 'preventControllerLifeToHand',
    summary: 'Controller cannot add Life cards to hand using their own effects for the duration.',
    params: [
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'player', type: "'controller' | 'opponent'", required: false },
    ],
    covers: ['you cannot add Life cards to your hand using your own effects during this turn'],
    examples: [{ cardNumber: 'ST15-001', snippet: "{ fn: 'preventControllerLifeToHand', duration: 'duringThisTurn' }" }],
  },
  preventControllerCharacterPlay: {
    id: 'preventControllerCharacterPlay',
    summary: 'Controller cannot play Character cards matching an optional base-cost filter for the duration.',
    params: [
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'player', type: "'controller' | 'opponent'", required: false },
      { name: 'minBaseCost', type: 'number', required: false, note: 'block Characters with base cost >= N' },
      { name: 'maxBaseCost', type: 'number', required: false, note: 'block Characters with base cost <= N' },
    ],
    covers: [
      'you cannot play Character cards during this turn',
      'you cannot play Character cards with a cost of {N} or more during this turn',
    ],
    examples: [
      { cardNumber: 'EB03-024', snippet: "{ fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn' }" },
      { cardNumber: 'OP12-030', snippet: "{ fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn', minBaseCost: 7 }" },
    ],
  },
  preventControllerHandPlay: {
    id: 'preventControllerHandPlay',
    summary: 'Controller cannot play any cards from hand for the duration.',
    params: [
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'player', type: "'controller' | 'opponent'", required: false },
    ],
    covers: ['you cannot play cards from your hand during this turn'],
    examples: [{ cardNumber: 'OP13-028', snippet: "{ fn: 'preventControllerHandPlay', duration: 'duringThisTurn' }" }],
  },
  preventControllerCharacterSetActiveDon: {
    id: 'preventControllerCharacterSetActiveDon',
    summary: 'Controller cannot set DON!! cards as active using Character effects for the duration.',
    params: [
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'player', type: "'controller' | 'opponent'", required: false },
    ],
    covers: ['you cannot set DON!! cards as active using Character effects during this turn'],
    examples: [{ cardNumber: 'EB04-016', snippet: "{ fn: 'preventControllerCharacterSetActiveDon', duration: 'duringThisTurn' }" }],
  },
  giveDonLeaderAndCharacter: {
    id: 'giveDonLeaderAndCharacter',
    summary: 'Give up to N rested DON!! to your Leader and up to N to 1 chosen Character.',
    params: [{ name: 'count', type: 'number', required: true }],
    covers: ['Give your Leader and 1 Character up to 1 rested DON!! card each'],
    examples: [{ cardNumber: 'EB03-026', snippet: "{ fn: 'giveDonLeaderAndCharacter', count: 1 }" }],
  },
  preventBlockers: {
    id: 'preventBlockers',
    summary: 'Opponent cannot activate [Blocker] while a chosen attacker attacks (or during this battle for self).',
    params: [
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'target', type: "'self' | 'chosenControllerLeaderOrCharacter'", required: false },
      { name: 'filter', type: '{ typeIncludes?: string; name?: string; minPower?: number }', required: false },
      { name: 'blockerPowerAtLeast', type: 'number', required: false },
      { name: 'blockerPowerAtMost', type: 'number', required: false },
      { name: 'blockerMaxCost', type: 'number', required: false },
      { name: 'powerBonus', type: 'number', required: false, note: 'with chosen target: grant +N power for the same duration before registering blocker suppression' },
    ],
    covers: ['your opponent cannot activate [Blocker] during this battle', 'if the selected card attacks during this turn, your opponent cannot activate [Blocker]', 'cannot activate the [Blocker] of any Character with a cost of {N} or less', 'cannot activate a [Blocker] Character that has {N} or less power'],
    examples: [{ cardNumber: 'OP07-057', snippet: "{ fn: 'preventBlockers', duration: 'duringThisTurn', target: 'chosenControllerLeaderOrCharacter', filter: { typeIncludes: 'The Seven Warlords of the Sea' }, powerBonus: 2000 }" }],
  },
  preventBlockersOnPreviousTarget: {
    id: 'preventBlockersOnPreviousTarget',
    summary: 'After a prior function selected/gave DON!! to a card, that previous target becomes unblockable for the duration.',
    params: [{ name: 'duration', type: 'IrDuration', required: true }],
    covers: ['If you do, when that card attacks this turn, your opponent cannot activate [Blocker]'],
    excludes: ['Suppressing a specific blocker card; use suppressBlockerOnTarget for that'],
    examples: [{ cardNumber: 'OP12-016', snippet: "{ fn: 'preventBlockersOnPreviousTarget', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }" }],
  },
  preventAttackLeaderWhileSummoningSick: {
    id: 'preventAttackLeaderWhileSummoningSick',
    summary: 'The source cannot attack Leaders while it still has summoning sickness.',
    params: [{ name: 'duration', type: 'IrDuration', required: true }],
    covers: ['This Character cannot attack your opponent\'s Leader on the turn in which it is played'],
    excludes: ['General cannot-attack clauses without the played-this-turn/summoning-sick limit'],
    examples: [{ cardNumber: 'OP03-001', snippet: "{ fn: 'preventAttackLeaderWhileSummoningSick', duration: 'permanent' }" }],
  },
  suppressBlockerOnTarget: {
    id: 'suppressBlockerOnTarget',
    summary: 'Chosen Character cannot activate [Blocker] for the duration (not tied to a specific attacker).',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'optional', type: 'boolean', required: false },
      { name: 'maxTargets', type: 'number', required: false },
    ],
    covers: ['Up to 1 of your opponent\'s Characters with a base cost of {N} or less cannot activate [Blocker] during this turn'],
    examples: [{ cardNumber: 'OP12-051', snippet: "{ fn: 'suppressBlockerOnTarget', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, duration: 'duringThisTurn', optional: true }" }],
  },
  addPower: {
    id: 'addPower',
    summary: 'Add/subtract power on chosen targets. Permanent + condition = a conditional continuous buff; a turn/battle duration = a one-shot pump.',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'amount', type: 'number', required: true, note: 'negative for "give −N power"' },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'condition', type: 'IrCondition', required: false },
      { name: 'optional', type: 'boolean', required: false },
    ],
    covers: ['up to {N} of your Leader or Character cards gains +{P} power during this turn', 'give up to 1 of your opponent\'s Characters −{P} power'],
    examples: [{ cardNumber: 'OP12-057', snippet: "{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }" }],
  },
  addPowerSelf: {
    id: 'addPowerSelf',
    summary: 'Add power to the source card (convenience for addPower on { ref: self }).',
    params: [
      { name: 'amount', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'condition', type: 'IrCondition', required: false },
    ],
    covers: ['this Character gains +{P} power', '[DON!! xN]/[Your Turn]/[Opponent\'s Turn] ... this Character gains +{P} power'],
    examples: [{ cardNumber: 'EB01-058', snippet: "{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [...] } }" }],
  },
  addPowerSelfPerPreviousTrashed: {
    id: 'addPowerSelfPerPreviousTrashed',
    summary: 'Add +amountPer power to self for each card trashed in the prior optionalTrash step (binds var `t`).',
    params: [
      { name: 'amountPer', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'countVar', type: 'string', required: false },
      { name: 'ifPrevious', type: 'SequenceCondition', required: false },
    ],
    covers: ['gains +{P} power during this battle for each card trashed by this effect'],
    examples: [{ cardNumber: 'OP03-001', snippet: "{ fn: 'addPowerSelfPerPreviousTrashed', amountPer: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' }" }],
  },
  addPowerSelfScaling: {
    id: 'addPowerSelfScaling',
    summary: 'Continuous self power scaling +amountPer per `step` of a source (cards in hand, Events in trash, etc.).',
    params: [
      { name: 'per', type: 'PowerScaleSource', required: true },
      { name: 'step', type: 'number', required: true },
      { name: 'amountPer', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'condition', type: 'IrCondition', required: false },
    ],
    covers: ['this Character gains +{P} power for each {source}'],
    examples: [{ cardNumber: 'OP09-092', snippet: "{ fn: 'addPowerSelfScaling', per: 'cardsInHand', step: 1, amountPer: 1000, duration: 'permanent' }" }],
  },
  addCost: {
    id: 'addCost',
    summary: 'Add/subtract cost on targets. Permanent + condition = continuous; a turn duration = temporary "give −N cost during this turn".',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'amount', type: 'number', required: true, note: 'negative for "give −N cost"' },
      { name: 'duration', type: 'IrDuration', required: false, note: "defaults to 'duringThisTurn'" },
      { name: 'condition', type: 'IrCondition', required: false },
    ],
    covers: ['give up to 1 of your opponent\'s Characters −{C} cost during this turn', 'this Character gains +{C} cost'],
    examples: [{ cardNumber: 'OP12-063', snippet: "{ fn: 'addCost', target: { ref: 'self' }, amount: 5, duration: 'permanent', condition: { gate: [...] } }" }],
  },
  setBasePower: {
    id: 'setBasePower',
    summary: '"Base power BECOMES N" (2-6): overwrite printed base; additive modifiers still stack on top. Last-applied set wins.',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'value', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'condition', type: 'IrCondition', required: false },
    ],
    covers: ['this card\'s base power becomes {P}', 'your Leader\'s base power becomes {P}', '[Opponent\'s Turn] this Character\'s base power becomes {P}'],
    excludes: [],
    examples: [{ cardNumber: 'EB04-004', snippet: "{ fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 7000, duration: 'endOfOpponentsTurn' }" }],
  },
  setBasePowerFromLeader: {
    id: 'setBasePowerFromLeader',
    summary: 'Set base power to match your Leader\'s printed base power (resolved at read time).',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'condition', type: 'IrCondition', required: false },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
    ],
    covers: ['this Character\'s base power becomes the same as your Leader\'s base power'],
    examples: [{ cardNumber: 'OP14-053', snippet: "{ fn: 'setBasePowerFromLeader', target: { ref: 'self' }, duration: 'endOfOpponentsTurn', sourceCondition: { turn: 'opponent' }, condition: { gate: [{ kind: 'selfHand', atMost: 7 }] } }" }],
  },
  drawByEventCount: {
    id: 'drawByEventCount',
    summary: 'Draw N cards where N comes from the reactive event context (e.g. handTrashedCount).',
    params: [{ name: 'countField', type: "'handTrashedCount'", required: true }],
    covers: ['draw cards equal to the number of cards trashed'],
    examples: [{ cardNumber: 'OP12-040', snippet: "{ fn: 'drawByEventCount', countField: 'handTrashedCount' }" }],
  },
  registerRestReplacementSelf: {
    id: 'registerRestReplacementSelf',
    summary: 'Register optional rest replacement on self ("would be rested … rest another Character instead").',
    params: [
      { name: 'oncePerTurn', type: 'boolean', required: false },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'effectSourceController', type: "'opponent' | 'controller'", required: false },
      { name: 'effectSourceCategory', type: "'leader' | 'character'", required: false },
      { name: 'duration', type: 'IrDuration', required: true },
    ],
    covers: ['If this Character would be rested by your opponent\'s Character\'s effect, you may rest 1 of your other Characters instead'],
    examples: [{ cardNumber: 'PRB02-006', snippet: "{ fn: 'registerRestReplacementSelf', sourceCondition: { turn: 'opponent' }, effectSourceController: 'opponent', effectSourceCategory: 'character', duration: 'permanent' }" }],
  },
  setBasePowerAuraControllerTypes: {
    id: 'setBasePowerAuraControllerTypes',
    summary: 'Aura: set base power to N for the controller\'s Leader + Characters (optionally name/type-filtered), optionally gated on source state.',
    params: [
      { name: 'value', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'anyOfTypes', type: 'string[]', required: false },
      { name: 'anyOfNames', type: 'string[]', required: false, note: 'OR filter on printed card name (Leader + Characters when ownLeaderAndCharacters)' },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'gate', type: 'AbilityGate[]', required: false },
    ],
    covers: ['[Opponent\'s Turn] all of your [{name}] cards\' base power become {P}'],
    examples: [{ cardNumber: 'OP15-070', snippet: "{ fn: 'setBasePowerAuraControllerTypes', value: 6000, duration: 'permanent', anyOfNames: ['Shura'], sourceCondition: { turn: 'opponent' } }" }],
  },
  setBaseCost: {
    id: 'setBaseCost',
    summary: '"Base cost BECOMES N" (2-7): overwrite printed base cost; additive deltas still stack. Floored at 0.',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'value', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'condition', type: 'IrCondition', required: false },
    ],
    covers: ['this card\'s base cost becomes {C}'],
    examples: [{ cardNumber: 'EB04-004', snippet: "// mirror of setBasePower for cost" }],
  },
  addKeyword: {
    id: 'addKeyword',
    summary: 'Grant a keyword to targets. Permanent + condition = a conditional static grant ("if X, gains [Blocker]"); a turn duration = "gains [Rush] during this turn".',
    params: [
      { name: 'target', type: 'TargetSpec', required: true },
      { name: 'keyword', type: 'ContinuousKeyword', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'condition', type: 'IrCondition', required: false },
      { name: 'optional', type: 'boolean', required: false },
    ],
    covers: ['this Character gains [Blocker]/[Rush]/[Double Attack]/[Banish]', 'if {gate}, this Character gains [Blocker]'],
    examples: [{ cardNumber: 'OP06-054', snippet: "{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfHand', atMost: 5 }] } }" }],
  },
  addKeywordAuraControllerTypes: {
    id: 'addKeywordAuraControllerTypes',
    summary: 'Aura: grant a keyword to the controller\'s Leader + Characters (optionally name/type-filtered), optionally gated on source state.',
    params: [
      { name: 'keyword', type: 'ContinuousKeyword', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'anyOfTypes', type: 'string[]', required: false },
      { name: 'anyOfNames', type: 'string[]', required: false, note: 'OR filter on printed card name (Leader + Characters when ownLeaderAndCharacters)' },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'gate', type: 'AbilityGate[]', required: false },
    ],
    covers: ['all of your [{name}] cards gain [Unblockable]/[Double Attack]', 'your {type} Leader and Characters gain [Blocker]'],
    examples: [{ cardNumber: 'OP15-070', snippet: "{ fn: 'addKeywordAuraControllerTypes', keyword: 'unblockable', duration: 'permanent', anyOfNames: ['Shura'] }" }],
  },
  addKeywordAuraControllerCharacters: {
    id: 'addKeywordAuraControllerCharacters',
    summary: 'Aura: grant a keyword to ALL controller Characters (chars only), optionally name/type-filtered + source-state gated.',
    params: [
      { name: 'keyword', type: 'ContinuousKeyword', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'anyOfTypes', type: 'string[]', required: false },
      { name: 'anyOfNames', type: 'string[]', required: false },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'gate', type: 'AbilityGate[]', required: false },
    ],
    covers: ['all of your [{name}] Characters gain [Blocker]'],
    examples: [{ cardNumber: 'OP15-071', snippet: "// characters-only variant: { fn: 'addKeywordAuraControllerCharacters', keyword: 'doubleAttack', duration: 'permanent', anyOfNames: ['Ohm'] }" }],
  },
  trashFromHand: {
    id: 'trashFromHand',
    summary: 'Trash exactly N cards from the controller\'s hand (mandatory).',
    params: [{ name: 'count', type: 'number', required: true }],
    covers: ['trash {N} card from your hand'],
    examples: [{ cardNumber: 'OP12-057', snippet: "{ fn: 'trashFromHand', count: 1 }" }],
  },
  optionalTrashFromHand: {
    id: 'optionalTrashFromHand',
    summary: '"You may trash N from hand:" cost — optional trash; gate the payoff with ifPrevious: previousMovedAny.',
    params: [
      { name: 'count', type: 'number', required: false },
      { name: 'anyNumber', type: 'boolean', required: false },
      { name: 'filter', type: 'SearchFilter', required: false },
    ],
    covers: ['You may trash {N} card from your hand:', 'You may trash any number of Event or Stage cards from your hand'],
    examples: [{ cardNumber: 'OP03-001', snippet: "{ fn: 'optionalTrashFromHand', anyNumber: true, filter: { anyOf: [{ category: 'event' }, { category: 'stage' }] } }" }],
  },
  trashTypeFromHand: {
    id: 'trashTypeFromHand',
    summary: 'Trash exactly N cards of a given type/category from hand (typed hand cost).',
    params: [
      { name: 'count', type: 'number', required: true },
      { name: 'filter', type: 'SearchFilter', required: true },
      { name: 'optional', type: 'boolean', required: false },
    ],
    covers: ['trash {N} {type} card from your hand', 'trash {N} Character card with a cost of {C} or more from your hand'],
    examples: [{ cardNumber: 'OP16-092', snippet: "{ fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', minCost: 8 }, optional: true }" }],
  },
  trashFromOpponentHandChosenByOpponent: {
    id: 'trashFromOpponentHandChosenByOpponent',
    summary: 'Opponent trashes N cards of their choice from their hand.',
    params: [{ name: 'count', type: 'number', required: true }],
    covers: ['your opponent trashes {N} card from their hand'],
    examples: [{ cardNumber: 'OP10-087', snippet: "{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }" }],
  },
  revealOpponentHand: {
    id: 'revealOpponentHand',
    summary: 'Reveal all or N chosen cards from the opponent\'s hand.',
    params: [{ name: 'count', type: 'number', required: false }],
    covers: ['your opponent reveals their hand', 'Choose {N} cards from your opponent\'s hand; your opponent reveals those cards'],
    excludes: ['branching based on the revealed card category/name'],
    examples: [{ cardNumber: 'OP01-105', snippet: "{ fn: 'revealOpponentHand', count: 2 }" }],
  },
  trashTopDeck: {
    id: 'trashTopDeck',
    summary: 'Trash N cards from the top of the controller\'s deck (mill self).',
    params: [{ name: 'count', type: 'number', required: true }],
    covers: ['trash {N} cards from the top of your deck'],
    examples: [{ cardNumber: 'OP04-079', snippet: "{ fn: 'trashTopDeck', count: 2 }" }],
  },
  trashSelf: {
    id: 'trashSelf',
    summary: 'Trash the source card as an ordered effect function, not as an activation cost.',
    params: [],
    covers: ['and trash this Character:', 'trash this Character, then'],
    examples: [{ cardNumber: 'OP13-007', snippet: "{ fn: 'trashSelf', ifPrevious: 'previousMovedAny' }" }],
  },
  moveCards: {
    id: 'moveCards',
    summary: 'Generic zone move: from a source (characters/hand/trash/deck/life) to a destination (hand/life/deck-bottom/trash). Covers return-to-hand, bottom-deck, life-to-hand, etc.',
    params: [
      { name: 'from', type: 'MoveCardSource', required: true },
      { name: 'to', type: 'MoveCardDestination', required: true },
      { name: 'optional', type: 'boolean', required: false },
      { name: 'maxTargets', type: 'number', required: false },
      { name: 'chooser', type: "'controller' | 'opponent'", required: false },
    ],
    covers: ['return up to 1 Character to the owner\'s hand', 'place ... at the bottom of the owner\'s deck', 'add 1 card from the top of your Life to your hand', 'your opponent places 1 card from their hand at the bottom of their deck'],
    excludes: ['character source filter by CURRENT minCost (only minBaseCost exists)', 'return to hand OR bottom of deck (player choice of destination)'],
    examples: [{ cardNumber: 'OP01-047', snippet: "{ fn: 'moveCards', from: { zone: 'characters', player: 'any' }, to: { zone: 'hand', player: 'owner' }, optional: true }" }],
  },
  moveAllCards: {
    id: 'moveAllCards',
    summary: 'Generic no-choice movement: move every card in a source selector to a destination.',
    params: [
      { name: 'from', type: 'MoveCardSource', required: true },
      { name: 'to', type: 'MoveCardDestination', required: true },
    ],
    covers: ['Trash all of your Characters', 'place all matching Characters at the bottom of the owner\'s deck'],
    examples: [{ cardNumber: 'OP13-082', snippet: "{ fn: 'moveAllCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'trash', player: 'owner' } }" }],
  },
  moveAllCharactersToBottomDeck: {
    id: 'moveAllCharactersToBottomDeck',
    summary: 'Move all matching Characters to the bottom of their owners\' decks, no target choice.',
    params: [
      { name: 'filter', type: '{ maxCost?; maxPower?; maxBaseCost?; maxBasePower? }', required: false },
    ],
    covers: ['Place all Characters with a cost of {N} or less at the bottom of the owner\'s deck'],
    examples: [{ cardNumber: 'OP05-058', snippet: "{ fn: 'moveAllCharactersToBottomDeck', filter: { maxCost: 3 } }" }],
  },
  peekLifeAndPlace: {
    id: 'peekLifeAndPlace',
    summary: 'Peek at the top Life card (yours or opponent\'s) and place it top or bottom.',
    params: [
      { name: 'from', type: "'controllerOrOpponentTop'", required: true },
      { name: 'placement', type: "'topOrBottom'", required: true },
    ],
    covers: ['look at the top card of your/their Life and place it at the top or bottom'],
    examples: [{ cardNumber: 'OP01-063', snippet: "{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }" }],
  },
  chooseOne: {
    id: 'chooseOne',
    summary: 'Modal "choose one:" — controller or opponent picks one branch of sequenced functions.',
    params: [
      { name: 'chooser', type: "'controller' | 'opponent'", required: true },
      { name: 'prompt', type: 'string', required: true },
      { name: 'options', type: '{ label; functions[] }[]', required: true },
    ],
    covers: ['choose one: • ... • ...'],
    examples: [{ cardNumber: 'OP12-060', snippet: "{ fn: 'chooseOne', chooser: 'controller', prompt: '...', options: [...] }" }],
  },
  playFromHand: {
    id: 'playFromHand',
    summary: 'Play up to N cards matching a filter from hand.',
    params: [
      { name: 'filter', type: 'SearchFilter', required: true },
      { name: 'maxTargets', type: 'number', required: false },
      { name: 'rested', type: 'boolean', required: false },
    ],
    covers: [
      'play up to 1 {type} Character card with a cost of {C} or less from your hand',
      'play up to 1 {type} Stage card with a cost of {C} or less from your hand',
      'play ... from your hand rested',
      'play ... a different color than the returned Character',
    ],
    examples: [
      { cardNumber: 'EB02-028', snippet: "{ fn: 'playFromHand', filter: { category: 'character', exactCost: 2 }, rested: true }" },
      { cardNumber: 'EB03-048', snippet: "{ fn: 'playFromHand', filter: { category: 'stage', typeIncludes: 'Dressrosa', maxCost: 1 } }" },
    ],
  },
  activateEventFromHand: {
    id: 'activateEventFromHand',
    summary: 'Activate up to N matching Events from hand without paying their play cost.',
    params: [
      { name: 'filter', type: 'SearchFilter', required: true },
      { name: 'maxTargets', type: 'number', required: false },
    ],
    covers: ['activate up to 1 {type} type Event from your hand'],
    examples: [{ cardNumber: 'OP15-046', snippet: "{ fn: 'activateEventFromHand', filter: { category: 'event', typeIncludes: 'Dressrosa' } }" }],
  },
  activateEventFromTrash: {
    id: 'activateEventFromTrash',
    summary: 'Activate up to N matching Events from trash (their [Main] effect).',
    params: [
      { name: 'filter', type: 'SearchFilter', required: true },
      { name: 'maxTargets', type: 'number', required: false },
    ],
    covers: ['activate the [Main] effect of up to 1 Event card with a cost of {C} or less in your trash'],
    examples: [{ cardNumber: 'EB03-031', snippet: "{ fn: 'activateEventFromTrash', filter: { category: 'event', maxCost: 7 } }" }],
  },
  playFromDeck: {
    id: 'playFromDeck',
    summary: 'Play up to N cards matching a filter directly from the deck.',
    params: [
      { name: 'filter', type: 'SearchFilter', required: true },
      { name: 'maxTargets', type: 'number', required: false },
    ],
    covers: ['play up to 1 {type} Character card ... from your deck'],
    examples: [{ cardNumber: 'OP01-069', snippet: "{ fn: 'playFromDeck', filter: { category: 'character', name: 'Smiley' } }" }],
  },
  playFromTrash: {
    id: 'playFromTrash',
    summary: 'Play up to N cards matching a filter from the trash (optionally rested).',
    params: [
      { name: 'filter', type: 'SearchFilter', required: true },
      { name: 'maxTargets', type: 'number', required: false },
      { name: 'rested', type: 'boolean', required: false },
    ],
    covers: ['play up to 1 {type} Character card with a cost of {C} or less from your trash'],
    examples: [{ cardNumber: 'OP08-096', snippet: "{ fn: 'playFromTrash', filter: { category: 'character', color: 'black', maxCost: 3 } }" }],
  },
  triggerPlaySelf: {
    id: 'triggerPlaySelf',
    summary: '[Trigger] "Play this card." Plays the just-revealed Life card (this event/character).',
    params: [],
    covers: ['[Trigger] Play this card'],
    excludes: ['[Trigger] you may trash 1 from hand: play this (trash-from-hand trigger cost not modeled)'],
    examples: [{ cardNumber: 'OP04-113', snippet: "{ fn: 'triggerPlaySelf' }" }],
  },
  searchTopDeck: {
    id: 'searchTopDeck',
    summary: 'Look at top `look` cards, pick up to `pick` matching `filter` to a destination, send the remainder to bottom/trash/top-or-bottom.',
    params: [
      { name: 'look', type: 'number', required: true },
      { name: 'pick', type: 'number', required: true },
      { name: 'reveal', type: 'boolean', required: true },
      { name: 'destination', type: "'hand' | 'lifeTop' | 'deckTopOrBottom' | 'play'", required: true },
      { name: 'filter', type: 'SearchFilter', required: false },
      { name: 'remainder', type: "'bottom' | 'trash' | 'deckTopOrBottom'", required: false },
    ],
    covers: ['look at {N} cards from the top of your deck; reveal up to 1 {type} card and add it to your hand', 'reveal up to 1 <attribute> card or {color} Event and add it to your hand', 'place the rest at the top or bottom of the deck in any order'],
    examples: [
      { cardNumber: 'OP06-013', snippet: "{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM' }, remainder: 'bottom' }" },
      { cardNumber: 'OP02-057', snippet: "{ fn: 'searchTopDeck', look: 2, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'The Seven Warlords of the Sea' }, remainder: 'deckTopOrBottom' }" },
      { cardNumber: 'OP12-034', snippet: "{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ attribute: 'slash' }, { category: 'event', color: 'green' }] } }" },
    ],
  },
  searchDeck: {
    id: 'searchDeck',
    summary: 'Search the full deck, pick up to `pick` matching cards to hand, then shuffle.',
    params: [
      { name: 'pick', type: 'number', required: true },
      { name: 'reveal', type: 'boolean', required: true },
      { name: 'destination', type: "'hand'", required: true },
      { name: 'filter', type: 'SearchFilter', required: false },
    ],
    covers: ['Reveal up to {N} [{name}] from your deck and add it to your hand. Then, shuffle your deck.'],
    excludes: ['look at top N cards; use searchTopDeck', 'play from deck; use playFromDeck/searchTopDeck destination play'],
    examples: [{ cardNumber: 'OP01-098', snippet: "{ fn: 'searchDeck', pick: 1, reveal: true, destination: 'hand', filter: { name: 'Artificial Devil Fruit SMILE' } }" }],
  },
  revealTopThen: {
    id: 'revealTopThen',
    summary: 'Reveal top card; run `then` only if it matches `filter` (compiler gates each branch op on the reveal).',
    params: [
      { name: 'filter', type: 'SearchFilter', required: false },
      { name: 'then', type: 'SequencedAbilityFunction[]', required: true },
    ],
    covers: ['Reveal 1 card from the top of your deck. If <filter>, <then>'],
    examples: [{ cardNumber: 'OP04-011', snippet: "{ fn: 'revealTopThen', filter: { category: 'character', minPower: 6000 }, then: [...] }" }],
  },
  revealOpponentTopIfChosenCostMatches: {
    id: 'revealOpponentTopIfChosenCostMatches',
    summary: 'Player chooses a cost, reveals opponent deck top; runs `then` only when printed cost matches.',
    params: [
      { name: 'costMin', type: 'number', required: false },
      { name: 'costMax', type: 'number', required: false },
      { name: 'then', type: 'SequencedAbilityFunction[]', required: true },
    ],
    covers: ['Choose a cost and reveal 1 card from the top of your opponent\'s deck. If the revealed card has the chosen cost, …'],
    examples: [{ cardNumber: 'OP11-066', snippet: "{ fn: 'revealOpponentTopIfChosenCostMatches', then: [{ fn: 'ko', ... }, { fn: 'addDonFromDeck', count: 1, rested: true }] }" }],
  },
  revealOpponentDeckTop: {
    id: 'revealOpponentDeckTop',
    summary: 'Reveal (look at) the top card of the opponent\'s deck. Composes with following functions in the same ability.',
    params: [],
    covers: ['Look at 1 card from the top of your opponent\'s deck'],
    examples: [{ cardNumber: 'OP11-062', snippet: "{ fn: 'revealOpponentDeckTop' }, { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle' }" }],
  },
  turnTopLifeFace: {
    id: 'turnTopLifeFace',
    summary: '"You may turn 1 card from the top of your Life cards face-up/down:" cost. Binds var t.',
    params: [{ name: 'faceUp', type: 'boolean', required: true }],
    covers: ['you may turn 1 card from the top of your Life cards face-up:'],
    examples: [{ cardNumber: 'OP08-096', snippet: "{ fn: 'turnTopLifeFace', faceUp: true }" }],
  },
  turnAllLifeFace: {
    id: 'turnAllLifeFace',
    summary: 'Turn all Life cards for a player face-up/down in place.',
    params: [{ name: 'player', type: "'controller' | 'opponent'", required: false }, { name: 'faceUp', type: 'boolean', required: true }],
    covers: ['Turn all of your Life cards face-down'],
    examples: [{ cardNumber: 'EB01-052', snippet: "{ fn: 'turnAllLifeFace', faceUp: false }" }],
  },
  lookLifeAndReorder: {
    id: 'lookLifeAndReorder',
    summary: 'Look at all Life cards for a player and reorder them; optionally move the first chosen card to the top of deck.',
    params: [{ name: 'player', type: "'controller' | 'opponent'", required: false }, { name: 'moveOneToDeckTop', type: 'boolean', required: false }],
    covers: ['Look at all of your Life cards and place them back in your Life area in any order', 'place 1 card at the top of your deck and place the rest back in your Life area in any order'],
    examples: [{ cardNumber: 'OP13-105', snippet: "{ fn: 'lookLifeAndReorder' }" }],
  },
  setActiveSelf: {
    id: 'setActiveSelf',
    summary: 'Set the source card as active (inverse of rest).',
    params: [],
    covers: ['set this Character as active'],
    examples: [{ cardNumber: 'OP05-032', snippet: "{ fn: 'setActiveSelf' }" }],
  },
  setActiveControllerLeader: {
    id: 'setActiveControllerLeader',
    summary: 'Set the controller\'s Leader as active without a target choice.',
    params: [],
    covers: ['set your Leader as active', 'set this Leader as active'],
    examples: [{ cardNumber: 'EB04-012', snippet: "{ fn: 'setActiveControllerLeader' }" }],
  },
  setActiveControllerCharacter: {
    id: 'setActiveControllerCharacter',
    summary: 'Set up to N of the controller\'s characters active, matching an optional filter.',
    params: [
      { name: 'filter', type: '{ maxCost?; exactCost?; rested?; typeIncludes?; anyOfTypes? }', required: false },
      { name: 'maxTargets', type: 'number', required: false },
    ],
    covers: ['set up to {N} of your {type} Characters as active'],
    examples: [{ cardNumber: 'EB04-013', snippet: "{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Minks' }, maxTargets: 2 }" }],
  },
  setActiveControllerDon: {
    id: 'setActiveControllerDon',
    summary: 'Set up to N of the controller\'s DON!! cards as active.',
    params: [{ name: 'maxTargets', type: 'number', required: true }],
    covers: ['set up to {N} of your DON!! cards as active'],
    examples: [{ cardNumber: 'OP01-003', snippet: "{ fn: 'setActiveControllerDon', maxTargets: 1 }" }],
  },
  setActiveControllerDonAtEndOfTurn: {
    id: 'setActiveControllerDonAtEndOfTurn',
    summary: 'Schedule up to N of the controller\'s rested DON!! cards to become active at the end of this turn.',
    params: [{ name: 'maxTargets', type: 'number', required: true }],
    covers: ['set up to {N} of your DON!! cards as active at the end of this turn'],
    examples: [{ cardNumber: 'OP04-033', snippet: "{ fn: 'setActiveControllerDonAtEndOfTurn', maxTargets: 1 }" }],
  },
  restOpponentDonAtStartOfNextMain: {
    id: 'restOpponentDonAtStartOfNextMain',
    summary: 'Schedule the opponent to rest up to N active DON!! cards at the start of their next Main Phase.',
    params: [{ name: 'maxTargets', type: 'number', required: false }],
    covers: ['your opponent rests {N} of their active DON!! cards at the start of their next Main Phase'],
    examples: [{ cardNumber: 'PRB02-005', snippet: "{ fn: 'restOpponentDonAtStartOfNextMain' }" }],
  },
  addPowerAuraControllerTypes: {
    id: 'addPowerAuraControllerTypes',
    summary: 'Aura: controller\'s Leader + Characters (optionally type-filtered) get a flat power delta, optionally gated on source state.',
    params: [
      { name: 'amount', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'anyOfTypes', type: 'string[]', required: false },
      { name: 'anyOfNames', type: 'string[]', required: false, note: 'OR filter on printed card name (Leader + Characters when ownLeaderAndCharacters)' },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'gate', type: 'AbilityGate[]', required: false, note: 'board gate re-evaluated each read against the source\'s controller (e.g. "if you have 3+ {type} Characters")' },
    ],
    covers: ['your {type} Leader and Characters gain +{P} power', 'all of your [{name}] and [{name}] cards gain +{P} power', 'if <board state>, your {type} Leader and Characters gain +{P} power'],
    examples: [{ cardNumber: 'ST30-001', snippet: "{ fn: 'addPowerAuraControllerTypes', amount: 3000, duration: 'permanent', anyOfNames: ['Portgas.D.Ace','Monkey.D.Luffy'], sourceCondition: { turn: 'opponent' } }" }],
  },
  addPowerControllerCharactersAll: {
    id: 'addPowerControllerCharactersAll',
    summary: 'Give ALL controller Characters (optionally type/cost-filtered) a flat power delta — no target choice.',
    params: [
      { name: 'amount', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'filter', type: '{ typeIncludes?; maxCost? }', required: false },
    ],
    covers: ['All of your {type} Characters gain +{P} power'],
    examples: [{ cardNumber: 'EB03-041', snippet: "{ fn: 'addPowerControllerCharactersAll', amount: 2000, duration: 'permanent', filter: { typeIncludes: 'SWORD', maxCost: 6 } }" }],
  },
  addPowerAuraControllerCharacters: {
    id: 'addPowerAuraControllerCharacters',
    summary: 'Dynamic aura over ALL controller Characters (chars only), optionally type-filtered + source-state gated.',
    params: [
      { name: 'amount', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'anyOfTypes', type: 'string[]', required: false },
      { name: 'anyOfNames', type: 'string[]', required: false, note: 'OR filter on printed card name (Characters only when charactersOnly)' },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'gate', type: 'AbilityGate[]', required: false, note: 'board gate re-evaluated each read against the source\'s controller (e.g. "if you have 3+ {type} Characters")' },
    ],
    covers: ['[DON!! xN] all of your {type} Characters gain +{P} power', 'all of your [{name}] Characters gain +{P} power', 'if <board state>, all of your {type} Characters gain +{P} power'],
    examples: [{ cardNumber: 'EB01-024', snippet: "{ fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'permanent', anyOfTypes: ['SMILE'], gate: [{ kind: 'selfHand', atMost: 4 }] }" }],
  },
  addPowerAuraOpponentCharacters: {
    id: 'addPowerAuraOpponentCharacters',
    summary: 'Dynamic aura over ALL opponent Characters ("give all your opponent\'s Characters −N power").',
    params: [
      { name: 'amount', type: 'number', required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'gate', type: 'AbilityGate[]', required: false, note: 'board gate re-evaluated each read against the source\'s controller (e.g. "if you have 3+ {type} Characters")' },
    ],
    covers: ['give your opponent\'s Leader and all of their Characters −{P} power', 'if <board state>, give all of your opponent\'s Characters −{P} power'],
    examples: [{ cardNumber: 'OP01-091', snippet: "{ fn: 'addPowerAuraOpponentCharacters', amount: -1000, duration: 'permanent', gate: [{ kind: 'selfDonFieldCount', atLeast: 10 }], sourceCondition: { turn: 'your' } }" }],
  },
  addCostAuraControllerCharacters: {
    id: 'addCostAuraControllerCharacters',
    summary: 'Continuous cost aura over ALL controller Characters (chars only), optionally type-filtered + source-state gated.',
    params: [
      { name: 'amount', type: 'number', required: true, note: 'negative for "−N cost"' },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'anyOfTypes', type: 'string[]', required: false },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'gate', type: 'AbilityGate[]', required: false, note: 'board gate re-evaluated each read against the source\'s controller (e.g. "if you have 3+ {type} Characters")' },
    ],
    covers: ['[Opponent\'s Turn] all of your {type} Characters gain +{C} cost', 'all of your Characters gain +{C} cost', 'if <board state>, all of your {type} Characters gain +{C} cost'],
    examples: [{ cardNumber: 'EB04-046', snippet: "{ fn: 'addCostAuraControllerCharacters', amount: 2, duration: 'permanent', anyOfTypes: ['Navy'], sourceCondition: { turn: 'opponent' } }" }],
  },
  addCostAuraOpponentCharacters: {
    id: 'addCostAuraOpponentCharacters',
    summary: 'Continuous cost aura over ALL opponent Characters ("give all your opponent\'s Characters −N cost").',
    params: [
      { name: 'amount', type: 'number', required: true, note: 'negative for "−N cost"' },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'gate', type: 'AbilityGate[]', required: false, note: 'board gate re-evaluated each read against the source\'s controller (e.g. "if you have 3+ {Minks} Characters")' },
    ],
    covers: ['give all of your opponent\'s Characters −{C} cost', 'if <board state>, give all of your opponent\'s Characters −{C} cost'],
    examples: [{ cardNumber: 'EB04-017', snippet: "{ fn: 'addCostAuraOpponentCharacters', amount: -1, duration: 'permanent', gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Minks', atLeast: 3 }], sourceCondition: { turn: 'your' } }" }],
  },
  addCostAuraSameCardInHand: {
    id: 'addCostAuraSameCardInHand',
    summary: '"Give this card in your hand −N cost" while the source is on the field (same cardDefinitionId copies in hand).',
    params: [
      { name: 'amount', type: 'number', required: true, note: 'negative for "−N cost"' },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'gate', type: 'AbilityGate[]', required: false, note: 'board gate re-evaluated each read (e.g. Leader power, typed Character power)' },
    ],
    covers: ['give this card in your hand −{C} cost', 'if <board state>, give this card in your hand −{C} cost'],
    examples: [{ cardNumber: 'OP15-013', snippet: "{ fn: 'addCostAuraSameCardInHand', amount: -2, duration: 'permanent', gate: [{ kind: 'selfLeaderPowerAtMost', power: 0 }] }" }],
  },
  addNextPlayFromHandCostDiscount: {
    id: 'addNextPlayFromHandCostDiscount',
    summary: 'One-shot in-hand play discount: the next matching Character played from hand this turn costs −N.',
    params: [
      { name: 'amount', type: 'number', required: true, note: 'negative for "cost will be reduced by N"' },
      { name: 'filter', type: '{ typeIncludes?: string; minBaseCost?: number }', required: false, note: 'typed / min printed cost gate on the played card' },
    ],
    covers: ['the next time you play a {Type} Character with a cost of {N} or more from your hand during this turn, the cost will be reduced by {C}'],
    examples: [{ cardNumber: 'OP02-025', snippet: "{ fn: 'addNextPlayFromHandCostDiscount', amount: -1, filter: { typeIncludes: 'Land of Wano', minBaseCost: 3 } }" }],
  },
  koImmunitySelf: {
    id: 'koImmunitySelf',
    summary: '"This card cannot be K.O.\'d" — scope battle/effect/any, optionally by attacker or effect-source filters.',
    params: [
      { name: 'scope', type: "'battle' | 'effect' | 'any'", required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'condition', type: 'IrCondition', required: false },
      { name: 'attackerCategory', type: "'leader' | 'character'", required: false },
      { name: 'attackerAttribute', type: 'string', required: false, note: 'battle K.O. only — attacker must have this attribute' },
      { name: 'effectSourceController', type: "'opponent' | 'controller'", required: false, note: 'effect K.O. only — restrict to opponent/controller effects' },
      { name: 'effectSourceMaxBasePower', type: 'number', required: false, note: 'effect K.O. only — K.O.-ing card printed base power cap' },
      { name: 'effectSourceCategory', type: "'leader' | 'character'", required: false, note: 'effect K.O. only — K.O.-ing card category' },
      { name: 'effectSourceWithoutAttribute', type: 'string', required: false, note: 'effect K.O. only — K.O.-ing card must not have this attribute' },
    ],
    covers: ['this Character cannot be K.O.\'d in battle', 'this Character cannot be K.O.\'d in battle by <Attribute> attribute Characters', 'this Character cannot be K.O.\'d by your opponent\'s effects', 'cannot be K.O.\'d by effects of opponent Characters with {N} base power or less', 'cannot be K.O.\'d by effects of Characters without the <Attribute> attribute'],
    examples: [{ cardNumber: 'OP11-005', snippet: "{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { donAttachedAtLeast: 1 }, effectSourceCategory: 'character', effectSourceWithoutAttribute: 'special' }" }],
  },
  koImmunityControllerCharactersAll: {
    id: 'koImmunityControllerCharactersAll',
    summary: 'K.O. immunity for ALL controller characters (no type/cost filter or self-exclusion).',
    params: [
      { name: 'scope', type: "'battle' | 'effect' | 'any'", required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'condition', type: 'IrCondition', required: false },
    ],
    covers: ['your Characters cannot be K.O.\'d in battle during this turn'],
    excludes: ['... your {type}/cost-filtered Characters OTHER THAN [X] cannot be K.O.\'d (use koImmunityAuraControllerCharacters)'],
    examples: [{ cardNumber: 'OP06-096', snippet: "{ fn: 'koImmunityControllerCharactersAll', scope: 'battle', duration: 'duringThisTurn' }" }],
  },
  koImmunityAuraControllerCharacters: {
    id: 'koImmunityAuraControllerCharacters',
    summary: 'Filtered K.O. immunity aura on controller Characters (type/cost/source-state gates).',
    params: [
      { name: 'scope', type: "'battle' | 'effect' | 'any'", required: true },
      { name: 'duration', type: 'IrDuration', required: true },
      { name: 'anyOfTypes', type: 'string[]', required: false },
      { name: 'excludeSource', type: 'boolean', required: false, note: 'exclude the aura source card from protection' },
      { name: 'targetCondition', type: 'IrCondition', required: false, note: 'gate on protected Characters (cost/rested/board)' },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false, note: 'gate on the aura source (active/rested/turn)' },
      { name: 'effectSourceController', type: "'opponent' | 'controller'", required: false },
    ],
    covers: [
      'your {Type} Characters with a cost of {N} or less other than [Name] cannot be K.O.\'d by effects',
      'your active Characters with a base cost of {N} cannot be K.O.\'d by effects',
      'your Characters with a cost of {N} or less cannot be K.O.\'d by your opponent\'s effects',
    ],
    examples: [{ cardNumber: 'OP07-033', snippet: "{ fn: 'koImmunityAuraControllerCharacters', scope: 'effect', duration: 'permanent', excludeSource: true, targetCondition: { maxCost: 3, gate: [{ kind: 'selfCharacterCount', atLeast: 3 }] }, effectSourceController: 'opponent' }" }],
  },
  koImmunityChosen: {
    id: 'koImmunityChosen',
    summary: 'Grant K.O. immunity to the card chosen by the immediately preceding function (var t).',
    params: [
      { name: 'scope', type: "'battle' | 'effect' | 'any'", required: true },
      { name: 'duration', type: 'IrDuration', required: true },
    ],
    covers: ['<after choosing a target> ... that Character cannot be K.O.\'d'],
    examples: [{ cardNumber: 'OP02-004', snippet: "{ fn: 'koImmunityChosen', scope: 'any', duration: 'untilStartOfNextTurn' }" }],
  },
  registerKoReplacementSelf: {
    id: 'registerKoReplacementSelf',
    summary: 'Register optional K.O. replacement on this card ("would be K.O.\'d … instead").',
    params: [
      { name: 'scope', type: "'battle' | 'effect' | 'any'", required: false },
      { name: 'oncePerTurn', type: 'boolean', required: false },
      { name: 'trashFromHand', type: '{ count, filter? }', required: false },
      { name: 'trashSelf', type: 'true', required: false },
      { name: 'returnDon', type: '{ count?: number }', required: false, note: 'Same as ability donMinus / field DON return' },
      { name: 'restDon', type: '{ count?: number }', required: false, note: 'Same as ability restDon cost' },
      { name: 'lifeToHand', type: "{ position?: 'top' | 'topOrBottom' }", required: false, note: 'Same as moveCards life → hand' },
      { name: 'duration', type: 'IrDuration', required: true },
    ],
    covers: ['If this Character would be K.O.\'d, you may trash 1 card from your hand instead', 'If this Character would be K.O.\'d, you may trash 1 Event from your hand instead', 'If this Character would be K.O.\'d by an effect, you may trash 1 Event or Stage card from your hand instead', 'If this Character would be K.O.\'d, you may trash this Character instead', 'If this Character would be K.O.\'d, you may return 1 DON!! card from your field to your DON!! deck instead', 'If this Character would be K.O\'d in battle, you may add 1 card from the top of your Life cards to your hand instead', 'If this Character would be K.O.\'d by your opponent\'s effect, you may rest 2 of your active DON!! cards instead'],
    examples: [
      { cardNumber: 'OP15-014', snippet: "{ fn: 'registerKoReplacementSelf', trashFromHand: { count: 1, filter: { category: 'event' } }, duration: 'permanent' }" },
      { cardNumber: 'EB01-008', snippet: "{ fn: 'registerKoReplacementSelf', scope: 'effect', oncePerTurn: true, trashFromHand: { count: 1, filter: { categories: ['event', 'stage'] } }, duration: 'permanent' }" },
      { cardNumber: 'EB04-030', snippet: "{ fn: 'registerKoReplacementSelf', returnDon: { count: 1 }, duration: 'permanent' }" },
      { cardNumber: 'OP10-034', snippet: "{ fn: 'registerKoReplacementSelf', scope: 'battle', oncePerTurn: true, lifeToHand: { position: 'top' }, duration: 'permanent' }" },
      { cardNumber: 'OP10-074', snippet: "{ fn: 'registerKoReplacementSelf', scope: 'effect', oncePerTurn: true, restDon: { count: 2 }, duration: 'permanent' }" },
      { cardNumber: 'OP13-046', snippet: "{ fn: 'registerKoReplacementSelf', scope: 'effect', oncePerTurn: true, trashFromHand: { count: 1, filter: { typeIncludes: 'Whitebeard Pirates' } }, duration: 'permanent' }" },
    ],
  },
  registerKoReplacementAura: {
    id: 'registerKoReplacementAura',
    summary: 'Register optional K.O. replacement aura on ally Characters ("If your {Type} Character would be K.O.\'d … trash this Character instead").',
    params: [
      { name: 'scope', type: "'battle' | 'effect' | 'any'", required: false },
      { name: 'oncePerTurn', type: 'boolean', required: false },
      { name: 'anyOfTypes', type: 'string[]', required: false },
      { name: 'anyOfNames', type: 'string[]', required: false },
      { name: 'anyOfAttributes', type: 'string[]', required: false },
      { name: 'charactersOnly', type: 'boolean', required: false },
      { name: 'excludeSource', type: 'boolean', required: false },
      { name: 'targetCondition', type: 'IrCondition', required: false },
      { name: 'sourceCondition', type: 'SourceStateCondition', required: false },
      { name: 'trashSource', type: 'true', required: false },
      { name: 'restSource', type: 'true', required: false },
      { name: 'restCharacter', type: 'true', required: false },
      { name: 'trashFromHand', type: '{ count, filter? }', required: false },
      { name: 'returnDon', type: '{ count?: number }', required: false, note: 'Same as ability donMinus / field DON return' },
      { name: 'restDon', type: '{ count?: number }', required: false, note: 'Same as ability restDon cost' },
      { name: 'lifeToHand', type: "{ position?: 'top' | 'topOrBottom' }", required: false, note: 'Same as moveCards life → hand' },
      { name: 'trashTrashToDeckBottom', type: '{ count: number }', required: false },
      { name: 'turnTopLifeFace', type: '{ faceUp: boolean }', required: false },
      { name: 'duration', type: 'IrDuration', required: true },
    ],
    covers: [
      'If your {Revolutionary Army} type Character would be K.O.\'d by your opponent\'s effect, you may trash this Character instead',
      'If your Character [Bonk Punch] would be K.O.\'d by an effect, you may trash this Character instead',
      '[Opponent\'s Turn] If your rested Character would be K.O.\'d, you may trash this Character instead',
      '[Once Per Turn] If your {Red-Haired Pirates} type Character would be K.O.\'d, you may trash 1 Character card with 6000 power or more from your hand instead',
      'If your <Slash> attribute Character with a cost of 5 or less other than this Character would be K.O.\'d by your opponent\'s effect, you may rest this Character instead',
      '[Once Per Turn] If your {Straw Hat Crew} type Character would be K.O.\'d by your opponent\'s effect, you may rest 1 of your Characters instead',
      '[Once Per Turn] If your [Trafalgar Law] would be K.O.\'d, you may add 1 card from the top of your Life cards to your hand instead',
      '[Once Per Turn] If your black Character with a base cost of 5 or less would be K.O.\'d by your opponent\'s effect, you may place 3 cards from your trash at the bottom of your deck in any order instead',
      'If your {Egghead} type Character would be K.O.\'d by your opponent\'s effect, you may turn 1 card from the top of your Life cards face-up instead',
    ],
    examples: [
      { cardNumber: 'OP13-008', snippet: "{ fn: 'registerKoReplacementAura', scope: 'effect', anyOfTypes: ['Revolutionary Army'], trashSource: true, duration: 'permanent' }" },
      { cardNumber: 'OP16-018', snippet: "{ fn: 'registerKoReplacementAura', oncePerTurn: true, anyOfTypes: ['Red-Haired Pirates'], trashFromHand: { count: 1, filter: { category: 'character', minCurrentPower: 6000 } }, duration: 'permanent' }" },
      { cardNumber: 'OP12-027', snippet: "{ fn: 'registerKoReplacementAura', scope: 'effect', effectSourceController: 'opponent', anyOfAttributes: ['Slash'], excludeSource: true, targetCondition: { maxCost: 5 }, restSource: true, duration: 'permanent' }" },
      { cardNumber: 'EB04-043', snippet: "{ fn: 'registerKoReplacementAura', scope: 'effect', effectSourceController: 'opponent', oncePerTurn: true, targetCondition: { color: 'black', maxBaseCost: 5 }, trashTrashToDeckBottom: { count: 3 }, duration: 'permanent' }" },
      { cardNumber: 'ST29-008', snippet: "{ fn: 'registerKoReplacementAura', scope: 'effect', effectSourceController: 'opponent', anyOfTypes: ['Egghead'], turnTopLifeFace: { faceUp: true }, duration: 'permanent' }" },
      { cardNumber: 'OP14-034', snippet: "{ fn: 'registerKoReplacementAura', scope: 'effect', oncePerTurn: true, anyOfTypes: ['Straw Hat Crew'], restCharacter: true, duration: 'permanent' }" },
      { cardNumber: 'OP12-061', snippet: "{ fn: 'registerKoReplacementAura', oncePerTurn: true, anyOfNames: ['Trafalgar Law'], lifeToHand: { position: 'top' }, duration: 'permanent' }" },
      { cardNumber: 'OP13-060', snippet: "{ fn: 'registerKoReplacementAura', scope: 'effect', anyOfTypes: ['Roger Pirates'], trashSource: true, duration: 'permanent' }" },
      { cardNumber: 'OP15-094', snippet: "{ fn: 'registerKoReplacementAura', scope: 'effect', anyOfTypes: ['Straw Hat Crew'], excludeSource: true, trashSource: true, duration: 'permanent' }" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Gates (params.gate / condition.gate — board-state preconditions)
// ---------------------------------------------------------------------------

export const GATES: Record<AbilityGate['kind'], CapabilitySpec> = {
  leaderName: { id: 'leaderName', summary: 'If your Leader is [X].', params: [{ name: 'name', type: 'string', required: true }], covers: ['If your Leader is [{name}]'], examples: [{ cardNumber: 'OP12-059', snippet: "{ kind: 'leaderName', name: 'Sanji' }" }] },
  leaderNameIncludes: { id: 'leaderNameIncludes', summary: 'If your Leader card name includes X.', params: [{ name: 'name', type: 'string', required: true }], covers: ['If your Leader\'s card name includes "{name}"'], examples: [{ cardNumber: 'OP16-015', snippet: "{ kind: 'leaderNameIncludes', name: 'Ace' }" }] },
  leaderType: { id: 'leaderType', summary: 'If your Leader has the {T} type.', params: [{ name: 'type', type: 'string', required: true }], covers: ['If your Leader has the {{type}} type', 'If your Leader\'s type includes "{type}"'], examples: [{ cardNumber: 'OP06-010', snippet: "{ kind: 'leaderType', type: 'FILM' }" }] },
  leaderAttribute: { id: 'leaderAttribute', summary: 'If your Leader has the <X> attribute.', params: [{ name: 'attribute', type: 'string', required: true }], covers: ['If your Leader has the <{attribute}> attribute'], examples: [{ cardNumber: 'OP12-021', snippet: "{ kind: 'leaderAttribute', attribute: 'slash' }" }] },
  opponentLeaderAttribute: { id: 'opponentLeaderAttribute', summary: "If your opponent's Leader has the <X> attribute.", params: [{ name: 'attribute', type: 'string', required: true }], covers: ["If your opponent's Leader has the <{attribute}> attribute"], examples: [{ cardNumber: 'OP14-020', snippet: "{ kind: 'opponentLeaderAttribute', attribute: 'slash' }" }] },
  leaderMulticolor: { id: 'leaderMulticolor', summary: 'If your Leader is multicolored.', params: [], covers: ['If your Leader is multicolored'], examples: [{ cardNumber: 'EB03-004', snippet: "{ kind: 'leaderMulticolor' }" }] },
  leaderActive: { id: 'leaderActive', summary: 'If your Leader is active (not rested).', params: [], covers: ['If your Leader is active', 'your 1 active Leader', 'give your active Leader'], examples: [{ cardNumber: 'EB01-004', snippet: "{ kind: 'leaderActive' }" }] },
  leaderRested: { id: 'leaderRested', summary: 'If your Leader is rested.', params: [], covers: ['If your Leader is rested'], examples: [{ cardNumber: 'EB01-004', snippet: "{ kind: 'leaderRested' }" }] },
  selfCharacterCount: { id: 'selfCharacterCount', summary: 'You have N or more/less Characters.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If you have {N} or more Characters'], examples: [{ cardNumber: 'OP07-033', snippet: "{ kind: 'selfCharacterCount', atLeast: 3 }" }] },
  selfRestedCharacterCount: { id: 'selfRestedCharacterCount', summary: 'You have N or more/less rested Characters.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If you have {N} or more rested Characters'], examples: [{ cardNumber: 'OP09-036', snippet: "{ kind: 'selfRestedCharacterCount', atLeast: 2 }" }] },
  opponentCharacterCount: { id: 'opponentCharacterCount', summary: 'Opponent has N or more/less Characters.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If your opponent has {N} or less Characters'], examples: [{ cardNumber: 'EB02-019', snippet: "{ kind: 'opponentCharacterCount', atLeast: 2 }" }] },
  selfDonFieldCount: { id: 'selfDonFieldCount', summary: 'DON!! on your field N or more/less.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If you have {N} or more DON!! cards on your field'], examples: [{ cardNumber: 'OP01-109', snippet: "{ kind: 'selfDonFieldCount', atLeast: 8 }" }] },
  selfRestedDonCount: { id: 'selfRestedDonCount', summary: 'Rested DON!! available in cost area (not attached).', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['rested DON!! cards'], examples: [{ cardNumber: 'EB03-038', snippet: "{ kind: 'selfRestedDonCount', atLeast: 1 }" }] },
  selfLife: { id: 'selfLife', summary: 'You have N or more/less Life cards.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If you have {N} or less Life cards'], examples: [{ cardNumber: 'EB01-058', snippet: "{ kind: 'selfLife', atMost: 2 }" }] },
  selfHasFaceUpLife: { id: 'selfHasFaceUpLife', summary: 'You have at least 1 face-up Life card.', params: [], covers: ['If you have a face-up Life card'], examples: [{ cardNumber: 'EB03-051', snippet: "{ kind: 'selfHasFaceUpLife' }" }] },
  opponentLife: { id: 'opponentLife', summary: 'Opponent has N or more/less Life cards.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If your opponent has {N} or more Life cards'], examples: [{ cardNumber: 'EB03-053', snippet: "{ kind: 'opponentLife', atLeast: 3 }" }] },
  combinedLifeTotal: { id: 'combinedLifeTotal', summary: 'Combined Life count (you + opponent) is at least/at most N.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['you and your opponent have a total of {N} or less Life cards'], examples: [{ cardNumber: 'EB04-055', snippet: "{ kind: 'combinedLifeTotal', atMost: 5 }" }] },
  selfLifeLessThanOpponent: { id: 'selfLifeLessThanOpponent', summary: 'You have fewer Life cards than your opponent.', params: [], covers: ['If you have less Life cards than your opponent'], examples: [{ cardNumber: 'OP04-106', snippet: "{ kind: 'selfLifeLessThanOpponent' }" }] },
  selfHand: { id: 'selfHand', summary: 'You have N or more/less cards in hand.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If you have {N} or less cards in your hand'], examples: [{ cardNumber: 'OP11-057', snippet: "{ kind: 'selfHand', atMost: 4 }" }] },
  anyCharacterExactCost: { id: 'anyCharacterExactCost', summary: 'There is a Character with a cost of exactly N (either player).', params: [{ name: 'exactCost', type: 'number', required: true }], covers: ['If there is a Character with a cost of {N}'], examples: [{ cardNumber: 'EB03-046', snippet: "{ kind: 'anyCharacterExactCost', exactCost: 0 }" }] },
  selfHasCharacterCostAtLeast: { id: 'selfHasCharacterCostAtLeast', summary: 'You have a Character with a cost of N or more.', params: [{ name: 'atLeast', type: 'number', required: true }], covers: ['If you have a Character with a cost of {N} or more'], examples: [{ cardNumber: 'OP08-085', snippet: "{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }" }] },
  selfCharacterCostCount: { id: 'selfCharacterCostCount', summary: 'You have N or more Characters with a cost of M or more.', params: [{ name: 'minCost', type: 'number', required: true }, { name: 'atLeast', type: 'number', required: true }], covers: ['If you have {N} or more Characters with a cost of {M} or more'], examples: [{ cardNumber: 'OP12-081', snippet: "{ kind: 'selfCharacterCostCount', minCost: 8, atLeast: 2 }" }] },
  selfHasCharacterBasePowerAtLeast: { id: 'selfHasCharacterBasePowerAtLeast', summary: 'You have a Character with a base power of N or more.', params: [{ name: 'power', type: 'number', required: true }], covers: ['If you have a Character with a base power of {N} or more'], examples: [{ cardNumber: 'ST30-001', snippet: "{ kind: 'selfHasCharacterBasePowerAtLeast', power: 7000 }" }] },
  opponentDonMoreThanSelf: { id: 'opponentDonMoreThanSelf', summary: 'Opponent has more DON!! on their field than you.', params: [], covers: ['If your opponent has more DON!! cards on their field than you'], examples: [{ cardNumber: 'EB04-034', snippet: "{ kind: 'opponentDonMoreThanSelf' }" }] },
  opponentDonFieldCount: { id: 'opponentDonFieldCount', summary: 'Opponent has N or more/less DON!! on their field.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If your opponent has {N} or more DON!! cards on their field'], examples: [{ cardNumber: 'OP02-090', snippet: "{ kind: 'opponentDonFieldCount', atLeast: 6 }" }] },
  selfDonAtMostOpponent: { id: 'selfDonAtMostOpponent', summary: 'Your DON!! on field <= opponent\'s.', params: [], covers: ['If the number of DON!! on your field is equal to or less than your opponent\'s'], examples: [{ cardNumber: 'OP12-062', snippet: "{ kind: 'selfDonAtMostOpponent' }" }] },
  selfControlsNamed: { id: 'selfControlsNamed', summary: 'You control a Character named X (counts self if same name).', params: [{ name: 'name', type: 'string', required: true }], covers: ['If you have [{name}]', 'If you have a [{name}] Character'], excludes: ['"other than THIS Character" self-instance exclusion'], examples: [{ cardNumber: 'OP07-030', snippet: "{ kind: 'selfControlsNamed', name: 'Camie' }" }] },
  selfDoesNotControlNamed: { id: 'selfDoesNotControlNamed', summary: 'You do not control a Character named X.', params: [{ name: 'name', type: 'string', required: true }], covers: ['If you don\'t have [{name}]', 'you have no other [{name}] Characters'], examples: [{ cardNumber: 'EB01-012', snippet: "{ kind: 'selfDoesNotControlNamed', name: 'Cavendish' }" }] },
  selfHandMatching: { id: 'selfHandMatching', summary: 'You can reveal N cards in hand matching a type/category/power ("reveal ... from your hand").', params: [{ name: 'atLeast', type: 'number', required: true }, { name: 'typeIncludes', type: 'string', required: false }, { name: 'category', type: 'CardCategory', required: false }, { name: 'exactPower/minPower', type: 'number', required: false }], covers: ['reveal {N} {type}/Event/{power}-power cards from your hand'], examples: [{ cardNumber: 'OP16-002', snippet: "{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }" }] },
  opponentHand: { id: 'opponentHand', summary: 'Opponent has N or more/less cards in hand.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If your opponent has {N} or more cards in their hand'], examples: [{ cardNumber: 'OP05-082', snippet: "{ kind: 'opponentHand', atLeast: 6 }" }] },
  selfPlayedThisTurn: { id: 'selfPlayedThisTurn', summary: 'This card was played this turn.', params: [], covers: ['If this Character was played on this turn'], examples: [{ cardNumber: 'EB03-013', snippet: "{ kind: 'selfPlayedThisTurn' }" }] },
  selfBattledOpponentCharacterThisTurn: { id: 'selfBattledOpponentCharacterThisTurn', summary: 'This card battled an opponent Character this turn.', params: [], covers: ['If this Leader battles your opponent\'s Character during this turn'], examples: [{ cardNumber: 'OP12-020', snippet: "{ kind: 'selfBattledOpponentCharacterThisTurn' }" }] },
  selfTrashCount: { id: 'selfTrashCount', summary: 'N or more/less cards in your trash.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['{N} or more cards in your trash'], examples: [{ cardNumber: 'OP08-096', snippet: "{ kind: 'selfTrashCount', atLeast: 1 }" }] },
  selfDeckCount: { id: 'selfDeckCount', summary: 'N or less cards in your deck.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['{N} or less cards in your deck'], examples: [{ cardNumber: 'OP15-022', snippet: "{ kind: 'selfDeckCount', atMost: 0 }" }] },
  selfTypedCharacterCount: { id: 'selfTypedCharacterCount', summary: 'You have N or more/less {type} Characters (counts self if same type).', params: [{ name: 'typeIncludes', type: 'string', required: true }, { name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }, { name: 'rested', type: 'boolean', required: false }], covers: ['if you have {N} or more {type} Characters'], excludes: ['combined-OR of two types', '"other than [X]" self exclusion (approximate with atLeast+1)'], examples: [{ cardNumber: 'OP13-009', snippet: "{ kind: 'selfTypedCharacterCount', typeIncludes: 'Mountain Bandits', atLeast: 2 }" }] },
  selfAnyTypedCharacterCount: { id: 'selfAnyTypedCharacterCount', summary: 'You have N or more/less Characters matching any listed type.', params: [{ name: 'anyOfTypes', type: 'string[]', required: true }, { name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }, { name: 'rested', type: 'boolean', required: false }], covers: ['if you have {N} or more {A} or {B} type Characters'], excludes: ['requires each counted Character to match one of the listed types; does not enforce distinct type names'], examples: [{ cardNumber: 'OP07-052', snippet: "{ kind: 'selfAnyTypedCharacterCount', anyOfTypes: ['Amazon Lily', 'Kuja Pirates'], atLeast: 2 }" }] },
  selfAllCharactersTyped: { id: 'selfAllCharactersTyped', summary: 'The only Characters on your field are {type} type (vacuously true if you have none).', params: [{ name: 'typeIncludes', type: 'string', required: true }], covers: ['if the only Characters on your field are {type} type Characters'], examples: [{ cardNumber: 'OP15-001', snippet: "{ kind: 'selfAllCharactersTyped', typeIncludes: 'East Blue' }" }] },
  selfLeaderPowerAtMost: { id: 'selfLeaderPowerAtMost', summary: 'Your Leader has N power or less (current power, incl. modifiers).', params: [{ name: 'power', type: 'number', required: true }], covers: ['if your Leader has {N} power or less'], examples: [{ cardNumber: 'OP15-004', snippet: "{ kind: 'selfLeaderPowerAtMost', power: 0 }" }] },
  selfInstancePowerAtLeast: { id: 'selfInstancePowerAtLeast', summary: 'This card (source instance) has N or more current power.', params: [{ name: 'power', type: 'number', required: true }], covers: ['If this Character has {N} power or more'], examples: [{ cardNumber: 'OP06-002', snippet: "{ kind: 'selfInstancePowerAtLeast', power: 7000 }" }] },
  selfControlsNamedWithPowerAtLeast: { id: 'selfControlsNamedWithPowerAtLeast', summary: 'You control [X] with N power or more (Leader or Character).', params: [{ name: 'name', type: 'string', required: true }, { name: 'power', type: 'number', required: true }], covers: ['If you have [{name}] with {N} power or more'], examples: [{ cardNumber: 'OP15-080', snippet: "{ kind: 'selfControlsNamedWithPowerAtLeast', name: 'Gecko Moria', power: 10000 }" }] },
  selfTypedCharacterPowerAtLeast: { id: 'selfTypedCharacterPowerAtLeast', summary: 'You have a {type} Character with N current power or more.', params: [{ name: 'typeIncludes', type: 'string', required: true }, { name: 'power', type: 'number', required: true }], covers: ['If you have a {type} type Character with {N} power or more'], examples: [{ cardNumber: 'OP15-102', snippet: "{ kind: 'selfTypedCharacterPowerAtLeast', typeIncludes: 'Sky Island', power: 7000 }" }] },
  selfCharacterCurrentPowerCount: { id: 'selfCharacterCurrentPowerCount', summary: 'You have N Characters with M current power or more.', params: [{ name: 'power', type: 'number', required: true }, { name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['if you have {N} or less Characters with {M} power or more'], examples: [{ cardNumber: 'EB02-022', snippet: "{ kind: 'selfCharacterCurrentPowerCount', power: 5000, atMost: 2 }" }] },
  selfOtherNamedCharacterCount: { id: 'selfOtherNamedCharacterCount', summary: 'You have N other [X] Characters (excludes the effect source).', params: [{ name: 'name', type: 'string', required: true }, { name: 'atMost', type: 'number', required: false }, { name: 'atLeast', type: 'number', required: false }], covers: ['there are no other [{name}] cards'], examples: [{ cardNumber: 'OP15-080', snippet: "{ kind: 'selfOtherNamedCharacterCount', name: 'Oars', atMost: 0 }" }] },
  selfTrashMatching: { id: 'selfTrashMatching', summary: 'N or more/less Events/{type} cards in your trash.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }, { name: 'category', type: 'CardCategory', required: false }, { name: 'typeIncludes', type: 'string', required: false }], covers: ['If you have {N} or more Events in your trash'], examples: [{ cardNumber: 'OP12-066', snippet: "{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }" }] },
  opponentRestedCharacterCount: { id: 'opponentRestedCharacterCount', summary: 'Opponent has N or more/less rested Characters.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If your opponent has {N} or more rested Characters'], examples: [{ cardNumber: 'OP01-032', snippet: "{ kind: 'opponentRestedCharacterCount', atLeast: 2 }" }] },
  selfGivenDonCount: { id: 'selfGivenDonCount', summary: 'You have N or more given DON!! (attached to your Leader/Characters).', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If you have a total of {N} or more given DON!! cards'], examples: [{ cardNumber: 'OP13-112', snippet: "{ kind: 'selfGivenDonCount', atLeast: 2 }" }] },
  opponentGivenDonCount: { id: 'opponentGivenDonCount', summary: 'Opponent has N or more given DON!!.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If your opponent has any DON!! cards given'], examples: [{ cardNumber: 'OP15-005', snippet: "{ kind: 'opponentGivenDonCount', atLeast: 1 }" }] },
  opponentHasCharacterBasePowerAtLeast: { id: 'opponentHasCharacterBasePowerAtLeast', summary: 'Opponent has a Leader/Character with base power N or more.', params: [{ name: 'power', type: 'number', required: true }], covers: ['If your opponent has a Leader or Character with a base power of {N} or more'], examples: [{ cardNumber: 'OP06-012', snippet: "{ kind: 'opponentHasCharacterBasePowerAtLeast', power: 6000 }" }] },
  opponentCharacterBasePowerCount: { id: 'opponentCharacterBasePowerCount', summary: 'Opponent has N Characters with base power M or more.', params: [{ name: 'power', type: 'number', required: true }, { name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['your opponent has {N} or more Characters with a base power of {M} or more'], examples: [{ cardNumber: 'EB04-005', snippet: "{ kind: 'opponentCharacterBasePowerCount', power: 5000, atLeast: 2 }" }] },
  anyCharacterCostAtLeast: { id: 'anyCharacterCostAtLeast', summary: 'There is a Character with a cost of N or more (either player).', params: [{ name: 'atLeast', type: 'number', required: true }], covers: ['if there is a Character with a cost of {N} or more'], examples: [{ cardNumber: 'OP11-095', snippet: "{ kind: 'anyCharacterCostAtLeast', atLeast: 9 }" }] },
  anyCharacterBasePowerAtLeast: { id: 'anyCharacterBasePowerAtLeast', summary: 'There is a Character with base power N or more (either player).', params: [{ name: 'power', type: 'number', required: true }], covers: ['unless there is a Character with {N} base power or more'], examples: [{ cardNumber: 'EB04-051', snippet: "{ kind: 'anyCharacterBasePowerAtLeast', power: 12000 }" }] },
  selfCharactersTotalCostAtLeast: { id: 'selfCharactersTotalCostAtLeast', summary: 'Total current cost of your Characters is N or more.', params: [{ name: 'atLeast', type: 'number', required: true }], covers: ['If the total cost of your Characters is {N} or more'], examples: [{ cardNumber: 'OP10-022', snippet: "{ kind: 'selfCharactersTotalCostAtLeast', atLeast: 5 }" }] },
  opponentHasCharacterExactCost: { id: 'opponentHasCharacterExactCost', summary: 'Opponent has a Character with a cost of exactly N.', params: [{ name: 'exactCost', type: 'number', required: true }], covers: ['if your opponent has a Character with a cost of {N}'], examples: [{ cardNumber: 'OP07-087', snippet: "{ kind: 'opponentHasCharacterExactCost', exactCost: 0 }" }] },
  selfDonReturnedThisAction: { id: 'selfDonReturnedThisAction', summary: 'N or more DON!! were returned to the DON!! deck during this cost payment (onDonReturned only).', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['When {N} or more DON!! cards on your field are returned to your DON!! deck', 'When a DON!! card on your field is returned to your DON!! deck'], examples: [{ cardNumber: 'OP09-061', snippet: "{ kind: 'selfDonReturnedThisAction', atLeast: 2 }" }] },
  selfActivatedEventBaseCostThisTurn: { id: 'selfActivatedEventBaseCostThisTurn', summary: 'You activated an Event with matching printed base cost during the current turn.', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['If you have activated an Event with a base cost of {N} or more this turn'], examples: [{ cardNumber: 'OP15-002', snippet: "{ kind: 'selfActivatedEventBaseCostThisTurn', atLeast: 3 }" }] },
  donGivenTargetLeaderOrCharacter: { id: 'donGivenTargetLeaderOrCharacter', summary: 'The DON!! recipient is your Leader or a Character (onDonGiven only).', params: [], covers: ['When this Leader or any of your Characters is given a DON!! card'], examples: [{ cardNumber: 'OP02-002', snippet: "{ kind: 'donGivenTargetLeaderOrCharacter' }" }] },
  donGivenTargetIsSelf: { id: 'donGivenTargetIsSelf', summary: 'This card was the DON!! recipient (onDonGiven only).', params: [], covers: ['When this Character is given a DON!! card'], examples: [{ cardNumber: 'OP13-007', snippet: "{ kind: 'donGivenTargetIsSelf' }" }] },
  selfDonGivenThisAction: { id: 'selfDonGivenThisAction', summary: 'N or more DON!! were given to this card this event (onDonGiven only).', params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }], covers: ['When this Character is given {N} or more DON!! cards'], examples: [{ cardNumber: 'OP13-007', snippet: "{ kind: 'selfDonGivenThisAction', atLeast: 1 }" }] },
  playedCharacterNoBaseEffect: { id: 'playedCharacterNoBaseEffect', summary: 'The Character just played from hand has no base effect (onCharacterPlayedFromHand only).', params: [], covers: ['Character with no base effect from your hand'], examples: [{ cardNumber: 'OP02-026', snippet: "{ kind: 'playedCharacterNoBaseEffect' }" }] },
  playedCharacterTypeIncludes: { id: 'playedCharacterTypeIncludes', summary: 'The just-played Character carries a type (played-character reactive windows).', params: [{ name: 'typeIncludes', type: 'string', required: true }], covers: ['When a {type} type Character card is played'], examples: [{ cardNumber: 'OP16-079', snippet: "{ kind: 'playedCharacterTypeIncludes', typeIncludes: 'Land of Wano' }" }] },
  playedCharacterBaseCostAtLeast: { id: 'playedCharacterBaseCostAtLeast', summary: 'The just-played Character has base cost >= N (reactive windows).', params: [{ name: 'atLeast', type: 'number', required: true }], covers: ['when your opponent plays a Character with a base cost of {N} or more'], examples: [{ cardNumber: 'OP12-081', snippet: "{ kind: 'playedCharacterBaseCostAtLeast', atLeast: 8 }" }] },
  playedFromCharacterEffect: { id: 'playedFromCharacterEffect', summary: 'The just-played Character entered play via another Character\'s effect.', params: [], covers: ['when your opponent plays a Character using a Character\'s effect'], examples: [{ cardNumber: 'OP12-081', snippet: "{ kind: 'playedFromCharacterEffect' }" }] },
  koedCharacterController: { id: 'koedCharacterController', summary: "Filters the onCharacterKoed reactive window by whose Character was K.O.'d (onCharacterKoed only).", params: [{ name: 'player', type: "'opponent' | 'controller'", required: true }], covers: ["When your opponent's Character is K.O.'d", 'When your Character is K.O.\u2019d'], examples: [{ cardNumber: 'OP01-061', snippet: "{ kind: 'koedCharacterController', player: 'opponent' }" }] },
  koByOpponentEffect: {
    id: 'koByOpponentEffect',
    summary: 'onKO only: the source Character was K.O.\'d by an opponent-controlled effect (not battle damage).',
    params: [],
    covers: ["When this Character is K.O.'d by your opponent's effect"],
    examples: [{ cardNumber: 'OP11-024', snippet: "{ kind: 'koByOpponentEffect' }" }],
  },
  koByEffect: {
    id: 'koByEffect',
    summary: 'onKO only: the source Character was K.O.\'d by any effect (not battle damage).',
    params: [],
    covers: ["When this Character is K.O.'d by an effect"],
    examples: [{ cardNumber: 'ST15-003', snippet: "{ kind: 'koByEffect' }" }],
  },
  selfActiveDonCount: {
    id: 'selfActiveDonCount',
    summary: 'Counts the controller\'s active, unattached DON!! in the cost area.',
    params: [{ name: 'atLeast', type: 'number', required: false }, { name: 'atMost', type: 'number', required: false }],
    covers: ['if you have {N} or more active DON!! cards'],
    examples: [{ cardNumber: 'OP04-028', snippet: "{ kind: 'selfActiveDonCount', atLeast: 2 }" }],
  },
  removedFromFieldController: { id: 'removedFromFieldController', summary: 'Whose card was removed from the field (onRemovedFromField only).', params: [{ name: 'player', type: "'opponent' | 'controller'", required: true }], covers: ['When your Character is removed', 'When your {Type} type Character is removed'], examples: [{ cardNumber: 'OP13-078', snippet: "{ kind: 'removedFromFieldController', player: 'controller' }" }] },
  removedByEffectController: { id: 'removedByEffectController', summary: 'Whose effect removed the card (onRemovedFromField only).', params: [{ name: 'player', type: "'opponent' | 'controller'", required: true }], covers: ['removed from the field by your effect', "removed from the field by your opponent's effect"], examples: [{ cardNumber: 'OP07-038', snippet: "{ kind: 'removedByEffectController', player: 'controller' }" }] },
  removedFromFieldCategory: { id: 'removedFromFieldCategory', summary: 'Category of the card removed from the field (onRemovedFromField only).', params: [{ name: 'category', type: 'CardCategory', required: true }], covers: ['When a Character is removed from the field'], examples: [{ cardNumber: 'OP07-038', snippet: "{ kind: 'removedFromFieldCategory', category: 'character' }" }] },
  removedFromFieldTypeIncludes: { id: 'removedFromFieldTypeIncludes', summary: 'Removed card must include a type (onRemovedFromField only).', params: [{ name: 'typeIncludes', type: 'string', required: true }], covers: ['your Character with a type including "{Type}"'], examples: [{ cardNumber: 'OP08-056', snippet: "{ kind: 'removedFromFieldTypeIncludes', typeIncludes: 'Whitebeard Pirates' }" }] },
  effectSourceTypeIncludes: { id: 'effectSourceTypeIncludes', summary: 'Effect source card must include a type (reactive windows).', params: [{ name: 'typeIncludes', type: 'string', required: true }], covers: ['by your {Navy} type card\'s effect'], examples: [{ cardNumber: 'OP12-040', snippet: "{ kind: 'effectSourceTypeIncludes', typeIncludes: 'Navy' }" }] },
  anyOf: { id: 'anyOf', summary: 'OR: satisfied if any sub-gate holds ("if Leader is X or has {Y} type").', params: [{ name: 'gates', type: 'AbilityGate[]', required: true }], covers: ['if your Leader has the {A} or {B} type'], examples: [{ cardNumber: 'OP11-031', snippet: "{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Fish-Man' }, { kind: 'leaderType', type: 'Merfolk' }] }" }] },
};

// ---------------------------------------------------------------------------
// Activation costs (params.cost — paid before the effect resolves)
// ---------------------------------------------------------------------------

export const COSTS: Record<AbilityCost['kind'], CapabilitySpec> = {
  donMinus: { id: 'donMinus', summary: 'DON!! −N: return N DON!! from the field to the DON!! deck.', params: [{ name: 'count', type: 'number', required: true }, { name: 'activeOnly', type: 'boolean', required: false }], covers: ['DON!! −{N}', 'return {N} active DON!! cards to your DON!! deck'], examples: [{ cardNumber: 'OP12-069', snippet: "cost: [{ kind: 'donMinus', count: 1 }]" }] },
  restThis: { id: 'restThis', summary: 'Rest the source card as a cost.', params: [], covers: ['You may rest this card:'], examples: [{ cardNumber: 'OP05-026', snippet: "cost: [{ kind: 'restThis' }]" }] },
  trashThis: { id: 'trashThis', summary: 'Trash the source card as a cost (NOT a K.O.; does not fire [On K.O.]).', params: [], covers: ['You may trash this Character:'], examples: [{ cardNumber: 'EB01-042', snippet: "cost: [{ kind: 'trashThis' }]" }] },
  restDon: { id: 'restDon', summary: 'Rest N of your active DON!! cards as a cost.', params: [{ name: 'count', type: 'number', required: true }], covers: ['➀/➁/... (rest the specified number of DON!! cards)'], examples: [{ cardNumber: 'OP16-006', snippet: "cost: [{ kind: 'restDon', count: 2 }]" }] },
};

// ---------------------------------------------------------------------------
// Timings, durations, keywords (enum reference with semantics)
// ---------------------------------------------------------------------------

export const TIMINGS: Record<IrTiming, string> = {
  onEnterPlay: 'Registers continuous/static effects when the card enters play (use for "gains [Blocker]", static buffs, auras).',
  onPlay: '[On Play] — one-shot when the card is played.',
  whenAttacking: '[When Attacking] — when this card declares an attack.',
  onBlock: '[On Block] — when this card blocks.',
  onOpponentsAttack: '[On Your Opponent\'s Attack] — when the opponent declares an attack.',
  onBattle: '[On Battle] — fires at battle start (before power comparison) unless `requiresOpponentKoed` defers to post-K.O. (OP02-094 Isuka).',
  activateMain: '[Activate: Main] — controller may activate during their Main phase.',
  onKO: '[On K.O.] — when this card is K.O.\'d.',
  onCharacterKoed: 'When one of your Characters is K.O.\'d (event trigger).',
  onRested: '[When this Character becomes rested] — fires when the card transitions active→rested (attack, cost, or effect).',
  onDonReturned: '[When DON!! on your field is returned to your DON!! deck] — fires after effect-sourced DON!! −N costs (not Refresh Phase returns).',
  onDonGiven: '[When … is given a DON!! card] — fires after effect or Main-Phase DON!! give resolves (not Refresh). Use donGivenTargetLeaderOrCharacter / donGivenTargetIsSelf gates.',
  onRemovedFromField: '[When a card is removed from the field by an effect] — fires after effect-sourced K.O./bounce/bottom-deck/trash from field (not battle K.O.). Use removedFromField* / removedByEffectController gates.',
  onOpponentEventActivated: '[When your opponent activates an Event] — reactive window after opponent Event resolution.',
  onYouEventActivated: '[When you activate an Event] — reactive window after your Event resolution.',
  onOpponentBlockerActivated: '[When your opponent activates a Blocker] — reactive window for the attacking player.',
  onLifeDamageDealt: '[When you deal damage to opponent Life] — fires after each Life hit in battle.',
  onDrawOutsideDrawPhase: '[When you draw outside your Draw Phase] — fires after each effect-sourced draw.',
  onLifeToHand: '[When a card is added to your hand from your Life] — fires after Life→hand in battle.',
  onTriggerActivated: '[When a [Trigger] activates] — fires after any player activates a Life [Trigger].',
  onCharacterPlayedFromHand: '[When you play a Character from your hand] — fires on your other in-play cards.',
  onOpponentCharacterPlayedFromHand: '[When your opponent plays a Character] — fires on your in-play cards (Leader/Characters).',
  onCharacterPlayedFromTrash: '[When you play a Character from your trash] — fires on your other in-play cards.',
  onStartOfTurn: '[Start of your turn] — optional activated effect after DON!! Phase before Main.',
  onHandTrashed: '[When a card is trashed from your hand by your card\'s effect] — reactive draw/buff window.',
  counter: '[Counter] — during the opponent\'s attack, from hand.',
  lifeTrigger: '[Trigger] — when this card is revealed from Life.',
  endOfTurn: '[End of Your Turn].',
};

export const DURATIONS: Record<IrDuration, string> = {
  untilStartOfNextTurn: 'Until the start of your next turn (expires at the same boundary as endOfOpponentsTurn).',
  endOfTurn: 'Until the end of the current turn (cleared in the End Phase).',
  endOfOpponentsTurn: 'Until the end of your opponent\'s next turn.',
  duringThisTurn: 'During this turn (temporary pump/debuff).',
  duringThisBattle: 'During this battle only (Counter/battle pumps).',
  permanent: 'Permanent; combine with `condition` for a conditional-continuous ("while X") effect.',
};

export const KEYWORDS: Record<ContinuousKeyword, string> = {
  rush: '[Rush] — can attack the turn it is played.',
  blocker: '[Blocker] — may be rested to become the new attack target.',
  doubleAttack: '[Double Attack] — deals 2 damage.',
  banish: '[Banish] — damage dealt trashes the target without activating its Trigger.',
  unblockable: 'Cannot be blocked.',
  canAttackActive: 'Can attack active Characters/Leader (attack-restriction lift).',
  canAttackCharactersWhileSummoningSick: 'Can attack Characters on the turn this Character is played, without granting Leader attacks.',
};

/** Convenience: all capability ids by group, for the doc generator and the triage classifier. */
export const CAPABILITY_INDEX = {
  effects: EFFECT_PRIMITIVES,
  gates: GATES,
  costs: COSTS,
  timings: TIMINGS,
  durations: DURATIONS,
  keywords: KEYWORDS,
} as const;
