/**
 * The ONE place app code is allowed to touch real browser globals.
 *
 * Every module under /src/cards takes its I/O dependencies as injected
 * parameters (FetchLike, StorageLike, CacheStore, a clock) so that layer
 * stays testable under plain Vitest with zero DOM. This file closes that
 * seam for the real app by binding those interfaces to `window.fetch` and
 * `window.localStorage` exactly once. Stores (/src/app/store) import from
 * here, never from `window` directly — tests of the stores can swap this
 * module's exports for fakes without touching the cards layer at all.
 */
import type { FetchLike } from '../../cards/api/client';
import { InMemoryCacheStore, type CacheStore } from '../../cards/api/cache';
import { createLocalStorageDeckStore, type DeckStore, type StorageLike } from '../../cards/decks/deckStorage';

export const browserFetch: FetchLike = (url) => fetch(url);

export const browserStorage: StorageLike = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};

/**
 * One in-memory cache shared by every card-library lookup for the lifetime
 * of the tab — see api/cache.ts module doc for why this exists (the API
 * owner explicitly asks consumers to keep call volume low). Lost on reload;
 * that's fine for a browsing cache. Saved decks never read from this — they
 * are fully self-contained snapshots (see /src/cards/decks/savedDeck.ts).
 */
export const cardLibraryCache: CacheStore = new InMemoryCacheStore();

/** How long a fetched set's cards are served from cardLibraryCache before a re-fetch is attempted. */
export const CARD_LIBRARY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — card data changes only on new-set releases.

export const deckStore: DeckStore = createLocalStorageDeckStore(browserStorage);

export const nowIso = (): string => new Date().toISOString();

/** Local-only id generator for new SavedDeck.deckId values — just a local primary key. */
export const generateDeckId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `deck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
