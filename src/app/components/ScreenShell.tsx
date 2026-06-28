/**
 * Page-level chrome shared by every screen: a dark navy top bar (back
 * button + title + a right-side slot) over a light body. Visual direction
 * follows the reference look the user asked for (optcgcustom.app's navy
 * header / light content split) — colors only, no copied art or wordmark.
 *
 * Deliberately navigation-store-agnostic: `onBack` is just a callback the
 * screen supplies (typically wired to `useNavigationStore().goBack`), so
 * this component has no dependency on which router/store implementation is
 * behind it — consistent with keeping UI components presentational.
 */
import type { ReactNode } from 'react';

export interface ScreenShellProps {
  title?: string;
  onBack?: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
  /** Override body padding/layout for screens that need full-bleed content (e.g. a card grid). Defaults to standard page padding. */
  bodyClassName?: string;
}

export function ScreenShell({ title, onBack, headerRight, children, bodyClassName }: ScreenShellProps) {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <header className="flex h-14 flex-shrink-0 items-center gap-3 bg-navy-900 px-4 text-white">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          >
            ←
          </button>
        )}
        {title && <h1 className="flex-1 truncate text-base font-bold tracking-tight">{title}</h1>}
        {!title && <div className="flex-1" />}
        {headerRight && <div className="flex flex-shrink-0 items-center gap-2">{headerRight}</div>}
      </header>
      <main className={['flex-1 overflow-y-auto', bodyClassName ?? 'p-4'].join(' ')}>{children}</main>
    </div>
  );
}
