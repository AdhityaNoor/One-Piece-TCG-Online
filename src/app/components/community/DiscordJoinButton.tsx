/**
 * "Join the Discord" — a plain link out to the invite.
 *
 * Discord publishes no standard button asset the way Ko-fi does, so this one
 * is drawn here: their brand blurple and their mark (nominative use, which is
 * what Discord's own brand guidelines are for), on the square-edged, uppercase
 * geometry the rest of the app uses.
 *
 * Used on the surfaces that show no widget — the victory screen and the
 * credits page — where there is no embed carrying Discord's own join link.
 *
 * Renders nothing when VITE_DISCORD_INVITE_URL is unset.
 */
import { DISCORD_INVITE_URL } from '../../config/community';

/** Discord's brand blurple. */
const BLURPLE = '#5865f2';

export interface DiscordJoinButtonProps {
  className?: string;
  label?: string;
}

export function DiscordJoinButton({ className, label = 'Join the Discord' }: DiscordJoinButtonProps) {
  if (!DISCORD_INVITE_URL) return null;

  return (
    <a
      href={DISCORD_INVITE_URL}
      target="_blank"
      rel="noreferrer noopener"
      className={[
        'group inline-flex flex-shrink-0 items-center justify-center gap-2 border px-4 py-2 transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030713]',
        className ?? '',
      ].join(' ')}
      style={{ borderColor: `${BLURPLE}99`, backgroundColor: `${BLURPLE}26` }}
    >
      <DiscordMark />
      <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-white sm:text-sm">{label}</span>
    </a>
  );
}

/** Inline so the button needs no network request and cannot break on a CDN change. */
function DiscordMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="currentColor" style={{ color: BLURPLE }}>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.011c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.128c-.598.35-1.22.645-1.873.891a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.029.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}
