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

import { useState } from 'react';
import type { CardView } from '../../../board/projection';
import { CardBackArt } from './CardBackArt';
import { CardImage } from '../CardImage';

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
  cards: CardView[];
  isOwn: boolean;
  position: 'bottom' | 'top';
  selectedIds: Set<string>;
  selectable: (card: CardView) => boolean;
  onCardTap: (card: CardView) => void;
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

// ── Component ──────────────────────────────────────────────────────────────
export function DockHand({
  cards,
  isOwn,
  position,
  selectedIds,
  selectable,
  onCardTap,
  onCardZoom,
  boardFocused,
}: DockHandProps) {
  const [dockHovered, setDockHovered] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [windowStart, setWindowStart] = useState(0);

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
      >
        <div
          className="pointer-events-auto flex items-end"
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
          {needsScroll && (
            <ArrowBtn dir="left" disabled={windowStart === 0} onClick={scrollLeft} />
          )}

          {visibleCards.map((card, i) => {
            const scale = cardScale(i, hoveredIdx);
            const isSelected = selectedIds.has(card.instanceId);
            const canSelect = selectable(card);
            const isHoveredCard = hoveredIdx === i;

            return (
              <div
                key={card.instanceId}
                className="group/dock-card relative flex-shrink-0"
                style={{
                  width: `${BASE_W}px`,
                  height: `${BASE_H}px`,
                  marginLeft: i === 0 ? 0 : `-${BASE_W * OVERLAP}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: isTop ? 'top center' : 'bottom center',
                  transition: 'transform 0.18s ease-out',
                  zIndex: isHoveredCard ? 50 : i + 1,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => { if (canSelect) onCardTap(card); }}
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
                  <button
                    type="button"
                    aria-label="View card detail"
                    className="absolute inset-x-0 bottom-0 bg-black/80 py-1 text-center text-[10px] font-black uppercase tracking-[0.1em] text-white"
                    onClick={(e) => { e.stopPropagation(); onCardZoom(card); }}
                  >
                    View
                  </button>
                )}

                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border border-navy-950 bg-gold shadow-[0_0_6px_rgba(217,164,65,0.7)]"
                  />
                )}
              </div>
            );
          })}

          {needsScroll && (
            <ArrowBtn dir="right" disabled={windowStart + MAX_VISIBLE >= cards.length} onClick={scrollRight} />
          )}
        </div>
      </div>
    </>
  );
}
