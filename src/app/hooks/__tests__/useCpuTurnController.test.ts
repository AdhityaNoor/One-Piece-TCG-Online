import { describe, expect, it } from 'vitest';
import { isCpuControlledSeat } from '../useCpuTurnController';

describe('isCpuControlledSeat', () => {
  it('never lets the CPU drive the pinned local seat', () => {
    expect(isCpuControlledSeat('p1', ['p1'], 'p1')).toBe(false);
  });

  it('allows the CPU opponent seat in a pinned local match', () => {
    expect(isCpuControlledSeat('p2', ['p2'], 'p1')).toBe(true);
  });
});
