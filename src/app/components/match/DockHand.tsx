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
 * Touch: TODO — mouse-driven only for now.
 */

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import type { CardView } from '../../../board/projection';
import { useCardAnimationStore } from '../../store/cardAnimationStore';
import { useCardFlightHidden } from '../../hooks/useCardFlightHidden';
import { CardImage } from '../CardImage';
import { CardBackArt } from './CardBackArt';

// ── Geometry ───────────────────────────────────────────────────────────────
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
  onPlayCard?: (card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  /** When true the dock slides fully off screen (board is being interacted with). */
  boardFocused: boolean;
  /** Optional per-render geometry override, used by mobile without changing desktop sizing. */
  cardWidthPx?: number;
  maxVisibleCards?: number;
  restPeekRatio?: number;
  touchReveal?: boolean;
  forceOpen?: boolean;
  onRequestHide?: () => void;
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
}) {
  const hiddenDuringFlight = useCardFlightHidden(card.instanceId);
  const scale = cardScale(index, hoveredIdx);
  const isHoveredCard = hoveredIdx === index;

  return (
    <div
      className={[
        'group/dock-card relative flex-shrink-0',
        hiddenDuringFlight ? 'invisible' : '',
      ].join(' ')}
      data-card-instance-id={card.instanceId}
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        marginLeft: index === 0 ? 0 : `-${overlapPx}px`,
        transform: `scale(${scale})`,
        transformOrigin: isTop ? 'top center' : 'bottom center',
        transition: 'transform 0.18s ease-out, opacity 0.15s ease-out',
        zIndex: isHoveredCard ? 50 : index + 1,
        opacity: isDimmed ? 0.4 : 1,
      }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={() => { if (canSelect) onTap(); }}
    >
      <div
        className={[
          'h-full w-full overflow-hidden rounded-[4px] border shadow-[0_6px_18px_rgba(0,0,0,0.6)]',
          isSelected
            ? 'border-gold ring-2 ring-gold/70 ring-offset-1 ring-offset-navy-950'
            : canSelect && isHoveredCard
              ? 'border-gold cursor-pointer'
              : canSelect
                ? 'border-gold/45 cursor-pointer'
                : 'border-white/20 cursor-default',
        ].join(' ')}
      >
        {showFaces ? (
          <CardImage src={card.imageUrl ?? null} alt={card.cardNumber ?? card.instanceId} />
        ) : (
          <CardBackArt tone="navy" />
        )}
      </div>

      {isHoveredCard && showFaces && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-b-[4px] border-t border-white/15 shadow-[0_-8px_16px_rgba(0,0,0,0.35)]">
          {canPlay && (
            <button
              type="button"
              aria-label={`Play ${card.name}`}
              className="bg-gold/95 py-1 text-center text-[10px] font-black uppercase tracking-[0.1em] text-navy-950 transition-colors hover:bg-gold"
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
            >
              Play
            </button>
          )}
          <button
            type="button"
            aria-label="View card detail"
            className="bg-black/86 py-1 text-center text-[10px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-black"
            onClick={(e) => { e.stopPropagation(); onZoom(); }}
          >
            View
          </button>
        </div>
      )}

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
export function DockHand({
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
  onCardZoom,
  boardFocused,
  cardWidthPx,
  maxVisibleCards,
  restPeekRatio,
  touchReveal = false,
  forceOpen = false,
  onRequestHide,
}: DockHandProps) {
  const [dockHovered, setDockHovered] = useState(false);
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

  const usesTouchScroll = touchReveal;
  const needsScroll = cards.length > maxVisible;
  const needsWindowScroll = needsScroll && !usesTouchScroll;
  const visibleCards = needsWindowScroll
    ? cards.slice(windowStart, windowStart + maxVisible)
    : cards;

  function scrollLeft() { setWindowStart((s) => Math.max(0, s - 1)); setHoveredIdx(null); }
  function scrollRight() { setWindowStart((s) => Math.min(cards.length - maxVisible, s + 1)); setHoveredIdx(null); }

  const revealForTouch = (): void => {
    if (!touchReveal) return;
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

    if (absY < 24) return;

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

  if (cards.length === 0) return null;

  return (
    <>
      {/* Arrow keyframes — rendered once, harmless if duplicated */}
      <style>{ARROW_STYLE}</style>

      <div
        aria-label={`${isOwn ? 'Your' : "Opponent's"} hand — ${cards.length} card${cards.length !== 1 ? 's' : ''}`}
        className={['pointer-events-none absolute left-0 right-0 flex justify-center', hoveredIdx !== null ? 'z-[220]' : 'z-[100]'].join(' ')}
        style={{ [isTop ? 'top' : 'bottom']: 0, height: `${cardHeight}px`, overflow: 'visible' }}
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
              paddingBlock: usesTouchScroll ? `${Math.round(cardHeight * 0.32)}px` : undefined,
              marginBlock: usesTouchScroll ? `-${Math.round(cardHeight * 0.32)}px` : undefined,
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
                overlapPx={cardWidth * OVERLAP}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                onHoverStart={() => setHoveredIdx(i)}
                onHoverEnd={() => setHoveredIdx(null)}
                onTap={() => onCardTap(card)}
                onPlay={() => onPlayCard?.(card)}
                onZoom={() => onCardZoom(card)}
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
}
