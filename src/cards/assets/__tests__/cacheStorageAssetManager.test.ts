// Vitest's default environment for this project is Node (see
// matchScreenPerf.phase0.test.tsx's explicit `@vitest-environment jsdom`
// override elsewhere — that's opt-in, not the default), so `caches` is
// genuinely absent here, exactly like an older/locked-down/private-browsing
// runtime. This exercises the "Cache Storage API unavailable" degrade-path
// documented in cacheStorageAssetManager.ts's own comments: every method
// must resolve to a safe no-op/undefined/false rather than throw, so a
// missing Cache Storage API can never block a match from starting.
import { describe, expect, it } from 'vitest';
import { createCacheStorageAssetManager } from '../cacheStorageAssetManager';

describe('createCacheStorageAssetManager (Cache Storage unavailable)', () => {
  it('precondition: no `caches` global in this test environment', () => {
    expect(typeof (globalThis as unknown as { caches?: unknown }).caches).toBe('undefined');
  });

  it('has() resolves false without throwing', async () => {
    const manager = createCacheStorageAssetManager();
    await expect(manager.has('https://example.com/a.webp')).resolves.toBe(false);
  });

  it('get() resolves undefined without throwing', async () => {
    const manager = createCacheStorageAssetManager();
    await expect(manager.get('https://example.com/a.webp')).resolves.toBeUndefined();
  });

  it('put() resolves without throwing', async () => {
    const manager = createCacheStorageAssetManager();
    await expect(manager.put('https://example.com/a.webp', 'https://example.com/a.webp')).resolves.toBeUndefined();
  });

  it('evict() resolves without throwing', async () => {
    const manager = createCacheStorageAssetManager();
    await expect(manager.evict('https://example.com/a.webp')).resolves.toBeUndefined();
  });
});
