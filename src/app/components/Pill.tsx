/**
 * Small static label chip — rarity, "NEW", schema/version badges, etc.
 * Distinct from ColorChip (which is an interactive filter toggle, not a
 * label) even though both render as a rounded-full pill.
 */
import type { ReactNode } from 'react';

export type PillTone = 'neutral' | 'gold' | 'brand' | 'navy';

export interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: 'bg-surface-panel text-navy-900/70',
  gold: 'bg-gold/15 text-gold-600',
  brand: 'bg-brand/10 text-brand-700',
  navy: 'bg-navy-900 text-white',
};

export function Pill({ tone = 'neutral', children, className }: PillProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
