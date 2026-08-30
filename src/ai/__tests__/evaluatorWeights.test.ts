/**
 * The tuning knobs must be inert until something deliberately turns them.
 *
 * Everything added for weight fitting — per-action-type shaping, the
 * opponent-projection switch, the search-budget overrides — ships DISABLED.
 * A default that quietly changed how the CPU plays would make every arena
 * measurement taken against "baseline" meaningless, since baseline is the
 * control the fitted candidates are compared to.
 */
import { describe, expect, it } from 'vitest';
import {
  actionShapingFor,
  DEFAULT_EVALUATOR_WEIGHTS,
  EVALUATOR_WEIGHT_KEYS,
  getEvaluatorWeights,
  setEvaluatorWeights,
  SHAPED_ACTION_TYPES,
  withWeights,
} from '../evaluation/weights';

describe('evaluator weights', () => {
  it('defaults to identity shaping for every shaped action type', () => {
    for (const type of SHAPED_ACTION_TYPES) {
      expect(actionShapingFor(DEFAULT_EVALUATOR_WEIGHTS, type)).toEqual({ bias: 0, scale: 1 });
    }
  });

  it('treats an unknown action type as identity rather than throwing', () => {
    expect(actionShapingFor(DEFAULT_EVALUATOR_WEIGHTS, 'SOME_FUTURE_ACTION')).toEqual({ bias: 0, scale: 1 });
  });

  it('ships every search override off', () => {
    expect(DEFAULT_EVALUATOR_WEIGHTS.skipOpponentProjection).toBeUndefined();
    expect(DEFAULT_EVALUATOR_WEIGHTS.lookaheadTopK).toBeUndefined();
    expect(DEFAULT_EVALUATOR_WEIGHTS.lookaheadDepth).toBeUndefined();
    expect(DEFAULT_EVALUATOR_WEIGHTS.actionShaping).toBeUndefined();
  });

  it('exposes only numeric fields to an optimizer', () => {
    // actionShaping is an object and the search flags are booleans; a tuner
    // that treated them as scalars would produce nonsense candidates.
    for (const key of EVALUATOR_WEIGHT_KEYS) {
      expect(typeof DEFAULT_EVALUATOR_WEIGHTS[key]).toBe('number');
    }
    expect(EVALUATOR_WEIGHT_KEYS).not.toContain('actionShaping');
    expect(EVALUATOR_WEIGHT_KEYS).not.toContain('skipOpponentProjection');
  });

  it('keeps the ordering that stops the CPU hoarding unrealized threats', () => {
    // lifeTaken > availableDamage > boardDamage. Violating this is the exact
    // shape of the "never attack" bug; a fitted set that inverts it is wrong
    // however good its regression metrics look.
    expect(DEFAULT_EVALUATOR_WEIGHTS.lifeTaken).toBeGreaterThan(DEFAULT_EVALUATOR_WEIGHTS.availableDamage);
    expect(DEFAULT_EVALUATOR_WEIGHTS.availableDamage).toBeGreaterThan(DEFAULT_EVALUATOR_WEIGHTS.boardDamage);
  });

  it('merges overrides onto the baseline without mutating it', () => {
    const tweaked = withWeights({ lifeTaken: 99 });
    expect(tweaked.lifeTaken).toBe(99);
    expect(tweaked.ownLife).toBe(DEFAULT_EVALUATOR_WEIGHTS.ownLife);
    expect(DEFAULT_EVALUATOR_WEIGHTS.lifeTaken).toBe(12);
  });

  it('restores the baseline when a seat supplies no weights', () => {
    setEvaluatorWeights(withWeights({ lifeTaken: 1 }));
    expect(getEvaluatorWeights().lifeTaken).toBe(1);
    // An unweighted seat must NOT inherit the previous seat's set — that would
    // silently make one agent play with the other's weights mid-arena.
    setEvaluatorWeights(undefined);
    expect(getEvaluatorWeights()).toBe(DEFAULT_EVALUATOR_WEIGHTS);
  });
});
