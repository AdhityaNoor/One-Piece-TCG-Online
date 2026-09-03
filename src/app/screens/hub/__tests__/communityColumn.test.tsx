/**
 * The community column's privacy contract, asserted on the rendered markup.
 *
 * Rendered with `renderToStaticMarkup` (the pattern established by
 * markdownDocument.test.tsx) rather than a DOM testing library. That is not
 * only a dependency choice: static markup is exactly the FIRST render, and
 * the first render is where the guarantee lives. CommunityColumn defers its
 * localStorage read to an effect precisely so the initial paint can never
 * contain a third-party frame, and a static render is the sharpest possible
 * way to prove it.
 *
 * These tests are why the URL builders live in config/community.ts as pure
 * functions: the panel is configuration-driven, and with both IDs unset (the
 * committed default) the column renders nothing at all, so the behaviour that
 * can be asserted here without live IDs is the gate itself.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { discordWidgetUrl, kofiPageUrl, kofiWidgetUrl } from '../../../config/community';
import { CommunityColumn, HAS_COMMUNITY_PANELS } from '../CommunityColumn';

describe('CommunityColumn', () => {
  it('never emits a third-party frame on the first render', () => {
    // The consent read is deferred to an effect, so even a returning player
    // who has already opted in gets a frame-free first paint. Nothing that
    // reaches the network before a click may appear here.
    const html = renderToStaticMarkup(<CommunityColumn />);
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('discord.com');
    expect(html).not.toContain('ko-fi.com');
  });

  it('renders nothing when neither panel is configured', () => {
    // The committed default. HomeTab reads the same flag to pick its grid, so
    // the two must agree or the layout reserves a column for an empty aside.
    if (!HAS_COMMUNITY_PANELS) {
      expect(renderToStaticMarkup(<CommunityColumn />)).toBe('');
    }
  });
});

describe('community embed URLs', () => {
  it('points the Discord widget at the given server in dark theme', () => {
    const url = new URL(discordWidgetUrl('123456789012345678'));
    expect(url.origin).toBe('https://discord.com');
    expect(url.pathname).toBe('/widget');
    expect(url.searchParams.get('id')).toBe('123456789012345678');
    expect(url.searchParams.get('theme')).toBe('dark');
  });

  it('builds the Ko-fi widget without its supporter feed', () => {
    const url = new URL(kofiWidgetUrl('someone'));
    expect(url.origin).toBe('https://ko-fi.com');
    expect(url.pathname).toBe('/someone/');
    expect(url.searchParams.get('widget')).toBe('true');
    expect(url.searchParams.get('embed')).toBe('true');
    // The column is ~15rem wide; the feed does not fit and would scroll.
    expect(url.searchParams.get('hidefeed')).toBe('true');
  });

  it('escapes identifiers rather than interpolating them into the path', () => {
    // These IDs are hand-edited config, not user input, but a handle that
    // silently produced a different origin would be a nasty failure mode.
    expect(new URL(kofiPageUrl('a/b')).pathname).toBe('/a%2Fb');
    expect(new URL(discordWidgetUrl('1&theme=light')).searchParams.get('theme')).toBe('dark');
  });
});
