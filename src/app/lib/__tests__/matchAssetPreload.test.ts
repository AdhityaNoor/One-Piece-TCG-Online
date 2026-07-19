// Phase 2 (match asset preload) unit coverage. Runs against a fake
// in-memory AssetCacheManager — no real Cache Storage / fetch / browser
// involved — so this exercises preloadMatchAssets()'s own orchestration
// logic (dedup-by-url, progress reporting, per-asset fault tolerance) in
// isolation from the real cacheStorageAssetManager.ts implementation,
// which needs a browser (see cacheStorageAssetManager.test.ts for that
// module's own "no caches global" degrade-safely coverage).
import { describe, expect, it, vi } from 'vitest';
import { preloadMatchAssets, revokeMatchAssetBlobUrls } from '../matchAssetPreload';
import type { AssetCacheManager } from '../../../cards/assets/assetCache';

function createFakeManager(): { manager: AssetCacheManager; putCalls: () => number } {
  const store = new Map<string, string>();
  let putCalls = 0;
  const manager: AssetCacheManager = {
    async has(key) {
      return store.has(key);
    },
    async get(key) {
      return store.get(key);
    },
    async put(key, remoteUrl) {
      putCalls += 1;
      if (remoteUrl.includes('broken')) {
        throw new Error('simulated fetch failure');
      }
      // A plain marker string stands in for whatever "local, already-cached"
      // reference the real AssetCacheManager hands back (a data: URL in
      // production — see cacheStorageAssetManager.ts). This orchestration
      // logic (preloadMatchAssets itself) treats it as an opaque string, so
      // the fake doesn't need to produce a real data: URL to exercise it.
      store.set(key, `cached:${key}`);
    },
    async evict(key) {
      store.delete(key);
    },
  };
  return { manager, putCalls: () => putCalls };
}

const IMAGES = {
  leaderA: 'https://example.com/leaderA.webp',
  charA1: 'https://example.com/charA1.webp',
  charA2: 'https://example.com/charA1.webp', // same URL as charA1 -- must dedup
  charBroken: 'https://example.com/broken.webp',
  genericDon: null,
} satisfies Record<string, string | null>;

describe('preloadMatchAssets', () => {
  it('fetches each distinct URL exactly once, even when multiple cardDefinitionIds share it', async () => {
    const { manager, putCalls } = createFakeManager();
    await preloadMatchAssets(IMAGES, manager);
    expect(putCalls()).toBe(3); // leaderA, charA1(==charA2), charBroken -- 3 distinct urls
  });

  it('resolves successfully-cached entries to their local cached reference, and shares it across duplicate-URL entries', async () => {
    const { manager } = createFakeManager();
    const result = await preloadMatchAssets(IMAGES, manager);
    expect(result.images.leaderA).toBe('cached:https://example.com/leaderA.webp');
    expect(result.images.charA1).toBe(result.images.charA2);
  });

  it('falls back to the original remote URL (never drops it) when caching a URL fails', async () => {
    const { manager } = createFakeManager();
    const result = await preloadMatchAssets(IMAGES, manager);
    expect(result.images.charBroken).toBe('https://example.com/broken.webp');
    expect(result.failedUrls).toContain('https://example.com/broken.webp');
  });

  it('passes null straight through unchanged', async () => {
    const { manager } = createFakeManager();
    const result = await preloadMatchAssets(IMAGES, manager);
    expect(result.images.genericDon).toBeNull();
  });

  it('reports progress starting at 0/distinctTotal and ending at distinctTotal/distinctTotal', async () => {
    const { manager } = createFakeManager();
    const samples: { loaded: number; total: number }[] = [];
    await preloadMatchAssets(IMAGES, manager, (p) => samples.push({ ...p }));
    expect(samples[0]).toEqual({ loaded: 0, total: 3 });
    expect(samples[samples.length - 1].loaded).toBe(3);
    expect(samples.every((s) => s.total === 3)).toBe(true);
  });

  it('resolves immediately with an empty result for a deck with no art at all', async () => {
    const { manager } = createFakeManager();
    const result = await preloadMatchAssets({}, manager);
    expect(result.images).toEqual({});
    expect(result.failedUrls).toEqual([]);
  });
});

// Dormant in the current data: URL design (preloadMatchAssets() no longer
// produces blob: URLs — see matchAssetPreload.ts's top doc comment) but
// kept as a defensive utility; this coverage stays as a contract test for
// if/when it's ever needed again.
describe('revokeMatchAssetBlobUrls', () => {
  it('revokes every blob: URL in the map and leaves non-blob URLs (fallback originals) untouched', () => {
    const revoked: string[] = [];
    const originalRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = vi.fn((url: string) => revoked.push(url));
    try {
      revokeMatchAssetBlobUrls({
        a: 'blob:local/1',
        b: 'blob:local/2',
        c: 'https://example.com/not-cached.webp',
        d: null,
      });
      expect(revoked).toEqual(['blob:local/1', 'blob:local/2']);
    } finally {
      URL.revokeObjectURL = originalRevoke;
    }
  });
});
