/**
 * Concrete SeededRng implementation.
 * Source of truth: project ground rule ("Randomness must use a seedable RNG
 * interface") — the *interface* lives in rng.ts; this file is one concrete,
 * deterministic implementation of it.
 *
 * Design choice: rather than a classic stateful generator (which advances an
 * internal counter on every call), nextFloat/nextInt/shuffle are pure
 * functions of the EXPLICIT (seed, cursor) pair passed in. Mixing
 * `hashSeed(seed)` and `cursor` through a splitmix32-style finalizer means
 * any (seed, cursor) reproduces the exact same draw with no need to replay
 * every earlier draw first — useful for replay/debugging and keeps this
 * file trivially testable. This is an engineering choice, not a rule from
 * the Comprehensive Rules PDF (the rules only require shuffling to happen,
 * not how — see 3-2-4, 5-2-1-2, 5-2-1-6-1).
 */
import type { RngState, SeededRng } from './rng';

/** Deterministic string -> uint32 hash (FNV-1a). Pure; no Math.random anywhere in this file. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** splitmix32-style finalizer mixing a seed hash with a draw index into a uint32. */
function mix(seedHash: number, cursor: number): number {
  let h = (seedHash ^ Math.imul(cursor + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function advance(state: RngState): RngState {
  return { seed: state.seed, cursor: state.cursor + 1 };
}

function rawNextFloat(state: RngState): { value: number; nextState: RngState } {
  const mixed = mix(hashSeed(state.seed), state.cursor);
  return { value: mixed / 0x100000000, nextState: advance(state) };
}

function rawNextInt(state: RngState, maxExclusive: number): { value: number; nextState: RngState } {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error(`nextInt requires a positive integer maxExclusive, got ${maxExclusive}`);
  }
  const { value, nextState } = rawNextFloat(state);
  return { value: Math.floor(value * maxExclusive), nextState };
}

/** Fisher-Yates, built only from nextInt (project ground rule: shuffles must not use ambient Math.random). */
function rawShuffle<T>(state: RngState, items: T[]): { result: T[]; nextState: RngState } {
  const result = items.slice();
  let current = state;
  for (let i = result.length - 1; i > 0; i--) {
    const draw = rawNextInt(current, i + 1);
    const j = draw.value;
    current = draw.nextState;
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return { result, nextState: current };
}

/**
 * Creates a SeededRng bound to a starting seed. `getState()` returns the
 * fresh `{ seed, cursor: 0 }` starting point for that seed; every other
 * method is a pure function of whatever RngState you pass it (not
 * necessarily the one from getState() — you can resume from any serialized
 * RngState found on a GameState).
 */
export function createSeededRng(seed: string): SeededRng {
  return {
    getState(): RngState {
      return { seed, cursor: 0 };
    },
    nextFloat: rawNextFloat,
    nextInt: rawNextInt,
    shuffle: rawShuffle,
  };
}
