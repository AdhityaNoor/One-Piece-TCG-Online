/**
 * The "enjoying this?" prompt — one Discord link, one Ko-fi button.
 *
 * One component rather than the same markup copied onto each surface, because
 * the ASK should be worded identically everywhere it appears. It currently
 * shows on the victory screen (the moment a player has just finished a match
 * and is most likely to act) and on the credits page.
 *
 * The copy is deliberate. It names what the support is FOR ("helps this game
 * grow") and says the game is free, because a donation prompt in a fan project
 * that sells nothing has to be legible as a gift rather than a paywall — the
 * same position § 9 of the Terms takes. It never implies a benefit in-game.
 *
 * Renders nothing when neither link is configured, so callers can mount it
 * unconditionally and a fork with no env set sees no empty panel.
 */
import { DISCORD_INVITE_URL, KOFI_USERNAME } from '../../config/community';
import { DiscordJoinButton } from './DiscordJoinButton';
import { KofiButton } from './KofiButton';

/** True when at least one link is configured — callers can skip their own wrapper. */
export const HAS_COMMUNITY_LINKS = Boolean(DISCORD_INVITE_URL || KOFI_USERNAME);

export interface CommunityCalloutProps {
  className?: string;
  /** Overrides the heading where the surrounding copy already sets the scene. */
  heading?: string;
}

export function CommunityCallout({ className, heading = 'Enjoying the sim?' }: CommunityCalloutProps) {
  if (!HAS_COMMUNITY_LINKS) return null;

  return (
    <aside
      className={[
        'flex flex-col items-center gap-3 border border-white/10 bg-black/40 px-4 py-3 text-center backdrop-blur-sm',
        className ?? '',
      ].join(' ')}
      aria-label="Support and community"
    >
      <div>
        <p className="font-display text-sm font-black uppercase tracking-[0.16em] text-gold sm:text-base">{heading}</p>
        <p className="mt-1 text-xs leading-5 text-slate-300/80 sm:text-sm">
          It is free and always will be. Join the Discord or buy me a coffee — it helps this game grow.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <DiscordJoinButton />
        <KofiButton />
      </div>
    </aside>
  );
}
