/**
 * Full-viewport game-menu shell. Visual-only chrome for title/menu style
 * screens; rules, navigation, and persistence stay in their existing stores.
 */
import type { ReactNode } from 'react';

export interface GameCanvasScreenProps {
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

export function GameCanvasScreen({ onBack, topRight, footer, dense = false, children }: GameCanvasScreenProps) {
  const hasControlRow = Boolean(onBack || topRight);

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#071126] font-body text-white">
      <div className="absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-30 grayscale" />

      <section className={['relative z-10 grid h-full w-full grid-rows-[auto_minmax(0,1fr)_auto]', dense ? 'pt-3 pb-0 sm:py-5' : 'py-5 sm:py-7'].join(' ')}>
        {/* Always rendered (even empty) so it keeps its explicit grid row —
            conditionally omitting this node would shift auto-placement and
            make the content row collapse to shrink-to-fit instead of 1fr. */}
        {/* `section` above is `display:grid` with only `grid-rows-*` set — no
            `grid-template-columns`. That leaves one implicit auto column, and
            an implicit grid track's `auto` sizing function still factors in
            each item's max-content width UNLESS the item itself has
            `min-width: 0`. Every direct child of `section` is therefore a
            grid item that — without `min-w-0` — can be stretched wider than
            the viewport by any wide descendant (e.g. a tab bar with many
            unwrapping labels), silently growing this whole row (and the
            grid's single column, and every sibling row with it) past 100%
            width. `main`'s `overflow-hidden` then clips the excess, which is
            what produced the "content cut off exactly at the screen edge"
            bug — no visible scrollbar, just missing pixels. `min-w-0` on all
            three rows is the actual fix; it was never inside the screens
            themselves. */}
        <div className={['relative z-20 flex min-w-0 items-start justify-between gap-3 px-3 sm:px-4', hasControlRow ? '' : 'pointer-events-none'].join(' ')}>
          <div className="flex min-w-0 items-start gap-2">
            {onBack && <CanvasMenuButton label="Back" onClick={onBack} size="sm" expandOnHover={!dense} className={dense ? "h-10 w-[5.75rem] max-w-none px-3" : "max-w-[7rem]"} />}
          </div>
          {topRight && <div className="flex min-w-0 flex-shrink-0">{topRight}</div>}
        </div>

        <div className={['min-h-0 min-w-0 w-full', dense ? 'pt-2 pb-0 sm:py-4' : 'py-4 sm:py-5'].join(' ')}>
          <div className="relative z-10 h-full min-h-0 min-w-0 w-full">{children}</div>
        </div>

        <div className={['relative z-20 min-w-0 items-end justify-center', dense ? 'hidden sm:flex sm:min-h-3' : 'flex min-h-4'].join(' ')}>
          {footer}
        </div>
      </section>
    </main>
  );
}
