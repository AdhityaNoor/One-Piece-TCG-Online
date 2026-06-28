/**
 * Card image asset reference + caching seam.
 *
 * Phase 1 (this milestone): images are referenced by URL only; the browser's
 * normal HTTP cache handles repeat-view performance. No blob storage, no
 * download queue — that's all Phase 2.
 *
 * Phase 2 (future, project requirements #8/#9/#10 — cacheable, downloadable,
 * usable offline): swap in a real AssetCacheManager implementation (Cache
 * Storage API / IndexedDB blobs in-browser, filesystem in a future
 * Electron-style shell) behind the SAME `AssetCacheManager` interface below,
 * with zero changes to callers — this is the same "inject an interface, ship
 * one trivial implementation now" pattern as api/cache.ts's CacheStore and
 * engine/rng's SeededRng.
 *
 * Identity note: assets are cached by PRINTING (card_image_id), never by
 * card NUMBER — a card's Parallel/SP/manga printings have genuinely
 * different art at different URLs.
 */
import type { CardPrintingDto } from '../api/types';

export type AssetStatus = 'remote' | 'cached' | 'missing';

export interface AssetRef {
  cacheKey: string; // = card_image_id
  url: string | null;
  status: AssetStatus;
}

/**
 * Builds an AssetRef for one printing. `card_image: null` is a real,
 * observed API state (several promo rows have never had an image scraped)
 * — surfaced as `status: 'missing'` so the UI can render a placeholder
 * instead of a broken <img>, never as a thrown error.
 */
export function buildAssetRef(printing: CardPrintingDto): AssetRef {
  return {
    cacheKey: printing.card_image_id,
    url: printing.card_image,
    status: printing.card_image === null ? 'missing' : 'remote',
  };
}

/**
 * Future Phase-2 contract (not implemented yet — no caller depends on this
 * today). Documented now so the Phase 1 AssetRef shape never has to change
 * shape to accommodate it later.
 */
export interface AssetCacheManager {
  has(cacheKey: string): Promise<boolean>;
  /** Returns a local, offline-usable reference (e.g. a blob: URL or file path) once downloaded. */
  get(cacheKey: string): Promise<string | undefined>;
  put(cacheKey: string, remoteUrl: string): Promise<void>;
  evict(cacheKey: string): Promise<void>;
}
