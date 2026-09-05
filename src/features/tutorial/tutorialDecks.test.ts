/**
 * Deck-construction invariants for the predefined tutorial decklists.
 * Rules enforced:
 * - main deck is exactly 50 cards (5-1-2 — mirrored by DECK_SIZE in
 *   tutorialScenario.ts)
 * - at most 4 copies of any card number (5-1-2-3 / 2-14-2)
 * - the Leader is listed separately, never inside the 50 (5-1-2-1)
 *
 * Plus the constraint that is specific to a SCRIPTED tutorial: every card
 * tutorialScript.ts names must actually exist in the list it is drawn from,
 * in enough copies for every time the script draws it. A padding change that
 * silently removed a scripted card would break the match halfway through, so
 * that link is pinned here rather than discovered at runtime.
 */
import { describe, expect, it } from 'vitest';
import { TUTORIAL_DECKS, TUTORIAL_DECK_PLAYER, TUTORIAL_DECK_INSTRUCTOR, deckSize, scriptedCardNumbers } from './tutorialDecks';
import { BASIC_GAME_FLOW, TUTORIAL_SCENARIOS } from './scenarios';

const TUTORIAL_SCRIPT = BASIC_GAME_FLOW.beats;
const OPENING_HAND = BASIC_GAME_FLOW.openingHand;
const SCRIPTED_DRAWS = BASIC_GAME_FLOW.draws;

/** Every list from every scenario — a new scenario's decks get the same legality checks for free. */
const ALL_LISTS: TutorialDeckList[] = [...new Set(TUTORIAL_SCENARIOS.flatMap((scenario) => [scenario.decks.player, scenario.decks.instructor]))];

describe('predefined tutorial decklists', () => {
  it('reproduces the official Teaching App matchup (OP05-060 vs OP03-099)', () => {
    expect(TUTORIAL_DECKS.player.leaderCardNumber).toBe('OP05-060');
    expect(TUTORIAL_DECKS.instructor.leaderCardNumber).toBe('OP03-099');
  });

  it.each(ALL_LISTS.map((list) => [list.id, list] as const))('%s main deck is exactly 50 cards', (_id, list) => {
    expect(deckSize(list)).toBe(50);
  });

  it.each(ALL_LISTS.map((list) => [list.id, list] as const))('%s respects the max-4-copies rule (5-1-2-3)', (_id, list) => {
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

  it.each(TUTORIAL_SCENARIOS.map((scenario) => [scenario.id, scenario] as const))(
    '%s: every card the deal pins is in that deck in enough copies',
    (_id, scenario) => {
      for (const [list, pins] of [
        [scenario.decks.player, [...scenario.openingHand, ...scenario.life.player, ...scenario.draws.player]],
        [scenario.decks.instructor, [...scenario.instructorOpeningHand, ...scenario.life.instructor, ...scenario.draws.instructor]],
      ] as const) {
        const copies = new Map(list.cards.map((entry) => [entry.cardNumber, entry.count]));
        const needed = new Map<string, number>();
        for (const cardNumber of pins) {
          if (cardNumber === null) continue;
          needed.set(cardNumber, (needed.get(cardNumber) ?? 0) + 1);
        }
        for (const [cardNumber, count] of needed) {
          expect(copies.get(cardNumber), `${list.id} must contain ${cardNumber}`).toBeGreaterThanOrEqual(count);
        }
      }
    },
  );

  it('the player list holds every card the script deals or draws, in enough copies', () => {
    const copies = new Map(TUTORIAL_DECK_PLAYER.cards.map((entry) => [entry.cardNumber, entry.count]));
    const needed = new Map<string, number>();
    for (const cardNumber of [...OPENING_HAND, ...SCRIPTED_DRAWS.player]) {
      needed.set(cardNumber, (needed.get(cardNumber) ?? 0) + 1);
    }
    for (const [cardNumber, count] of needed) {
      expect(copies.get(cardNumber) ?? 0).toBeGreaterThanOrEqual(count);
    }
  });

  it('every card the script plays or references exists in the deck that plays it', () => {
    const playerNumbers = new Set(TUTORIAL_DECK_PLAYER.cards.map((entry) => entry.cardNumber));
    const instructorNumbers = new Set(TUTORIAL_DECK_INSTRUCTOR.cards.map((entry) => entry.cardNumber));
    for (const beat of TUTORIAL_SCRIPT) {
      const action = beat.action;
      if (!action) continue;
      const pool = beat.actor === 'instructor' ? instructorNumbers : playerNumbers;
      if (action.kind === 'playCharacter' || action.kind === 'counterCharacter') {
        expect(pool.has(action.cardNumber)).toBe(true);
      }
    }
  });

  it('the scripted-card markers stay in sync with what the script actually names', () => {
    // The `scripted: true` flag is documentation for whoever edits the padding
    // later; it is worthless if it drifts, so it is checked, not trusted.
    const named = new Set<string>([...OPENING_HAND, ...SCRIPTED_DRAWS.player]);
    for (const beat of TUTORIAL_SCRIPT) {
      if (beat.actor !== 'player') continue;
      const action = beat.action;
      if (action && (action.kind === 'playCharacter' || action.kind === 'counterCharacter')) named.add(action.cardNumber);
    }
    expect(new Set(scriptedCardNumbers(TUTORIAL_DECK_PLAYER))).toEqual(named);
  });
});
