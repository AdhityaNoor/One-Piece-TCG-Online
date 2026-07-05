/**
 * Client-side search/filter over an already-fetched batch of library
 * entries. Exists because optcgapi.com documents no server-side search and
 * its `/filtered/` endpoints are confirmed unreliable per-field (see
 * api/endpoints.ts module doc) — so the deck builder/card library screens
 * fetch once (per set) and filter here instead of re-querying per keystroke.
 * Pure data in, pure data out — no React, no I/O.
 */
import type { CardCategory, Color } from '../../engine/state/card';
import type { CardLibraryEntry } from './cardPrintingSummary';

export interface CardLibraryFilter {
  /** Case-insensitive substring match against card name OR card number. Empty/omitted = no text filter. */
  query?: string;
  /** OR match: entry passes if it has at least one of these colors. Empty/omitted = no color filter. */
  colors?: Color[];
  /** OR match against CardDefinition.category. Empty/omitted = no category filter. */
  categories?: CardCategory[];
  /** Case-insensitive substring match against CardDefinition.types. Empty/omitted = no type filter. */
  typeQuery?: string;
  /** Exact case-insensitive match against a normalized CardDefinition.types entry. Empty/omitted = no type filter. */
  type?: string;
  /**
   * Effect-timing facet. [Trigger] is modeled as `lifeTrigger` (2-11), not a
   * separate "effect" category. "any"/omitted = no timing filter.
   */
  timing?: 'any' | 'lifeTrigger' | 'no-lifeTrigger';
  /**
   * Inclusive cost range against CardDefinition.baseCost. Omitted bounds fall
   * back to the full COST_FILTER_MIN..MAX range. When narrowed, cards without a
   * cost (Leaders/DON!!) are excluded.
   */
  costMin?: number;
  costMax?: number;
  /**
   * Inclusive power range against CardDefinition.basePower. Omitted bounds fall
   * back to the full POWER_FILTER_MIN..MAX range. When narrowed, cards without a
   * power (Events/Stages) are excluded.
   */
  powerMin?: number;
  powerMax?: number;
}

// Slider bounds for the cost/power facet filters (shared by UI + filtering).
export const COST_FILTER_MIN = 1;
export const COST_FILTER_MAX = 10;
export const POWER_FILTER_MIN = 0;
export const POWER_FILTER_MAX = 14000;
export const POWER_FILTER_STEP = 1000;

export function normalizeTypeTags(types: string[]): string[] {
  return types
    .flatMap((type) => type.split(/[\/,]+/))
    .map((type) => type.trim())
    .filter(Boolean);
}

export function filterCardLibraryEntries(entries: CardLibraryEntry[], filter: CardLibraryFilter): CardLibraryEntry[] {
  const query = filter.query?.trim().toLowerCase();
  const colors = filter.colors && filter.colors.length > 0 ? filter.colors : undefined;
  const categories = filter.categories && filter.categories.length > 0 ? filter.categories : undefined;
  const typeQuery = filter.typeQuery?.trim().toLowerCase();
  const type = filter.type?.trim().toLowerCase();
  const timing = filter.timing && filter.timing !== 'any' ? filter.timing : undefined;

  const costMin = filter.costMin ?? COST_FILTER_MIN;
  const costMax = filter.costMax ?? COST_FILTER_MAX;
  const costActive = costMin > COST_FILTER_MIN || costMax < COST_FILTER_MAX;
  const powerMin = filter.powerMin ?? POWER_FILTER_MIN;
  const powerMax = filter.powerMax ?? POWER_FILTER_MAX;
  const powerActive = powerMin > POWER_FILTER_MIN || powerMax < POWER_FILTER_MAX;

  return entries.filter((entry) => {
    const normalizedTypes = normalizeTypeTags(entry.definition.types);
    if (query) {
      const matchesName = entry.definition.name.toLowerCase().includes(query);
      const matchesNumber = entry.cardNumber.toLowerCase().includes(query);
      if (!matchesName && !matchesNumber) return false;
    }
    if (colors && !entry.definition.colors.some((c) => colors.includes(c))) return false;
    if (categories && !categories.includes(entry.definition.category)) return false;
    if (typeQuery && !normalizedTypes.some((cardType) => cardType.toLowerCase().includes(typeQuery))) return false;
    if (type && !normalizedTypes.some((cardType) => cardType.toLowerCase() === type)) return false;
    if (timing === 'lifeTrigger' && !entry.definition.hasTrigger) return false;
    if (timing === 'no-lifeTrigger' && entry.definition.hasTrigger) return false;
    if (costActive) {
      const cost = entry.definition.baseCost;
      if (cost === undefined || cost < costMin || cost > costMax) return false;
    }
    if (powerActive) {
      const power = entry.definition.basePower;
      if (power === undefined || power < powerMin || power > powerMax) return false;
    }
    return true;
  });
}
