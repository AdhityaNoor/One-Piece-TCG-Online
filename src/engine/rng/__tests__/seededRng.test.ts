import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../seededRng';
import type { RngState } from '../rng';

describe('createSeededRng', () => {
  it('nextFloat is deterministic for the same (seed, cursor)', () => {
    const rng = createSeededRng('seed-a');
    const state: RngState = { seed: 'seed-a', cursor: 0 };
    const draw1 = rng.nextFloat(state);
    const draw2 = rng.nextFloat(state);
    expect(draw1.value).toBe(draw2.value);
    expect(draw1.nextState).toEqual(draw2.nextState);
  });

  it('nextFloat always returns a value in [0, 1)', () => {
    const rng = createSeededRng('seed-b');
    let state: RngState = { seed: 'seed-b', cursor: 0 };
    for (let i = 0; i < 200; i++) {
      const draw = rng.nextFloat(state);
      expect(draw.value).toBeGreaterThanOrEqual(0);
      expect(draw.value).toBeLessThan(1);
      state = draw.nextState;
    }
  });

  it('different seeds produce different sequences', () => {
    const rngA = createSeededRng('seed-a');
    const rngB = createSeededRng('seed-b');
    const drawA = rngA.nextFloat({ seed: 'seed-a', cursor: 0 });
    const drawB = rngB.nextFloat({ seed: 'seed-b', cursor: 0 });
    expect(drawA.value).not.toBe(drawB.value);
  });

  it('advancing cursor changes the draw (no obvious short cycle)', () => {
    const rng = createSeededRng('seed-c');
    const values = new Set<number>();
    let state: RngState = { seed: 'seed-c', cursor: 0 };
    for (let i = 0; i < 50; i++) {
      const draw = rng.nextFloat(state);
      values.add(draw.value);
      state = draw.nextState;
    }
    expect(values.size).toBe(50);
  });

  it('nextInt stays within [0, maxExclusive)', () => {
    const rng = createSeededRng('seed-d');
    let state: RngState = { seed: 'seed-d', cursor: 0 };
    for (let i = 0; i < 100; i++) {
      const draw = rng.nextInt(state, 7);
      expect(draw.value).toBeGreaterThanOrEqual(0);
      expect(draw.value).toBeLessThan(7);
      expect(Number.isInteger(draw.value)).toBe(true);
      state = draw.nextState;
    }
  });

  it('nextInt rejects a non-positive-integer maxExclusive', () => {
    const rng = createSeededRng('seed-e');
    expect(() => rng.nextInt({ seed: 'seed-e', cursor: 0 }, 0)).toThrow();
    expect(() => rng.nextInt({ seed: 'seed-e', cursor: 0 }, 1.5)).toThrow();
  });

  it('shuffle returns a permutation of the input (same elements, same length)', () => {
    const rng = createSeededRng('seed-f');
    const items = Array.from({ length: 20 }, (_, i) => `card-${i}`);
    const { result } = rng.shuffle({ seed: 'seed-f', cursor: 0 }, items);
    expect(result).toHaveLength(items.length);
    expect([...result].sort()).toEqual([...items].sort());
  });

  it('shuffle is deterministic for the same (seed, cursor)', () => {
    const rng = createSeededRng('seed-g');
    const items = Array.from({ length: 50 }, (_, i) => `card-${i}`);
    const state: RngState = { seed: 'seed-g', cursor: 0 };
    const shuffle1 = rng.shuffle(state, items);
    const shuffle2 = rng.shuffle(state, items);
    expect(shuffle1.result).toEqual(shuffle2.result);
    expect(shuffle1.nextState).toEqual(shuffle2.nextState);
  });

  it('shuffle actually reorders a non-trivial array (not a no-op)', () => {
    const rng = createSeededRng('seed-h');
    const items = Array.from({ length: 50 }, (_, i) => `card-${i}`);
    const { result } = rng.shuffle({ seed: 'seed-h', cursor: 0 }, items);
    expect(result).not.toEqual(items);
  });

  it('shuffle handles empty and single-element arrays without throwing', () => {
    const rng = createSeededRng('seed-i');
    const state: RngState = { seed: 'seed-i', cursor: 0 };
    expect(rng.shuffle(state, []).result).toEqual([]);
    expect(rng.shuffle(state, ['only']).result).toEqual(['only']);
  });

  it('getState() returns a fresh cursor-0 state for the bound seed', () => {
    const rng = createSeededRng('seed-j');
    expect(rng.getState()).toEqual({ seed: 'seed-j', cursor: 0 });
  });

  it('hashSeed-driven draws can resume from any serialized RngState, not just getState()', () => {
    const rng = createSeededRng('seed-k');
    const state: RngState = { seed: 'seed-k', cursor: 17 }; // arbitrary cursor, as if loaded from a saved GameState
    const draw1 = rng.nextFloat(state);
    const draw2 = rng.nextFloat({ seed: 'seed-k', cursor: 17 });
    expect(draw1.value).toBe(draw2.value);
  });
});
