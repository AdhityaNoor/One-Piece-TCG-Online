/**
 * Page-level chrome shared by every screen. This stays UI-only: it frames the
 * app like a card-game client, while rule/game state continues to live below.
 */
import type { ReactNode } from 'react';

export interface ScreenShellProps {
  title?: string;
  onBack?: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
  /** Override body padding/layout for screens that need full-bleed content. */
  bodyClassName?: string;
}

export function ScreenShell({ title, onBack, headerRight, children, bodyClassName }: ScreenShellProps) {
  return (
    <div className="flex h-full w-full flex-col bg-transparent font-body text-slate-100">
      <header className="relative flex h-16 flex-shrink-0 items-center gap-3 border-b-2 border-gold/60 bg-[linear-gradient(90deg,_#050914_0%,_#071a38_42%,_#b91d22_100%)] px-4 text-white shadow-[0_10px_30px_rgba(0,0,0,0.42)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.16)_0%,_transparent_18%,_transparent_82%,_rgba(255,211,74,0.22)_100%)]" />
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center border border-gold/40 bg-black/35 font-heading text-xl font-black text-gold shadow-inner shadow-black/30 transition-all hover:-translate-y-0.5 hover:bg-gold hover:text-black"
          >
            &larr;
          </button>
        )}
        {title && <h1 className="relative z-10 flex-1 truncate font-display text-lg font-extrabold uppercase tracking-[0.08em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.42)]">{title}</h1>}
        {!title && <div className="flex-1" />}
        {headerRight && <div className="relative z-10 flex flex-shrink-0 items-center gap-2">{headerRight}</div>}
      </header>
      <main
        className={[
          'min-h-0 flex-1 overflow-y-auto',
          'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_38%)]',
          bodyClassName ?? 'px-2 py-2 sm:px-3',
        ].join(' ')}
      >
        <div className="flex h-full min-h-0 w-full flex-col gap-3">{children}</div>
      </main>
    </div>
  );
}
