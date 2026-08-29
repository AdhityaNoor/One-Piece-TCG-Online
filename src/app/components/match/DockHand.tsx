/**
 * macOS-dock-style hand strip.
 *
 * Rest states:
 *  - idle (not hovered, board not focused): 50 % peek above/below the edge
 *  - boardFocused: fully slid off screen — returns on next dock hover
 *  - open (dock hovered & board not focused): cards fully visible + magnified
 *
 * Arrows use a gold glow + bounce animation; no background — they float
 * above the card strip at z-index 60 (cards max out at z-index 50).
 *
 * Off-turn privacy: backs shown at rest, faces on dock hover.
 *
 * Hover-reveal is a hotseat-only convenience (same physical player controls
 * both boards, so there's no real secrecy boundary between "acting" and
 * "not currently acting"). In Online/Casual/VS CPU, `isOwn=false` means a
 * genuinely different entity's hand (a real opponent or the CPU) — hovering
 * it must never reveal faces, only ever show backs like the docked/at-rest
 * state. See `allowHoverReveal` below.
 *
 * Touch (mobile, `tapActions`): none of the hover behaviour applies. The strip
 * stays docked in view — the caller sets how much of the card tucks behind the
 * screen edge via `restPeekRatio`, there is no reveal/auto-hide — and a tap
 * raises the card clear of the strip and opens the same action bubble the
 * mobile field uses, instead of magnifying it and floating buttons over it.
 */

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { applyHandOrder, findPlayZoneHost, handDropIndex, isOverPlayDropZone, moveInOrder, playDropZoneFor } from './handOrder';
import type { CardView } from '../../../board/projection';
import { useCardAnimationStore } from '../../store/cardAnimationStore';
import { useCardFlightHidden } from '../../hooks/useCardFlightHidden';
import { CardImage } from '../CardImage';
import { CardBackArt } from './CardBackArt';
import { BoardCardTile } from './BoardCardTile';

// ── Geometry ───────────────────────────────────────────────────────────────
/** Pointer travel before a press on a hand card becomes a drag rather than a tap. */
const DRAG_THRESHOLD_PX = 8;

/** How far a tapped card rises out of the strip, as a share of its height. */
const TAP_LIFT_RATIO = 0.22;

const BASE_W = 112;
const BASE_H = Math.round(BASE_W * 88 / 63); // ≈ 156 px
const OVERLAP = 0.30;
const PEEK = 0.50;
const MAX_VISIBLE = 10;
const ARROW_W = 44;

// ── Magnification ──────────────────────────────────────────────────────────
const SCALE_AT_DIST: Record<number, number> = { 0: 2.35, 1: 1.5, 2: 1.18 };

function cardScale(idx: number, hoveredIdx: number | null): number {
  if (hoveredIdx === null) return 1;
  return SCALE_AT_DIST[Math.abs(idx - hoveredIdx)] ?? 1;
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface DockHandProps {
  playerId: string;
  cards: CardView[];
  isOwn: boolean;
  /**
   * Whether hovering a non-own hand is allowed to reveal card faces.
   * Defaults to true (hotseat's existing behavior). Callers pass `false`
   * whenever the non-own hand belongs to a genuinely separate entity whose
   * hand must stay secret — an online opponent or the CPU — so hovering it
   * only ever shows backs, same as the docked/at-rest look. Has no effect
   * when `isOwn` is true (an own hand always shows faces regardless).
   */
  allowHoverReveal?: boolean;
  position: 'bottom' | 'top';
  selectedIds: Set<string>;
  selectable: (card: CardView) => boolean;
  canPlay?: (card: CardView) => boolean;
  /**
   * Cards this returns true for render at reduced opacity and skip the
   * hover-magnify "Play"/"View" affordance treatment for selectability —
   * used by the Counter Step to visually de-emphasize hand cards that
   * aren't usable Counter options (no Counter value, or an unaffordable
   * Counter Event) without hiding them outright (project rule: dim, don't
   * hide, since the player may still want to inspect them).
   */
  dimmed?: (card: CardView) => boolean;
  /** Small overlay badge (e.g. a DON!! cost readout) rendered top-left of the card. */
  cardBadge?: (card: CardView) => ReactNode | null;
  onCardTap: (card: CardView) => void;
  /** `replaceInstanceId`: the own Character the drop landed on, when the play overflows (3-7-6-1). */
  onPlayCard?: (card: CardView, replaceInstanceId?: string) => void;
  /** Which of the player's own Characters `card` could replace if played now; [] when it fits. */
  replaceTargetIdsFor?: (card: CardView) => string[];
  /** Live during a drag, so the mat can ring the Character about to be replaced. */
  onReplaceTargetHover?: (instanceId: string | null) => void;
  onCardZoom: (card: CardView) => void;
  /** When true the dock slides fully off screen (board is being interacted with). */
  boardFocused: boolean;
  /** Optional per-render geometry override, used by mobile without changing desktop sizing. */
  cardWidthPx?: number;
  maxVisibleCards?: number;
  restPeekRatio?: number;
  /**
   * How much of each card the next one covers. The desktop default (0.30) is
   * affordable there because hovering magnifies the card under the cursor, so
   * a covered card is one mouse-move away from being readable. Touch has no
   * hover and (in tapActions mode) no magnification, so a mobile caller passes
   * a smaller value and lets the strip scroll instead — a hand you cannot read
   * is a hand you cannot play from.
   */
  overlapRatio?: number;
  touchReveal?: boolean;
  forceOpen?: boolean;
  onRequestHide?: () => void;
  /**
   * Touch dock behaviour (mobile). The desktop dock magnifies the hovered
   * card to 2.35x and floats Play/View over it — a mouse affordance that made
   * no sense under a finger, where the "hover" is the tap itself and the blown
   * -up card covered the board. With this on the card is never scaled: a tap
   * RAISES it slightly and opens the same action bubble the mobile field uses
   * (see .op-mobile-card-action-bubble), so hand cards and field cards are
   * operated the exact same way.
   */
  tapActions?: boolean;
  /**
   * A selection mode is running (mode.kind !== 'idle'). Mirrors the mobile
   * field, where a tap is the selection itself while a mode is collecting
   * targets and only opens the action bubble when idle.
   */
  selectionActive?: boolean;
  /**
   * Hand card currently awaiting play-cost confirmation (mode
   * 'confirmPlayCost'). While set, its landing ghost stays on the field so the
   * card reads as already played — it only leaves if the player cancels the
   * DON!! prompt, which clears this id.
   */
  pendingPlayInstanceId?: string | null;
}

// ── Arrow keyframe styles (injected once) ──────────────────────────────────
const ARROW_STYLE = `
  @keyframes dock-nudge-left {
    0%, 100% { transform: translateX(0); }
    50%       { transform: translateX(-6px); }
  }
  @keyframes dock-nudge-right {
    0%, 100% { transform: translateX(0); }
    50%       { transform: translateX(6px); }
  }
`;

// ── Arrow button ───────────────────────────────────────────────────────────
function ArrowBtn({
  dir,
  disabled,
  onClick,
  width,
  height,
}: {
  dir: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
  width: number;
  height: number;
}) {
  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center"
      style={{ zIndex: 60, width, height }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={dir === 'left' ? 'Previous cards' : 'Next cards'}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="flex items-center justify-center disabled:cursor-default"
        style={{ background: 'none', border: 'none', padding: 0 }}
      >
        <span
          style={{
            display: 'inline-flex',
            color: disabled ? 'rgba(255,255,255,0.2)' : '#D9A441',
            filter: disabled
              ? 'none'
              : 'drop-shadow(0 0 8px rgba(217,164,65,0.9)) drop-shadow(0 0 16px rgba(217,164,65,0.5))',
            animation: disabled
              ? 'none'
              : `${dir === 'left' ? 'dock-nudge-left' : 'dock-nudge-right'} 1.1s ease-in-out infinite`,
          }}
        >
          {dir === 'left' ? (
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}

// ── Single dock card (hook-safe leaf) ───────────────────────────────────────
function DockHandCard({
  card,
  index,
  hoveredIdx,
  isTop,
  isSelected,
  canSelect,
  canPlay,
  isDimmed,
  badge,
  showFaces,
  overlapPx,
  cardWidth,
  cardHeight,
  onHoverStart,
  onHoverEnd,
  onTap,
  onPlay,
  onZoom,
  registerEl,
  onDragStart,
  isDragging,
  dropIntent,
  shouldSuppressClick,
  playerId,
  tapActions,
  selectionActive,
  isTapped,
  onToggleActions,
  onCloseActions,
}: {
  card: CardView;
  index: number;
  hoveredIdx: number | null;
  isTop: boolean;
  isSelected: boolean;
  canSelect: boolean;
  canPlay: boolean;
  isDimmed: boolean;
  badge: ReactNode | null;
  showFaces: boolean;
  overlapPx: number;
  cardWidth: number;
  cardHeight: number;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onTap: () => void;
  onPlay: () => void;
  onZoom: () => void;
  registerEl: (instanceId: string, el: HTMLDivElement | null) => void;
  onDragStart: (instanceId: string, event: PointerEvent<HTMLDivElement>) => void;
  isDragging: boolean;
  dropIntent: 'reorder' | 'play';
  shouldSuppressClick: () => boolean;
  playerId?: string;
  tapActions: boolean;
  selectionActive: boolean;
  isTapped: boolean;
  onToggleActions: () => void;
  onCloseActions: () => void;
}) {
  const hiddenDuringFlight = useCardFlightHidden(card.instanceId);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  // Where the tap bubble is pinned, in viewport coordinates. The bubble is
  // portalled to <body> and positioned FIXED because every box between the
  // card and the screen clips it: the hand strip is a horizontal scroller
  // (overflow-x: auto forces overflow-y to auto, so anything drawn above a
  // card is cut off) and .op-mobile-match-center is overflow: hidden. Padding
  // the scroller to make room — the first attempt — wrecked the strip's own
  // vertical placement, since its height is stretched from that box.
  const [bubbleAt, setBubbleAt] = useState<{ x: number; edge: number } | null>(null);
  // Touch dock: no magnification at all. The lift is the whole feedback — the
  // card rises out of the strip far enough to clear the cards beside it and to
  // sit under its own action bubble.
  const scale = tapActions ? 1 : cardScale(index, hoveredIdx);
  const liftPx = tapActions && isTapped ? Math.round(cardHeight * TAP_LIFT_RATIO) : 0;
  // The strip hangs off the nearest screen edge, so "up" is away from that
  // edge: down for the top hand, up for the bottom one.
  const liftY = isTop ? liftPx : -liftPx;
  const isHoveredCard = hoveredIdx === index;

  const open = tapActions && isTapped && showFaces;
  useLayoutEffect(() => {
    if (!open) {
      setBubbleAt(null);
      return;
    }
    const measure = (): void => {
      const el = boxRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // `edge` is the card side the bubble hangs off: its bottom for the top
      // dock (bubble opens downward), its top for the bottom dock.
      setBubbleAt({ x: rect.left + rect.width / 2, edge: isTop ? rect.bottom : rect.top });
    };
    measure();
    // Again once the 0.18s lift has landed, so the bubble sits against the
    // RAISED card rather than where it started.
    const settle = window.setTimeout(measure, 220);
    window.addEventListener('resize', measure);
    // Tapping anything else — another card, the board, the battle line —
    // dismisses it, the way a real popover behaves.
    const onDocPointerDown = (event: globalThis.PointerEvent): void => {
      const target = event.target as Node | null;
      if (!target) return;
      if (boxRef.current?.contains(target) || bubbleRef.current?.contains(target)) return;
      onCloseActions();
    };
    document.addEventListener('pointerdown', onDocPointerDown, true);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('resize', measure);
      document.removeEventListener('pointerdown', onDocPointerDown, true);
    };
  }, [open, isTop, onCloseActions]);

  return (
    <div
      className={[
        'group/dock-card relative flex-shrink-0',
        hiddenDuringFlight ? 'invisible' : '',
      ].join(' ')}
      data-card-instance-id={card.instanceId}
      ref={(el) => { boxRef.current = el; registerEl(card.instanceId, el); }}
      onPointerDown={(event) => onDragStart(card.instanceId, event)}
      style={{
        // touchAction none so a drag on touch isn't stolen by page scrolling.
        touchAction: 'none',
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        marginLeft: index === 0 ? 0 : `-${overlapPx}px`,
        // While dragging, this element stays in flow as an invisible
        // placeholder holding the card's slot (so the gap follows the reorder)
        // and the visible card is a fixed-position ghost tracking the pointer.
        // pointerEvents:none is load-bearing, not cosmetic — the drag
        // hit-tests with elementFromPoint, which would otherwise just return
        // this card and never see the field underneath it.
        transform: `translateY(${liftY}px) scale(${scale})`,
        transformOrigin: isTop ? 'top center' : 'bottom center',
        transition: isDragging ? 'none' : 'transform 0.18s ease-out, opacity 0.15s ease-out',
        zIndex: isTapped ? 60 : isHoveredCard ? 50 : index + 1,
        opacity: isDragging ? 0 : isDimmed ? 0.4 : 1,
        // The touch strip sets pointer-events: none on itself so its headroom
        // does not swallow taps meant for the board; the cards opt back in.
        pointerEvents: isDragging ? 'none' : tapActions ? 'auto' : undefined,
      }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={() => {
        // A completed drag must not also fire the card's tap action.
        if (shouldSuppressClick()) return;
        if (tapActions) {
          // While a mode is collecting targets the tap IS the selection (same
          // rule as MobileCardZone, which only opens its bubble when idle).
          if (selectionActive) {
            if (canSelect) onTap();
            return;
          }
          onToggleActions();
          return;
        }
        if (canSelect) onTap();
      }}
    >
      <div
        className={[
          'h-full w-full overflow-hidden rounded-[4px] border shadow-[0_6px_18px_rgba(0,0,0,0.6)]',
          canSelect ? 'cursor-pointer' : 'cursor-default',
          isDragging
            ? dropIntent === 'play'
              ? 'ring-2 ring-emerald-400 brightness-110'
              : 'ring-2 ring-white/70'
            : '',
          isSelected
            ? 'border-gold ring-2 ring-gold/70 ring-offset-1 ring-offset-navy-950'
            : canPlay
              ? isHoveredCard
                ? 'border-emerald-400 ring-2 ring-emerald-400/60'
                : 'border-emerald-500/90'
              : 'border-transparent',
        ].join(' ')}
      >
        {showFaces ? (
          <CardImage src={card.imageUrl ?? null} alt={card.cardNumber ?? card.instanceId} />
        ) : (
          <CardBackArt tone="navy" playerId={playerId} />
        )}
      </div>

      {isHoveredCard && showFaces && !tapActions && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 px-1">
          {canPlay && (
            <button
              type="button"
              aria-label={`Play ${card.name}`}
              className="pointer-events-auto w-[80%] rounded-full bg-gold/95 py-1 text-center text-[10px] font-black uppercase tracking-[0.1em] text-navy-950 shadow-[0_2px_10px_rgba(0,0,0,0.55)] transition-colors hover:bg-gold"
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
            >
              Play
            </button>
          )}
          <button
            type="button"
            aria-label="View card detail"
            className="pointer-events-auto w-[80%] rounded-full bg-black/86 py-1 text-center text-[10px] font-black uppercase tracking-[0.1em] text-white shadow-[0_2px_10px_rgba(0,0,0,0.55)] transition-colors hover:bg-black"
            onClick={(e) => { e.stopPropagation(); onZoom(); }}
          >
            View
          </button>
        </div>
      )}

      {/* Same bubble the mobile field uses — one interaction language for every
          card on screen. Portalled to <body> and fixed-positioned so no
          scroller or overflow: hidden ancestor can clip it; it opens on the
          side away from the screen edge the strip is docked to. */}
      {open && bubbleAt
        ? createPortal(
            <div
              ref={bubbleRef}
              className={['op-mobile-card-action-bubble', isTop ? 'is-below' : ''].filter(Boolean).join(' ')}
              style={{
                position: 'fixed',
                zIndex: 130,
                left: `${bubbleAt.x}px`,
                top: isTop ? `${bubbleAt.edge + 6}px` : undefined,
                bottom: isTop ? undefined : `${Math.round(window.innerHeight - bubbleAt.edge + 6)}px`,
                transform: 'translateX(-50%)',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {canPlay && (
                <button type="button" onClick={() => { onCloseActions(); onPlay(); }}>
                  Play
                </button>
              )}
              <button type="button" onClick={() => { onCloseActions(); onZoom(); }}>
                View
              </button>
            </div>,
            document.body,
          )
        : null}

      {isSelected && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border border-navy-950 bg-gold shadow-[0_0_6px_rgba(217,164,65,0.7)]"
        />
      )}

      {badge && showFaces && (
        <div className="pointer-events-none absolute left-0.5 top-0.5 z-10">
          {badge}
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
/**
 * Wrapped in React.memo — see docs/08-match-performance-plan.md Phase 1.
 * `selectable`/`canPlay`/`dimmed`/`cardBadge`/`onCardTap` must be
 * reference-stable at the call site (MatchScreen builds these per-side via
 * a single useMemo bundle) for this to actually skip re-rendering on
 * unrelated re-renders — this component's own body is unchanged.
 */
export const DockHand = memo(function DockHand({
  playerId,
  cards,
  isOwn,
  allowHoverReveal = true,
  position,
  selectedIds,
  selectable,
  canPlay,
  dimmed,
  cardBadge,
  onCardTap,
  onPlayCard,
  replaceTargetIdsFor,
  onReplaceTargetHover,
  onCardZoom,
  boardFocused,
  cardWidthPx,
  maxVisibleCards,
  restPeekRatio,
  overlapRatio,
  touchReveal = false,
  forceOpen = false,
  onRequestHide,
  tapActions = false,
  selectionActive = false,
  pendingPlayInstanceId = null,
}: DockHandProps) {
  const [dockHovered, setDockHovered] = useState(false);
  // Which card has its action bubble open. One at a time, and never carried
  // across a mode change or a card leaving the hand (see the effects below).
  const [tappedId, setTappedId] = useState<string | null>(null);
  // Stable identity: DockHandCard registers a document listener keyed on it.
  const closeActions = useCallback(() => setTappedId(null), []);
  const [touchOpen, setTouchOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [windowStart, setWindowStart] = useState(0);
  const touchCloseTimer = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchHorizontalSwipe = useRef(false);
  const touchLastX = useRef<number | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const hiddenDuringFlight = useCardAnimationStore((s) => s.hiddenDuringFlight);

  // Keep cards that are mid-flight in the visible window so animation can
  // measure their dock slot (see CardMovementOverlay / boardAnchors.ts).
  const cardWidth = cardWidthPx ?? BASE_W;
  const cardHeight = Math.round(cardWidth * 88 / 63);
  const arrowWidth = Math.max(32, Math.round(cardWidth * ARROW_W / BASE_W));
  const maxVisible = maxVisibleCards ?? MAX_VISIBLE;

  useLayoutEffect(() => {
    if (cards.length <= maxVisible) return;
    setWindowStart((current) => {
      let next = current;
      for (let i = 0; i < cards.length; i++) {
        if (!hiddenDuringFlight[cards[i].instanceId]) continue;
        if (i < next) next = i;
        if (i >= next + maxVisible) next = Math.max(0, i - maxVisible + 1);
      }
      return next;
    });
  }, [cards, hiddenDuringFlight, maxVisible]);

  const isTop = position === 'top';
  /** Vertical headroom the touch strip needs so a lifted card is not clipped. */
  const liftRoomPx = tapActions ? Math.round(cardHeight * TAP_LIFT_RATIO) + 6 : 0;
  const isOpen = (dockHovered || touchOpen || forceOpen) && !boardFocused;
  const showFaces = isOwn || (isOpen && allowHoverReveal);
  const restPeek = restPeekRatio ?? PEEK;

  // Three translate states:
  //  open        → 0          (fully visible)
  //  boardFocused → ±BASE_H   (fully off screen — slide away)
  //  idle peek   → ±BASE_H*PEEK (50 % hidden at edge)
  const peekPx = cardHeight * restPeek;
  const translateY = isOpen
    ? 0
    : boardFocused
      ? (isTop ? -cardHeight : cardHeight)
      : (isTop ? -peekPx : peekPx);

  // Player-arranged hand order. UI-only and local to this component: hand
  // order has no rules meaning, so it never enters GameState (see handOrder.ts).
  // applyHandOrder reconciles the saved arrangement with the live hand every
  // render, so draws/plays can't leave a stale id hiding or duplicating a card.
  const [handOrderIds, setHandOrderIds] = useState<string[]>([]);
  const orderedCards = isOwn ? applyHandOrder(cards, handOrderIds) : cards;

  const usesTouchScroll = touchReveal;
  const needsScroll = orderedCards.length > maxVisible;
  const needsWindowScroll = needsScroll && !usesTouchScroll;
  const visibleCards = needsWindowScroll
    ? orderedCards.slice(windowStart, windowStart + maxVisible)
    : orderedCards;

  // ── Drag: reorder within the hand, or drop onto your field to play ────────
  const cardElRefs = useRef(new Map<string, HTMLDivElement | null>());
  const dragRef = useRef<{ instanceId: string; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  // Pointer position drives a FIXED-position ghost rather than translating the
  // card in place. Translating by (pointer - pressOrigin) desynced as soon as
  // a reorder moved the card's layout slot: the base position jumped, so the
  // same delta no longer put it under the cursor. A fixed ghost is immune to
  // layout changes, and grabOffset keeps the card held at the exact point it
  // was picked up.
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const grabOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // A ref, not state: the pointermove handler is registered once per drag (see the effect below)
  // and would otherwise close over a stale value, and the drop needs the value synchronously.
  const replaceHoverRef = useRef<string | null>(null);
  const [dropIntent, setDropIntent] = useState<'reorder' | 'play'>('reorder');
  // Host element for the "where this card will land" ghost — the acting
  // player's Character Area. Looked up from the DOM rather than threaded down
  // from MatchScreen so the preview stays entirely inside the drag layer.
  const [previewHost, setPreviewHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!draggingId) return;

    const handleMove = (event: globalThis.PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;

      // Movement threshold — below it this is still a tap, so tap-to-play and
      // tap-to-select keep working and no click gets swallowed.
      if (!drag.moved) {
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        drag.moved = true;
        setDragActive(true);
        // Drop the hover magnification: it scales cards up to 2.35x, which
        // would move every rect this drag measures.
        setHoveredIdx(null);
      }

      // The ghost follows the pointer, so the drag reads as picking it up.
      setDragPointer({ x: event.clientX, y: event.clientY });

      // Dropping onto your own field means "play this card"; anywhere else in
      // the hand strip means "rearrange". The dragged card is pointer-events:
      // none while active (see DockHandCard), so this hit-test sees the board
      // underneath it rather than the card itself.
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const overPlayZone = isOverPlayDropZone(hit);
      setDropIntent(overPlayZone ? 'play' : 'reorder');
      if (overPlayZone) {
        const dragged = orderedCards.find((c) => c.instanceId === drag.instanceId);
        const zone = playDropZoneFor(dragged?.category);
        setPreviewHost(zone ? findPlayZoneHost(zone) : null);
        // Which of your own Characters is under the pointer, when this play would overflow the
        // Character Area. The dragged ghost is pointer-events:none (see DockHandCard), so this
        // hit-test reaches the mat underneath rather than the card being dragged.
        const replaceable = dragged ? replaceTargetIdsFor?.(dragged) ?? [] : [];
        const overId = replaceable.length > 0
          ? (hit as Element | null)?.closest('[data-card-instance-id]')?.getAttribute('data-card-instance-id') ?? null
          : null;
        const hovered = overId && replaceable.includes(overId) ? overId : null;
        if (hovered !== replaceHoverRef.current) {
          replaceHoverRef.current = hovered;
          onReplaceTargetHover?.(hovered);
        }
        return;
      }
      setPreviewHost(null);
      if (replaceHoverRef.current !== null) {
        replaceHoverRef.current = null;
        onReplaceTargetHover?.(null);
      }

      // Centres are measured live because the fan reflows after every swap.
      const currentOrder = orderedCards.map((c) => c.instanceId);
      const from = currentOrder.indexOf(drag.instanceId);
      if (from < 0) return;
      const centers = currentOrder.map((id) => {
        const el = cardElRefs.current.get(id);
        if (!el) return Number.POSITIVE_INFINITY;
        const rect = el.getBoundingClientRect();
        return rect.left + rect.width / 2;
      });
      const to = handDropIndex(centers, from, event.clientX);
      if (to !== from) setHandOrderIds(moveInOrder(currentOrder, from, to));
    };

    const handleUp = (event: globalThis.PointerEvent): void => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDraggingId(null);
      setDragActive(false);
      setDragPointer(null);
      setDropIntent('reorder');
      if (!drag) return;

      // A drag must not also fire the card's click handler on release.
      if (drag.moved) suppressClickRef.current = true;

      if (drag.moved && isOverPlayDropZone(document.elementFromPoint(event.clientX, event.clientY))) {
        const card = orderedCards.find((c) => c.instanceId === drag.instanceId);
        // 3-7-6-1: dropping ONTO one of your own Characters while the area is full means "this
        // one replaces that one". The hovered target travelled with the drag, so the play and
        // the trash are decided in the same gesture.
        if (card && (canPlay?.(card) ?? false)) onPlayCard?.(card, replaceHoverRef.current ?? undefined);
      }
      if (replaceHoverRef.current !== null) {
        replaceHoverRef.current = null;
        onReplaceTargetHover?.(null);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [draggingId, orderedCards, canPlay, onPlayCard, replaceTargetIdsFor, onReplaceTargetHover]);

  const beginCardDrag = (instanceId: string, event: PointerEvent<HTMLDivElement>): void => {
    if (!isOwn) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    // Stops the browser starting its own image/text drag, which would fire
    // pointercancel and abort this gesture (see CardImage's draggable={false}).
    event.preventDefault();
    // The pressed card is usually hover-magnified (up to 2.35x), so its rect is
    // larger than the ghost. Scale the grab point proportionally, or the ghost
    // hangs off the cursor by the magnification difference.
    const rect = cardElRefs.current.get(instanceId)?.getBoundingClientRect();
    grabOffsetRef.current =
      rect && rect.width > 0 && rect.height > 0
        ? {
            x: (event.clientX - rect.left) * (cardWidth / rect.width),
            y: (event.clientY - rect.top) * (cardHeight / rect.height),
          }
        : { x: cardWidth / 2, y: cardHeight / 2 };
    dragRef.current = { instanceId, startX: event.clientX, startY: event.clientY, moved: false };
    setDraggingId(instanceId);
  };

  const consumeDragClick = (): boolean => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  };

  function scrollLeft() { setWindowStart((s) => Math.max(0, s - 1)); setHoveredIdx(null); }
  function scrollRight() { setWindowStart((s) => Math.min(cards.length - maxVisible, s + 1)); setHoveredIdx(null); }

  const revealForTouch = (): void => {
    // Tap mode keeps the strip permanently docked in view, so there is nothing
    // to reveal and nothing to auto-hide.
    if (!touchReveal || tapActions) return;
    setTouchOpen(true);
    if (touchCloseTimer.current !== null) window.clearTimeout(touchCloseTimer.current);
    touchCloseTimer.current = window.setTimeout(() => {
      setTouchOpen(false);
      setHoveredIdx(null);
      touchCloseTimer.current = null;
    }, 2400);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (touchReveal) {
      touchStartX.current = event.clientX;
      touchStartY.current = event.clientY;
      touchLastX.current = event.clientX;
      touchHorizontalSwipe.current = false;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    revealForTouch();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!touchReveal || touchStartY.current === null || touchStartX.current === null) return;
    const deltaX = event.clientX - touchStartX.current;
    const deltaY = event.clientY - touchStartY.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (usesTouchScroll && absX > 6 && absX > absY) {
      const lastX = touchLastX.current ?? event.clientX;
      const deltaFromLast = event.clientX - lastX;
      stripRef.current?.scrollBy({ left: -deltaFromLast, behavior: 'auto' });
      touchLastX.current = event.clientX;
      touchHorizontalSwipe.current = true;
      return;
    }

    if (!needsWindowScroll || absX < 36 || absX <= absY) return;

    touchHorizontalSwipe.current = true;
    if (deltaX < 0) scrollRight();
    else scrollLeft();
    touchStartX.current = event.clientX;
    touchStartY.current = event.clientY;
    revealForTouch();
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (!touchReveal || touchStartY.current === null || touchStartX.current === null) return;
    const deltaX = event.clientX - touchStartX.current;
    const deltaY = event.clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    touchLastX.current = null;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (touchHorizontalSwipe.current) {
      touchHorizontalSwipe.current = false;
      return;
    }

    if (needsWindowScroll && absX >= 28 && absX > absY) {
      if (deltaX < 0) scrollRight();
      else scrollLeft();
      revealForTouch();
      return;
    }

    if (absY < 24 || tapActions) return;

    const hidesInNaturalDirection = isTop ? deltaY < 0 : deltaY > 0;
    if (deltaY > 0 || hidesInNaturalDirection) {
      if (touchCloseTimer.current !== null) {
        window.clearTimeout(touchCloseTimer.current);
        touchCloseTimer.current = null;
      }
      setTouchOpen(false);
      setHoveredIdx(null);
      onRequestHide?.();
    }
  };

  useEffect(() => {
    return () => {
      if (touchCloseTimer.current !== null) window.clearTimeout(touchCloseTimer.current);
    };
  }, []);

  // A bubble left open across a mode change would offer actions the new mode
  // no longer allows; one left open on a card that has since been played would
  // never close at all. Mirrors MobileCardZone's own reset effect.
  useEffect(() => {
    setTappedId(null);
  }, [selectionActive]);

  useEffect(() => {
    setTappedId((current) => (current && !cards.some((c) => c.instanceId === current) ? null : current));
  }, [cards]);

  // MUST stay above the `cards.length === 0` early return below: a hook after
  // a conditional return runs on some renders and not others, which is exactly
  // the "Rendered more hooks than during the previous render" crash — it fired
  // whenever a hand emptied and refilled mid-match.
  //
  // While a play awaits confirmation the drag is already over, so resolve the
  // host zone here rather than from the pointer handler.
  useEffect(() => {
    if (!pendingPlayInstanceId) return;
    const pending = cards.find((c) => c.instanceId === pendingPlayInstanceId);
    const zone = playDropZoneFor(pending?.category);
    setPreviewHost(zone ? findPlayZoneHost(zone) : null);
  }, [pendingPlayInstanceId, cards]);

  if (cards.length === 0) return null;

  const draggedCard = draggingId ? orderedCards.find((c) => c.instanceId === draggingId) ?? null : null;

  // The card whose ghost belongs on the field: the one being dragged over the
  // drop zone, or — after release — the one waiting on the DON!! cost prompt.
  const pendingCard = pendingPlayInstanceId
    ? orderedCards.find((c) => c.instanceId === pendingPlayInstanceId) ?? null
    : null;
  const fieldGhostCard = pendingCard ?? (dragActive && dropIntent === 'play' ? draggedCard : null);

  return (
    <>
      {/* Arrow keyframes — rendered once, harmless if duplicated */}
      <style>{ARROW_STYLE}</style>

      {/* The dragged card itself: a fixed-position ghost pinned to the pointer
          at the exact offset it was grabbed. Rendered to document.body so no
          ancestor's overflow, transform or stacking context can clip or
          displace it, which is what keeps it locked to the cursor. */}
      {dragActive && dragPointer && draggedCard
        ? createPortal(
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-[999]"
              style={{
                left: `${dragPointer.x - grabOffsetRef.current.x}px`,
                top: `${dragPointer.y - grabOffsetRef.current.y}px`,
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
              }}
            >
              <div
                className={[
                  'h-full w-full overflow-hidden rounded-[4px] shadow-[0_12px_30px_rgba(0,0,0,0.7)]',
                  dropIntent === 'play' ? 'ring-2 ring-emerald-400 brightness-110' : 'ring-2 ring-white/70',
                ].join(' ')}
                style={{ transform: 'scale(1.06)' }}
              >
                <CardImage src={draggedCard.imageUrl ?? null} alt="" />
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Landing preview: while the drag hovers your field, a heavily dimmed
          ghost of the card appears in the Character Area so you can see where
          it will go before you commit. Portalled into the real zone so it sits
          in the actual card row and inherits its sizing; purely visual —
          nothing is played until pointerup, and the DON!! cost is still paid
          and validated by playHandCard. */}
      {previewHost && fieldGhostCard
        ? createPortal(
            // The real BoardCardTile, not a hand-rolled copy: it is portalled
            // into the actual Character Area, so its cqh-based sizing resolves
            // against the same container as every played card and matches them
            // by construction. The wrapper mirrors PlayerBoardPanel's
            // HoverableFieldCard box (h-full, flex-shrink-0, centred) so the
            // ghost occupies an identical slot in the row.
            <div
              aria-hidden="true"
              data-play-ghost="true"
              className="pointer-events-none flex h-full flex-shrink-0 items-center justify-center opacity-40"
            >
              <BoardCardTile card={fieldGhostCard} size="field" />
            </div>,
            previewHost,
          )
        : null}

      <div
        aria-label={`${isOwn ? 'Your' : "Opponent's"} hand — ${cards.length} card${cards.length !== 1 ? 's' : ''}`}
        className={['pointer-events-none absolute left-0 right-0 flex justify-center', hoveredIdx !== null ? 'z-[220]' : 'z-[100]'].join(' ')}
        style={{
          // Absolute inside .op-mobile-match-center (NOT fixed to the
          // viewport): the centre already starts below the mobile action
          // header, and a viewport-anchored dock drew the opponent's hand
          // straight over that header. The small inset keeps the cards clear
          // of the screen edge — and of a phone's home indicator — instead of
          // sitting flush against it where a pixel of container/viewport
          // disagreement shaves off their bottom row.
          [isTop ? 'top' : 'bottom']: tapActions
            ? `calc(env(safe-area-inset-${isTop ? 'top' : 'bottom'}, 0px) + ${isTop ? 4 : 10}px)`
            : 0,
          height: `${cardHeight}px`,
          overflow: 'visible',
        }}
        data-board-zone="hand"
        data-board-player={playerId}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(event) => {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          touchStartX.current = null;
          touchStartY.current = null;
          touchLastX.current = null;
          touchHorizontalSwipe.current = false;
        }}
      >
        <div
          ref={stripRef}
          className="pointer-events-auto"
          style={{
            maxWidth: usesTouchScroll ? '100%' : undefined,
            overflowX: usesTouchScroll ? 'auto' : 'visible',
            scrollbarWidth: usesTouchScroll ? 'none' : undefined,
            // Headroom for the tap lift. It has to live on the SCROLLER, not
            // on the row inside it: overflow-x: auto forces overflow-y to
            // auto, so this element is what clips, and a scroll container
            // clips at its PADDING box — content inside the padding survives,
            // content above the box does not. (Padding on the row did nothing
            // for this; the lifted card was still cut off at the strip's top
            // edge.) The negative margin cancels the padding again so the
            // strip's layout box, and every card in it, stays put.
            paddingBlock: liftRoomPx ? `${liftRoomPx}px` : undefined,
            marginBlock: liftRoomPx ? `-${liftRoomPx}px` : undefined,
            // ...and with headroom comes reach: an auto-pointer-events box now
            // covers a band of the board. Turn it off here and back on per
            // card (see DockHandCard) so only the cards themselves are hit.
            pointerEvents: tapActions ? 'none' : undefined,
            transform: `translateY(${translateY}px)`,
            touchAction: touchReveal ? 'none' : undefined,
            transition: isOpen
              ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
              : boardFocused
                ? 'transform 0.2s ease-in'
                : 'transform 0.25s ease-in',
          }}
          onMouseEnter={() => setDockHovered(true)}
          onMouseLeave={() => { setDockHovered(false); setHoveredIdx(null); }}
        >
          <div
            className="relative flex items-end"
            style={{
              minWidth: usesTouchScroll ? 'max-content' : undefined,
              paddingInline: usesTouchScroll ? `${Math.round(cardWidth * 0.35)}px` : undefined,
              paddingBlock: usesTouchScroll && !tapActions ? `${Math.round(cardHeight * 0.32)}px` : undefined,
              marginBlock: usesTouchScroll && !tapActions ? `-${Math.round(cardHeight * 0.32)}px` : undefined,
              overflow: 'visible',
            }}
          >
            <div
              aria-hidden="true"
              data-board-card-anchor
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[4px]"
              style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}
            />
            {needsWindowScroll && (
              <ArrowBtn dir="left" disabled={windowStart === 0} onClick={scrollLeft} width={arrowWidth} height={cardHeight} />
            )}

            {visibleCards.map((card, i) => (
              <DockHandCard
                key={card.instanceId}
                card={card}
                index={i}
                hoveredIdx={hoveredIdx}
                isTop={isTop}
                isSelected={selectedIds.has(card.instanceId)}
                canSelect={selectable(card)}
                canPlay={canPlay?.(card) ?? false}
                isDimmed={dimmed?.(card) ?? false}
                badge={cardBadge?.(card) ?? null}
                showFaces={showFaces}
                overlapPx={cardWidth * (overlapRatio ?? OVERLAP)}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                onHoverStart={() => { if (!draggingId) setHoveredIdx(i); }}
                onHoverEnd={() => setHoveredIdx(null)}
                onTap={() => onCardTap(card)}
                onPlay={() => onPlayCard?.(card)}
                onZoom={() => onCardZoom(card)}
                registerEl={(id, el) => { cardElRefs.current.set(id, el); }}
                onDragStart={beginCardDrag}
                isDragging={dragActive && draggingId === card.instanceId}
                dropIntent={dropIntent}
                shouldSuppressClick={consumeDragClick}
                playerId={playerId}
                tapActions={tapActions}
                selectionActive={selectionActive}
                isTapped={tappedId === card.instanceId}
                onToggleActions={() => setTappedId((current) => (current === card.instanceId ? null : card.instanceId))}
                onCloseActions={closeActions}
              />
            ))}

            {needsWindowScroll && (
              <ArrowBtn dir="right" disabled={windowStart + maxVisible >= cards.length} onClick={scrollRight} width={arrowWidth} height={cardHeight} />
            )}
          </div>
        </div>
      </div>
    </>
  );
});
