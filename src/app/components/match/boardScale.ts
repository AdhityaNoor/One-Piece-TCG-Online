/**
 * Single source of truth for converting the match board's historical
 * fixed-px card constants (PlayerBoardPanel's FIELD_CARD_WIDTH/HEIGHT,
 * DonChip's CARD_WIDTH/CARD_HEIGHT/BOX, DonStack's CHIP_BOX/STEP_PX,
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
 * Converts a legacy fixed-px length into a container-query length that is the
 * smaller of its height-driven (`cqh`) and width-driven (`cqw`) size, so the
 * board scales down on narrow viewports as well as short ones. Emitted with no
 * space after the comma so it stays valid if ever used inside a Tailwind
 * arbitrary value, not just an inline style / calc().
 */
export function cqh(px: number): string {
  const h = (px / REFERENCE_HEIGHT) * 100;
  const w = (px / REFERENCE_WIDTH) * 100;
  return `min(${h}cqh,${w}cqw)`;
}
