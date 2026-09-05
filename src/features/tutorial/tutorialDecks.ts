/**
 * Predefined tutorial decklists — plain DATA (card numbers + copy counts),
 * resolved against the local catalog by tutorialScenario.ts at scenario
 * build time. Same ground rule as everywhere else: this file never touches
 * the engine; it is deck-construction input only.
 *
 * MATCHUP SOURCE — these are the two decks the OFFICIAL Teaching App's
 * "Basic Game Flow" scenario plays (tutorial.onepiece-cardgame.com; its
 * scenario declares `turnSetting/deckPlayer: "OP05-060"` and
 * `deckOpponent: "OP03-099_p2"`). The studying player pilots purple
 * OP05-060 Monkey.D.Luffy (Straw Hat Crew / Land of Wano); the Instructor
 * pilots yellow OP03-099 Charlotte Katakuri (Big Mom Pirates). Both Leaders
 * print Life 5 and 5000 power, which is what makes the official script's
 * power arithmetic work out (see tutorialScript.ts).
 *
 * The official app is a slideshow and therefore never publishes a 50-card
 * list — it only ever shows the ~8 cards its script touches. These lists are
 * built around exactly those cards (marked SCRIPTED below), padded to a
 * legal 50 with same-colour, same-archetype cards from the same sets. The
 * padding is ours; the scripted cards are not negotiable, because
 * tutorialScript.ts names them and stacks the deck so they are drawn on cue.
 *
 * Deck-construction invariants these lists must satisfy (enforced by
 * tutorialDecks.test.ts and re-checked at resolve time in
 * tutorialScenario.ts):
 * - exactly 50 cards in the main deck, Leader separate (5-1-2)
 * - no Leader or DON!! card in the main deck (5-1-2-1)
 * - every card's colour legal for the Leader's colour (5-1-2-2) — both lists
 *   are strictly mono-coloured under a mono-coloured Leader, which is the
 *   unambiguous case of that rule
 * - at most 4 copies of any card number (5-1-2-3 / 2-14-2)
 */

import type { Color } from '../../engine/state/card';

export interface TutorialDeckEntry {
  cardNumber: string;
  count: number;
  /** True when tutorialScript.ts names this card by number — padding may change, these may not. */
  scripted?: true;
}

export interface TutorialDeckList {
  id: string;
  label: string;
  leaderCardNumber: string;
  /** The Leader's single colour. Every entry below must match it (5-1-2-2). */
  color: Color;
  cards: TutorialDeckEntry[];
}

/**
 * Studying player. SCRIPTED cards and where the script uses them:
 *   OP05-063 O-Robi      — opening hand; Counters for Zoro-Juurou on turn 7
 *   ST18-004 Zoro-Juurou — opening hand; played turn 4, K.O.s Pekoms turn 6
 *   ST18-003 San-Gorou   — opening hand; played turn 6, attacks turn 8
 *   ST18-002 O-Nami      — opening hand; Counters for the Leader on turn 7
 *   OP05-068 Chopa-Emon  — opening hand; played turn 2, wins the game turn 8
 *   ST18-001 Uso-Hachi   — drawn on turns 2 and 8 (needs 2+ copies)
 *   OP05-070 Fra-Nosuke  — drawn on turn 4
 *   P-041    Monkey.D.Luffy — drawn on turn 6
 */
export const TUTORIAL_DECK_PLAYER: TutorialDeckList = {
  id: 'OP05-060',
  label: 'Monkey.D.Luffy — Land of Wano (purple)',
  leaderCardNumber: 'OP05-060',
  color: 'purple',
  cards: [
    { cardNumber: 'OP05-062', count: 4 }, // O-Nami (1)
    { cardNumber: 'OP05-068', count: 4, scripted: true }, // Chopa-Emon (2)
    { cardNumber: 'OP05-061', count: 4 }, // Uso-Hachi (3)
    { cardNumber: 'ST18-001', count: 4, scripted: true }, // Uso-Hachi (3)
    { cardNumber: 'OP05-067', count: 4 }, // Zoro-Juurou (3)
    { cardNumber: 'OP05-063', count: 4, scripted: true }, // O-Robi (4)
    { cardNumber: 'ST18-002', count: 4, scripted: true }, // O-Nami (4)
    { cardNumber: 'ST18-004', count: 4, scripted: true }, // Zoro-Juurou (4)
    { cardNumber: 'OP05-072', count: 4 }, // Hone-Kichi (4)
    { cardNumber: 'OP05-066', count: 4 }, // Jinbe (5)
    { cardNumber: 'OP05-070', count: 4, scripted: true }, // Fra-Nosuke (5)
    { cardNumber: 'ST18-003', count: 4, scripted: true }, // San-Gorou (5)
    { cardNumber: 'P-041', count: 2, scripted: true }, // Monkey.D.Luffy (10)
  ],
};

/**
 * Instructor. SCRIPTED cards and where the script uses them:
 *   OP03-115 Streusen         — played turn 1
 *   ST07-014 Pekoms           — played turn 3, attacks turn 5, K.O.'d turn 6
 *   OP03-106 Charlotte Opera  — played turn 5, attacks turn 7
 *   ST20-005 Charlotte Linlin — played turn 7
 */
export const TUTORIAL_DECK_INSTRUCTOR: TutorialDeckList = {
  id: 'OP03-099',
  label: 'Charlotte Katakuri — Big Mom Pirates (yellow)',
  leaderCardNumber: 'OP03-099',
  color: 'yellow',
  cards: [
    { cardNumber: 'OP03-115', count: 4, scripted: true }, // Streusen (1)
    { cardNumber: 'OP03-112', count: 4 }, // Charlotte Pudding (1)
    { cardNumber: 'ST07-006', count: 4 }, // Charlotte Flampe (2)
    { cardNumber: 'OP03-103', count: 4 }, // Bobbin the Disposer (2)
    { cardNumber: 'ST07-014', count: 4, scripted: true }, // Pekoms (3)
    { cardNumber: 'OP03-105', count: 4 }, // Charlotte Oven (3)
    { cardNumber: 'ST07-011', count: 4 }, // Zeus (3)
    { cardNumber: 'OP03-106', count: 4, scripted: true }, // Charlotte Opera (4)
    { cardNumber: 'ST07-012', count: 4 }, // Baron Tamago (4)
    { cardNumber: 'OP03-110', count: 4 }, // Charlotte Smoothie (4)
    { cardNumber: 'ST20-001', count: 4 }, // Charlotte Katakuri (5)
    { cardNumber: 'ST07-004', count: 4 }, // Charlotte Snack (5)
    { cardNumber: 'ST20-005', count: 2, scripted: true }, // Charlotte Linlin (6)
  ],
};

/** The studying player's deck and the Instructor's deck, in that order. */
export const TUTORIAL_DECKS = { player: TUTORIAL_DECK_PLAYER, instructor: TUTORIAL_DECK_INSTRUCTOR } as const;

/**
 * Scenario 2 — "Mastering Card Effects, Part 1". Same two Leaders as Basic
 * Game Flow on purpose: the player already knows this board, so the only new
 * thing is that abilities now FIRE.
 *
 * Every card the script plays was chosen because its curated program does
 * exactly what its printed text says and nothing extra — a lesson cannot be
 * taught with an ability the engine only half-implements. SCRIPTED cards:
 *   OP05-068 Chopa-Emon      — turn 2 body ([On Play] gated on 8 DON!!, so silent here)
 *   OP16-068 Trafalgar Law   — turn 4, teaches [On Play]
 *   OP09-068 Tony Tony.Chopper — turn 6, teaches [End of Your Turn]
 *   EB01-036 Minochihuahua   — turn 8, teaches [Rush]
 *   OP05-063 O-Robi / ST18-002 O-Nami — turn 7, the two-card Counter
 */
export const EFFECTS_DECK_PLAYER: TutorialDeckList = {
  id: 'OP05-060-effects',
  label: 'Monkey.D.Luffy — Straw Hat Crew (purple)',
  leaderCardNumber: 'OP05-060',
  color: 'purple',
  cards: [
    { cardNumber: 'OP05-062', count: 4 }, // O-Nami (1)
    { cardNumber: 'OP05-068', count: 4, scripted: true }, // Chopa-Emon (2)
    { cardNumber: 'OP05-061', count: 4 }, // Uso-Hachi (3)
    { cardNumber: 'ST18-001', count: 4 }, // Uso-Hachi (3)
    { cardNumber: 'OP05-063', count: 4, scripted: true }, // O-Robi (4) — Counter 1000
    { cardNumber: 'ST18-002', count: 4, scripted: true }, // O-Nami (4) — Counter 1000
    { cardNumber: 'ST18-004', count: 4 }, // Zoro-Juurou (4)
    { cardNumber: 'OP16-068', count: 4, scripted: true }, // Trafalgar Law (4) — [On Play]
    { cardNumber: 'EB01-036', count: 4, scripted: true }, // Minochihuahua (4) — [Rush]
    { cardNumber: 'OP09-068', count: 4, scripted: true }, // Tony Tony.Chopper (5) — [End of Your Turn]
    { cardNumber: 'ST18-003', count: 4 }, // San-Gorou (5)
    { cardNumber: 'OP05-066', count: 4 }, // Jinbe (5)
    { cardNumber: 'P-041', count: 2 }, // Monkey.D.Luffy (10)
  ],
};

/**
 * Scenario 2's Instructor. Deliberately built on VANILLA bodies — Pekoms,
 * Baron Tamago, Charlotte Flampe, Bobbin all print no text at all — so the
 * only Instructor ability in the whole scenario is the one being taught:
 * their Leader's [DON!! x1] [When Attacking].
 */
export const EFFECTS_DECK_INSTRUCTOR: TutorialDeckList = {
  id: 'OP03-099-effects',
  label: 'Charlotte Katakuri — Big Mom Pirates (yellow)',
  leaderCardNumber: 'OP03-099',
  color: 'yellow',
  cards: [
    { cardNumber: 'OP03-112', count: 4 }, // Charlotte Pudding (1)
    { cardNumber: 'OP03-103', count: 4, scripted: true }, // Bobbin the Disposer (2) — vanilla
    { cardNumber: 'ST07-006', count: 4, scripted: true }, // Charlotte Flampe (2) — vanilla
    { cardNumber: 'ST07-014', count: 4, scripted: true }, // Pekoms (3) — vanilla
    { cardNumber: 'OP03-105', count: 4 }, // Charlotte Oven (3)
    { cardNumber: 'ST07-011', count: 4 }, // Zeus (3)
    { cardNumber: 'OP03-106', count: 4 }, // Charlotte Opera (4) — vanilla
    { cardNumber: 'ST07-012', count: 4, scripted: true }, // Baron Tamago (4) — vanilla
    { cardNumber: 'OP03-110', count: 4 }, // Charlotte Smoothie (4)
    { cardNumber: 'ST20-001', count: 4 }, // Charlotte Katakuri (5)
    { cardNumber: 'ST07-004', count: 4 }, // Charlotte Snack (5)
    { cardNumber: 'ST07-002', count: 4 }, // filler (see test: 50 exactly)
    { cardNumber: 'ST20-005', count: 2 }, // Charlotte Linlin (6)
  ],
};

/** Total main-deck card count for a list. */
export function deckSize(list: TutorialDeckList): number {
  return list.cards.reduce((sum, entry) => sum + entry.count, 0);
}

/** Every card number the script relies on being present in this list. */
export function scriptedCardNumbers(list: TutorialDeckList): string[] {
  return list.cards.filter((entry) => entry.scripted).map((entry) => entry.cardNumber);
}


/**
 * Scenario 3 — "Mastering Card Effects, Part 2". Built around the four
 * purple cards that carry the remaining keywords, each chosen because the
 * keyword is handled NATIVELY by the engine (hasBanish / hasDoubleAttack /
 * hasTrigger on the printing) rather than by a curated program that might
 * only half-cover it:
 *   OP09-080 Thousand Sunny         — the Stage card itself
 *   OP03-072 Gum-Gum Jet Gatling    — a [Counter] Event that also has [Trigger]
 *   OP02-087 Minotaur               — [Double Attack]
 *   OP03-068 Minozebra              — [Banish]
 * Minotaur's and Minozebra's [On K.O.] abilities are gated on an {Impel Down}
 * Leader, which this deck does not run, so neither fires — the keyword under
 * test is the only thing the player sees happen.
 */
export const EFFECTS2_DECK_PLAYER: TutorialDeckList = {
  id: 'OP05-060-effects2',
  label: 'Monkey.D.Luffy — Straw Hat Crew (purple)',
  leaderCardNumber: 'OP05-060',
  color: 'purple',
  cards: [
    { cardNumber: 'OP03-072', count: 4, scripted: true }, // Gum-Gum Jet Gatling (Event 0) — [Counter] + [Trigger]
    { cardNumber: 'OP09-080', count: 4, scripted: true }, // Thousand Sunny (Stage 1)
    { cardNumber: 'OP05-062', count: 4 }, // O-Nami (1)
    { cardNumber: 'OP05-068', count: 4, scripted: true }, // Chopa-Emon (2)
    { cardNumber: 'OP05-061', count: 4 }, // Uso-Hachi (3)
    { cardNumber: 'ST18-001', count: 4 }, // Uso-Hachi (3)
    { cardNumber: 'OP02-087', count: 4, scripted: true }, // Minotaur (4) — [Double Attack]
    { cardNumber: 'OP03-068', count: 4, scripted: true }, // Minozebra (4) — [Banish]
    { cardNumber: 'OP05-063', count: 4, scripted: true }, // O-Robi (4) — Counter 1000
    { cardNumber: 'ST18-002', count: 4 }, // O-Nami (4)
    { cardNumber: 'ST18-004', count: 4 }, // Zoro-Juurou (4)
    { cardNumber: 'ST18-003', count: 4 }, // San-Gorou (5)
    { cardNumber: 'OP05-066', count: 2 }, // Jinbe (5)
  ],
};