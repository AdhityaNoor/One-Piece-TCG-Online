/**
 * The community rail's markup contract.
 *
 * The config module is MOCKED rather than read for real. Since the IDs moved
 * to env, a test that imported the real config would assert nothing on a
 * machine with no `.env.local` — every case would early-return on a null ID
 * and the suite would pass green while checking nothing. Fixed values make
 * the assertions mean the same thing in CI, on a fork, and here.
 *
 * Rendered with `renderToStaticMarkup` (the pattern established by
 * markdownDocument.test.tsx) rather than a DOM testing library: this
 * component is pure — config in, markup out, no state and no effects — so
 * static markup is the whole behaviour, and it keeps the test in the
 * project's default `node` Vitest environment with no new dependency.
 *
 * What is asserted is what has regressed before and what the type checker
 * cannot see: Discord's frame must keep `allow-same-origin` (without it the
 * widget renders as a blank white box), must be mounted raw with nothing
 * wrapped around it, and Ko-fi must stay a LINK. Ko-fi's embeddable form is
 * ~660px tall and stacking it under Discord is what forced the rail to
 * scroll; turning the button back into an iframe would quietly bring that
 * back.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const SERVER_ID = '123456789012345678';
const KOFI_HANDLE = 'someone';

vi.mock('../../../config/community', () => ({
  DISCORD_SERVER_ID: SERVER_ID,
  DISCORD_INVITE_URL: 'https://discord.gg/testinvite',
  KOFI_USERNAME: KOFI_HANDLE,
  discordWidgetUrl: (id: string) => `https://discord.com/widget?id=${id}&theme=dark`,
  kofiButtonImageUrl: () => 'https://storage.ko-fi.com/cdn/kofi3.png?v=6',
  kofiPageUrl: (name: string) => `https://ko-fi.com/${name}`,
}));

const { CommunityColumn, HAS_COMMUNITY_PANELS } = await import('../CommunityColumn');

const html = () => renderToStaticMarkup(<CommunityColumn />);

describe('CommunityColumn', () => {
  it('embeds Discord and only Discord', () => {
    // Exactly one frame in the rail. Ko-fi is a link, by design.
    expect(html().match(/<iframe/g)?.length ?? 0).toBe(1);
    expect(HAS_COMMUNITY_PANELS).toBe(true);
  });

  it('points the Discord frame at the vendor, not at a local proxy', () => {
    expect(html()).toContain(`https://discord.com/widget?id=${SERVER_ID}&amp;theme=dark`);
  });

  it("keeps allow-same-origin in Discord's sandbox", () => {
    // The one attribute this integration cannot lose. Without it Discord's
    // widget cannot boot and renders as a blank white box — which is exactly
    // how this shipped once already.
    const sandbox = /sandbox="([^"]*)"/.exec(html())?.[1] ?? '';
    expect(sandbox.split(/\s+/)).toContain('allow-same-origin');
    expect(sandbox.split(/\s+/)).toContain('allow-scripts');
    // Without this the widget's join link opens into a sandboxed dead end.
    expect(sandbox.split(/\s+/)).toContain('allow-popups-to-escape-sandbox');
  });

  it('wraps the Discord frame in no chrome of its own', () => {
    // Discord's widget already ships a header, a member list and a join
    // button. A frame around a frame is what this component exists to avoid,
    // so no visible border may appear on anything in the rail.
    const markup = html();
    expect(markup).not.toMatch(/class="[^"]*\bborder(?!-0)\b/);
    expect(markup).not.toContain('<h3');
  });

  it("renders Ko-fi as a link carrying Ko-fi's own button asset", () => {
    const markup = html();
    expect(markup).toContain(`href="https://ko-fi.com/${KOFI_HANDLE}"`);
    expect(markup).toContain('storage.ko-fi.com/cdn/kofi3.png');
    // A second iframe here would reintroduce the ~660px form that made the
    // rail scroll.
    expect(markup.match(/<iframe/g)?.length).toBe(1);
  });

  it('gives the Ko-fi image real alt text so a CDN failure still leaves a usable link', () => {
    // The image is the link's only label. An empty decorative alt would leave
    // a blank strip and an unlabelled link if storage.ko-fi.com ever failed.
    expect(html()).toMatch(/alt="[^"]+Ko-fi"/);
  });

  it('opens outbound links safely in a new tab', () => {
    const markup = html();
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('noopener');
  });
});
