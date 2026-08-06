/**
 * Hypergeometric probability helpers — the statistical backbone of the deck
 * stat metrics that talk about "chance to draw / hit" (On Curve Plays and
 * Searcher hit chance). These are PURE math over deck composition numbers; no
 * rules-engine or card-effect logic lives here.
 *
 * Model: a deck is an urn of N cards containing K "successes". You reveal /
 * draw n cards without replacement. The hypergeometric distribution gives the
 * probability of seeing exactly k successes.
 *
 * We only ever need P(at least one success), so the public surface is
 * {@link atLeastOne}. Everything else is an implementation detail kept private
 * and tested through it.
 */

/**
 * ln(n!) via lgamma, so large binomials (deck of 50, draw 20+) never overflow
 * a double the way a naive factorial product would. Memoised small table keeps
 * the hot path cheap for the tiny numbers a 50-card deck actually uses.
 */
const LN_FACT_CACHE: number[] = [0, 0];
function lnFactorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error(`lnFactorial expects a non-negative integer, got ${n}`);
  }
  if (LN_FACT_CACHE[n] !== undefined) return LN_FACT_CACHE[n];
  let value = LN_FACT_CACHE[LN_FACT_CACHE.length - 1];
  for (let i = LN_FACT_CACHE.length; i <= n; i += 1) {
    value += Math.log(i);
    LN_FACT_CACHE[i] = value;
  }
  return LN_FACT_CACHE[n];
}

/** ln( C(n, k) ). Returns -Infinity for impossible choices (k > n or k < 0). */
function lnChoose(n: number, k: number): number {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
  return lnFactorial(n) - lnFactorial(k) - lnFactorial(n - k);
}

/**
 * P(exactly `k` successes) when drawing `draws` cards from a `deckSize`-card
 * deck holding `successes` copies of the wanted card. Returns 0 for
 * combinatorially impossible parameters rather than NaN.
 */
export function exactly(deckSize: number, successes: number, draws: number, k: number): number {
  if (deckSize <= 0 || draws < 0) return 0;
  const clampedDraws = Math.min(draws, deckSize);
  const lnP =
    lnChoose(successes, k) +
    lnChoose(deckSize - successes, clampedDraws - k) -
    lnChoose(deckSize, clampedDraws);
  return Number.isFinite(lnP) ? Math.exp(lnP) : 0;
}

/**
 * P(at least one success) — the only shape the stat views need ("chance you
 * see your on-curve play / your searcher hits"). Computed as 1 - P(0) for
 * numerical stability. Clamped to [0, 1] to absorb floating-point drift.
 */
export function atLeastOne(deckSize: number, successes: number, draws: number): number {
  if (successes <= 0 || draws <= 0 || deckSize <= 0) return 0;
  if (successes >= deckSize) return 1;
  const pNone = exactly(deckSize, successes, draws, 0);
  return Math.min(1, Math.max(0, 1 - pNone));
}
