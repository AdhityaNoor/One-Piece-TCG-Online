/**
 * The community config module — env in, URLs out.
 *
 * Every case re-imports the module after stubbing `import.meta.env`, because
 * the module reads env at import time (Vite inlines these at build time, so
 * reading once at module scope is the honest shape). `vi.resetModules()` is
 * therefore load-bearing: without it the second case would assert against the
 * first case's inlined values.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

type CommunityModule = typeof import('../../../config/community');

async function loadWith(env: Record<string, string | undefined>): Promise<CommunityModule> {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, '');
    else vi.stubEnv(key, value);
  }
  return import('../../../config/community');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('community config from env', () => {
  it('reads both IDs from the environment', async () => {
    const mod = await loadWith({
      VITE_DISCORD_SERVER_ID: '123456789012345678',
      VITE_KOFI_USERNAME: 'someone',
    });
    expect(mod.DISCORD_SERVER_ID).toBe('123456789012345678');
    expect(mod.KOFI_USERNAME).toBe('someone');
  });

  it('treats an unset or blank value as absent', async () => {
    // A deploy that defines the variable but leaves it empty must disable the
    // panel, not render an embed pointed at nothing.
    const mod = await loadWith({ VITE_DISCORD_SERVER_ID: '   ', VITE_KOFI_USERNAME: '' });
    expect(mod.DISCORD_SERVER_ID).toBeNull();
    expect(mod.KOFI_USERNAME).toBeNull();
  });

  it('trims surrounding whitespace', async () => {
    // Easy to introduce by hand in a .env file or a hosting dashboard field.
    const mod = await loadWith({ VITE_KOFI_USERNAME: '  someone  ' });
    expect(mod.KOFI_USERNAME).toBe('someone');
  });
});

describe('community URLs', () => {
  it('points the Discord widget at the given server in dark theme', async () => {
    const mod = await loadWith({});
    const url = new URL(mod.discordWidgetUrl('123456789012345678'));
    expect(url.origin).toBe('https://discord.com');
    expect(url.pathname).toBe('/widget');
    expect(url.searchParams.get('id')).toBe('123456789012345678');
    // Light theme would render a white panel on a dark hub.
    expect(url.searchParams.get('theme')).toBe('dark');
  });

  it("uses Ko-fi's own CDN for the button rather than a local copy", async () => {
    const mod = await loadWith({});
    const url = new URL(mod.kofiButtonImageUrl());
    expect(url.origin).toBe('https://storage.ko-fi.com');
    expect(url.pathname).toBe('/cdn/kofi3.png');
  });

  it('honours a valid button variant', async () => {
    const mod = await loadWith({ VITE_KOFI_BUTTON_VARIANT: '5' });
    expect(new URL(mod.kofiButtonImageUrl()).pathname).toBe('/cdn/kofi5.png');
  });

  it('falls back rather than shipping a 404 for an out-of-range variant', async () => {
    // Ko-fi publishes kofi1..kofi6 only; anything else is a broken image.
    for (const bad of ['0', '7', '2.5', 'red', '-1']) {
      const mod = await loadWith({ VITE_KOFI_BUTTON_VARIANT: bad });
      expect(new URL(mod.kofiButtonImageUrl()).pathname).toBe('/cdn/kofi3.png');
    }
  });

  it('escapes identifiers rather than interpolating them into the path', async () => {
    // These come from env, not user input, but a handle that silently
    // produced a different origin would be a nasty failure mode.
    const mod = await loadWith({});
    expect(new URL(mod.kofiPageUrl('a/b')).pathname).toBe('/a%2Fb');
    expect(new URL(mod.discordWidgetUrl('1&theme=light')).searchParams.get('theme')).toBe('dark');
  });
});
