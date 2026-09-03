/**
 * The callout with nothing configured — a separate file because `vi.mock` is
 * hoisted per module graph, so one file cannot hold two different configs.
 *
 * This is the fork case: someone clones the repo, sets no env, and both
 * callers still mount the callout unconditionally. It must render nothing —
 * an empty bordered panel under the victory headline would look like a
 * loading failure.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../config/community', () => ({
  DISCORD_INVITE_URL: null,
  KOFI_USERNAME: null,
  DISCORD_SERVER_ID: null,
  discordWidgetUrl: (id: string) => `https://discord.com/widget?id=${id}&theme=dark`,
  kofiButtonImageUrl: () => 'https://storage.ko-fi.com/cdn/kofi3.png?v=6',
  kofiPageUrl: (name: string) => `https://ko-fi.com/${name}`,
}));

const { CommunityCallout, HAS_COMMUNITY_LINKS } = await import('../CommunityCallout');

describe('CommunityCallout with no links configured', () => {
  it('renders nothing at all', () => {
    expect(HAS_COMMUNITY_LINKS).toBe(false);
    expect(renderToStaticMarkup(<CommunityCallout />)).toBe('');
  });
});
