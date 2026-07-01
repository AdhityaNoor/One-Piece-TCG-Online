/**
 * Layer 3 board leaf: one player's Active or Rested DON!! pile.
 *
 * Hover: a full-screen backdrop (portal, covers everything) appears with the
 * cards laid out tight and flat at the stack's own screen position. Uses
 * createPortal so the popup escapes the board's overflow-hidden chain and
 * sits above all board content via z-index.
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cqh } from './boardScale';
import { CountBadge } from './CountBadge';
import { DonChip } from './DonChip';
import type { CardView } from '../../../board/projection';

export type DonStackDirection = 'vertical' | 'horizontal';

export interface DonStackProps {
  label: string;
  cards: CardView[];
  direction: DonStackDirection;
  selectable: (card: CardView) => boolean;
  selectedIds: Set<string>;
  onDonSelect: (card: CardView) => void;
  reverseRows?: boolean;
}

const CHIP_BOX = 210;
const STEP_PX  = 14;
const DON_TOKEN_SRC = '/ui/don-token.png';

// Fixed px dimensions for popup cards (cqh doesn't resolve outside ScaleToFit container).
const POPUP_W = 72;
const POPUP_H = 101;

/** Tight chip for the portal popup — fixed px sizing. */
function PopupChip({
  card, isSelectable, isSelected, onSelect,
}: {
  card: CardView; isSelectable: boolean; isSelected: boolean; onSelect: () => void;
}) {
  const rested = card.donRested;
  const outerW = rested ? POPUP_H : POPUP_W;
  const outerH = rested ? POPUP_W : POPUP_H;
  const rotation = rested ? 'translate(-50%,-50%) rotate(90deg)' : 'translate(-50%,-50%)';

  return (
    <div
      role={isSelectable ? 'button' : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onClick={isSelectable ? onSelect : undefined}
      onKeyDown={isSelectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); } : undefined}
      className={isSelectable ? 'cursor-pointer' : ''}
      style={{ position: 'relative', flexShrink: 0, width: outerW, height: outerH }}
    >
      <div
        className={[
          'absolute overflow-hidden rounded-md shadow-[0_5px_12px_rgba(0,0,0,0.5)]',
          isSelected ? 'ring-2 ring-white/80' : '',
        ].join(' ')}
        style={{ width: POPUP_W, height: POPUP_H, top: '50%', left: '50%', transform: rotation }}
      >
        <img src={DON_TOKEN_SRC} alt="" aria-hidden="true" className="block h-full w-full object-cover" draggable={false} />
      </div>
    </div>
  );
}

export function DonStack({ label, cards, direction, selectable, selectedIds, onDonSelect, reverseRows = false }: DonStackProps) {
  const isVertical = direction === 'vertical';
  const stackedSpan = CHIP_BOX + Math.max(cards.length - 1, 0) * STEP_PX;
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownRef = useRef(false); // blocks re-open immediately after a card selection
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  function handleEnter() {
    if (cooldownRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const portalEl = document.getElementById('board-overlay-root');
    if (wrapperRef.current && portalEl) {
      const pr = portalEl.getBoundingClientRect();
      const sr = wrapperRef.current.getBoundingClientRect();
      setAnchor({
        x: sr.left + sr.width / 2 - pr.left,
        y: sr.top + sr.height / 2 - pr.top,
      });
    }
    setExpanded(true);
  }
  function handleLeave(e?: React.MouseEvent) {
    // Don't close if a mouse button is still held (mid-click movement)
    if (e && e.buttons !== 0) return;
    setExpanded(false);
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40">{label}</span>

      {/* Stacked chips — anchor for portal positioning. Only opens; the overlay
          owns closing so the wrapper's mouseleave doesn't fire when the popup
          appears on top (overlay intercepts pointer events). */}
      <div
        ref={wrapperRef}
        className="relative"
        style={isVertical
          ? { width: cqh(CHIP_BOX), height: cqh(stackedSpan), overflow: 'visible' }
          : { width: cqh(stackedSpan), height: cqh(CHIP_BOX), overflow: 'visible' }}
        onMouseEnter={handleEnter}
      >
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
                  style={{
                    ...(isVertical ? { left: 0, top: cqh(offset) } : { top: 0, left: cqh(offset) }),
                    zIndex: index,
                    opacity: expanded ? 0 : 1,
                    pointerEvents: expanded ? 'none' : 'auto',
                    transition: 'opacity 0.12s ease',
                  }}
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
            {!expanded && <CountBadge count={cards.length} />}
          </>
        )}
      </div>

      {/* Portal into #board-overlay-root — inside the board DOM so the popup
          follows board animations and is clipped by board bounds. Coordinates
          are relative to the portal root (which has inset:0 on op-match-table-shell). */}
      {expanded && anchor && cards.length > 0 && (() => {
        const portalEl = document.getElementById('board-overlay-root');
        if (!portalEl) return null;
        return createPortal(
          <div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
            onClick={() => setExpanded(false)}
          >
            {/* Backdrop — click anywhere outside popup to close. */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(2px)',
              }}
            />
            {/* Popup — positioned at the stack's coordinates relative to the board */}
            <div
              style={{
                position: 'absolute',
                top: anchor.y,
                left: anchor.x,
                transform: 'translate(-50%, -50%)',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '4px',
                padding: '10px',
                background: 'transparent',
                borderRadius: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseLeave={handleLeave}
            >
              {cards.map((don) => (
                <PopupChip
                  key={don.instanceId}
                  card={don}
                  isSelectable={selectable(don)}
                  isSelected={selectedIds.has(don.instanceId)}
                  onSelect={() => {
                  onDonSelect(don);
                }}
                />
              ))}
            </div>
          </div>,
          portalEl,
        );
      })()}
    </div>
  );
}
