/**
 * The OPTCG API is inconsistent about how it encodes numbers (see
 * api/types.ts module doc): card_power/card_cost/life arrive as numeric
 * strings or null; counter_amount arrives as a real number or null. Every
 * numeric CardDefinition field must pass through one of these so the
 * engine never sees a stray "5000" string or a NaN from a malformed value.
 */

/** "5000" -> 5000, null/undefined/"" -> undefined, non-numeric garbage -> undefined (never NaN). */
export function coerceOptionalNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Comprehensive Rules 2-10-2: Counter is a Character-only property. The API
 * represents "this Character has no Counter value" as `counter_amount: 0`
 * (observed: promo Luffy P-001) rather than `null` — there is no "Counter +0"
 * concept in the rules, so 0 is normalized to `undefined` (absent) here, not
 * to a printed 0, to match CardDefinition.counter's "Character only" meaning.
 */
export function coerceCounterAmount(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === 0) return undefined;
  return Number.isFinite(value) ? value : undefined;
}
