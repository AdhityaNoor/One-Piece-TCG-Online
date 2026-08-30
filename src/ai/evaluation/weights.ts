/**
 * Every tunable scalar in the CPU's position evaluation, in one place.
 *
 * These numbers were originally hand-picked constants scattered across
 * matchObjective.ts and boardHeuristics.ts. Nobody ever measured them — and
 * two of them being wrong is exactly what made the CPU pass its turns. Pulling
 * them into a single serializable object makes them fittable against actual
 * self-play results instead of intuition.
 *
 * HOW A WEIGHT SET REACHES THE EVALUATOR
 * Threading a weights parameter through every scoring function would touch
 * dozens of signatures for no behavioural gain, so the active set is held in a
 * module-level slot that decideBestAction sets from CpuConfig at the start of
 * each decision. That is safe here because a decision is synchronous and
 * single-threaded: two agents with different weights can share a process as
 * long as neither yields mid-decision. It would NOT be safe if scoring ever
 * became async or ran in parallel — hence this comment rather than silence.
 *
 * A weight is only worth exposing if it changes what the CPU PREFERS. Pure
 * scale factors that multiply the whole utility are excluded: they cannot
 * change an argmax, so tuning them is wasted search budget.
 */

/**
 * Per-action-type shaping, applied where an action's score is produced.
 *
 * actionEvaluator.ts decides normal-difficulty play, and it holds ~60 inline
 * constants spread across one branch per action type. Extracting all of them
 * would be an invasive refactor with a large surface for silently changing
 * behaviour, for numbers that mostly trade off WITHIN one action type.
 *
 * What actually needs tuning is the trade-off BETWEEN types — attack versus
 * develop versus attach DON!! versus pass. `bias` shifts a whole class of
 * action up or down; `scale` widens or narrows the spread inside it. Two
 * numbers per type reach that trade-off without touching the internals.
 *
 * Identity is bias 0, scale 1, so the default set is a behavioural no-op.
 */
export interface ActionTypeShaping {
  bias: number;
  scale: number;
}

/** Action types worth shaping — the ones a player actually chooses between. */
export const SHAPED_ACTION_TYPES = [
  'PLAY_CHARACTER',
  'PLAY_STAGE',
  'ACTIVATE_EVENT_MAIN',
  'ACTIVATE_CARD_EFFECT',
  'GIVE_DON',
  'DECLARE_ATTACK',
  'ACTIVATE_BLOCKER',
  'ACTIVATE_COUNTER_CHARACTER',
  'ACTIVATE_COUNTER_EVENT',
  'END_MAIN_PHASE',
  'PASS_STEP',
] as const;

export type ShapedActionType = (typeof SHAPED_ACTION_TYPES)[number];

export interface EvaluatorWeights {
  // --- Life pressure (matchObjective.ts) ---------------------------------
  /**
   * Value of a Life card already taken off the opponent.
   * MUST stay above availableDamage — see that field.
   */
  lifeTaken: number;
  /**
   * Value per point of damage merely AVAILABLE this turn. Held strictly below
   * lifeTaken so that converting potential into damage is always a gain; when
   * this exceeded it, the CPU preferred to sit on an unrealized threat.
   */
  availableDamage: number;
  /** Value per point of damage the refreshed board threatens next turn. */
  boardDamage: number;
  /** A kill available next turn is worth less than one available now. */
  nextTurnDiscount: number;

  // --- Own survival (matchObjective.ts) ----------------------------------
  /** Value of each of our own remaining Life cards. */
  ownLife: number;
  /** Penalty for the risk of losing before our next turn. */
  immediateLossRisk: number;
  /** Penalty for the risk of losing on the turn after that. */
  nextTurnLossRisk: number;
  /** How heavily estimated loss probability counts against utility. */
  lossProbability: number;
  /** How heavily estimated win probability counts toward utility. */
  winProbability: number;

  // --- Blending (matchObjective.ts) --------------------------------------
  /** Weight on board/material position relative to life pressure. */
  positionValue: number;
  /** Weight on the lethal-horizon bonus. */
  lethalHorizon: number;

  // --- Board strength (boardHeuristics.ts) -------------------------------
  /** Value per 1000 power of a Character or the Leader. */
  powerPerThousand: number;
  /** Bonus for a Character being active (able to attack or block). */
  activeCharacter: number;
  /** Bonus per DON!! attached to a Character. */
  donAttached: number;
  /** Bonus for [Blocker]. */
  blocker: number;
  /** Bonus for [Rush]. */
  rush: number;
  /** Value of a card in hand. */
  handCard: number;
  /** Value of one of our own Life cards, as material. */
  lifeCard: number;
  /** Value of a resolved Stage. */
  stage: number;
  /** Scale on the (our board - their board) difference. */
  boardDifference: number;
  /** Scale on the (our Life - their Life) difference. */
  lifeDifference: number;

  /** Per-action-type shaping. Absent entries mean identity. */
  actionShaping?: Partial<Record<ShapedActionType, Partial<ActionTypeShaping>>>;

  /**
   * Skip the opponent-turn projection at lookahead leaves.
   *
   * That projection plays out the opponent's ENTIRE next turn at every leaf
   * node, and it is the single largest cost in a hard-difficulty decision:
   * ~32 engine simulations and ~103 full state clones per decision, 178ms.
   * Whether it buys enough accuracy to justify 350x slower games than the
   * other difficulties is an empirical question nobody had asked. This flag
   * exists so the arena can answer it.
   */
  skipOpponentProjection?: boolean;

  /**
   * How many candidate actions the lookahead simulates. Default 8.
   *
   * Measured: the finally-chosen action is inside the heuristic top-8 in 96.9%
   * of wide decisions, and the misses sat at ranks 8-9 — so a modest widening
   * captures nearly all of them. Exposed because the projection above costs
   * 2.2x per decision while changing only 4.4% of choices; trading that budget
   * for a wider search is the obvious experiment, and it needs a knob.
   */
  lookaheadTopK?: number;
  /** Plies of lookahead. Default 2. */
  lookaheadDepth?: number;
}

/**
 * The hand-picked baseline. Every value here is the one that was hardcoded
 * before weights were extracted, so swapping this in is a behavioural no-op —
 * which is what makes it a fair control in the arena.
 */
export const DEFAULT_EVALUATOR_WEIGHTS: EvaluatorWeights = {
  lifeTaken: 12,
  availableDamage: 3,
  boardDamage: 2,
  nextTurnDiscount: 0.8,

  ownLife: 12,
  immediateLossRisk: 40,
  nextTurnLossRisk: 20,
  lossProbability: 100,
  winProbability: 100,

  positionValue: 0.15,
  lethalHorizon: 0.1,

  powerPerThousand: 1,
  activeCharacter: 1.5,
  donAttached: 0.5,
  blocker: 1,
  rush: 0.5,
  handCard: 0.4,
  lifeCard: 1.2,
  stage: 2,
  boardDifference: 10,
  lifeDifference: 8,
};

/** Numeric field names, for optimizers that need a flat vector. */
export const EVALUATOR_WEIGHT_KEYS = (Object.keys(DEFAULT_EVALUATOR_WEIGHTS) as (keyof EvaluatorWeights)[])
  .filter((key) => typeof DEFAULT_EVALUATOR_WEIGHTS[key] === 'number');

/** Shaping for one action type, defaulted to identity. */
export function actionShapingFor(
  weights: EvaluatorWeights,
  actionType: string,
): ActionTypeShaping {
  const entry = weights.actionShaping?.[actionType as ShapedActionType];
  return { bias: entry?.bias ?? 0, scale: entry?.scale ?? 1 };
}

let activeWeights: EvaluatorWeights = DEFAULT_EVALUATOR_WEIGHTS;

/**
 * Install the weight set for the decision about to be made. Called by
 * decideBestAction; the arena relies on it to let two different weight sets
 * play each other inside one process.
 */
export function setEvaluatorWeights(weights: EvaluatorWeights | undefined): void {
  activeWeights = weights ?? DEFAULT_EVALUATOR_WEIGHTS;
}

export function getEvaluatorWeights(): EvaluatorWeights {
  return activeWeights;
}

/**
 * Merge a partial override onto the baseline. Fitted sets are stored as full
 * objects, but a hand-written experiment usually wants to move one number.
 */
export function withWeights(overrides: Partial<EvaluatorWeights>): EvaluatorWeights {
  return { ...DEFAULT_EVALUATOR_WEIGHTS, ...overrides };
}
