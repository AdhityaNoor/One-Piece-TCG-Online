/**
 * Phase 2 match performance: front-load every card image a match will need
 * — both decks' leader + main-deck art (matchStore's
 * `cardImagesByDefinitionId`, built by buildCardImageLookup() in
 * savedDeckToSetupInput.ts) — into Cache Storage BEFORE the board mounts,
 * via a loading screen (see MatchScreen.tsx's preload gate). During the
 * match itself, board components then read already-cached `data:` URLs
 * instead of the original remote URLs, so no image request happens
 * mid-battle regardless of network conditions.
 *
 * Resolved URLs are `data:` URLs (base64-inlined bytes), not `blob:` object
 * URLs — see cacheStorageAssetManager.ts's doc comment for why: a `blob:`
 * URL stored in Zustand state to be read by React much later (a card's art
 * may not even attempt to load until it's drawn/played, and CardImage.tsx
 * uses `loading="lazy"` on top of that) turned out to be fragile in
 * production — well-formed blob: URLs that failed once actually requested.
 * `data:` URLs are inert, self-contained strings with no such lifecycle, so
 * this "resolve once, use whenever" pattern is safe with them.
 *
 * Deliberately generic over `AssetCacheManager` (assetCache.ts) rather than
 * importing cacheStorageAssetManager.ts directly, so this orchestration
 * logic — dedup, progress reporting, per-asset fault tolerance — stays
 * testable against an in-memory fake without touching real Cache Storage.
 *
 * `cardImagesByDefinitionId` values are root-relative paths (e.g.
 * "/card-images/OP16/OP16-038_EN.webp"), NOT fetchable URLs on their own —
 * see assetUrl.ts's doc comment: only `resolveAssetUrl()` knows whether that
 * should resolve against the current origin (local dev) or the production
 * Vercel Blob CDN origin (`VITE_ASSET_BASE_URL`). This module fetches
 * through `resolveAssetUrl()` for exactly that reason — an earlier version
 * called `fetch()` on the raw stored path directly, which in production
 * resolved against the APP's own origin instead of the Blob CDN (that path
 * is deliberately excluded from the app's own deployment bundle via
 * .vercelignore), silently "succeeding" with a 0-byte text/html response
 * for every single card and caching THAT as if it were the image.
 */
import type { AssetCacheManager } from '../../cards/assets/assetCache';
import { resolveAssetUrl } from './assetUrl';

export interface MatchAssetPreloadProgress {
  loaded: number;
  total: number;
}

export interface MatchAssetPreloadResult {
  /** cardDefinitionId -> local data: URL (successfully cached) or the original remote URL (fetch/cache failed — falls back to normal network load) or null (card has no art). Same shape/keys as matchStore's cardImagesByDefinitionId, safe to swap in directly via applyCardImages(). */
  images: Record<string, string | null>;
  /** Remote URLs that failed to fetch/cache, for diagnostics — callers are not required to surface these; the returned `images` map already degrades those entries to their original remote URL. */
  failedUrls: string[];
}

/**
 * Fetches and caches every distinct non-null URL in `images` at most once
 * (leader art, for instance, is frequently reused across many decks/cards
 * pointing at the same URL — no reason to fetch it twice), reporting
 * progress per DISTINCT url resolved, not per cardDefinitionId, so the
 * loading screen's progress bar reflects real network/cache work done.
 *
 * One failed asset never aborts the batch — a single broken/slow image
 * host must not block the whole match from starting. Failures degrade to
 * "use the original remote URL" (i.e. Phase 1 behavior: normal <img> load,
 * browser HTTP cache best-effort) for that one asset only.
 */
export async function preloadMatchAssets(
  images: Record<string, string | null>,
  cacheManager: AssetCacheManager,
  onProgress?: (progress: MatchAssetPreloadProgress) => void,
): Promise<MatchAssetPreloadResult> {
  const distinctUrls = Array.from(
    new Set(Object.values(images).filter((url): url is string => typeof url === 'string' && url.length > 0)),
  );

  const total = distinctUrls.length;
  let loaded = 0;
  onProgress?.({ loaded, total });

  const resolvedByUrl = new Map<string, string>(); // original (stored) url -> local data: URL
  const failedUrls: string[] = [];

  await Promise.all(
    distinctUrls.map(async (url) => {
      try {
        // `url` is the raw stored value (root-relative in production — see
        // this file's top comment); `fetchUrl` is what's actually reachable.
        // The cache is keyed by fetchUrl too, so caching stays consistent
        // with whatever origin actually served the bytes.
        const fetchUrl = resolveAssetUrl(url);
        if (!fetchUrl) {
          failedUrls.push(url);
          return;
        }
        await cacheManager.put(fetchUrl, fetchUrl);
        const local = await cacheManager.get(fetchUrl);
        if (local) {
          resolvedByUrl.set(url, local);
        } else {
          // put() succeeded but get() came back empty — treat as a failure
          // rather than silently falling through to the fallback branch
          // below with no record of why.
          failedUrls.push(url);
        }
      } catch {
        failedUrls.push(url);
      } finally {
        loaded += 1;
        onProgress?.({ loaded, total });
      }
    }),
  );

  const resultImages: Record<string, string | null> = {};
  for (const [cardDefinitionId, url] of Object.entries(images)) {
    if (url === null) {
      resultImages[cardDefinitionId] = null;
      continue;
    }
    // Fall back to the original remote URL on any failure — never drop the
    // reference entirely, or the board would render a broken image instead
    // of just quietly missing the offline-cache speedup.
    resultImages[cardDefinitionId] = resolvedByUrl.get(url) ?? url;
  }

  return { images: resultImages, failedUrls };
}

/**
 * Defensive no-op in the current data: URL design (see this file's top
 * comment — preloadMatchAssets() no longer produces blob: URLs, so there is
 * nothing here for MatchScreen.tsx to call this for). Kept exported rather
 * than deleted: if any future caller of AssetCacheManager ever DOES hand out
 * a real blob: URL again (a different cache implementation, a manual
 * `URL.createObjectURL()` somewhere), this is the one place that knows how
 * to clean one up, and it's harmless to call unconditionally either way.
 */
export function revokeMatchAssetBlobUrls(images: Record<string, string | null>): void {
  for (const url of Object.values(images)) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
