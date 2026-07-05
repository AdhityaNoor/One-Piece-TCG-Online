/**
 * Full-viewport game-menu shell. Visual-only chrome for title/menu style
 * screens; rules, navigation, and persistence stay in their existing stores.
 */
import type { ReactNode } from 'react';

export interface GameCanvasScreenProps {
  kicker?: string;
  status?: string;
  /** Omit to collapse the title row and let children fill the full content area. */
  title?: ReactNode;
  onBack?: () => void;
  topRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export interface CanvasMenuButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string | number;
  prominence?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function CanvasMenuButton({ label, onClick, disabled, badge, prominence = 'secondary', size = 'md', className }: CanvasMenuButtonProps) {
  const borderClass =
    prominence === 'primary'
      ? 'border-white/80 bg-red-600/55 group-hover:border-white group-hover:bg-red-600/70'
      : prominence === 'danger'
        ? 'border-white/80 bg-red-600/55 group-hover:border-white group-hover:bg-red-600/70'
        : 'border-white/75 bg-[rgba(11,28,62,0.42)] group-hover:border-white group-hover:bg-[rgba(11,28,62,0.62)]';
  const textClass =
    prominence === 'primary' ? 'text-white' : prominence === 'danger' ? 'text-red-200' : 'text-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'group relative w-full select-none text-center font-heading font-black uppercase transition-transform duration-200 [transform-origin:center]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#061024]',
        size === 'sm' ? 'h-11 max-w-[15rem] px-5 text-xs tracking-[0.1em]' : 'h-14 max-w-[21rem] px-7 text-base tracking-[0.12em]',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:scale-x-150',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        aria-hidden="true"
        className={['absolute inset-0 -skew-x-12 border transition-colors duration-200', borderClass].join(' ')}
      />
      <span className={['relative z-10 flex h-full items-center justify-center gap-3 transition-transform duration-200 group-hover:scale-x-[0.6667]', textClass].join(' ')}>
        {label}
        {badge !== undefined && (
          <span className="min-w-7 border border-gold/70 bg-black/35 px-2 py-0.5 text-xs text-gold shadow-inner shadow-black/40">
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

export function GameCanvasScreen({ title, onBack, topRight, footer, children }: GameCanvasScreenProps) {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#071126] font-body text-white">
      <div className="absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-30 grayscale" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,_rgba(255,211,74,0.18),_transparent_24%),linear-gradient(180deg,_rgba(5,9,20,0.2)_0%,_rgba(5,10,24,0.92)_72%,_#030713_100%)]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,_rgba(255,255,255,0.16),_transparent)]" />
      <div className="absolute inset-x-[-10%] bottom-[-18%] h-[42%] rotate-[-2deg] border-t-2 border-gold/35 bg-[linear-gradient(180deg,_rgba(11,28,62,0.78),_rgba(3,7,19,0.98))] shadow-[0_-20px_60px_rgba(0,0,0,0.45)]" />

      <section className="relative z-10 grid h-full grid-rows-[auto_minmax(0,1fr)_auto] px-4 py-5 sm:px-8 sm:py-7">
        <div className="relative z-20 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {onBack && <CanvasMenuButton label="Back" onClick={onBack} size="sm" className="max-w-[7rem]" />}
          </div>
          {topRight}
        </div>

        <div className="min-h-0 py-4 sm:py-5">
          <div className="mx-auto flex h-full w-full max-w-[72rem] flex-col gap-4">
            {title && (
              <div className="relative z-20 text-center">
                <div className="absolute inset-x-8 top-1/2 h-10 -translate-y-1/2 bg-brand/45 blur-3xl" />
                <h1 className="relative font-display text-4xl font-black uppercase leading-[0.9] tracking-[0.04em] text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.55)] sm:text-6xl md:text-7xl">
                  {title}
                </h1>
              </div>
            )}
            <div className="relative z-10 min-h-0 flex-1">{children}</div>
          </div>
        </div>

        <div className="relative z-20 flex min-h-4 items-end justify-center">
          {footer ?? <div className="h-2 w-40 border-x-2 border-gold/45 bg-[linear-gradient(90deg,_transparent,_rgba(217,164,65,0.85),_transparent)]" />}
        </div>
      </section>
    </main>
  );
}
