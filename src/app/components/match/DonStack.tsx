/**
 * Layer 3 board leaf: one player's Active or Rested DON!! pile inside the
 * leader's row (PlayerBoardPanel's boardRow). Deliberately ONE axis of
 * offset per pile, never a diagonal cascade — that's not how a real pile
 * sits on a table. Both Active and Rested piles now stack the same way
 * (straight sideways, each card peeking out to the side of the one before
 * it); the only visual difference between them is DonChip's own
 * rotate-90-when-rested transform, which this component doesn't touch. This
 * component only controls the offset axis/amount between multiple chips in
 * the same pile.
 */
import { cqh } from './boardScale';
import { CountBadge } from './CountBadge';
import { DonChip } from './DonChip';
import type { CardView } from '../../../board/projection';

export type DonStackDirection = 'vertical' | 'horizontal';

export interface DonStackProps {
  label: string;
  cards: CardView[];
  /** 'vertical' = stack top-to-bottom. 'horizontal' = stack left-to-right (now used for both Active and Rested). */
  direction: DonStackDirection;
  selectable: (card: CardView) => boolean;
  selectedIds: Set<string>;
  onDonSelect: (card: CardView) => void;
}

// DonChip's own fixed mounting box (see DonChip.tsx's BOX) — square so a
// rested (rotated) chip and an active (upright) chip take the same footprint.
// Kept as a raw px-equivalent number (not cqh yet) so the `span` arithmetic
// below stays exact; cqh() is applied only where a value is actually
// assigned to a style — see boardScale.ts.
const CHIP_BOX = 210;
// Offset scales with the full pile size, uncapped — stacking used to stop
// growing past 6 cards (MAX_OFFSET_INDEX clamp), but the wrapper cell is now
// variant="invisible" and flex-shrink-0/absolutely anchored (see
// PlayerBoardPanel.tsx's donGroup), so there's no fixed-width chrome for a
// wide pile to clip against — every card in the pile gets its own offset.
const STEP_PX = 14;

export function DonStack({ label, cards, direction, selectable, selectedIds, onDonSelect }: DonStackProps) {
  const isVertical = direction === 'vertical';
  const span = CHIP_BOX + Math.max(cards.length - 1, 0) * STEP_PX;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40">{label}</span>
      <div className="relative" style={isVertical ? { width: cqh(CHIP_BOX), height: cqh(span) } : { width: cqh(span), height: cqh(CHIP_BOX) }}>
        {cards.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md border border-dashed border-white/15 text-[8px] font-bold uppercase text-white/20">
            None
          </div>
        ) : (
          <>
            {cards.map((don, index) => {
              const offset = index * STEP_PX;
              return (
                <div
                  key={don.instanceId}
                  className="absolute"
                  style={isVertical ? { left: 0, top: cqh(offset), zIndex: index } : { left: cqh(offset), top: 0, zIndex: index }}
                >
                  <DonChip
                    card={don}
                    selectable={selectable(don)}
                    selected={selectedIds.has(don.instanceId)}
                    onSelect={() => onDonSelect(don)}
                  />
                </div>
              );
            })}
            <CountBadge count={cards.length} />
          </>
        )}
      </div>
    </div>
  );
}
