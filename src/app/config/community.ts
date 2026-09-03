/**
 * The project's community links, read from the environment.
 *
 * WHY ENV AND NOT CONSTANTS: these identify one particular Discord server and
 * one particular Ko-fi page, so a fork, a staging deploy or a second server
 * should not need a code change — and the repo is public, so the committed
 * source should not name a specific operator's donation page. They are not
 * secrets (a Discord server ID is visible to every member and the Ko-fi
 * handle is a public page name), but they are deployment configuration, which
 * is what env is for.
 *
 * Vite inlines `import.meta.env.VITE_*` at BUILD time, so these must be set
 * wherever the bundle is built — `.env.local` for local dev, and the hosting
 * provider's environment variables for a deployed build. A value added after
 * a build does not appear until the next build.
 *
 * An unset value disables that panel rather than rendering a broken embed —
 * see CommunityColumn, which drops the whole rail when both are unset. That
 * is deliberate: a fork with no env set gets a clean two-column Home tab, not
 * an error.
 */

/** Empty strings read as unset — an env var present but blank is not a value. */
function envValue(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Discord's numeric server ("guild") ID — `VITE_DISCORD_SERVER_ID`.
 *
 * The widget iframe only works if the server has
 * Server Settings -> Widget -> "Enable Server Widget" turned on. With it off,
 * Discord serves the widget's header and footer around an empty body and its
 * API answers `{"message": "Widget Disabled", "code": 50004}` — which is the
 * fastest way to tell that apart from a wrong ID, since a wrong ID answers
 * `10004 Unknown Guild` instead.
 */
export const DISCORD_SERVER_ID: string | null = envValue(import.meta.env.VITE_DISCORD_SERVER_ID);

/**
 * Public Discord invite — `VITE_DISCORD_INVITE_URL`, e.g. https://discord.gg/xxxx.
 *
 * Separate from the server ID rather than derived from it: an invite is a
 * revocable, optionally expiring token that an admin can rotate at any time,
 * while the server ID never changes. It is also needed in places that show no
 * widget at all (the victory screen, the credits page), where there is no
 * embed to carry Discord's own join link.
 */
export const DISCORD_INVITE_URL: string | null = envValue(import.meta.env.VITE_DISCORD_INVITE_URL);

/** Ko-fi page handle — `VITE_KOFI_USERNAME`, the path segment after ko-fi.com/. */
export const KOFI_USERNAME: string | null = envValue(import.meta.env.VITE_KOFI_USERNAME);

/**
 * Which of Ko-fi's official button images to use — `VITE_KOFI_BUTTON_VARIANT`.
 *
 * Ko-fi serves its button as `kofi1.png` .. `kofi6.png`, one per colour
 * variant, from their CDN — the same assets their own button generator hands
 * out. Defaults to 3 (red), closest to the hub's accent. Anything outside
 * 1..6 would 404, so an out-of-range value falls back rather than shipping a
 * broken image.
 */
function kofiButtonVariant(): number {
  const parsed = Number(envValue(import.meta.env.VITE_KOFI_BUTTON_VARIANT));
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 6 ? parsed : 3;
}

/**
 * Discord's server widget. `theme=dark` matches the hub; the frame shows the
 * online member list and join button, rendered entirely by Discord.
 */
export function discordWidgetUrl(serverId: string): string {
  return `https://discord.com/widget?id=${encodeURIComponent(serverId)}&theme=dark`;
}

/**
 * Ko-fi's own button asset, served by Ko-fi.
 *
 * Used as a plain <img> inside a link rather than through Ko-fi's
 * `Widget_2.js`, which draws the identical button but needs a page ID we do
 * not have and injects DOM outside React's control. The `v` query parameter
 * is Ko-fi's cache buster and is part of the published URL.
 */
export function kofiButtonImageUrl(): string {
  return `https://storage.ko-fi.com/cdn/kofi${kofiButtonVariant()}.png?v=6`;
}

/** The public Ko-fi page. The rail links here rather than embedding Ko-fi's form — see CommunityColumn. */
export function kofiPageUrl(username: string): string {
  return `https://ko-fi.com/${encodeURIComponent(username)}`;
}
