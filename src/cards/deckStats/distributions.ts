/**
 * Categorical breakdowns: Types (tribal tags, 2-4), Attributes (2-5), and
 * Keyword presence (10-1/10-2 flags on CardDefinition). All copy-weighted.
 *
 * These read ONLY the already-detected flags/arrays on CardDefinition — they
 * never re-parse effect text — so they inherit exactly whatever the
 * normalization layer decided, keeping "card data as input" intact.
 */
import type { SavedDeckCardSnapshot } from '../decks/savedDeck';
import { ATTRIBUTE_ORDER, type CountBucket } from './types';

function descending(map: Map<string, number>): CountBucket[] {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/** Tribal types across the main deck; a multi-type card counts once per type. */
export function computeTypeDistribution(cards: SavedDeckCardSnapshot[]): CountBucket[] {
  const counts = new Map<string, number>();
  for (const snap of cards) {
    for (const type of snap.definition.types) {
      counts.set(type, (counts.get(type) ?? 0) + snap.quantity);
    }
  }
  return descending(counts);
}

/** Battle attributes across the main deck; ordered by the canonical attribute order. */
export function computeAttributeDistribution(cards: SavedDeckCardSnapshot[]): CountBucket[] {
  const counts = new Map<string, number>();
  for (const snap of cards) {
    for (const attribute of snap.definition.attributes ?? []) {
      counts.set(attribute, (counts.get(attribute) ?? 0) + snap.quantity);
    }
  }
  return ATTRIBUTE_ORDER.filter((attr) => counts.has(attr)).map((attr) => ({
    key: attr,
    count: counts.get(attr)!,
  }));
}

/** Keyword flags present across the main deck, copy-weighted, fixed display order. */
export function computeKeywordDistribution(cards: SavedDeckCardSnapshot[]): CountBucket[] {
  const totals: Record<string, number> = {
    Rush: 0,
    Blocker: 0,
    'Double Attack': 0,
    Banish: 0,
    Unblockable: 0,
    Trigger: 0,
  };
  for (const snap of cards) {
    const def = snap.definition;
    const qty = snap.quantity;
    if (def.hasRush) totals.Rush += qty;
    if (def.hasBlocker) totals.Blocker += qty;
    if (def.hasDoubleAttack) totals['Double Attack'] += qty;
    if (def.hasBanish) totals.Banish += qty;
    if (def.isUnblockable) totals.Unblockable += qty;
    if (def.hasTrigger) totals.Trigger += qty;
  }
  return Object.entries(totals)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, count }));
}
