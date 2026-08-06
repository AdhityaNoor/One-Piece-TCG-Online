import { describe, expect, it } from 'vitest';
import { atLeastOne, exactly } from '../hypergeometric';

describe('hypergeometric', () => {
  it('exactly() matches a hand-computed value: draw 1 from 50 with 4 hits', () => {
    // P(exactly 1) = C(4,1)C(46,0)/C(50,1) = 4/50 = 0.08
    expect(exactly(50, 4, 1, 1)).toBeCloseTo(0.08, 10);
  });

  it('atLeastOne() = 1 - P(none); draw 5 from 50 with 4 copies', () => {
    // 1 - C(46,5)/C(50,5) = 1 - 1370754/2118760
    expect(atLeastOne(50, 4, 5)).toBeCloseTo(0.3530, 3);
  });

  it('returns 0 when there are no successes or no draws', () => {
    expect(atLeastOne(50, 0, 5)).toBe(0);
    expect(atLeastOne(50, 4, 0)).toBe(0);
  });

  it('returns 1 when every card is a success', () => {
    expect(atLeastOne(10, 10, 1)).toBe(1);
    expect(atLeastOne(10, 12, 1)).toBe(1);
  });

  it('is monotonic: more copies never lowers the odds', () => {
    const a = atLeastOne(50, 2, 6);
    const b = atLeastOne(50, 4, 6);
    const c = atLeastOne(50, 8, 6);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it('clamps draws to the deck size without NaN', () => {
    expect(atLeastOne(50, 4, 999)).toBe(1);
  });
});
