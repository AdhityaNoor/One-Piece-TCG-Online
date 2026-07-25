/**
 * Deck-construction invariants for the predefined tutorial decklists.
 * Rules enforced:
 * - main deck is exactly 50 cards (game preparation, Section 5 — mirrored
 *   by DECK_SIZE in tutorialScenario.ts)
 * - at most 4 copies of any card number (2-14, the "deck-construction
 *   max-4-copies key" per engine/state/card.ts)
 * - the Leader is listed separately, never inside the 50
 */
import { describe, expect, it } from 'vitest';
import { TUTORIAL_DECKS, TUTORIAL_DECK_ST01, TUTORIAL_DECK_ST04, deckSize } from './tutorialDecks';

const ALL_LISTS = [TUTORIAL_DECK_ST01, TUTORIAL_DECK_ST04];

describe('predefined tutorial decklists', () => {
  it('player pilots ST01, instructor pilots ST04', () => {
    expect(TUTORIAL_DECKS.player.leaderCardNumber).toBe('ST01-001');
    expect(TUTORIAL_DECKS.instructor.leaderCardNumber).toBe('ST04-001');
  });

  it.each(ALL_LISTS.map((list) => [list.id, list] as const))('%s main deck is exactly 50 cards', (_id, list) => {
    expect(deckSize(list)).toBe(50);
  });

  it.each(ALL_LISTS.map((list) => [list.id, list] as const))('%s respects the max-4-copies rule (2-14)', (_id, list) => {
    for (const entry of list.cards) {
      expect(entry.count).toBeGreaterThan(0);
      expect(entry.count).toBeLessThanOrEqual(4);
    }
  });

  it.each(ALL_LISTS.map((list) => [list.id, list] as const))('%s has no duplicate card-number rows and excludes its Leader', (_id, list) => {
    const numbers = list.cards.map((entry) => entry.cardNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).not.toContain(list.leaderCardNumber);
  });
});
