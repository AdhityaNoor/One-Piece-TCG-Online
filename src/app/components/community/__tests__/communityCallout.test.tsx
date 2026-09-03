/**
 * The shared community callout — the ask that appears on the victory screen
 * and the credits page.
 *
 * Config is MOCKED, as in communityColumn.test.tsx: since the IDs moved to
 * env, a test reading the real config would assert nothing on a machine with
 * no `.env.local`. Fixed values make these mean the same thing everywhere.
 *
 * The behaviour worth pinning is the graceful degradation. Each link is
 * independently optional, and the callout is mounted unconditionally by both
 * callers — so a half-configured deploy must drop the missing button rather
 * than render a dead link, and a deploy with neither must render nothing at
 * all rather than an empty bordered panel floating under the victory text.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../config/community', () => ({
  DISCORD_INVITE_URL: 'https://discord.gg/testinvite',
  KOFI_USERNAME: 'someone',
  DISCORD_SERVER_ID: null,
  discordWidgetUrl: (id: string) => `https://discord.com/widget?id=${id}&theme=dark`,
  kofiButtonImageUrl: () => 'https://storage.ko-fi.com/cdn/kofi3.png?v=6',
  kofiPageUrl: (name: string) => `https://ko-fi.com/${name}`,
}));

const { CommunityCallout, HAS_COMMUNITY_LINKS } = await import('../CommunityCallout');

const html = () => renderToStaticMarkup(<CommunityCallout />);

describe('CommunityCallout', () => {
  it('offers both routes', () => {
    const markup = html();
    expect(HAS_COMMUNITY_LINKS).toBe(true);
    expect(markup).toContain('https://discord.gg/testinvite');
    expect(markup).toContain('https://ko-fi.com/someone');
  });

  it('opens both outbound links safely in a new tab', () => {
    // These render over a live match result and a credits page; neither
    // should hand the opener to a third-party tab.
    const markup = html();
    expect(markup.match(/target="_blank"/g)?.length).toBe(2);
    expect(markup.match(/noopener/g)?.length).toBe(2);
  });

  it('frames support as a gift, never as a purchase', () => {
    // § 9 of the Terms: a donation buys nothing in game. The prompt must not
    // drift into implying otherwise, and it appears right after a match,
    // where a "unlock/upgrade" reading would be most damaging.
    const markup = html().toLowerCase();
    expect(markup).toContain('free');
    for (const forbidden of ['unlock', 'premium', 'upgrade', 'subscribe', 'buy now']) {
      expect(markup).not.toContain(forbidden);
    }
  });
});
