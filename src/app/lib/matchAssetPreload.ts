/**
 * Phase 2 match performance: front-load every card image a match will need
 * — both decks' leader + main-deck art (matchStore's
 * `cardImagesByDefinitionId`, built by buildCardImageLookup() in
 * savedDeckToSetupInput.ts) — into Cache Storage BEFORE the board mounts,
 * via a loading screen (see MatchScreen.tsx's preload gate). During the
 * match itself, board components then read already-cached `blob:` URLs
 * instead of the original remote URLs, so no image request happens
 * mid-battle regardless of network conditions.
 *
 * Deliberately generic over `AssetCacheManager` (assetCache.ts) rather than
 * importing cacheStorageAssetManager.ts directly, so this orchestration
 * logic — dedup, progress reporting, per-asset fault tolerance — stays
 * testable against an in-memory fake without touching real Cache Storage.
 */
import type { AssetCacheManager } from '../../cards/assets/assetCache';

export interface MatchAssetPreloadProgress {
  loaded: number;
  total: number;
}

export interface MatchAssetPreloadResult {
  /** cardDefinitionId -> local blob: URL (successfully cached) or the original remote URL (fetch/cache failed — falls back to normal network load) or null (card has no art). Same shape/keys as matchStore's cardImagesByDefinitionId, safe to swap in directly via applyCardImages(). */
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

  const resolvedByUrl = new Map<string, string>(); // url -> local blob: URL
  const failedUrls: string[] = [];

  await Promise.all(
    distinctUrls.map(async (url) => {
      try {
        await cacheManager.put(url, url);
        const local = await cacheManager.get(url);
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

/** Revokes every `blob:` URL produced by a previous preloadMatchAssets() call. Safe to call with URLs that aren't blob: URLs (e.g. fallback originals) — those are left untouched. MatchScreen.tsx calls this at the START of each new preload run, since it never actually unmounts on navigation (see its `if (!isMatchScreen) return null` pattern) — component-unmount cleanup would never fire. */
export function revokeMatchAssetBlobUrls(images: Record<string, string | null>): void {
  for (const url of Object.values(images)) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
