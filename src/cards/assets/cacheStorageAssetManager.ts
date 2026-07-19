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
 * `get()` returns a `data:` URL (base64-inlined image bytes), NOT a `blob:`
 * object URL. This was a deliberate correction after `blob:` URLs broke in
 * production: this module hands the resolved URL to a caller
 * (matchAssetPreload.ts) that stores it in Zustand state to be read by React
 * far LATER — a card's `<img>` might not actually render until it's drawn or
 * played, and `CardImage.tsx` uses `loading="lazy"`, so the browser may not
 * even attempt to load it until well after this function returns. `blob:`
 * URLs are only reliably valid for immediate, synchronous use in the same
 * task that created them (or until explicitly revoked) — storing one for
 * indeterminate later use, across renders/lazy-load timing, is a known-fragile
 * pattern (observed in production: well-formed blob: URLs that 404/fail once
 * actually requested). `data:` URLs have no such lifecycle — they're inert,
 * self-contained strings, safe to store and reuse for as long as JS still
 * holds a reference, with zero cleanup/revocation required. The tradeoff is
 * ~33% larger in-memory size (base64 overhead) versus a blob reference; for
 * card-art-sized images (tens to ~150KB) this is an acceptable, worthwhile
 * trade for correctness.
 */
import type { AssetCacheManager } from './assetCache';

// Chunk size for building the base64 binary string below — well under any
// engine's max call-stack/argument-list size for String.fromCharCode(...),
// so this stays correct for full-resolution card art (tens to ~150KB),
// not just small test fixtures.
const BASE64_CHUNK_SIZE = 0x8000;

/**
 * Blob -> data: URL conversion via ArrayBuffer + btoa, deliberately NOT
 * FileReader.readAsDataURL() — FileReader is browser-only (no global in
 * Node), so using it here would make this function untestable outside a
 * real browser. ArrayBuffer/Uint8Array/btoa are all standard and available
 * in both Node and every browser, so the exact same code path that runs in
 * production can run in this project's Node-environment Vitest suite too.
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_SIZE));
  }
  const base64 = btoa(binary);
  return `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
}

// v2: a production bug (matchAssetPreload.ts fetching the raw root-relative
// stored path instead of resolving it through assetUrl.ts's resolveAssetUrl
// first) had every v1 entry silently cache a 0-byte text/html response
// instead of the actual image. Bumping the cache name guarantees a clean
// slate rather than leaving those bad entries orphaned in users' browsers
// (matched by nothing anymore anyway, since the fix also changes the cache
// key from the raw path to the resolved absolute URL — but a name bump is
// a clearer, one-time fresh start than relying on that side effect alone).
const CACHE_NAME = 'op-tcg-card-images-v2';

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
      return blobToDataUrl(blob);
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
      // Defensive guard against exactly the production bug this module
      // already caused once (see the CACHE_NAME v2 comment above): a
      // misrouted fetch (wrong origin, SPA fallback route, etc.) can return
      // a 200 OK with the WRONG body — e.g. an HTML page instead of an
      // image — which response.ok alone can't catch. Refuse to cache
      // anything that isn't actually image bytes, so a future routing
      // mistake fails loudly (falls back to the original URL, degrading
      // gracefully) instead of silently caching garbage that renders as a
      // permanently blank card.
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Refusing to cache non-image response for ${remoteUrl} (Content-Type: ${contentType || 'unknown'})`);
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
