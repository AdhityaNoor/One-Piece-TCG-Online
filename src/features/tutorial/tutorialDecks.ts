/**
 * Predefined tutorial decklists — plain DATA (card numbers + copy counts),
 * resolved against the local catalog by tutorialScenario.ts at scenario
 * build time. Same ground rule as everywhere else: this file never touches
 * the engine; it is deck-construction input only.
 *
 * The studying player pilots the ST01 "Straw Hat Crew" list (Leader
 * ST01-001 Monkey.D.Luffy); the Instructor pilots the ST04 "Animal Kingdom
 * Pirates" list (Leader ST04-001 Kaido). Lists supplied by the project
 * owner (2026-07-25).
 *
 * Deck-construction invariants these lists must satisfy (enforced by
 * tutorialDecks.test.ts and re-checked at resolve time in
 * tutorialScenario.ts):
 * - exactly 50 cards in the main deck, Leader separate (game preparation,
 *   Section 5; DECK_SIZE in tutorialScenario.ts)
 * - at most 4 copies of any card number (2-14 — cardNumber is the
 *   "deck-construction max-4-copies key", see engine/state/card.ts)
 *
 * TODO / needs ruling confirmation: color legality (every deck card must
 * share a color with the Leader) is NOT re-verified against the rule text
 * here — both lists are established constructed-format lists, but the exact
 * CR section for color restriction hasn't been re-read this session, so no
 * automated check cites it yet.
 */

export interface TutorialDeckEntry {
  cardNumber: string;
  count: number;
}

export interface TutorialDeckList {
  id: string;
  label: string;
  leaderCardNumber: string;
  cards: TutorialDeckEntry[];
}

export const TUTORIAL_DECK_ST01: TutorialDeckList = {
  id: 'ST01',
  label: 'Straw Hat Crew (ST01)',
  leaderCardNumber: 'ST01-001',
  cards: [
    { cardNumber: 'ST01-007', count: 4 },
    { cardNumber: 'OP01-016', count: 4 },
    { cardNumber: 'ST21-003', count: 4 },
    { cardNumber: 'OP10-005', count: 4 },
    { cardNumber: 'OP01-025', count: 4 },
    { cardNumber: 'OP10-011', count: 4 },
    { cardNumber: 'ST21-015', count: 4 },
    { cardNumber: 'EB01-007', count: 4 },
    { cardNumber: 'ST01-012', count: 3 },
    { cardNumber: 'ST21-014', count: 4 },
    { cardNumber: 'OP07-015', count: 4 },
    { cardNumber: 'OP04-016', count: 3 },
    { cardNumber: 'OP01-029', count: 4 },
  ],
};

export const TUTORIAL_DECK_ST04: TutorialDeckList = {
  id: 'ST04',
  label: 'Animal Kingdom Pirates (ST04)',
  leaderCardNumber: 'ST04-001',
  cards: [
    { cardNumber: 'OP08-074', count: 4 },
    { cardNumber: 'OP01-101', count: 4 },
    { cardNumber: 'OP01-106', count: 4 },
    { cardNumber: 'OP08-059', count: 2 },
    { cardNumber: 'OP01-114', count: 4 },
    { cardNumber: 'OP05-074', count: 4 },
    { cardNumber: 'ST04-005', count: 4 },
    { cardNumber: 'OP08-060', count: 4 },
    { cardNumber: 'ST04-003', count: 4 },
    { cardNumber: 'OP01-094', count: 4 },
    { cardNumber: 'OP07-077', count: 4 },
    { cardNumber: 'ST04-015', count: 4 },
    { cardNumber: 'ST04-017', count: 4 },
  ],
};

/** The studying player's deck and the Instructor's deck, in that order. */
export const TUTORIAL_DECKS = { player: TUTORIAL_DECK_ST01, instructor: TUTORIAL_DECK_ST04 } as const;

/** Total main-deck card count for a list. */
export function deckSize(list: TutorialDeckList): number {
  return list.cards.reduce((sum, entry) => sum + entry.count, 0);
}
