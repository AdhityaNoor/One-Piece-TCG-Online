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
  headerTitle?: ReactNode;
  onBack?: () => void;
  topRight?: ReactNode;
  footer?: ReactNode;
  dense?: boolean;
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
  expandOnHover?: boolean;
  contained?: boolean;
}

export function CanvasMenuButton({ label, onClick, disabled, badge, prominence = 'secondary', size = 'md', className, expandOnHover = true, contained = false }: CanvasMenuButtonProps) {
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
        contained ? 'overflow-hidden' : 'overflow-visible',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061024]',
        size === 'sm' ? 'h-11 max-w-[15rem] px-5 text-xs tracking-[0.1em]' : 'h-14 max-w-[21rem] px-7 text-base tracking-[0.12em]',
        disabled ? 'cursor-not-allowed opacity-40' : expandOnHover ? 'hover:scale-x-150' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        aria-hidden="true"
        className={['absolute inset-y-0 border transition-colors duration-200', contained ? 'inset-x-0' : 'inset-x-0 -skew-x-12', borderClass].join(' ')}
      />
      <span className={['relative z-10 flex h-full items-center justify-center gap-3 transition-transform duration-200', expandOnHover ? 'group-hover:scale-x-[0.6667]' : '', textClass].join(' ')}>
        {label}
        {badge !== undefined && (
          <span className="min-w-7 border border-[rgb(var(--op-gold-rgb)/0.7)] bg-black/35 px-2 py-0.5 text-xs text-[rgb(var(--op-gold-rgb))] shadow-inner shadow-black/40">
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

export function GameCanvasScreen({ title, headerTitle, onBack, topRight, footer, dense = false, children }: GameCanvasScreenProps) {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#071126] font-body text-white">
      <div className="absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-30 grayscale" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,_rgba(255,211,74,0.18),_transparent_24%),linear-gradient(180deg,_rgba(5,9,20,0.2)_0%,_rgba(5,10,24,0.92)_72%,_#030713_100%)]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,_rgba(255,255,255,0.16),_transparent)]" />
      <div className="absolute inset-x-[-10%] bottom-[-18%] h-[42%] rotate-[-2deg] border-t-2 border-gold/35 bg-[linear-gradient(180deg,_rgba(11,28,62,0.78),_rgba(3,7,19,0.98))] shadow-[0_-20px_60px_rgba(0,0,0,0.45)]" />

      <section className={['relative z-10 grid h-full grid-rows-[auto_minmax(0,1fr)_auto]', dense ? 'px-0 pt-3 pb-0 sm:px-8 sm:py-5' : 'px-4 py-5 sm:px-8 sm:py-7'].join(' ')}>
        <div className={['relative z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3', dense ? 'px-4 sm:px-0' : ''].join(' ')}>
          <div className="flex min-w-0 items-start gap-2">
            {onBack && <CanvasMenuButton label="Back" onClick={onBack} size="sm" expandOnHover={!dense} className={dense ? "h-10 w-[5.75rem] max-w-none px-3" : "max-w-[7rem]"} />}
          </div>
          <div className="flex min-h-10 min-w-0 items-center justify-center">
            {headerTitle && (
              <h1 className="truncate text-center font-heading text-sm font-black uppercase tracking-[0.14em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.65)] sm:text-base">
                {headerTitle}
              </h1>
            )}
          </div>
          {topRight && <div className="flex flex-shrink-0">{topRight}</div>}
        </div>

        <div className={['min-h-0', dense ? 'pt-2 pb-0 sm:py-4' : 'py-4 sm:py-5'].join(' ')}>
          <div className={['mx-auto flex h-full w-full max-w-[72rem] flex-col', dense ? 'gap-2 sm:gap-4' : 'gap-4'].join(' ')}>
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

        <div className={['relative z-20 items-end justify-center', dense ? 'hidden sm:flex sm:min-h-3' : 'flex min-h-4'].join(' ')}>
          {footer ?? <div className="h-2 w-40 border-x-2 border-gold/45 bg-[linear-gradient(90deg,_transparent,_rgba(217,164,65,0.85),_transparent)]" />}
        </div>
      </section>
    </main>
  );
}
