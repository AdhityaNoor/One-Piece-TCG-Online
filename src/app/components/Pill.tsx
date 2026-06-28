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
  neutral: 'bg-white/10 text-slate-100 border border-white/10',
  gold: 'bg-amber-400/15 text-amber-200 border border-amber-300/20',
  brand: 'bg-brand/20 text-rose-100 border border-brand/20',
  navy: 'bg-navy-950 text-white border border-white/10',
};

export function Pill({ tone = 'neutral', children, className }: PillProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]',
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
