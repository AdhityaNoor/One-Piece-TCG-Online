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
import { cqh } from './boardScale';
import type { CardView } from '../../../board/projection';

export type BoardCardTileSize = 'leader' | 'board' | 'field';

// box = ceil(width * 88/63), i.e. the upright card's own height — large
// enough to also fit the same card rotated 90° (where width/height swap).
// cqh-based (see boardScale.ts) so every size variant shrinks/grows with
// the board's live height, including 'leader'/'board' (used by Hand cards
// in MatchScreen.tsx) — 'field' is left functionally equivalent to before,
// it already also sizes itself relatively via aspect-square + h-full below.
const SIZE_PX: Record<BoardCardTileSize, { width: string; box: string }> = {
  leader: { width: cqh(116), box: cqh(162) },
  board: { width: cqh(116), box: cqh(162) },
  field: { width: cqh(150), box: cqh(210) },
};

export interface BoardCardTileProps {
  card: CardView;
  size?: BoardCardTileSize;
  selectable?: boolean;
  selected?: boolean;
  /** Marks a card that has a usable [Activate: Main] effect right now (own card, Main Phase). */
  activatable?: boolean;
  onSelect?: () => void;
  onZoom?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
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

export function BoardCardTile({ card, size = 'board', selectable, selected, activatable, onSelect, onZoom, onHoverStart, onHoverEnd }: BoardCardTileProps) {
  const dims = SIZE_PX[size];
  const isField = size === 'field';
  const rested = card.orientation === 'rested';
  const primaryStat = card.power ?? card.life;

  return (
    <div
      data-card-instance-id={card.instanceId}
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
      className={['group relative flex-shrink-0', isField ? 'aspect-square h-full max-h-full max-w-full' : ''].join(' ')}
      style={isField ? undefined : { width: dims.box, height: dims.box }}
    >
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
        <div className="relative" style={isField ? { height: '100%', aspectRatio: '63 / 88' } : { width: dims.width }}>
          <CardImage src={card.imageUrl} alt={card.name} className={[isField ? 'h-full w-full' : '', selected ? 'ring-2 ring-amber-300' : activatable ? 'ring-2 ring-emerald-400' : ''].filter(Boolean).join(' ')} />
          {onZoom && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100 group-focus-within:bg-black/45 group-focus-within:opacity-100" />}

          {activatable && (
            <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2">
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-[1px] text-[8px] font-extrabold uppercase leading-none tracking-wide text-white shadow ring-1 ring-emerald-200/60">
                ⚡ Main
              </span>
            </div>
          )}

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
          className="absolute left-1/2 top-1/2 z-30 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-sm text-white opacity-0 shadow-lg transition hover:bg-black/90 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          🔍
        </button>
      )}
    </div>
  );
}
