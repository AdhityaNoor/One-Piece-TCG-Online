/**
 * Persists SavedDeck objects to a key/value store. This file is pure I/O
 * plumbing — deck SHAPE, legality, and schema-migration logic all live in
 * savedDeck.ts / deckValidation.ts; this module only knows how to get bytes
 * in and out of a `StorageLike`, never inspects deck content beyond what's
 * needed to maintain the list index.
 *
 * `StorageLike` is the same "inject an interface, ship one trivial
 * implementation" seam used elsewhere in /src/cards (FetchLike in
 * api/client.ts, CacheStore in api/cache.ts). It is structurally identical
 * to the Web Storage API (window.localStorage/sessionStorage both already
 * satisfy it with zero adapter code), but staying decoupled from a real
 * `Storage` type means:
 * - tests run in plain Node with an in-memory fake, no jsdom/happy-dom needed;
 * - swapping to IndexedDB or a future backend-backed store later (project
 *   requirement: "support future offline/local deck loading") only requires
 *   a new `StorageLike`-shaped (or DeckStore-shaped) adapter, not a rewrite
 *   here.
 */
import { migrateSavedDeck, type SavedDeck } from './savedDeck';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY_PREFIX = 'optcg.deck.';
const INDEX_KEY = 'optcg.deckIndex';

/** Lightweight summary kept in the index so `list()` never needs to parse every full deck (each of which embeds full raw API rows for ~51 cards) just to render a deck-picker screen. */
export interface DeckStoreListEntry {
  deckId: string;
  name: string;
  updatedAt: string;
}

export type DeckLoadResult = { ok: true; deck: SavedDeck } | { ok: false; deckId: string; reason: string };

export interface DeckStore {
  /** Cheap summaries of every saved deck, most-recently-updated first. */
  list(): DeckStoreListEntry[];
  load(deckId: string): DeckLoadResult;
  /** Upsert — overwrites any existing deck with the same deckId. */
  save(deck: SavedDeck): void;
  remove(deckId: string): void;
}

function deckKey(deckId: string): string {
  return `${KEY_PREFIX}${deckId}`;
}

function isPlausibleIndexEntry(value: unknown): value is DeckStoreListEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).deckId === 'string' &&
    typeof (value as Record<string, unknown>).name === 'string' &&
    typeof (value as Record<string, unknown>).updatedAt === 'string'
  );
}

/** Never throws — a corrupted index degrades to "no decks listed" rather than breaking the whole app. Individual decks are still loadable by id even if the index is lost, since save() always rewrites the index from scratch on next write. */
function readIndex(storage: StorageLike): DeckStoreListEntry[] {
  const raw = storage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPlausibleIndexEntry);
  } catch {
    return [];
  }
}

function writeIndex(storage: StorageLike, index: DeckStoreListEntry[]): void {
  storage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function createLocalStorageDeckStore(storage: StorageLike): DeckStore {
  return {
    list(): DeckStoreListEntry[] {
      return [...readIndex(storage)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    load(deckId: string): DeckLoadResult {
      const raw = storage.getItem(deckKey(deckId));
      if (raw === null) {
        return { ok: false, deckId, reason: `No saved deck found for id "${deckId}".` };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { ok: false, deckId, reason: 'Saved deck data is corrupted (invalid JSON).' };
      }

      const migrated = migrateSavedDeck(parsed);
      if (!migrated) {
        return { ok: false, deckId, reason: 'Saved deck data does not match any known schema version.' };
      }
      return { ok: true, deck: migrated };
    },

    save(deck: SavedDeck): void {
      storage.setItem(deckKey(deck.deckId), JSON.stringify(deck));
      const index = readIndex(storage).filter((entry) => entry.deckId !== deck.deckId);
      index.push({ deckId: deck.deckId, name: deck.name, updatedAt: deck.updatedAt });
      writeIndex(storage, index);
    },

    remove(deckId: string): void {
      storage.removeItem(deckKey(deckId));
      writeIndex(storage, readIndex(storage).filter((entry) => entry.deckId !== deckId));
    },
  };
}
