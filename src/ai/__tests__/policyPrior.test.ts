/**
 * The policy prior is a fitted artifact loaded from disk, which means the
 * dangerous failures are all silent ones: a vector from an older feature list
 * applies cleanly and ranks actions by the wrong coefficients. So the tests
 * that matter here are the refusals.
 *
 * The other property under test is boundedness. The prior's job is to nudge a
 * ranking the evaluator produced; if one extreme feature value could return a
 * score of 400, the prior would BE the decision, and a model fitted on data
 * that never contained this position would be overruling rules-aware logic.
 */
import { describe, expect, it } from 'vitest';
import {
  policyPriorBonus,
  validatePolicyPrior,
  type PolicyPriorModel,
} from '../evaluation/policyPrior';
import {
  ACTION_FEATURE_KEYS,
  createActionFeatureContext,
} from '../evaluation/actionFeatures';
import type { GameAction } from '../../engine/actions/action';
import { buildBaseRig, putDon } from '../../engine/rules/shared/__tests__/testRig';

const ctx = () => {
  let rig = buildBaseRig();
  ({ rig } = putDon(rig, 'p1', 5));
  return createActionFeatureContext(rig.state, rig.defs, {}, 'p1');
};

const act = (type: GameAction['type']): GameAction =>
  ({ type, actionId: 'a', playerId: 'p1' }) as GameAction;

const model = (over: Partial<PolicyPriorModel> = {}): PolicyPriorModel => ({
  featureKeys: [...ACTION_FEATURE_KEYS],
  weights: new Array(ACTION_FEATURE_KEYS.length).fill(0),
  strength: 10,
  ...over,
});

describe('refusing a mismatched model', () => {
  it('rejects a vector of the wrong length', () => {
    expect(validatePolicyPrior(model({ weights: [1, 2, 3] }))).toMatch(/weights but this build/);
  });

  it('rejects a vector fitted against a different feature ORDER', () => {
    // Same length, same names, different order — the case that would otherwise
    // apply every coefficient to the wrong feature and still look healthy.
    const swapped = [...ACTION_FEATURE_KEYS];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    expect(validatePolicyPrior(model({ featureKeys: swapped }))).toMatch(/different ACTION_FEATURE_KEYS/);
  });

  it('rejects non-finite weights', () => {
    const weights = new Array(ACTION_FEATURE_KEYS.length).fill(0);
    weights[2] = Number.NaN;
    expect(validatePolicyPrior(model({ weights }))).toMatch(/non-finite/);
  });

  it('accepts a well-formed model, and treats absent as fine', () => {
    expect(validatePolicyPrior(model())).toBeNull();
    expect(validatePolicyPrior(undefined)).toBeNull();
  });

  it('contributes NOTHING rather than throwing when the model is bad', () => {
    // A stale artifact must degrade to the shipped evaluator, not crash a match.
    expect(policyPriorBonus(model({ weights: [1] }), ctx(), act('PASS_STEP'))).toBe(0);
  });
});

describe('influence is bounded', () => {
  it('never exceeds strength however extreme the coefficients', () => {
    const huge = new Array(ACTION_FEATURE_KEYS.length).fill(1e6);
    const bonus = policyPriorBonus(model({ weights: huge, strength: 10 }), ctx(), act('PASS_STEP'));
    expect(Math.abs(bonus)).toBeLessThanOrEqual(10);
  });

  it('is exactly off at strength 0, and when no model is supplied', () => {
    const w = new Array(ACTION_FEATURE_KEYS.length).fill(5);
    expect(policyPriorBonus(model({ weights: w, strength: 0 }), ctx(), act('PASS_STEP'))).toBe(0);
    expect(policyPriorBonus(undefined, ctx(), act('PASS_STEP'))).toBe(0);
  });

  it('separates two action types when the coefficients say to', () => {
    const w = new Array(ACTION_FEATURE_KEYS.length).fill(0);
    w[ACTION_FEATURE_KEYS.indexOf('isPassStep')] = 5;
    const m = model({ weights: w, strength: 10 });
    const pass = policyPriorBonus(m, ctx(), act('PASS_STEP'));
    const end = policyPriorBonus(m, ctx(), act('END_MAIN_PHASE'));
    expect(pass).toBeGreaterThan(end);
  });
});
