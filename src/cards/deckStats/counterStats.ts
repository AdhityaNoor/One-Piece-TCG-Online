/**
 * Counter Stats — how much defensive Counter the deck can present.
 *
 * Two sources of Counter in One Piece:
 *  1. The (Counter) value printed on a Character card (2-10) — a hard number
 *     on CardDefinition.counter. Summed exactly.
 *  2. A [Counter] ABILITY in text (10-2-x style), typically on Events and some
 *     Characters, e.g. "[Counter] +2000". The engine resolves these live; here
 *     we only want a display estimate, so we HEURISTICALLY read a "+NNNN"
 *     immediately associated with a [Counter] marker. This is clearly labelled
 *     an estimate and never fed to the engine (project rule: text is not
 *     executable logic).
 */
import type { SavedDeckCardSnapshot } from '../decks/savedDeck';
import type { CounterStat, CountBucket } from './types';

/** Pull the "+NNNN" tied to a [Counter] marker, if the text has one. Heuristic, display-only. */
export function extractCounterAbilityPower(text: string): number | null {
  if (!/\[Counter\]/i.test(text)) return null;
  // Look at the slice starting at the [Counter] marker so a "+1000" from an
  // unrelated On-Play clause earlier in the text doesn't get miscredited.
  const idx = text.search(/\[Counter\]/i);
  const tail = text.slice(idx);
  const match = tail.match(/\+\s*(\d{3,5})/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

export function computeCounterStat(cards: SavedDeckCardSnapshot[]): CounterStat {
  const distribution = new Map<number, number>();
  let counterCards = 0;
  let totalCounterPower = 0;
  let counterEventCards = 0;
  let estimatedEventCounterPower = 0;

  for (const snap of cards) {
    const def = snap.definition;
    const qty = snap.quantity;

    const value = def.counter ?? 0;
    distribution.set(value, (distribution.get(value) ?? 0) + qty);
    if (value > 0) {
      counterCards += qty;
      totalCounterPower += value * qty;
    }

    const abilityPower = extractCounterAbilityPower(def.text);
    if (abilityPower !== null) {
      counterEventCards += qty;
      estimatedEventCounterPower += abilityPower * qty;
    }
  }

  const distributionBuckets: CountBucket[] = [...distribution.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ key: String(value), count }));

  return {
    distribution: distributionBuckets,
    counterCards,
    totalCounterPower,
    counterEventCards,
    estimatedEventCounterPower,
  };
}
