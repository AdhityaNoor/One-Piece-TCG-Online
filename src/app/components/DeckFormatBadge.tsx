import type { DeckFormatStatus } from '../../cards/format';

const BADGE_STYLES: Record<DeckFormatStatus, { label: string; className: string }> = {
  legal: {
    label: 'Legal',
    className: 'border-emerald-300/45 bg-emerald-500/15 text-emerald-100',
  },
  extraLegal: {
    label: 'Extra Legal',
    className: 'border-amber-300/45 bg-amber-500/15 text-amber-100',
  },
  banned: {
    label: 'Banned',
    className: 'border-red-400/45 bg-red-500/15 text-red-100',
  },
};

export interface DeckFormatBadgeProps {
  status: DeckFormatStatus;
  /** Smaller variant for dense deck-list rows. */
  size?: 'sm' | 'md';
  className?: string;
}

export function DeckFormatBadge({ status, size = 'md', className = '' }: DeckFormatBadgeProps) {
  const style = BADGE_STYLES[status];
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[9px] tracking-[0.10em]' : 'px-2 py-0.5 text-[10px] tracking-[0.12em]';

  return (
    <span
      className={[
        'inline-flex flex-shrink-0 items-center rounded border font-black uppercase',
        sizeClass,
        style.className,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {style.label}
    </span>
  );
}
