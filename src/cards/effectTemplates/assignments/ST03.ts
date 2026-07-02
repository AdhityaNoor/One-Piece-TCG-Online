/**
 * Reviewed effect template assignments — Starter Deck ST03 (The Seven Warlords).
 *
 * Coverage notes:
 *   SKIPPED (not yet supported in IR):
 *     ST03-001 (leader) — DON!! −4 cost + returnToHand: DON!! cost mechanism (TODO).
 *     ST03-003 — [Blocker] [DON!! x1] [On Block] place at bottom of deck: needs
 *                placeAtBottom op (TODO).
 *     ST03-004 — [On Play] add from trash with OR type filter (Warlords OR Thriller Bark):
 *                SearchFilter only ANDs; OR logic not yet supported (TODO).
 *     ST03-007 — [DON!! x1] [Activate: Main] ➁ cost + play from deck: DON!! cost (TODO).
 *     ST03-010 — [On Play] look top 3 reorder + [Trigger] play self: reorder + trigger (TODO).
 *     ST03-013 — [Blocker] [Trigger] play self: triggerPlaySelf (TODO).
 *     ST03-015 (event) — [Main] returnToHand + [Trigger] activate Main: event timing (TODO).
 *     ST03-016 (event) — [Counter] returnToHand + [Trigger] activate Counter: event (TODO).
 *     ST03-017 (event) — [Counter] +4000 + conditional draw: event + conditional (TODO).
 */
import type { CardEffectAssignment } from '../assembler';

export const ST03_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST03-005 — [DON!! x1] [When Attacking] Draw 2 cards and trash 2 cards from your hand.
  {
    cardNumber: 'ST03-005',
    templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] },
  },

  // ST03-009 — [On Play] Return up to 1 Character with a cost of 7 or less to the owner's hand.
  { cardNumber: 'ST03-009', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'returnToHand', maxCost: 7, target: 'any' }] } },

  // ST03-014 — [On Play] Return up to 1 Character with a cost of 3 or less to the owner's hand.
  { cardNumber: 'ST03-014', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'returnToHand', maxCost: 3, target: 'any' }] } },
];
