/**
 * A cheap stand-in for `projectOpponentTurn`, fitted to that simulation's own
 * output (see scripts/ai-sim/fitThreatModel.ts).
 *
 * WHAT THIS REPLACES, AND WHY IT IS NOT A DELETION
 * The lookahead asks one question at every leaf: how much worse does my
 * position get once the opponent has had their turn? Answering it by SIMULATING
 * that whole turn costs ~5.5ms per leaf and ~2.2x the cost of an entire
 * decision. Stage 2 measured what happens if you simply stop asking — aggro
 * matchups improve, control matchups collapse (held-out 40% vs tuned 83%),
 * because the question is really "am I about to die" and that is what decides
 * grindy games. The projection is load-bearing; only its COST is negotiable.
 *
 * TWO HEADS, BECAUSE THE ANSWER IS BIMODAL
 * Sampled over thousands of leaf positions, the projection's utility delta
 * splits cleanly: ~14% are terminal (the opponent kills us; delta ~ -1,000,176)
 * and the rest are ordinary attrition (mean 0, sd ~45). Fitting one regression
 * across six orders of magnitude yields a model that scores a respectable R²
 * while being useless at the case it is asked most often, so lethality is
 * CLASSIFIED and attrition is REGRESSED, then combined as an expectation.
 *
 * TRAINED WHERE IT IS USED
 * Labels come from SIMULATED LEAF states — positions after a candidate action —
 * not from the game positions a match passes through. Those are different
 * distributions: a leaf is mid-line, often with an attack already declared. A
 * first version fitted on ordinary game positions agreed with the real
 * projection only 90.2% of the time, worse than the trivial baseline of
 * omitting the term.
 *
 * Held-out performance of the shipped coefficients:
 *   lethal detection  recall 88.1%  precision 66.8%
 *   ordinary delta    R² 0.608  MAE 16.8  (target sd ~38)
 *
 * RECALL is the metric that matters, not R² and not precision. A false alarm
 * makes the CPU over-cautious at one leaf; a MISS is the CPU walking into a
 * loss it had every bit of information needed to see.
 *
 * MONOTONICITY IS ENFORCED, AND IT COSTS RECALL
 * The lethal head is fitted under sign constraints (projected gradient): more
 * attackers or less Life may only ever INCREASE estimated danger. Without them
 * an unconstrained fit reached 99.5%% recall while giving extra opponent
 * attackers a NEGATIVE coefficient — harmless bookkeeping under collinearity on
 * the training distribution, and actively dangerous inside a search, where a
 * leaf is an unusual position by construction and the model would steer toward
 * danger exactly where it is asked to avoid it. Constraining the signs dropped
 * recall from 99.5%% to 88.1%%. That is the honest trade, and the reason this
 * is NOT yet enabled by default.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { GameState } from '../../engine/state/game';
import { extractThreatFeatures, threatFeaturesToVector, THREAT_FEATURE_KEYS } from './threatFeatures';

export interface ThreatModel {
  /** Guards against a model fitted on a different feature list being loaded. */
  featureKeys: readonly string[];
  mean: readonly number[];
  sd: readonly number[];
  /** Head 1 — logistic: does the opponent's turn end the game? */
  lethalWeights: readonly number[];
  lethalBias: number;
  /** Utility delta a lethal opponent turn actually applies. */
  lethalMagnitude: number;
  /** Head 2 — ridge: the ordinary, non-lethal delta. */
  ordinaryWeights: readonly number[];
  ordinaryBias: number;
  yMean: number;
  ySd: number;
}

/** Fitted 3898 train / 974 held-out LEAF positions, V1 registry. */
export const DEFAULT_THREAT_MODEL: ThreatModel = {
  featureKeys: THREAT_FEATURE_KEYS,
  mean: [2.40328, 0.972807, 1.47229, 0, 1.06388, 0.181434, 0.31646, 5.00231, 8.70087, 5.4038, 2.43253, 2.88661, 2.72678, 0.868394],
  sd: [1.63969, 1.25966, 1.32268, 1, 1.27544, 0.243006, 0.354319, 0.170247, 3.1459, 0.717805, 1.62212, 3.50437, 1.50696, 0.338062],
  lethalWeights: [-2.98176, 0, 0.0647582, 0, -0.212473, 0, 0, 0, 0, 0, 0.0193011, 0.0190687, 0, 0.0281521],
  lethalBias: -4.0796,
  lethalMagnitude: -1.00018e+06,
  ordinaryWeights: [-0.0297579, -0.242996, 0.163551, 0, -0.0186796, 0.631825, 0.227186, 0.0364827, -0.0361375, 0.0120402, 0.0480775, 0.00340906, 0.0358003, -0.137986],
  ordinaryBias: -0.0403673,
  yMean: 7.95902,
  ySd: 45.2962,
};

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
}

function dot(weights: readonly number[], standardised: readonly number[], bias: number): number {
  let z = bias;
  for (let i = 0; i < weights.length; i++) z += weights[i] * standardised[i];
  return z;
}

export interface ThreatEstimate {
  /** Expected utility delta from the opponent's coming turn. Negative is bad. */
  delta: number;
  /** Probability that the opponent's turn ends the game against us. */
  lethalProbability: number;
}

/**
 * Estimate what `projectOpponentTurn` would have returned, without simulating.
 * Roughly 0.1ms against the simulation's ~5.5ms.
 */
export function estimateOpponentThreat(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  model: ThreatModel = DEFAULT_THREAT_MODEL,
): ThreatEstimate {
  const raw = threatFeaturesToVector(extractThreatFeatures(state, playerId, defs));
  const standardised = raw.map((v, i) => (v - model.mean[i]) / (model.sd[i] || 1));

  const lethalProbability = sigmoid(dot(model.lethalWeights, standardised, model.lethalBias));
  const ordinary = dot(model.ordinaryWeights, standardised, model.ordinaryBias) * model.ySd + model.yMean;

  return {
    lethalProbability,
    delta: lethalProbability * model.lethalMagnitude + (1 - lethalProbability) * ordinary,
  };
}
