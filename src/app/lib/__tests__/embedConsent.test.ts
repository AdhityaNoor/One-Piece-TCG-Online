/**
 * The consent store behind the Discord / Ko-fi embeds.
 *
 * The load-bearing property is the DEFAULT: anything other than a recorded
 * "1" must read as "no consent", because the privacy policy's position is
 * that no third-party request is made for a feature the player did not ask
 * for. A storage backend that throws must therefore fail CLOSED, not open.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  embedConsentKey,
  grantEmbedConsent,
  hasEmbedConsent,
  revokeEmbedConsent,
} from '../embedConsent';

function stubStorage(impl: Partial<Storage>): void {
  vi.stubGlobal('window', { localStorage: impl });
}

function memoryStorage(seed: Record<string, string> = {}) {
  const store = { ...seed };
  return {
    store,
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  } as unknown as Storage & { store: Record<string, string> };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('embedConsent', () => {
  it('namespaces the key per provider so one consent is not the other', () => {
    expect(embedConsentKey('discord')).toBe('optcg.embedConsent.discord');
    expect(embedConsentKey('kofi')).toBe('optcg.embedConsent.kofi');
    expect(embedConsentKey('discord')).not.toBe(embedConsentKey('kofi'));
  });

  it('defaults to no consent when nothing is stored', () => {
    stubStorage(memoryStorage());
    expect(hasEmbedConsent('discord')).toBe(false);
    expect(hasEmbedConsent('kofi')).toBe(false);
  });

  it('records and reads back consent for one provider only', () => {
    const storage = memoryStorage();
    stubStorage(storage);

    grantEmbedConsent('discord');

    expect(hasEmbedConsent('discord')).toBe(true);
    // Agreeing to the Discord member list is not agreeing to load Ko-fi.
    expect(hasEmbedConsent('kofi')).toBe(false);
  });

  it('withdraws consent', () => {
    stubStorage(memoryStorage({ 'optcg.embedConsent.kofi': '1' }));
    expect(hasEmbedConsent('kofi')).toBe(true);

    revokeEmbedConsent('kofi');

    expect(hasEmbedConsent('kofi')).toBe(false);
  });

  it('treats any value other than "1" as no consent', () => {
    stubStorage(memoryStorage({ 'optcg.embedConsent.discord': 'true' }));
    expect(hasEmbedConsent('discord')).toBe(false);
  });

  it('fails closed when storage throws on read', () => {
    stubStorage({
      getItem: () => {
        throw new Error('site data blocked');
      },
    } as unknown as Storage);

    expect(hasEmbedConsent('discord')).toBe(false);
  });

  it('does not throw when storage refuses a write', () => {
    stubStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {
        throw new Error('quota exceeded');
      },
    } as unknown as Storage);

    expect(() => grantEmbedConsent('kofi')).not.toThrow();
    expect(() => revokeEmbedConsent('kofi')).not.toThrow();
  });
});
