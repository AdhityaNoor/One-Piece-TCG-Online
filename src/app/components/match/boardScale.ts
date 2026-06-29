/**
 * Single source of truth for converting the match board's historical
 * fixed-px card constants (PlayerBoardPanel's FIELD_CARD_WIDTH/HEIGHT,
 * DonChip's CARD_WIDTH/CARD_HEIGHT/BOX, DonStack's CHIP_BOX/STEP_PX,
 * PileStack's field/compact box sizes, BoardCardTile's leader/board SIZE_PX)
 * into CSS container-query height units (`cqh`) instead of literal px.
 * `1cqh` = 1% of the nearest ancestor element that has `container-type`
 * containment (see ScaleToFit.tsx) and an actual rendered height — so every
 * card-sized box shrinks/grows in lockstep with that ancestor's height,
 * with zero JS measurement and zero risk of position drift: this is a pure
 * linear rescale of numbers that already encoded every working ratio
 * (fan offsets, stack steps, grid track widths), so multiplying all of them
 * by the same conversion preserves every relationship exactly.
 *
 * Deliberately HEIGHT-only, not a width/height blend: the project
 * prioritizes landscape play, where height is normally the real space
 * constraint, and tying card size to height alone (rather than min(width,
 * height) like the now-reverted ScaleToFit v1-v3 JS transform) is what lets
 * the existing CSS grid/flex layout (PlayerSideRow's 180px/1fr/180px
 * columns, PlayerBoardPanel's mat grid, boardRow's absolute anchoring) keep
 * stretching to fill 100% of whatever width is available, instead of being
 * recompressed by a width-driven factor — see project memory
 * project_board_responsive_scaling.md for the three earlier, reverted,
 * width-coupled attempts and exactly why each one broke.
 *
 * Known limitation: a sufficiently narrow (but tall) viewport can still
 * make the fixed-anchored boardRow groups (DON!! piles, Stage/Deck, Leader)
 * overlap rather than shrink, exactly as already documented in
 * PlayerBoardPanel.tsx's boardRow comment — width-driven shrinking isn't
 * handled here, only height-driven. If that becomes a real problem, the fix
 * is a `min(Xcqh, Ycqi)` per measurement, not reintroducing a JS transform.
 */

// The board's fixed-px constants were originally hand-tuned against a board
// that rendered at roughly this height. Only the RATIO of each constant to
// this number matters — the number itself was never measured, it's a
// nominal reference for the conversion below.
const REFERENCE_HEIGHT = 1100;

/** Converts a legacy fixed-px length into the equivalent cqh CSS value. */
export function cqh(px: number): string {
  return `${(px / REFERENCE_HEIGHT) * 100}cqh`;
}
