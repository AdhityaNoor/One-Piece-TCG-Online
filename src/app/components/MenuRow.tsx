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
        'flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-card p-4 text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface-cardHover',
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-navy-900">{title}</span>
        {description && <span className="block text-xs text-navy-900/50">{description}</span>}
      </span>
      <span className="flex flex-shrink-0 items-center gap-2 text-navy-900/40">
        {trailing}
        <span aria-hidden="true">→</span>
      </span>
    </button>
  );
}
