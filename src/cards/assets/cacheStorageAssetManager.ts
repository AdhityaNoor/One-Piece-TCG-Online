/**
 * Real Phase-2 implementation of assetCache.ts's `AssetCacheManager`, using
 * the browser's Cache Storage API (the same API service workers use for
 * offline assets — not `localStorage`, which is synchronous, string-only,
 * and capped at ~5-10MB, a bad fit for image blobs).
 *
 * This implementation is used by the MATCH-PRELOAD path (matchAssetPreload.ts
 * -> MatchScreen.tsx), which caches by a deck snapshot's `imageUrl` — NOT by
 * the card-library/deck-builder browsing path's `card_image_id` (see
 * buildAssetRef() above). Both are valid cache keys for the same underlying
 * printing-level art; this module treats `cacheKey` as an opaque string and
 * doesn't care which convention a given caller uses, as long as that caller
 * is consistent with itself.
 *
 * `get()` returns a `blob:` object URL, not the cached Response's own URL —
 * substituting that in place of the original remote URL in
 * `cardImagesByDefinitionId` (see matchAssetPreload.ts) is what actually
 * guarantees zero network involvement during a match, regardless of
 * whatever HTTP cache-control headers the asset host does or doesn't send.
 * Callers own revoking these via `URL.revokeObjectURL` once done with them
 * (MatchScreen.tsx tracks and revokes its own batch on match teardown) —
 * this module never revokes on its own, since it has no way to know when a
 * caller is finished with a URL it handed out.
 */
import type { AssetCacheManager } from './assetCache';

const CACHE_NAME = 'op-tcg-card-images-v1';

/** `caches` is absent in Node/test environments and some older/locked-down browsers — every method degrades to "not cached" rather than throwing, so a missing Cache Storage API never blocks a match from starting. */
function isCacheStorageAvailable(): boolean {
  return typeof caches !== 'undefined';
}

async function openCache(): Promise<Cache | null> {
  if (!isCacheStorageAvailable()) return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    // Some browsers throw opening Cache Storage under strict private-
    // browsing modes — treat exactly like "unavailable".
    return null;
  }
}

export function createCacheStorageAssetManager(): AssetCacheManager {
  return {
    async has(cacheKey) {
      const cache = await openCache();
      if (!cache) return false;
      const match = await cache.match(cacheKey);
      return match !== undefined;
    },

    async get(cacheKey) {
      const cache = await openCache();
      if (!cache) return undefined;
      const match = await cache.match(cacheKey);
      if (!match) return undefined;
      const blob = await match.blob();
      return URL.createObjectURL(blob);
    },

    async put(cacheKey, remoteUrl) {
      const cache = await openCache();
      if (!cache) return;
      const existing = await cache.match(cacheKey);
      if (existing) return; // already cached from a previous match/session — nothing to fetch
      const response = await fetch(remoteUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch asset for caching: ${remoteUrl} (HTTP ${response.status})`);
      }
      await cache.put(cacheKey, response);
    },

    async evict(cacheKey) {
      const cache = await openCache();
      if (!cache) return;
      await cache.delete(cacheKey);
    },
  };
}
