/**
 * Layer 3 board leaf: one card rendered as real card art on the field,
 * replacing CardRow for the board surface itself (CardRow/ZoneSection are
 * kept for compact list contexts — the Trash inspector in PlayerBoardPanel
 * and the Character Area overflow choice in PendingChoicePrompt.tsx — where
 * a scannable text list is genuinely more useful than card art).
 *
 * "Rested" is shown the authentic OPTCG way: the card physically rotates
 * 90°, exactly like turning a card sideways on a real table, instead of a
 * text "Rested" label. Both orientations share one fixed square mounting
 * box per tile (SIZE_PX[size].box) so a row of cards never reflows or
 * overlaps when a card rests/refreshes mid-turn.
 *
 * Stat badges are deliberately minimal: cost, power-or-life, attached
 * DON!! count, counter, and summoning-sick. Static keyword text (Blocker,
 * Rush, Double Attack, Unblockable, Trigger) is intentionally left off the
 * tile to avoid clutter — it's still fully visible via the card zoom/preview
 * modal (onZoom), which is the project's required small-screen card-detail
 * affordance anyway. Known limitation, documented in MatchScreen.tsx.
 */
import type { ReactNode } from 'react';
import { CardImage } from '../CardImage';
import type { CardView } from '../../../board/projection';

export type BoardCardTileSize = 'leader' | 'board';

const SIZE_PX: Record<BoardCardTileSize, { width: number; box: number }> = {
  // box = ceil(width * 88/63), i.e. the upright card's own height — large
  // enough to also fit the same card rotated 90° (where width/height swap).
  leader: { width: 84, box: 118 },
  board: { width: 60, box: 84 },
};

export interface BoardCardTileProps {
  card: CardView;
  size?: BoardCardTileSize;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onZoom?: () => void;
}

function MiniBadge({ tone = 'dark', children }: { tone?: 'dark' | 'gold'; children: ReactNode }) {
  return (
    <span
      className={[
        'flex min-w-[1.1rem] items-center justify-center rounded-full px-1 py-[1px] text-[9px] font-extrabold leading-none shadow',
        tone === 'gold' ? 'bg-amber-400 text-navy-950' : 'bg-black/80 text-white',
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export function BoardCardTile({ card, size = 'board', selectable, selected, onSelect, onZoom }: BoardCardTileProps) {
  const dims = SIZE_PX[size];
  const rested = card.orientation === 'rested';
  const primaryStat = card.power ?? card.life;

  return (
    <div className="relative flex-shrink-0" style={{ width: dims.box, height: dims.box }}>
      <div
        role={selectable ? 'button' : undefined}
        tabIndex={selectable ? 0 : undefined}
        onClick={selectable ? onSelect : undefined}
        onKeyDown={selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(); } : undefined}
        className={[
          'absolute inset-0 flex items-center justify-center transition-transform duration-200',
          rested ? 'rotate-90' : '',
          selectable ? 'cursor-pointer' : '',
        ].join(' ')}
      >
        <div className="relative" style={{ width: dims.width }}>
          <CardImage src={card.imageUrl} alt={card.name} className={selected ? 'ring-2 ring-amber-300' : undefined} />

          {card.cost !== null && (
            <div className="absolute -top-1 -left-1 z-10">
              <MiniBadge>{card.cost}</MiniBadge>
            </div>
          )}

          {card.counter !== null && (
            <div className="absolute -top-1 -right-1 z-10">
              <MiniBadge>+{card.counter}</MiniBadge>
            </div>
          )}

          {(card.summoningSick || card.donAttachedCount > 0) && (
            <div className="absolute -bottom-1 -left-1 z-10 flex flex-col items-start gap-0.5">
              {card.summoningSick && <MiniBadge>💤</MiniBadge>}
              {card.donAttachedCount > 0 && <MiniBadge tone="gold">+{card.donAttachedCount}</MiniBadge>}
            </div>
          )}

          {primaryStat !== null && (
            <div className="absolute -bottom-1 -right-1 z-10">
              <MiniBadge tone="gold">{primaryStat}</MiniBadge>
            </div>
          )}
        </div>
      </div>

      {onZoom && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onZoom(); }}
          aria-label={`Preview ${card.name}`}
          className="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white/80 hover:bg-black/80 hover:text-white"
        >
          🔍
        </button>
      )}
    </div>
  );
}
