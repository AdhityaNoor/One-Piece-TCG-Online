/**
 * Single-viewport chrome shared by every screen except live gameplay (match /
 * online-match / play-test — see App.tsx). Owns the ONE `h-dvh` for the whole
 * app: AppHeader is a fixed-height row, and `children` fills the remaining
 * space via `flex-1 min-h-0`. Nested screens must size themselves with
 * `h-full` (not `h-dvh`) so they fill this remaining area instead of
 * re-claiming the entire device viewport and overlapping the header.
 *
 * The background image/gradient live here (not just inside each screen) so
 * AppHeader's `backdrop-blur` has something behind it to actually blur —
 * AppHeader sits in normal flex flow above `children`, not overlapping it,
 * so without a shared root background the header's frosted-glass styling
 * only ever revealed the flat `bg-[#071126]` fill, which reads as opaque.
 */
import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#071126] font-body text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-30 grayscale" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,_rgba(255,211,74,0.18),_transparent_24%)]" />
      <AppHeader />
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}
