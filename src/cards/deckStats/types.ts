/**
 * Deck-stat model — the machine-readable output of the deckStats engine.
 *
 * Everything here is plain JSON-serializable data derived from a SavedDeck's
 * card SNAPSHOTS (definition + quantity). No API calls, no rules-engine, no
 * effect curation: this is a read-only analytical projection of card DATA,
 * mirroring the project's "card data is input, not executable logic" rule.
 * The UI (DeckStatsScreen) consumes this; it must never recompute stats
 * itself.
 *
 * Metric semantics intentionally follow the public gumgum.gg deck-analysis
 * definitions (cost/power curve, on-curve odds, counter totals, searcher hit
 * chance, type/attribute/keyword breakdowns) so a user comparing the two sees
 * the same shape of numbers — but every formula here is an independent
 * reimplementation over our own card model, not ported code.
 */
import type { Attribute } from '../../engine/state/card';

/** A single (bucket, count) pair used by the histogram-style metrics. */
export interface CountBucket {
  /** The bucket's stringified key (a cost, a power value, a type name, ...). */
  key: string;
  /** Copy-weighted number of cards in this bucket (respects deck quantities). */
  count: number;
}

/** Cost or power histogram over the 50-card main deck (leader excluded from cost). */
export interface CurveStat {
  /** Ordered low->high buckets. Numeric buckets are pre-sorted ascending. */
  buckets: CountBucket[];
  /** Copy-weighted mean over the cards that HAVE the measured field. */
  average: number;
  /** Copy-weighted count of cards that contributed (had a defined value). */
  contributingCards: number;
}

/** One row of the On Curve Plays table: for a given DON!! count / turn. */
export interface OnCurveRow {
  /** DON!! available == cost being evaluated (1..maxCost). */
  cost: number;
  /** Copy-weighted number of playable cards costing EXACTLY this. */
  cardsAtCost: number;
  /** Copy-weighted number of playable cards costing this OR LESS. */
  cardsAtOrBelow: number;
  /**
   * P(at least one card costing exactly `cost` is in hand by the turn you
   * first have `cost` DON!!). Hypergeometric over the assumptions in
   * {@link OnCurveStat.assumptions}.
   */
  onCurveChance: number;
}

export interface OnCurveStat {
  rows: OnCurveRow[];
  /** Human-readable statement of the draw model, surfaced in the UI as a note. */
  assumptions: string;
}

export interface CounterStat {
  /** counterValue (e.g. 1000, 2000) -> copy-weighted card count. 0 == no counter. */
  distribution: CountBucket[];
  /** Copy-weighted number of cards providing a defensive Counter value ( > 0 ). */
  counterCards: number;
  /** Sum of counter * quantity across the deck (total defensive power on hand). */
  totalCounterPower: number;
  /** Copy-weighted count of cards with a [Counter] ability detected in text (events + characters). */
  counterEventCards: number;
  /** Heuristic: extra counter power from [Counter] event text (e.g. "+2000"). Marked approximate. */
  estimatedEventCounterPower: number;
}

/** One detected searcher and its computed odds. */
export interface SearcherEntry {
  cardNumber: string;
  name: string;
  quantity: number;
  /** Cards looked at from the top of the deck (the "look at N" number). */
  lookCount: number;
  /** Human description of what it searches for (e.g. "{Straw Hat Crew} type"). */
  targetDescription: string;
  /** Copy-weighted number of valid targets remaining in the 50-card deck. */
  targetPool: number;
  /**
   * P(at least one valid target within the top `lookCount` cards), computed
   * hypergeometrically over the remaining deck (searcher copy itself removed).
   */
  hitChance: number;
}

export interface SearcherStat {
  entries: SearcherEntry[];
  /**
   * Card numbers whose text looked searcher-ish but could not be parsed into a
   * (lookCount, target) pair. Surfaced as "needs ruling/parse confirmation"
   * rather than silently dropped — mirrors the project's TODO discipline.
   */
  unparsed: Array<{ cardNumber: string; name: string; reason: string }>;
}

export interface DeckStats {
  /** Copy-weighted size of the main deck used as the probability universe (should be 50 for a legal deck). */
  deckSize: number;
  costCurve: CurveStat;
  powerCurve: CurveStat;
  onCurve: OnCurveStat;
  counter: CounterStat;
  /** Tribal type tags, copy-weighted, descending by count. */
  types: CountBucket[];
  /** Battle attributes (Slash/Strike/...), copy-weighted, descending by count. */
  attributes: CountBucket[];
  /** Keyword presence counts (Rush/Blocker/Double Attack/Banish/Unblockable/Trigger), copy-weighted. */
  keywords: CountBucket[];
  searcher: SearcherStat;
}

/** Attribute display order for the Attributes section. */
export const ATTRIBUTE_ORDER: Attribute[] = ['slash', 'strike', 'ranged', 'special', 'wisdom', 'unknown'];
