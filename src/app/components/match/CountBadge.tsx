import { cqh } from './boardScale';

/**
 * Layer 3 leaf: shared "count overlay" badge — a single number centered on
 * top of a card/pile/stack visual. Pulled out as its own component so the
 * Deck pile (PileStack.tsx), the DON!! Deck and Life stack (PlayerBoardPanel
 * .tsx's LifeStack), and the Active/Rested DON!! piles (DonStack.tsx) all
 * read the same count style instead of four hand-tuned one-off badges.
 * Caller must render this inside a `position: relative` (or `absolute`)
 * ancestor — it centers itself via `absolute` + transform, it doesn't carry
 * its own positioning context.
 *
 * Font size is cqh-based (see boardScale.ts), not Tailwind's fixed text-2xl,
 * so the badge shrinks along with the card/pile it sits on instead of
 * staying a fixed size and visually overwhelming a small card on a short
 * viewport.
 */
export interface CountBadgeProps {
  count: number;
  className?: string;
}

export function CountBadge({ count, className = '' }: CountBadgeProps) {
  return (
    <span
      className={['absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/55 px-3 py-1.5 font-black text-white', className].join(' ')}
      style={{ fontSize: cqh(24) }}
    >
      {count}
    </span>
  );
}
