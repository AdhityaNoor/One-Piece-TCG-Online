/**
 * TTL + in-flight-dedupe cache wrapping the raw client.
 *
 * Why this exists: optcgapi.com explicitly asks consumers to keep call
 * volume low (it's a self-funded VPS), and several endpoints return their
 * entire table unpaginated (tens of thousands of characters). Without a
 * cache layer, a deck builder's live search box would re-fetch/re-filter
 * the same multi-hundred-row payload on every keystroke.
 *
 * Design choice: the store is an INJECTED interface (`CacheStore`), not a
 * hardcoded Map. Phase 1 ships an in-memory implementation; this is the seam
 * project requirement #9 ("support future asset download/caching") and #10
 * ("support future offline/local deck loading") plug into later — swap in an
 * IndexedDB/localStorage-backed CacheStore without touching any caller.
 */

export interface CacheStore {
  get(key: string): { value: unknown; storedAt: number } | undefined;
  set(key: string, value: unknown, storedAt: number): void;
  delete(key: string): void;
}

/** Phase 1 implementation. Lost on page reload — acceptable for a card-library preview cache; NOT used for saved decks, which are persisted separately (see /src/cards/decks). */
export class InMemoryCacheStore implements CacheStore {
  private map = new Map<string, { value: unknown; storedAt: number }>();

  get(key: string) {
    return this.map.get(key);
  }
  set(key: string, value: unknown, storedAt: number): void {
    this.map.set(key, { value, storedAt });
  }
  delete(key: string): void {
    this.map.delete(key);
  }
}

export interface CachedFetchOptions {
  /** How long a cached value is served without re-fetching. */
  ttlMs: number;
  /** Clock seam for deterministic tests; defaults to Date.now. */
  now?: () => number;
}

/**
 * In-flight de-dupe map, module-scoped per CacheStore instance via closure in
 * withCache — multiple simultaneous callers for the same key while a fetch is
 * already pending share the one underlying request instead of firing N.
 */
const inFlight = new WeakMap<CacheStore, Map<string, Promise<unknown>>>();

/**
 * Cache-or-fetch for a single key. On loader failure with a stale cached
 * value present, serves the stale value (caller should surface a
 * "showing cached data, refresh failed" hint) rather than hard-failing —
 * this is the resilience behavior the card-library preview needs so a
 * transient optcgapi.com hiccup doesn't blank out the deck builder.
 */
export async function withCache<T>(
  store: CacheStore,
  key: string,
  loader: () => Promise<{ ok: true; data: T } | { ok: false; error: unknown }>,
  options: CachedFetchOptions,
): Promise<{ ok: true; data: T; stale: boolean } | { ok: false; error: unknown }> {
  const now = options.now ?? Date.now;
  const cached = store.get(key);
  const isFresh = cached !== undefined && now() - cached.storedAt < options.ttlMs;

  if (isFresh) {
    return { ok: true, data: cached.value as T, stale: false };
  }

  let pendingForStore = inFlight.get(store);
  if (!pendingForStore) {
    pendingForStore = new Map();
    inFlight.set(store, pendingForStore);
  }

  let pending = pendingForStore.get(key) as Promise<{ ok: true; data: T } | { ok: false; error: unknown }> | undefined;
  if (!pending) {
    pending = loader().finally(() => pendingForStore!.delete(key));
    pendingForStore.set(key, pending);
  }

  const result = await pending;

  if (result.ok) {
    store.set(key, result.data, now());
    return { ok: true, data: result.data, stale: false };
  }

  if (cached !== undefined) {
    return { ok: true, data: cached.value as T, stale: true };
  }

  return result;
}
