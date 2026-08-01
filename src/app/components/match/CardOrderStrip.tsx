/**
 * Drag-to-reorder strip for deck-return ordering prompts — "place them at the
 * top or bottom of your deck in any order".
 *
 * Shows every card already in a default order (deck order, top-most first —
 * see cardOrdering.defaultOrder) with a 1..N position badge, so confirming
 * without touching anything returns the cards exactly as they were. Dragging a
 * card reorders live: the list reflows under the pointer, and the drop is
 * simply wherever the reflow left it.
 *
 * Pointer Events give mouse, touch and pen in one code path. `touch-action:
 * none` on each card stops the browser treating a horizontal drag as a scroll
 * gesture, and setPointerCapture keeps events flowing to the card the drag
 * started on even when the pointer outruns it.
 *
 * Pure presentational: no engine imports and no dispatch — the parent
 * (PendingChoicePrompt) owns the order state and the RESOLVE action. Ordering
 * carries no rules meaning here; the engine applies the submitted sequence in
 * effectContext.searchResolveTopOrBottom.
 */
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CardImage } from '../CardImage';
import { moveInOrder, targetIndexForPointer } from './cardOrdering';
import type { CardView } from '../../../board/projection';

export interface CardOrderStripProps {
  /** Every card in the prompt, in any order — `order` decides what's rendered. */
  cards: CardView[];
  /** Current ordering by instanceId; index 0 is the first card back onto the deck. */
  order: string[];
  onReorder: (nextOrder: string[]) => void;
  /** Caption under the strip explaining which end of the deck position 1 means. */
  hint?: string;
}

export function CardOrderStrip({ cards, order, onReorder, hint }: CardOrderStripProps) {
  const cardById = new Map(cards.map((card) => [card.instanceId, card]));
  const itemRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handlePointerDown = useCallback((instanceId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    // Ignore secondary buttons so right-click never starts a drag.
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(instanceId);
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingId) return;
      const from = order.indexOf(draggingId);
      if (from < 0) return;

      // Measured live rather than cached at drag start: the strip reflows on
      // every swap, so cached centres would be stale after the first move.
      const centers = order.map((id) => {
        const el = itemRefs.current.get(id);
        if (!el) return Number.POSITIVE_INFINITY;
        const rect = el.getBoundingClientRect();
        return rect.left + rect.width / 2;
      });

      const to = targetIndexForPointer(centers, from, event.clientX);
      if (to !== from) onReorder(moveInOrder(order, from, to));
    },
    [draggingId, onReorder, order],
  );

  const endDrag = useCallback(() => setDraggingId(null), []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-center gap-2 py-1">
        {order.map((instanceId, index) => {
          const card = cardById.get(instanceId);
          if (!card) return null;
          const isDragging = draggingId === instanceId;

          return (
            <div
              key={instanceId}
              ref={(el) => {
                itemRefs.current.set(instanceId, el);
              }}
              onPointerDown={(event) => handlePointerDown(instanceId, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              role="button"
              tabIndex={0}
              aria-label={`${card.name}, position ${index + 1} of ${order.length}`}
              title={`${card.name} — drag to reorder`}
              style={{ touchAction: 'none' }}
              className={[
                'group relative w-[7.5rem] max-w-[28vw] cursor-grab select-none transition-transform duration-150',
                isDragging ? 'z-20 scale-[1.06] cursor-grabbing' : 'hover:-translate-y-0.5',
              ].join(' ')}
            >
              <CardImage
                src={card.imageUrl}
                alt={card.name}
                className={[
                  'pointer-events-none rounded-none ring-1',
                  isDragging ? 'ring-gold shadow-[0_14px_34px_rgba(0,0,0,0.5)]' : 'ring-white/15 group-hover:ring-white/30',
                ].join(' ')}
              />
              <span className="pointer-events-none absolute -left-1.5 -top-1.5 z-10 flex h-6 min-w-6 items-center justify-center border border-white/20 bg-black/70 px-1 text-[10px] font-black text-white/85 backdrop-blur-md">
                {index + 1}
              </span>
              <p className="pointer-events-none mt-1 truncate text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
                {card.name}
              </p>
            </div>
          );
        })}
      </div>
      {hint ? <p className="text-center text-[10px] uppercase tracking-[0.14em] text-white/40">{hint}</p> : null}
    </div>
  );
}
