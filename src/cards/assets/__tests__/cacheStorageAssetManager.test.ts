// Vitest's default environment for this project is Node (see
// matchScreenPerf.phase0.test.tsx's explicit `@vitest-environment jsdom`
// override elsewhere — that's opt-in, not the default), so `caches` is
// genuinely absent here, exactly like an older/locked-down/private-browsing
// runtime. This exercises the "Cache Storage API unavailable" degrade-path
// documented in cacheStorageAssetManager.ts's own comments: every method
// must resolve to a safe no-op/undefined/false rather than throw, so a
// missing Cache Storage API can never block a match from starting.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

// Minimal in-memory fake of the Cache Storage API (just enough of Cache +
// CacheStorage for this module's own usage: match/put/delete, open by
// name), plus a mocked global fetch — lets the "Cache Storage IS available"
// path run for real in Node, in particular get()'s Blob -> data: URL
// conversion (the exact thing that was broken as a blob: URL in
// production — see this module's top doc comment). blobToDataUrl() is
// deliberately implemented with ArrayBuffer/btoa rather than FileReader for
// exactly this reason: FileReader has no Node global, so a FileReader-based
// implementation could never be exercised by a test like this one.
class FakeCache {
  private store = new Map<string, Response>();
  async match(key: string): Promise<Response | undefined> {
    return this.store.get(key);
  }
  async put(key: string, response: Response): Promise<void> {
    this.store.set(key, response);
  }
  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }
}

describe('createCacheStorageAssetManager (Cache Storage available)', () => {
  const IMAGE_URL = 'https://example.com/OP01-001.webp';
  const IMAGE_TEXT = 'pretend-this-is-webp-bytes';
  const IMAGE_BYTES = new TextEncoder().encode(IMAGE_TEXT);
  let fakeCache: FakeCache;
  let originalCaches: unknown;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    fakeCache = new FakeCache();
    originalCaches = (globalThis as unknown as { caches?: unknown }).caches;
    originalFetch = globalThis.fetch;
    (globalThis as unknown as { caches: unknown }).caches = {
      open: async () => fakeCache,
    };
    globalThis.fetch = vi.fn(async () => new Response(IMAGE_BYTES, { status: 200, headers: { 'Content-Type': 'image/webp' } })) as unknown as typeof fetch;
  });

  afterEach(() => {
    (globalThis as unknown as { caches: unknown }).caches = originalCaches;
    globalThis.fetch = originalFetch;
  });

  it('put() fetches and stores the asset, get() returns a data: URL that decodes back to the original bytes', async () => {
    const manager = createCacheStorageAssetManager();
    await manager.put(IMAGE_URL, IMAGE_URL);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const dataUrl = await manager.get(IMAGE_URL);
    expect(dataUrl).toMatch(/^data:image\/webp;base64,/);

    // Decode back to text and compare strings rather than comparing
    // Uint8Array instances via toEqual() — a prior version of this
    // assertion (`expect(decoded).toEqual(IMAGE_BYTES)`) failed locally
    // with "Compared values have no visual difference", a known
    // Vitest/chai symptom of comparing two typed arrays that hold identical
    // bytes but differ in constructor/realm identity (environment-specific,
    // not a real bug — see cacheStorageAssetManager.ts's responseToDataUrl
    // doc comment for the related Response.arrayBuffer() fix). Comparing
    // plain strings sidesteps that entirely while still proving the
    // round-trip is byte-for-byte correct.
    const base64 = (dataUrl as string).split(',')[1];
    const decodedBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const decodedText = new TextDecoder().decode(decodedBytes);
    expect(decodedText).toBe(IMAGE_TEXT);
  });

  it('put() does not re-fetch a URL that is already cached', async () => {
    const manager = createCacheStorageAssetManager();
    await manager.put(IMAGE_URL, IMAGE_URL);
    await manager.put(IMAGE_URL, IMAGE_URL);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('has() reflects whether put() has cached the key', async () => {
    const manager = createCacheStorageAssetManager();
    await expect(manager.has(IMAGE_URL)).resolves.toBe(false);
    await manager.put(IMAGE_URL, IMAGE_URL);
    await expect(manager.has(IMAGE_URL)).resolves.toBe(true);
  });

  it('evict() removes a cached entry so has()/get() report it missing again', async () => {
    const manager = createCacheStorageAssetManager();
    await manager.put(IMAGE_URL, IMAGE_URL);
    await manager.evict(IMAGE_URL);
    await expect(manager.has(IMAGE_URL)).resolves.toBe(false);
    await expect(manager.get(IMAGE_URL)).resolves.toBeUndefined();
  });

  it('put() throws (caught by the caller — see matchAssetPreload.ts) when the fetch response is not ok', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    const manager = createCacheStorageAssetManager();
    await expect(manager.put('https://example.com/missing.webp', 'https://example.com/missing.webp')).rejects.toThrow(/404/);
  });
});
