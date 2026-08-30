/**
 * The feature vector the utility function is built from.
 *
 * `evaluateMatchObjective`'s utility is a LINEAR combination of these features
 * with EvaluatorWeights as its coefficients. That is the whole reason a fit is
 * cheap here: no neural network is needed to improve the weights, because the
 * thing being weighted is already a linear model. Extracting the features
 * explicitly lets a logistic regression recover coefficients that actually
 * predict winning, instead of the numbers someone picked by intuition.
 *
 * ONE HONEST CAVEAT, stated here because it decides how the result must be
 * judged: fitting these coefficients to game outcomes produces a good STATE
 * EVALUATOR, which is not automatically a good ACTION SELECTOR. Features that
 * merely correlate with winning — "I have four points of damage available" —
 * will earn a large positive coefficient, and an agent that maximises them can
 * learn to preserve the feature rather than cash it in. That is precisely the
 * bug that made this CPU pass its turns. So a fit is never shipped on its
 * regression metrics; it ships only if it beats the baseline in the arena.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import { evaluatePosition } from '../heuristics/boardHeuristics';
import { evaluateSurvival } from '../strategy/strategicModeSelector';
import { estimateVictory, lethalHorizonScore } from './lethalEstimator';
import { opponentLifeCount, ownLifeCount } from '../visibility/playerView';
import type { EvaluatorWeights } from './weights';

/** Life total both players start from — must match matchObjective.ts. */
const STARTING_LIFE_REFERENCE = 10;

/**
 * Feature order is the contract between extraction and the fitted vector.
 * Each entry names the EvaluatorWeights field it is the coefficient for.
 */
export const POSITION_FEATURE_KEYS = [
  'lifeTaken',
  'availableDamage',
  'boardDamage',
  'ownLife',
  'immediateLossRisk',
  'nextTurnLossRisk',
  'winProbability',
  'lossProbability',
  'positionValue',
  'lethalHorizon',
] as const satisfies readonly (keyof EvaluatorWeights)[];

export type PositionFeatureKey = (typeof POSITION_FEATURE_KEYS)[number];

export type PositionFeatures = Record<PositionFeatureKey, number>;

/**
 * Extract the features for `playerId` from a state.
 *
 * Signs are baked in so that every coefficient is expected POSITIVE: the risk
 * terms are negated here rather than subtracted later. A negative fitted
 * coefficient is then immediately readable as "this feature predicts the
 * opposite of what the hand-written formula assumed", which is exactly the
 * kind of finding worth noticing.
 */
export function extractPositionFeatures(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): PositionFeatures {
  const survival = evaluateSurvival(state, playerId, defs);
  const victory = estimateVictory(state, playerId, defs);
  const ownLife = ownLifeCount(state, playerId);
  const opponentLife = opponentLifeCount(state, playerId);

  // Mirrors matchObjective's own composition so the fitted coefficients drop
  // straight back into the same formula.
  const opponentLifePressure =
    (STARTING_LIFE_REFERENCE - opponentLife) * 12 +
    victory.expectedSuccessfulLifeDamage * 3 +
    victory.nextTurnLifeDamagePotential * 2;
  const bestLethalHorizon = Math.max(
    victory.currentTurnLethalProbability,
    victory.nextTurnLethalProbability * 0.8,
  );

  return {
    lifeTaken: STARTING_LIFE_REFERENCE - opponentLife,
    availableDamage: victory.expectedSuccessfulLifeDamage,
    boardDamage: victory.nextTurnLifeDamagePotential,
    ownLife,
    immediateLossRisk: -survival.immediateLossRisk,
    nextTurnLossRisk: -survival.nextTurnLossRisk,
    winProbability: Math.min(0.95, bestLethalHorizon / 100 + opponentLifePressure / 400),
    lossProbability: -Math.min(0.95, survival.immediateLossRisk + survival.nextTurnLossRisk * 0.5),
    positionValue: evaluatePosition(state, playerId, defs, registry),
    lethalHorizon: lethalHorizonScore(victory),
  };
}

export function featuresToVector(features: PositionFeatures): number[] {
  return POSITION_FEATURE_KEYS.map((key) => features[key]);
}
