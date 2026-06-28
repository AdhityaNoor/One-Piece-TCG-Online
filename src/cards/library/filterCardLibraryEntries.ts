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
}

export function filterCardLibraryEntries(entries: CardLibraryEntry[], filter: CardLibraryFilter): CardLibraryEntry[] {
  const query = filter.query?.trim().toLowerCase();
  const colors = filter.colors && filter.colors.length > 0 ? filter.colors : undefined;
  const categories = filter.categories && filter.categories.length > 0 ? filter.categories : undefined;

  return entries.filter((entry) => {
    if (query) {
      const matchesName = entry.definition.name.toLowerCase().includes(query);
      const matchesNumber = entry.cardNumber.toLowerCase().includes(query);
      if (!matchesName && !matchesNumber) return false;
    }
    if (colors && !entry.definition.colors.some((c) => colors.includes(c))) return false;
    if (categories && !categories.includes(entry.definition.category)) return false;
    return true;
  });
}
