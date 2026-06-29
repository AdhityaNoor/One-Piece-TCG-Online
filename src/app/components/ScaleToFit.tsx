/**
 * Layer 3/4 generic UI utility (not board-specific): establishes a CSS
 * containment context so descendants can size themselves directly off THIS
 * element's own rendered height, via the `cqh` container-query unit
 * (1cqh = 1% of the nearest ancestor with `container-type` containment —
 * this element). It no longer does any scaling itself.
 *
 * Why this exists: the match board (PlayerBoardPanel, DonChip, DonStack,
 * PileStack, LifeStack, etc.) is built mostly from fixed-pixel card
 * dimensions (e.g. FIELD_CARD_WIDTH = 150) specifically so every internal
 * position is exact and predictable — see PlayerBoardPanel.tsx's boardRow
 * comment for the layout bug that fixed-pixel anchoring was put in place to
 * solve. Those constants have since been converted to `cqh`-based values
 * (see boardScale.ts's `cqh()` helper) instead of literal px, so they shrink
 * and grow with this container's height while every ratio between them
 * (fan offsets, stack steps, grid track widths) stays exactly as it was —
 * cqh is a pure linear rescale, nothing more.
 *
 * History — three earlier JS `transform: scale()` attempts were tried and
 * reverted here before landing on plain CSS containment:
 * - v1 froze the container's *measured* size on first layout, then scaled
 *   uniformly. The first measurement could land during a transient layout
 *   (a narrower single-column breakpoint before the real two-column board
 *   settled), freezing the wrong aspect ratio for the whole session —
 *   that produced visible dead-space bars.
 * - v2 "fixed" the dead space with independent per-axis scaling
 *   (scaleX != scaleY), which filled the container but literally stretched
 *   every card's art and every DON!! chip non-uniformly whenever the
 *   container's aspect ratio strayed from the assumed reference — this is
 *   what produced the "thin elongated DON!! chip" distortion bug.
 * - v3 went back to a single uniform factor (`Math.min(scaleX, scaleY)`)
 *   against a constant reference size. That fixed the distortion, but a
 *   uniform factor that ALSO controls width necessarily letterboxes
 *   (blank bars on two sides) whenever the container is wider than the
 *   reference ratio needs — which is exactly what the live board hit: the
 *   whole Hand+Board+Trash row was frozen at a fixed pixel width regardless
 *   of how much more space the window actually had, even though
 *   PlayerSideRow's own CSS grid (`180px minmax(0,1fr) 180px`) was already
 *   designed to stretch its middle column to fill 100% of the row.
 *
 * This version drops the whole "one JS-computed factor for everything"
 * idea. Width is left completely alone — the pre-existing CSS grid/flex
 * layout (PlayerSideRow's columns, PlayerBoardPanel's mat grid, boardRow's
 * absolute anchoring) already stretches to fill available width on its
 * own, which is what "the card field container stretches horizontally"
 * actually wanted. Only the leaf-level fixed-px CARD sizes are tied to this
 * container's height (via cqh), which is what makes "all cards shrink when
 * the viewport shrinks" true without ever distorting card art: cqh scales
 * width and height of each card box by the identical factor, by
 * construction, so there's no axis-mismatch to go wrong.
 *
 * Known limitation: `container-type: size` requires this element to have an
 * explicit height from its own layout (it does — h-full inside the match
 * screen's flex/grid shell), and cqh-based card sizing only responds to
 * this container's HEIGHT, not its width — see boardScale.ts for why, and
 * for the narrow-viewport edge case that isn't handled by this alone.
 */
import type { ReactNode } from 'react';

export interface ScaleToFitProps {
  children: ReactNode;
  className?: string;
}

export function ScaleToFit({ children, className = '' }: ScaleToFitProps) {
  return (
    <div className={['h-full w-full overflow-hidden', className].join(' ')} style={{ containerType: 'size' }}>
      {children}
    </div>
  );
}
