/**
 * Single-viewport chrome shared by every screen except live gameplay (match /
 * online-match / play-test — see App.tsx). Owns the ONE `h-dvh` for the whole
 * app: AppHeader is a fixed-height row, and `children` fills the remaining
 * space via `flex-1 min-h-0`. Nested screens must size themselves with
 * `h-full` (not `h-dvh`) so they fill this remaining area instead of
 * re-claiming the entire device viewport and overlapping the header.
 *
 * The background image lives here (not just inside each screen) so
 * AppHeader's `backdrop-blur` has something behind it to actually blur.
 * The decorative gold radial glow that used to sit on top of it was removed
 * by design decision — only the plain background photo remains.
 */
import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { useHexDriftDelay } from '../hooks/useHexDriftDelay';

export function AppShell({ children }: { children: ReactNode }) {
  const hexDriftDelay = useHexDriftDelay();
  return (
    <div style={hexDriftDelay} className="relative flex h-dvh w-full flex-col overflow-hidden op-hex-bg bg-[#0a1a4f] font-body text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('/ui/bg.png')] bg-cover bg-center op-bg-tint opacity-80" />
      <AppHeader />
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}
