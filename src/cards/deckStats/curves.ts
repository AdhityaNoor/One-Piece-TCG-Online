/**
 * Cost curve and Power curve — copy-weighted histograms over the main deck.
 *
 * Cost curve: baseCost across Characters/Events/Stages (Leader and DON!! have
 * no cost, 2-7 / 4-4-2, so they never contribute). Power curve: basePower
 * across Characters (Leader has power too but the curve metric describes the
 * deck you draw, so the Leader is excluded like on gumgum.gg — Events/Stages
 * have no power). Pure data projection; no rules logic.
 */
import type { SavedDeckCardSnapshot } from '../decks/savedDeck';
import type { CountBucket, CurveStat } from './types';

function buildCurve(
  cards: SavedDeckCardSnapshot[],
  pick: (snap: SavedDeckCardSnapshot) => number | undefined,
): CurveStat {
  const byValue = new Map<number, number>();
  let weightedSum = 0;
  let contributingCards = 0;

  for (const snap of cards) {
    const value = pick(snap);
    if (value === undefined) continue;
    const qty = snap.quantity;
    byValue.set(value, (byValue.get(value) ?? 0) + qty);
    weightedSum += value * qty;
    contributingCards += qty;
  }

  const buckets: CountBucket[] = [...byValue.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ key: String(value), count }));

  return {
    buckets,
    average: contributingCards === 0 ? 0 : weightedSum / contributingCards,
    contributingCards,
  };
}

/** Cost histogram — every card carrying a baseCost (Character/Event/Stage). */
export function computeCostCurve(cards: SavedDeckCardSnapshot[]): CurveStat {
  return buildCurve(cards, (snap) => snap.definition.baseCost);
}

/** Power histogram — Characters only (basePower present, category character). */
export function computePowerCurve(cards: SavedDeckCardSnapshot[]): CurveStat {
  return buildCurve(cards, (snap) =>
    snap.definition.category === 'character' ? snap.definition.basePower : undefined,
  );
}
