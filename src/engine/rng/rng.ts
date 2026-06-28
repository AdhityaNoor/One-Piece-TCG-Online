/**
 * Seeded RNG model.
 * Source of truth: project ground rule ("Randomness must use a seedable
 * RNG interface") plus the shuffle requirements in Comprehensive Rules
 * 3-2-4, 5-2-1-2, 5-2-1-6-1.
 *
 * RngState must be plain serializable data (no closures) so it round-trips
 * through GameState exactly like everything else.
 */

export interface RngState {
  seed: string;
  /** Number of values already drawn from this seed — replaying the same seed+cursor reproduces the same draws. */
  cursor: number;
}

/**
 * Pure, swappable RNG. Implementations must be deterministic for a given
 * RngState and must return their OWN new RngState rather than mutating in
 * place, so GameState updates stay immutable-friendly.
 */
export interface SeededRng {
  getState(): RngState;
  /** Returns a float in [0, 1) and the RngState reflecting that draw. */
  nextFloat(state: RngState): { value: number; nextState: RngState };
  /** Returns an integer in [0, maxExclusive) and the RngState reflecting that draw. */
  nextInt(state: RngState, maxExclusive: number): { value: number; nextState: RngState };
  /** Fisher-Yates shuffle built only from nextInt; returns the shuffled array and resulting RngState. */
  shuffle<T>(state: RngState, items: T[]): { result: T[]; nextState: RngState };
}
