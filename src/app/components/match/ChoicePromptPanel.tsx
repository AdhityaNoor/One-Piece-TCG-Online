/**
 * Floating choice panel — exact coloring and chrome as BacksoundControl's gear menu.
 */
import { createPortal } from 'react-dom';
import { useState, type ReactNode } from 'react';
import {
  SETTINGS_PANEL_BODY,
  SETTINGS_PANEL_INSET,
  SETTINGS_PANEL_LABEL,
  SETTINGS_PANEL_META,
  SETTINGS_PANEL_OPTION,
  SETTINGS_PANEL_OPTION_DISABLED,
  SETTINGS_PANEL_SCRIM,
  SETTINGS_PANEL_SHELL,
  SETTINGS_PANEL_TITLE,
} from '../settingsPanelStyles';

export interface ChoicePromptShellProps {
  title: string;
  children: ReactNode;
  maxWidthClassName?: string;
}

/**
 * Every ChoicePromptShell-based popup (mulligan, K.O. replacement, "Choose"/
 * "Choose V2 Cards" search galleries, Character Area Limit, Life Trigger,
 * etc.) can be minimized in place — a lot of these choices are easier to
 * make after actually looking at the board/hand behind the popup (e.g.
 * picking from a search result while checking what's already in play), so
 * the player shouldn't have to lose the choice just to look. Self-contained
 * (own useState, works identically on mobile and desktop — no external
 * wiring from MatchScreen needed) rather than a prop, since every caller in
 * PendingChoicePrompt.tsx just wants this for free. Minimizing does NOT lose
 * progress: PendingChoicePrompt's own component instance (and all its local
 * useState, e.g. which cards are already toggled in a multi-select gallery)
 * stays mounted the whole time — only this shell's rendered chrome swaps to
 * the small reopen pill. Resets to expanded on every fresh mount, i.e. a
 * brand new choice always starts visible; it only stays minimized across
 * re-renders of the SAME choice (progressive selection).
 *
 * NOT applied to SetupTossOverlay (the 5-2-1-4 coin-toss cinematic) — that
 * one doesn't use ChoicePromptShell at all and deliberately stays a
 * permanent full-screen sequence, see PendingChoicePrompt.tsx's doc comment.
 */
export function ChoicePromptShell({ title, children, maxWidthClassName = 'max-w-md' }: ChoicePromptShellProps) {
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    // Hung over the OPPONENT's end of the field (top-14, clear of the mobile
    // header row + TurnAndPhaseBanner above it), never the bottom — the
    // bottom-center strip is where the desktop "Hide Hands" toggle docks
    // (see MatchScreen.tsx), and a bottom-anchored reopen affordance used to
    // sit right on top of it. Deliberately loud/distinct (hazard-stripe
    // background, pulsing dot, full-width long bar) since this is the ONLY
    // way back into a choice that's still blocking the game underneath.
    return createPortal(
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="op-choice-prompt-reopen fixed inset-x-0 top-14 z-50 mx-auto flex h-11 w-[94%] max-w-2xl items-center justify-center gap-3 border-y-2 border-gold bg-[repeating-linear-gradient(135deg,rgba(4,4,4,0.92)_0px,rgba(4,4,4,0.92)_14px,rgba(46,32,0,0.92)_14px,rgba(46,32,0,0.92)_28px)] px-4 text-[11px] font-black uppercase tracking-[0.2em] text-gold shadow-[0_10px_32px_rgba(0,0,0,0.55)] backdrop-blur-md transition-transform hover:scale-[1.015]"
        aria-label={`Resume: ${title}`}
      >
        <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-gold shadow-[0_0_10px_2px_rgba(255,211,74,0.7)]" aria-hidden="true" />
        <span className="truncate">Action Needed — {title}</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div
      className="op-choice-prompt-root fixed inset-0 z-50 flex items-start justify-center p-4 pt-[7vh] font-body text-white xl:pt-[9vh]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        onClick={() => setMinimized(true)}
        aria-label="Hide to view the board"
        className={`op-choice-prompt-scrim absolute inset-0 cursor-zoom-out ${SETTINGS_PANEL_SCRIM}`}
      />
      <div
        className={[
          'op-choice-prompt-panel relative z-10 flex w-full max-h-[min(80vh,920px)] flex-col overflow-y-auto p-3',
          maxWidthClassName,
          SETTINGS_PANEL_SHELL,
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <p className={SETTINGS_PANEL_TITLE}>{title}</p>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Hide to view the board"
            className="flex h-7 flex-shrink-0 items-center justify-center whitespace-nowrap border border-white/15 bg-white/[0.04] px-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 transition-colors hover:border-gold/45 hover:text-gold"
          >
            See field / hand
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ChoicePromptMessage({ children }: { children: ReactNode }) {
  return <p className={SETTINGS_PANEL_BODY}>{children}</p>;
}

export function ChoicePromptMeta({ children }: { children: ReactNode }) {
  return <p className={SETTINGS_PANEL_META}>{children}</p>;
}

export function ChoicePromptInset({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className={SETTINGS_PANEL_INSET}>
      {title ? <p className={`mb-2 ${SETTINGS_PANEL_LABEL}`}>{title}</p> : null}
      {children}
    </div>
  );
}

export function ChoicePromptActionList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

export function ChoicePromptActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function ChoicePromptOption({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[SETTINGS_PANEL_OPTION, SETTINGS_PANEL_OPTION_DISABLED, 'min-h-[2.5rem]', className ?? ''].join(' ')}
    >
      {children}
    </button>
  );
}

export function ChoicePromptError({ messages }: { messages: string[] }) {
  return (
    <div className={SETTINGS_PANEL_INSET}>
      <p className={SETTINGS_PANEL_BODY}>{messages.join(' ')}</p>
    </div>
  );
}
