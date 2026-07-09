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
 * Touch: TODO — mouse-driven only for now.
 */

import { useLayoutEffect, useState } from 'react';
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
const SCALE_AT_DIST: Record<number, number> = { 0: 1.55, 1: 1.25, 2: 1.08 };

function cardScale(idx: number, hoveredIdx: number | null): number {
  if (hoveredIdx === null) return 1;
  return SCALE_AT_DIST[Math.abs(idx - hoveredIdx)] ?? 1;
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface DockHandProps {
  playerId: string;
  cards: CardView[];
  isOwn: boolean;
  position: 'bottom' | 'top';
  selectedIds: Set<string>;
  selectable: (card: CardView) => boolean;
  canPlay?: (card: CardView) => boolean;
  onCardTap: (card: CardView) => void;
  onPlayCard?: (card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  /** When true the dock slides fully off screen (board is being interacted with). */
  boardFocused: boolean;
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
}: {
  dir: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center"
      style={{ zIndex: 60, width: ARROW_W, height: BASE_H }}
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
  showFaces,
  overlapPx,
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
  showFaces: boolean;
  overlapPx: number;
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
        width: `${BASE_W}px`,
        height: `${BASE_H}px`,
        marginLeft: index === 0 ? 0 : `-${overlapPx}px`,
        transform: `scale(${scale})`,
        transformOrigin: isTop ? 'top center' : 'bottom center',
        transition: 'transform 0.18s ease-out',
        zIndex: isHoveredCard ? 50 : index + 1,
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
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export function DockHand({
  playerId,
  cards,
  isOwn,
  position,
  selectedIds,
  selectable,
  canPlay,
  onCardTap,
  onPlayCard,
  onCardZoom,
  boardFocused,
}: DockHandProps) {
  const [dockHovered, setDockHovered] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [windowStart, setWindowStart] = useState(0);
  const hiddenDuringFlight = useCardAnimationStore((s) => s.hiddenDuringFlight);

  // Keep cards that are mid-flight in the visible window so animation can
  // measure their dock slot (see CardMovementOverlay / boardAnchors.ts).
  useLayoutEffect(() => {
    if (cards.length <= MAX_VISIBLE) return;
    setWindowStart((current) => {
      let next = current;
      for (let i = 0; i < cards.length; i++) {
        if (!hiddenDuringFlight[cards[i].instanceId]) continue;
        if (i < next) next = i;
        if (i >= next + MAX_VISIBLE) next = Math.max(0, i - MAX_VISIBLE + 1);
      }
      return next;
    });
  }, [cards, hiddenDuringFlight]);

  const isTop = position === 'top';
  const isOpen = dockHovered && !boardFocused;
  const showFaces = isOwn || isOpen;

  // Three translate states:
  //  open        → 0          (fully visible)
  //  boardFocused → ±BASE_H   (fully off screen — slide away)
  //  idle peek   → ±BASE_H*PEEK (50 % hidden at edge)
  const peekPx = BASE_H * PEEK;
  const translateY = isOpen
    ? 0
    : boardFocused
      ? (isTop ? -BASE_H : BASE_H)
      : (isTop ? -peekPx : peekPx);

  const needsScroll = cards.length > MAX_VISIBLE;
  const visibleCards = needsScroll
    ? cards.slice(windowStart, windowStart + MAX_VISIBLE)
    : cards;

  function scrollLeft() { setWindowStart((s) => Math.max(0, s - 1)); setHoveredIdx(null); }
  function scrollRight() { setWindowStart((s) => Math.min(cards.length - MAX_VISIBLE, s + 1)); setHoveredIdx(null); }

  if (cards.length === 0) return null;

  return (
    <>
      {/* Arrow keyframes — rendered once, harmless if duplicated */}
      <style>{ARROW_STYLE}</style>

      <div
        aria-label={`${isOwn ? 'Your' : "Opponent's"} hand — ${cards.length} card${cards.length !== 1 ? 's' : ''}`}
        className="pointer-events-none absolute left-0 right-0 z-[100] flex justify-center"
        style={{ [isTop ? 'top' : 'bottom']: 0, height: `${BASE_H}px`, overflow: 'visible' }}
        data-board-zone="hand"
        data-board-player={playerId}
      >
        <div
          className="pointer-events-auto relative flex items-end"
          style={{
            transform: `translateY(${translateY}px)`,
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
            aria-hidden="true"
            data-board-card-anchor
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[4px]"
            style={{ width: `${BASE_W}px`, height: `${BASE_H}px` }}
          />
          {needsScroll && (
            <ArrowBtn dir="left" disabled={windowStart === 0} onClick={scrollLeft} />
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
              showFaces={showFaces}
              overlapPx={BASE_W * OVERLAP}
              onHoverStart={() => setHoveredIdx(i)}
              onHoverEnd={() => setHoveredIdx(null)}
              onTap={() => onCardTap(card)}
              onPlay={() => onPlayCard?.(card)}
              onZoom={() => onCardZoom(card)}
            />
          ))}

          {needsScroll && (
            <ArrowBtn dir="right" disabled={windowStart + MAX_VISIBLE >= cards.length} onClick={scrollRight} />
          )}
        </div>
      </div>
    </>
  );
}
