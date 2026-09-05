/**
 * The community rail on the hub Home tab — the Discord widget above, a Ko-fi
 * button below, sitting to the LEFT of the banner carousel.
 *
 * Both pieces are shared components (see components/community), because the
 * same two links now appear on the Social tab, the victory screen and the
 * credits page, and they must not drift apart. This file owns only the rail's
 * LAYOUT; what a Discord widget or a Ko-fi button is belongs to those.
 *
 * WHY ONE EMBED AND ONE BUTTON: Ko-fi's embeddable form is a fixed ~660px
 * page that scrolls inside its own card below that height. Stacked under
 * Discord's widget it overflowed any realistic rail height, and both escapes
 * were bad — let the rail scroll, or uniformly scale the pair down until
 * neither was readable. The button costs one line, hands the visitor to
 * Ko-fi's real page where the form has room, and gives the whole remaining
 * column to Discord, which is the widget that actually uses height because
 * what it shows is a list.
 *
 * Both IDs come from the environment (see config/community.ts), so this file
 * names no particular server or donation page and a fork with no env set
 * simply renders nothing here.
 */
// Imported from the community subpath rather than the components barrel: the
// barrel re-exports modules that touch `window` at import time (savedDecksStore
// via deckStorage), which breaks this file's test under the project's `node`
// Vitest environment. The subpath pulls only these four files and the config.
import { DiscordServerWidget, KofiButton } from '../../components/community';
import { DISCORD_SERVER_ID, KOFI_USERNAME } from '../../config/community';

/** True when at least one panel is configured — HomeTab reads this to pick its grid. */
export const HAS_COMMUNITY_PANELS = Boolean(DISCORD_SERVER_ID || KOFI_USERNAME);

export function CommunityColumn() {
  if (!HAS_COMMUNITY_PANELS) return null;

  return (
    <aside className="flex min-h-0 flex-col gap-3 lg:order-1 lg:h-full" aria-label="Community">
      {/* Fills the rail on lg, where the grid row gives the column a real
          height. Below lg the rail is content-sized, so flex-1 would collapse
          it to nothing and it needs an explicit height instead. Either way
          Discord scrolls its own member list past the visible rows, which is
          its native behaviour rather than a squeeze. */}
      <DiscordServerWidget className="h-[26rem] w-full lg:h-auto lg:min-h-0 lg:flex-1" />
      {/* Left at Ko-fi's own size, centred in the rail rather than stretched
          to its width. Ko-fi publishes the asset at one size and it is drawn
          as a button, not a banner: scaled to a 24rem rail it both upscales
          past its native resolution and stops reading as something you press.
          The `w-full` here is on the LINK, so the button centres — it is not
          a width for the image. */}
      <KofiButton className="w-full" />
    </aside>
  );
}
