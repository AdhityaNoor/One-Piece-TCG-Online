/**
 * The fitted action policy, applied at decision time.
 *
 * WHAT THIS IS
 * A single linear score over the action features (evaluation/actionFeatures.ts),
 * fitted by scripts/ai-sim/fitPolicy.ts to what players actually chose. It is a
 * PRIOR, not a replacement: it nudges the hand-written evaluator's ranking, it
 * never overrides it.
 *
 * WHY A PRIOR AND NOT A POLICY
 * A learned policy can only ever reproduce the play it was fitted to, and it
 * has no notion of the rules — nothing stops it preferring an action that
 * throws the game away in a position its training data never contained. The
 * hand-written evaluator does know the rules, and it is the thing that has been
 * arena-tested. So the model contributes an opinion about what a player would
 * do here, scaled by `strength`, and the evaluator keeps the final say.
 *
 * WHY IT IS OFF BY DEFAULT
 * Predicting a player is not the same as beating one, and this project has
 * already shipped one lesson on that: the position weights fitted to game
 * outcomes predicted winners at 72.9% and did not improve play at all. So no
 * fitted artifact is enabled here until it has won games in the arena against
 * the baseline. `strength: 0` — or simply not setting `policyPrior` — is the
 * shipped configuration.
 */
import type { GameAction } from '../../engine/actions/action';
import {
  ACTION_FEATURE_KEYS,
  extractActionFeatures,
  type ActionFeatureContext,
} from './actionFeatures';

export interface PolicyPriorModel {
  /**
   * The feature list this vector was fitted against. Checked, not trusted: a
   * vector is just numbers, and applying one fitted under a different feature
   * order lands every coefficient on the wrong feature and still "works".
   */
  featureKeys: readonly string[];
  weights: readonly number[];
  /**
   * How much the prior may move a score, in the evaluator's own units. 0
   * disables it entirely.
   */
  strength: number;
}

/**
 * Returns null — and says why — rather than applying a model that does not
 * match this build. Silently misapplying a stale vector is the failure mode
 * worth spending a branch on.
 */
export function validatePolicyPrior(model: PolicyPriorModel | undefined): string | null {
  if (!model) return null;
  if (model.weights.length !== ACTION_FEATURE_KEYS.length) {
    return `policy prior has ${model.weights.length} weights but this build has ${ACTION_FEATURE_KEYS.length} features`;
  }
  if (model.featureKeys.join(',') !== ACTION_FEATURE_KEYS.join(',')) {
    return 'policy prior was fitted against a different ACTION_FEATURE_KEYS order; re-fit it';
  }
  if (!model.weights.every((w) => Number.isFinite(w))) {
    return 'policy prior contains a non-finite weight';
  }
  return null;
}

/**
 * The prior's opinion of one action, already scaled by `strength`.
 *
 * Returns 0 for a missing or mismatched model, so every caller can add this
 * unconditionally and the disabled path costs one comparison.
 */
export function policyPriorBonus(
  model: PolicyPriorModel | undefined,
  ctx: ActionFeatureContext,
  action: GameAction,
): number {
  if (!model || model.strength === 0) return 0;
  if (validatePolicyPrior(model) !== null) return 0;

  const features = extractActionFeatures(ctx, action);
  let utility = 0;
  for (let i = 0; i < ACTION_FEATURE_KEYS.length; i++) {
    utility += model.weights[i] * features[ACTION_FEATURE_KEYS[i]];
  }
  // Squashed before scaling. The fitted utility is unbounded — one extreme
  // feature can produce a huge value — and an unbounded prior would stop being a
  // prior and start being the decision. tanh caps its influence at ±strength.
  return Math.tanh(utility) * model.strength;
}
