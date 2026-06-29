/**
 * Layer 3 leaf: shared "count overlay" badge — a single number centered on
 * top of a card/pile/stack visual. Pulled out as its own component so the
 * Deck pile (PileStack.tsx), the DON!! Deck and Life stack (PlayerBoardPanel
 * .tsx's LifeStack), and the Active/Rested DON!! piles (DonStack.tsx) all
 * read the same count style instead of four hand-tuned one-off badges.
 * Caller must render this inside a `position: relative` (or `absolute`)
 * ancestor — it centers itself via `absolute` + transform, it doesn't carry
 * its own positioning context.
 */
export interface CountBadgeProps {
  count: number;
  className?: string;
}

export function CountBadge({ count, className = '' }: CountBadgeProps) {
  return (
    <span
      className={[
        'absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/55 px-3 py-1.5 text-2xl font-black text-white',
        className,
      ].join(' ')}
    >
      {count}
    </span>
  );
}
