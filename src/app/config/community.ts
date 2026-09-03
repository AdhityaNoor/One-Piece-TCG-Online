/**
 * The project's outbound community links, in one place.
 *
 * WHY A CONFIG MODULE: the Discord server ID and the Ko-fi handle are the
 * only two values in this feature that are neither derivable nor stable
 * across forks. Everything else (embed URL shapes, theme parameters) is
 * mechanical. Keeping the two IDs here means a fork or a server migration is
 * a one-line change and never a hunt through JSX.
 *
 * These are PUBLIC identifiers — a Discord server ID is visible to anyone in
 * the server and the Ko-fi handle is the public page name. Neither is a
 * secret, so neither belongs in an env var; committing them keeps a static
 * Vercel build reproducible with no build-time configuration.
 *
 * `null` on either ID disables that panel entirely rather than rendering a
 * broken embed — see CommunityColumn.
 */

/**
 * Discord's numeric server ("guild") ID.
 *
 * The widget iframe ONLY works if the server has
 * Server Settings -> Widget -> "Enable Server Widget" turned on. With it off,
 * discord.com/widget returns an error page inside the frame, which is why
 * the panel keeps its own invite link independent of the embed.
 */
export const DISCORD_SERVER_ID: string | null = '1544726019280339024';

/** The public invite. Used for the panel's own link, and as the fallback if the widget cannot load. */
export const DISCORD_INVITE_URL: string | null = 'https://discord.gg/qWgnBykUW';

/** Ko-fi page handle — the path segment after ko-fi.com/. */
export const KOFI_USERNAME: string | null = 'croixshadow';

/** Brand-matched panel colours, kept next to the IDs so the two embeds theme together. */
const KOFI_BUTTON_COLOR = 'd9a441'; // op-gold, matching the rest of the hub chrome

/**
 * Discord's server widget. `theme=dark` matches the hub; the frame shows the
 * online member list and a join button rendered entirely by Discord.
 */
export function discordWidgetUrl(serverId: string): string {
  return `https://discord.com/widget?id=${encodeURIComponent(serverId)}&theme=dark`;
}

/**
 * Ko-fi's embeddable donation panel.
 *
 * Query parameters are Ko-fi's own, not ours:
 *   hidefeed=true    — drop the supporter feed, which needs far more vertical
 *                      space than this column has
 *   widget=true      — the compact embed layout rather than the full page
 *   embed=true       — tells Ko-fi it is framed, so it drops its own chrome
 *   preview=true     — renders the panel without requiring an interaction first
 */
export function kofiWidgetUrl(username: string): string {
  const params = new URLSearchParams({
    hidefeed: 'true',
    widget: 'true',
    embed: 'true',
    preview: 'true',
    'text-color': 'ffffff',
    'button-color': KOFI_BUTTON_COLOR,
  });
  return `https://ko-fi.com/${encodeURIComponent(username)}/?${params.toString()}`;
}

/** The public Ko-fi page, for the panel's own link and the no-consent fallback. */
export function kofiPageUrl(username: string): string {
  return `https://ko-fi.com/${encodeURIComponent(username)}`;
}
