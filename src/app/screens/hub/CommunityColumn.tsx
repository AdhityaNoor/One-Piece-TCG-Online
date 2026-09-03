/**
 * The community column on the hub Home tab — Discord on top, Ko-fi below,
 * sitting to the LEFT of the banner carousel.
 *
 * Both panels are real third-party embeds (Discord's server widget iframe and
 * Ko-fi's widget iframe), and both are gated behind an explicit click. See
 * src/app/lib/embedConsent.ts for why that gate is not optional here: the
 * privacy policy's "no consent banner needed" position rests on the app
 * making no third-party request the player did not ask for, and an iframe is
 * such a request the instant it mounts.
 *
 * The gate is not a dead end. Before consent, each panel still shows its own
 * first-party link out to Discord / Ko-fi, so a player who never opts in
 * loses the live member list and the inline donate form, not the ability to
 * find either. That also covers the case where the embed itself fails — a
 * Discord server with the widget switched off renders an error page inside
 * the frame, and an iframe gives the parent no load-failure signal to detect
 * it with, so the visible invite link is the fallback rather than a retry.
 *
 * A panel whose ID is unset in config/community.ts is omitted entirely; with
 * both unset the column does not render, so HomeTab collapses cleanly back to
 * its previous two-column layout.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  DISCORD_INVITE_URL,
  DISCORD_SERVER_ID,
  KOFI_USERNAME,
  discordWidgetUrl,
  kofiPageUrl,
  kofiWidgetUrl,
} from '../../config/community';
import { grantEmbedConsent, hasEmbedConsent, revokeEmbedConsent, type EmbedProvider } from '../../lib/embedConsent';

/** True when at least one panel is configured — HomeTab uses this to decide the grid. */
export const HAS_COMMUNITY_PANELS = Boolean(DISCORD_SERVER_ID || KOFI_USERNAME);

export function CommunityColumn() {
  if (!HAS_COMMUNITY_PANELS) return null;

  return (
    <aside className="flex min-h-0 flex-col gap-3 lg:order-1 lg:h-full" aria-label="Community">
      <div className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full bg-gold shadow-[0_0_10px_rgba(217,164,65,0.65)]" />
        <p className="font-display text-sm font-black uppercase tracking-[0.22em] text-gold sm:text-base">Crew</p>
      </div>

      {DISCORD_SERVER_ID ? (
        <EmbedPanel
          provider="discord"
          title="Discord"
          blurb="See who is online and jump into the server."
          hostLabel="discord.com"
          linkUrl={DISCORD_INVITE_URL}
          linkLabel="Open invite"
          embedTitle="Discord server widget"
          embedUrl={discordWidgetUrl(DISCORD_SERVER_ID)}
          /* Discord's widget needs real height before the member list is worth
             showing; it is the taller of the two panels for that reason. */
          className="min-h-[16rem] flex-[3]"
        />
      ) : null}

      {KOFI_USERNAME ? (
        <EmbedPanel
          provider="kofi"
          title="Support the project"
          blurb="Donations go to hosting. They buy nothing in-game."
          hostLabel="ko-fi.com"
          linkUrl={kofiPageUrl(KOFI_USERNAME)}
          linkLabel="Open Ko-fi"
          embedTitle="Ko-fi donation widget"
          embedUrl={kofiWidgetUrl(KOFI_USERNAME)}
          className="min-h-[13rem] flex-[2]"
        />
      ) : null}
    </aside>
  );
}

interface EmbedPanelProps {
  provider: EmbedProvider;
  title: string;
  blurb: string;
  /** The third-party host, named to the player before anything is requested from it. */
  hostLabel: string;
  /** First-party escape hatch, shown whether or not the embed is loaded. */
  linkUrl: string | null;
  linkLabel: string;
  embedTitle: string;
  embedUrl: string;
  className?: string;
}

function EmbedPanel({
  provider,
  title,
  blurb,
  hostLabel,
  linkUrl,
  linkLabel,
  embedTitle,
  embedUrl,
  className,
}: EmbedPanelProps) {
  const [loaded, setLoaded] = useState(false);

  // Deferred to an effect rather than a useState initialiser for the same
  // reason as FanProjectNotice: the first render must not touch localStorage,
  // so the component stays renderable under the `node` Vitest environment —
  // which is also what lets the tests assert that the pre-consent render
  // contains no iframe at all.
  useEffect(() => {
    if (hasEmbedConsent(provider)) setLoaded(true);
  }, [provider]);

  const load = useCallback(() => {
    grantEmbedConsent(provider);
    setLoaded(true);
  }, [provider]);

  const unload = useCallback(() => {
    revokeEmbedConsent(provider);
    setLoaded(false);
  }, [provider]);

  return (
    <PanelFrame className={className}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <h3 className="font-display text-xs font-black uppercase tracking-[0.18em] text-white sm:text-sm">{title}</h3>
        {loaded ? (
          <button
            type="button"
            onClick={unload}
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 underline-offset-2 transition hover:text-slate-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))]"
          >
            Unload
          </button>
        ) : null}
      </div>

      {loaded ? (
        <iframe
          title={embedTitle}
          src={embedUrl}
          className="min-h-0 w-full flex-1 border-0 bg-transparent"
          /* No allow-same-origin: neither widget needs it, and withholding it
             keeps the frame in an opaque origin, so it cannot read or write
             storage or cookies scoped to its own host. allow-popups plus
             allow-popups-to-escape-sandbox is what lets "Join"/"Donate" open
             a real tab rather than a sandboxed dead end. */
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5 px-3 py-3">
          <p className="text-xs leading-5 text-slate-300/80">{blurb}</p>
          <button
            type="button"
            onClick={load}
            className="border border-gold/50 bg-gold/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-gold transition hover:border-gold hover:bg-gold/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030713]"
          >
            Load widget
          </button>
          <p className="text-[10px] leading-4 text-slate-400/70">
            Loads content from <span className="text-slate-300">{hostLabel}</span>, which will see your IP address and
            may set its own cookies. Nothing is requested until you click.
          </p>
        </div>
      )}

      {linkUrl ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="border-t border-white/10 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))]"
        >
          {linkLabel}
        </a>
      ) : null}
    </PanelFrame>
  );
}

function PanelFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={[
        'flex min-h-0 flex-col overflow-hidden border border-white/10 bg-black/30 shadow-[0_10px_26px_rgba(0,0,0,0.35)] backdrop-blur-md',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </section>
  );
}
