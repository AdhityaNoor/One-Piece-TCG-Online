/**
 * Layer 3 board leaf: the DON!! attached to ONE Leader/Character, shown as a
 * row of individually-clickable tokens directly below that card while it's
 * hovered (desktop) or its "DON!! x N" badge is tapped open (touch — see
 * PlayerBoardPanel's revealAttachedDon/hideAttachedDon). Replaces the old
 * behaviour where tapping that badge bulk-selected/deselected every attached
 * DON!! at once — donMinus cost payment (both the player-initiated
 * [Activate: Main]/[On Your Opponent's Attack] flows and the interpreter's
 * donMinus pending-choice, see useBoardSelection.ts's 'resolvingDonChoice')
 * needs the player to pick WHICH DON!! to return, and DON!! tokens carry no
 * distinguishing art, so a bulk toggle or a generic card-gallery modal both
 * hide that choice. This is deliberately NOT a popup: no backdrop, no
 * click-away-to-close, no dimming of the rest of the board — it's an inline
 * reveal that disappears when the card stops being hovered, same spirit as
 * DockHand's hover-to-open dock.
 *
 * Portals into #board-overlay-root (the same anchor DonStack.tsx's popup
 * uses) so it escapes PlayerBoardPanel's overflow-hidden ancestors
 * regardless of where the hovered card sits in the mat. cqh() sizing doesn't
 * resolve outside the ScaleToFit container the portal root lives next to
 * (see DonStack.tsx's own comment on this), so chip dimensions are fixed px
 * like DonStack's own popup chips.
 */
import { createPortal } from 'react-dom';
import type { CardView } from '../../../board/projection';

const DON_TOKEN_SRC = '/ui/don-token.png';
const CHIP_W = 60;
const CHIP_H = 84;
const GAP = 6;

export interface AttachedDonHoverStackProps {
  /** Screen point (relative to #board-overlay-root) to center the row under — null/absent hides the stack entirely. */
  anchor: { x: number; y: number } | null;
  cards: CardView[];
  selectable: (card: CardView) => boolean;
  selectedIds: Set<string>;
  onSelect: (card: CardView) => void;
  /** Bridges the pointer-hover gap between the owning card and this portal-rendered stack — see PlayerBoardPanel's closeTimerRef doc comment. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function Chip({
  card, isSelectable, isSelected, onSelect,
}: {
  card: CardView; isSelectable: boolean; isSelected: boolean; onSelect: () => void;
}) {
  const rested = card.donRested;
  const outerW = rested ? CHIP_H : CHIP_W;
  const outerH = rested ? CHIP_W : CHIP_H;
  const rotation = rested ? 'rotate(90deg)' : 'none';

  return (
    <div
      role={isSelectable ? 'button' : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onClick={isSelectable ? (event) => { event.stopPropagation(); onSelect(); } : undefined}
      onKeyDown={isSelectable ? (event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(); } : undefined}
      aria-label={isSelectable ? 'Select this DON!!' : undefined}
      className={isSelectable ? 'cursor-pointer' : ''}
      style={{ position: 'relative', flexShrink: 0, width: outerW, height: outerH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className={[
          'overflow-hidden rounded-md shadow-[0_5px_14px_rgba(0,0,0,0.55)]',
          isSelected ? 'ring-2 ring-white/85' : isSelectable ? 'ring-1 ring-white/25' : '',
        ].join(' ')}
        style={{ width: CHIP_W, height: CHIP_H, transform: rotation }}
      >
        <img src={DON_TOKEN_SRC} alt="" aria-hidden="true" className="block h-full w-full object-cover" draggable={false} />
      </div>
    </div>
  );
}

export function AttachedDonHoverStack({ anchor, cards, selectable, selectedIds, onSelect, onMouseEnter, onMouseLeave }: AttachedDonHoverStackProps) {
  if (!anchor || cards.length === 0) return null;
  const portalEl = document.getElementById('board-overlay-root');
  if (!portalEl) return null;

  return createPortal(
    <div
      style={{
        position: 'absolute',
        top: anchor.y,
        left: anchor.x,
        transform: 'translate(-50%, 6px)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: GAP,
        padding: '6px 8px',
        borderRadius: '10px',
        background: 'rgba(4,10,24,0.72)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 14px 32px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        pointerEvents: 'auto',
        zIndex: 190,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {cards.map((don) => (
        <Chip
          key={don.instanceId}
          card={don}
          isSelectable={selectable(don)}
          isSelected={selectedIds.has(don.instanceId)}
          onSelect={() => onSelect(don)}
        />
      ))}
    </div>,
    portalEl,
  );
}
