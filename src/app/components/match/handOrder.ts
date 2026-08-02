/**
 * Player-chosen hand ordering — a pure UI concern.
 *
 * Hand order carries no rules meaning: the Comprehensive Rules treat the hand
 * as an unordered private zone, so arranging it is a display preference, not a
 * game action. It therefore never enters GameState, never syncs to the
 * opponent and never produces a log entry — it lives in local component state
 * for the duration of the match.
 *
 * The tricky part is that the hand changes underneath the saved order: cards
 * are drawn, played, discarded. applyHandOrder reconciles the two on every
 * render so a stale id can never hide a card or duplicate one.
 */
import { moveInOrder } from './cardOrdering';

export { moveInOrder };

/**
 * Order `cards` by the player's saved arrangement.
 *
 * - ids in `order` that are still in hand keep their arranged position
 * - ids in `order` that have left the hand are ignored (played/discarded)
 * - cards NOT in `order` are appended in their natural order (newly drawn)
 *
 * Returns a list containing exactly the input cards, so it is always safe to
 * render even if `order` is empty or completely stale.
 */
export function applyHandOrder<T extends { instanceId: string }>(cards: T[], order: string[]): T[] {
  if (order.length === 0) return cards;

  const byId = new Map(cards.map((card) => [card.instanceId, card]));
  const arranged: T[] = [];
  const taken = new Set<string>();

  for (const id of order) {
    const card = byId.get(id);
    if (card && !taken.has(id)) {
      arranged.push(card);
      taken.add(id);
    }
  }

  // Newly drawn cards the saved order has never seen go to the end, keeping
  // the engine's own hand order among themselves.
  for (const card of cards) {
    if (!taken.has(card.instanceId)) arranged.push(card);
  }

  return arranged;
}

/**
 * Which slot a dragged card should occupy, given the on-screen centre of every
 * hand card and the pointer's x position. Mirrors targetIndexForPointer in
 * cardOrdering.ts but is kept separate because hand cards overlap heavily —
 * centres are measured live so the fan reflows correctly mid-drag.
 */
export function handDropIndex(centers: number[], fromIndex: number, pointerX: number): number {
  let to = fromIndex;
  for (let i = 0; i < centers.length; i += 1) {
    if (i === fromIndex) continue;
    const center = centers[i];
    if (!Number.isFinite(center)) continue;
    if (i < fromIndex && pointerX < center) {
      to = i;
      break;
    }
    if (i > fromIndex && pointerX > center) {
      to = i;
    }
  }
  return to;
}

/**
 * True when the pointer is over the acting player's own field — the drop area
 * that means "play this card". Walks up from the element under the pointer
 * looking for the marker MatchScreen puts on the bottom player's side.
 */
export function isOverPlayDropZone(element: Element | null): boolean {
  let node: Element | null = element;
  // getAttribute rather than `instanceof HTMLElement` / `.dataset`: the check
  // then depends only on the DOM interface, so it works across documents
  // (portals, iframes) and can be unit-tested without a DOM implementation.
  while (node) {
    if (node.getAttribute?.('data-play-drop') === 'true') return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * The board zone a hand card would land in, used to place its drag preview.
 * Characters go to the Character Area, Stages replace the Stage slot. Events
 * have no field destination — they resolve and go to the trash — so they get
 * no landing ghost.
 */
export function playDropZoneFor(category: string | undefined): 'characterArea' | 'stageArea' | null {
  if (category === 'character') return 'characterArea';
  if (category === 'stage') return 'stageArea';
  return null;
}

/** DOM lookup for the acting player's copy of a landing zone. */
export function findPlayZoneHost(zone: 'characterArea' | 'stageArea'): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(`[data-play-drop="true"] [data-board-zone="${zone}"]`);
}
