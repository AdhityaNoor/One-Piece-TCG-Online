/**
 * Resolves a TutorialAnchorId to a live DOM rect, so the spotlight overlay
 * can point at the real board without the tutorial module ever importing or
 * editing PlayerBoardPanel/DockHand/ActionBar. It queries the
 * `data-board-zone` / `data-board-player` attributes those components
 * ALREADY carry for other purposes (see grep results in types.ts's doc
 * comment) — the one exception is `leaderZone`, which needed a single
 * additive attribute added to PlayerBoardPanel.tsx's `leaderGroup` to match
 * the existing convention (no new pattern introduced, just one more
 * instance of the one already used everywhere else on that file).
 */
import type { TutorialAnchorId } from './types';

const ZONE_SELECTOR: Record<Exclude<TutorialAnchorId, 'none'>, string> = {
  leaderZone: '[data-board-zone="leaderArea"][data-board-player="p1"]',
  donZone: '[data-board-zone="costArea"][data-board-player="p1"]',
  donDeckZone: '[data-board-zone="donDeck"][data-board-player="p1"]',
  handZone: '[data-board-zone="hand"][data-board-player="p1"]',
  lifeZone: '[data-board-zone="life"][data-board-player="p1"]',
  characterAreaZone: '[data-board-zone="characterArea"][data-board-player="p1"]',
  trashZone: '[data-board-zone="trash"][data-board-player="p1"]',
  deckZone: '[data-board-zone="deck"][data-board-player="p1"]',
};

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Returns null when the anchor id is 'none' or the target isn't currently mounted (e.g. a zone that's momentarily empty/hidden) — callers should fall back to a centered, non-spotlit tooltip in that case. */
export function resolveAnchorRect(anchorId: TutorialAnchorId): AnchorRect | null {
  if (anchorId === 'none') return null;
  const selector = ZONE_SELECTOR[anchorId];
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}
