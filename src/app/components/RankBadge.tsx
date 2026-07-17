/**
 * RankBadge — a uniform, fixed-size container that renders a ranked-ladder
 * icon tinted by its color category (Iron / Copper / Silver / Gold).
 *
 * The source SVGs (public/ui-icons/Ranks/) are monochrome silhouettes, so we
 * recolor them with a CSS mask: the container's background-color becomes the
 * icon's fill, driven by the resolved category style. This keeps every rank
 * icon the exact same box size regardless of the art's native aspect ratio.
 */

import { resolveRankIcon, type RankCategory, type RankCategoryStyle } from '../lib/rankIcons';

type RankBadgeSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<RankBadgeSize, number> = { sm: 30, md: 44, lg: 68 };

export interface RankBadgeProps {
  /** RankedRankId, 'placement', or any string from the profile header. */
  rank: string | null | undefined;
  division?: string | null;
  /** Show a muted placeholder for players still in placement. */
  inPlacement?: boolean;
  size?: RankBadgeSize;
  /** Accessible label; falls back to the category name. */
  title?: string;
  className?: string;
}

export function RankBadge({ rank, division, inPlacement = false, size = 'md', title, className }: RankBadgeProps) {
  const resolved = resolveRankIcon(rank, division);
  const style = resolved.style;
  const box = SIZE_PX[size];
  const muted = inPlacement;
  const label = title ?? (muted ? 'Placement' : style.label);

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={['relative inline-flex shrink-0 items-center justify-center', className ?? ''].join(' ')}
      style={{
        width: box,
        height: box,
        background: 'transparent',
      }}
    >
      <span
        aria-hidden
        style={{
          width: '88%',
          height: '88%',
          backgroundColor: muted ? 'rgba(255,255,255,0.3)' : style.color,
          WebkitMaskImage: `url("${resolved.path}")`,
          maskImage: `url("${resolved.path}")`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    </span>
  );
}

export type { RankBadgeSize, RankCategory, RankCategoryStyle };
