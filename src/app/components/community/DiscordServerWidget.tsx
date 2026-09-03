/**
 * Discord's server widget, mounted raw.
 *
 * No title bar, border or footer of our own: the widget already ships its own
 * header, member list and join link, so anything drawn around it reads as a
 * frame around a frame.
 *
 * Renders nothing when VITE_DISCORD_SERVER_ID is unset, so every caller can
 * mount it unconditionally.
 *
 * OPERATIONAL NOTE, because this looks like a bug and is not: the frame
 * renders as a header and footer around an EMPTY body unless the server has
 * Server Settings -> Widget -> "Enable Server Widget" turned on. Nothing in
 * this file can detect that — an iframe reports no load failure to its parent
 * — so the check is
 * `https://discord.com/api/guilds/<id>/widget.json`, which answers
 * `{"code": 50004, "message": "Widget Disabled"}` when it is off and
 * `10004 Unknown Guild` when the ID itself is wrong.
 */
import { DISCORD_SERVER_ID, discordWidgetUrl } from '../../config/community';

export interface DiscordServerWidgetProps {
  /** Applied to the iframe. Callers own the sizing; the widget has no opinion. */
  className?: string;
}

export function DiscordServerWidget({ className }: DiscordServerWidgetProps) {
  if (!DISCORD_SERVER_ID) return null;

  return (
    <iframe
      title="Discord server"
      src={discordWidgetUrl(DISCORD_SERVER_ID)}
      /* Verbatim from Discord's own embed snippet. `allow-same-origin` is the
         load-bearing one: without it the widget cannot boot and renders as a
         blank white box. `allow-popups-to-escape-sandbox` is what lets its
         join link open a real tab rather than a sandboxed dead end. Discord's
         snippet also carries allowtransparency, omitted here because React
         refuses to pass the deprecated attribute through and the widget paints
         its own dark panel anyway. */
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
      className={['block border-0', className ?? ''].join(' ')}
      loading="lazy"
    />
  );
}
