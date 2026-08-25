/**
 * Single source of truth for converting the match board's historical
 * fixed-px card constants (PlayerBoardPanel's FIELD_CARD_WIDTH/HEIGHT,
 * DonChip's CARD_WIDTH/CARD_HEIGHT/BOX, DonStack's chip box and fan step,
 * PileStack's field/compact box sizes, BoardCardTile's leader/board SIZE_PX)
 * into container-query units instead of literal px. `1cqh` = 1% of the
 * nearest ancestor with `container-type: size` containment (see ScaleToFit.tsx)
 * height; `1cqw` = 1% of that same ancestor's width. Every card-sized box
 * therefore shrinks/grows in lockstep with that ancestor, with zero JS
 * measurement and zero position drift: this is a pure linear rescale of
 * numbers that already encoded every working ratio (fan offsets, stack steps,
 * grid track widths), so multiplying all of them by the same factor preserves
 * every relationship exactly.
 *
 * Height AND width, via `min(Xcqh, Ycqw)` per measurement.
 * Sizing was originally HEIGHT-only (cqh alone), because the project
 * prioritizes landscape play where height is normally the space constraint,
 * and because the reverted ScaleToFit v1–v3 JS transforms proved that a single
 * width-driven factor letterboxes/distorts (see ScaleToFit.tsx history). But a
 * narrow-but-tall viewport left card size tied to height alone, so the
 * fixed-anchored boardRow groups (DON!! piles, Leader, Stage/Trash) and the
 * character row overflowed their cells and overlapped instead of shrinking.
 *
 * The fix (the one the reverted-history note itself recommended) is a
 * PER-MEASUREMENT `min(Xcqh, Ycqw)`: each box is the smaller of its
 * height-driven and width-driven size. This is NOT the reverted global JS
 * `transform: scale()` — the CSS grid/flex layout still stretches to fill
 * available width on its own; only the leaf card sizes get an extra width cap.
 * Because both axes of every box are scaled by the identical factor
 * (whichever `min` wins), card art is never distorted — the failure mode of
 * ScaleToFit v2.
 *
 * The crossover is set by REFERENCE_WIDTH / REFERENCE_HEIGHT: when the
 * container is WIDER than that ratio, height wins (unchanged landscape
 * behavior); when NARROWER, width wins and every card/track shrinks together.
 * REFERENCE_WIDTH is the board's natural content width at REFERENCE_HEIGHT
 * (Life + up to 5 field-size Characters + Deck across the widest row), so the
 * width cap engages just before those cells would collide.
 */

// The board's fixed-px constants were hand-tuned against a board that rendered
// at roughly this height; only the RATIO of each constant to this number
// matters. REFERENCE_WIDTH is the matching nominal content width at that
// height (its ratio to REFERENCE_HEIGHT — ~1.6 — is the aspect at which the
// board is snug and the width cap starts to bite).
const REFERENCE_HEIGHT = 1100;
const REFERENCE_WIDTH = 1800;

/**
 * Name of the CSS custom property every cqh() length is multiplied by.
 *
 * It exists because the DESKTOP mat grew a third row — Character Area /
 * Leader+Stage+Trash / DON!! stacked vertically per player (see
 * PlayerBoardPanel.tsx's `mat`) — and three rows of the old card size do not
 * fit in one player's half of the board. Every row is the same height and
 * every card (DON!! chips included) is the same size, so the only way to buy
 * the third row is to make all of them proportionally smaller.
 *
 * Doing that by editing the constants themselves, or by folding a factor into
 * cqh() unconditionally, would ALSO shrink the mobile mat: mobile renders the
 * same cqh-sized leaves (BoardCardTile/DonChip/PileStack/CountBadge) inside
 * its own `container-type: size` box (.op-mobile-match) and has its own
 * two-row layout that does not need the extra room. A CSS variable keeps the
 * change where it belongs — PlayerBoardPanel sets it on its own root, so it
 * inherits to every desktop board leaf and to nothing else. Anything that
 * never sees the variable falls back to 1 and is pixel-identical to before.
 */
export const BOARD_CARD_SCALE_VAR = '--op-card-scale';

/**
 * Value PlayerBoardPanel (the desktop mat) sets BOARD_CARD_SCALE_VAR to.
 *
 * The arithmetic, at a container height H (the .op-match-playmat-layer box,
 * which is what cqh resolves against):
 *   one player's half        = (H - battle line ~16 - two 8px gaps) / 2
 *   mat padding (p-1)        = 8
 *   two row gaps (gap-y-0.5) = 4
 *   three equal card rows    = 3 * 210s * H / 1100
 * which solves to s <= 0.873 - 41.9/H. Note the fixed-px terms: they do not
 * shrink with the board, so the bound is TIGHTER on a small window than on a
 * large one — 0.807 at 1080p but only 0.774 at 720p. A value chosen against a
 * big monitor alone therefore ships a board that overflows its own mat on a
 * laptop, which is exactly what an earlier 0.8 did here.
 *
 * 0.78 clears the bound down to a ~650px-tall window. It was picked by
 * measuring a real render (Playwright, 1100x650 through 2560x1440, five rested
 * Characters and a full Cost Area) and taking the largest value with zero
 * clipping at every size, not by trusting this comment's algebra.
 *
 * Because cqh() is a pure linear rescale, multiplying every constant by the
 * same s preserves every ratio the board depends on exactly (fan offsets,
 * stack steps, grid track widths, the Leader centring offset) — the same
 * property that made the px -> cqh conversion safe in the first place.
 */
export const DESKTOP_BOARD_CARD_SCALE = 0.78;

/**
 * Converts a legacy fixed-px length into a container-query length that is the
 * smaller of its height-driven (`cqh`) and width-driven (`cqw`) size, so the
 * board scales down on narrow viewports as well as short ones, then multiplies
 * that by the inherited BOARD_CARD_SCALE_VAR (default 1 — see above).
 *
 * Emitted with no space after the comma inside min() so it stays valid if ever
 * used inside a Tailwind arbitrary value, not just an inline style / calc().
 * The result is a calc(), so it nests fine inside a caller's own calc()
 * (PileStack and PlayerBoardPanel's MAT_MAX_WIDTH both do this).
 */
export function cqh(px: number): string {
  const h = (px / REFERENCE_HEIGHT) * 100;
  const w = (px / REFERENCE_WIDTH) * 100;
  return `calc(var(${BOARD_CARD_SCALE_VAR},1) * min(${round(h)}cqh,${round(w)}cqw))`;
}

/** Keeps emitted style strings readable; 4dp is far below one device pixel at any real board size. */
function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
