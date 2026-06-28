/**
 * Full-width tappable row: title + description + optional trailing badge +
 * chevron. Used by the Main Menu and Debug Tools screens for primary
 * navigation — a lighter-weight alternative to a pill Button when the
 * action needs room for a description (CardTile/DeckListSummary cover the
 * card-grid/list-row cases; this covers the "menu of destinations" case).
 */
import type { ReactNode } from 'react';

export interface MenuRowProps {
  title: string;
  description?: string;
  onClick: () => void;
  trailing?: ReactNode;
  disabled?: boolean;
}

export function MenuRow({ title, description, onClick, trailing, disabled }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex w-full items-center justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-gradient-to-br from-white/12 to-white/5 p-4 text-left text-slate-100 shadow-[0_14px_30px_rgba(0,0,0,0.18)] transition-all',
        disabled ? 'cursor-not-allowed opacity-45' : 'hover:-translate-y-0.5 hover:border-white/20 hover:from-white/16 hover:to-white/8',
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold uppercase tracking-[0.12em] text-white">{title}</span>
        {description && <span className="block text-xs text-slate-200/65">{description}</span>}
      </span>
      <span className="flex flex-shrink-0 items-center gap-2 text-slate-100/45">
        {trailing}
        <span aria-hidden="true">→</span>
      </span>
    </button>
  );
}
