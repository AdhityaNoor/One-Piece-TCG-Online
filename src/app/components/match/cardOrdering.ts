/**
 * Pure helpers for the "put these cards back on your deck in an order you
 * choose" prompts (Comprehensive Rules 10-1-2 / card texts of the form
 * "Look at N cards from the top of your deck ... place them at the top or
 * bottom of your deck in any order").
 *
 * The engine already models the ordering explicitly — see
 * effectContext.searchResolveTopOrBottom(playerId, lookedIds, topOrderIds,
 * bottomOrderIds), where the array order IS the resulting deck order. The
 * interpreter asks for it as a plain SELECT_CARDS choice whose response array
 * carries the order. Nothing here touches game rules; this is UI-side ordering
 * only, kept in its own module so it can be unit-tested without React.
 */
import type { PendingChoice } from '../../../engine/events/pendingChoice';

/**
 * True when a SELECT_CARDS choice is really an ORDERING choice: the player must
 * select every candidate (min === max === candidate count), so the only degree
 * of freedom left is the sequence they come back in.
 *
 * Both interpreter prompts that need an order match this shape:
 *  - searchTopDeck with destination 'deckTopOrBottom' (min = max = looked.length)
 *  - the '-remainder-order' follow-up for remainder 'deckTopOrBottom'
 *
 * A forced select-all prompt where order happens NOT to matter also matches,
 * but that is harmless: the response contains the same ids either way, and an
 * order-insensitive op ignores the sequence.
 */
export function isOrderingChoice(choice: PendingChoice): boolean {
  if (choice.kind !== 'SELECT_CARDS') return false;
  const candidates = choice.constraints.candidateInstanceIds ?? [];
  if (candidates.length < 2) return false;
  const { min, max } = choice.constraints;
  return min === candidates.length && max === candidates.length;
}

/**
 * Default ordering presented to the player: exactly the order the engine listed
 * the candidates in, which for a top-deck look is deck order, top-most first.
 * Confirming without dragging therefore puts the cards back the way they were.
 */
export function defaultOrder(choice: PendingChoice): string[] {
  return [...(choice.constraints.candidateInstanceIds ?? [])];
}

/**
 * Move one entry within an ordered id list. Returns a new array; out-of-range
 * or no-op moves return the input order unchanged (referentially new only when
 * something actually moved, so callers can skip redundant state updates).
 */
export function moveInOrder(order: string[], from: number, to: number): string[] {
  if (from === to) return order;
  if (from < 0 || from >= order.length) return order;
  if (to < 0 || to >= order.length) return order;
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Given the pointer's x position mid-drag and the on-screen centre of every
 * item, work out which index the dragged card should now occupy.
 *
 * Walks outward from the dragged card's current index: moving left, the first
 * card whose centre the pointer has crossed becomes the target; moving right,
 * the last one crossed does. Centres are measured live (post-reorder), so this
 * stays correct as the list shuffles under the cursor.
 */
export function targetIndexForPointer(centers: number[], fromIndex: number, pointerX: number): number {
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
