/**
 * Builds the ONE match the tutorial plays, using only the engine's own
 * public setup surface (createPreGameState). The project rule "treat the
 * card API/catalog as data only" applies here too: this module resolves real
 * CardDefinitions from the local catalog, but never fabricates engine
 * behavior for them.
 *
 * WHAT CHANGED FROM v1. The old builder produced a DIFFERENT, fabricated
 * mid-game board for every chapter (turn 3, four DON!! already placed,
 * Characters teleported out of the deck, hands rewritten) and threw it away
 * on the next chapter. That is why the narration and the board disagreed.
 * There is now exactly one build call for the whole tutorial, it returns the
 * real pre-game state, and every later board state is produced by the engine
 * executing the scripted actions in tutorialScript.ts.
 *
 * THE ONE THING THIS FILE STILL ARRANGES: DECK ORDER. A scripted lesson
 * cannot survive a shuffle — "Chopa-Emon costs 2, and you have exactly 2
 * DON!!" is only true if Chopa-Emon is actually in the opening hand. So both
 * decks are STACKED before the engine deals anything: the cards the script
 * names are placed at the exact depths the engine will draw them from, and
 * the remaining 40-odd cards keep their shuffled order underneath. The
 * engine still deals and draws entirely by its own rules; it simply does so
 * from a known deck. This is the honest scripted-tutorial equivalent of a
 * stacked demo deck, and it is the only pre-arrangement left.
 *
 * Deck depths the engine reads, in order (5-2-1-6 -> 5-2-1-7 -> 6-3):
 *   [0..4]   opening hand of 5, dealt when CHOOSE_GOING_FIRST resolves
 *   [5..9]   Life cards, dealt when the second mulligan resolves
 *   [10..]   one card per Draw Phase, in turn order
 */
import { createPreGameState, type PlayerSetupInput } from '../../engine/setup';
import type { GameState } from '../../engine/state/game';
import type { CardDefinition } from '../../engine/state/card';
import { GENERIC_DON_CARD_DEFINITION } from '../../cards/decks/genericDonCard';
import { PLAYER_A_ID, PLAYER_B_ID } from '../../app/store/matchStore';
import { loadTutorialCatalog, type TutorialCatalogEntry } from './tutorialCatalog';
import { type TutorialDeckList } from './tutorialDecks';
import { buildCuratedEffectRegistry } from '../../cards/effectTemplates/curatedPrograms';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { DeckStackSlot, TutorialScenarioDef } from './types';

const DECK_SIZE = 50;
const OPENING_HAND_SIZE = 5;

export interface TutorialScenario {
  state: GameState;
  defs: Record<string, CardDefinition>;
  images: Record<string, string | null>;
  /**
   * What the engine is allowed to make cards DO. Empty for `effects: 'off'`
   * scenarios (the official Basic Game Flow explicitly ignores abilities);
   * the real curated registry for the two effect scenarios, which exist to
   * teach exactly those abilities.
   */
  registry: EffectTemplateRegistry;
  studyingPlayerId: string;
  opponentPlayerId: string;
}

function uniqueByCardNumber(entries: TutorialCatalogEntry[]): TutorialCatalogEntry[] {
  const seen = new Set<string>();
  const unique: TutorialCatalogEntry[] = [];
  for (const entry of entries.sort((a, b) => a.definition.cardNumber.localeCompare(b.definition.cardNumber))) {
    if (seen.has(entry.definition.cardNumber)) continue;
    seen.add(entry.definition.cardNumber);
    unique.push(entry);
  }
  return unique;
}

/**
 * Resolves one predefined decklist (tutorialDecks.ts) against the local
 * catalog. Fails loudly — with the exact card numbers at fault — rather
 * than silently padding/substituting, per the project's "never assume"
 * rule: a tutorial board that quietly swapped cards would teach with the
 * wrong deck, and here it would also break the script mid-match.
 */
function resolveDeckList(byCardNumber: Map<string, TutorialCatalogEntry>, list: TutorialDeckList): { leader: TutorialCatalogEntry; deck: CardDefinition[]; entriesUsed: TutorialCatalogEntry[] } {
  const missing: string[] = [];

  const leader = byCardNumber.get(list.leaderCardNumber);
  if (!leader) missing.push(list.leaderCardNumber);
  else if (leader.definition.category !== 'leader') {
    throw new Error(`Tutorial: ${list.id} lists ${list.leaderCardNumber} as Leader, but the catalog says it is a '${leader.definition.category}' card.`);
  }

  const deck: CardDefinition[] = [];
  const entriesUsed: TutorialCatalogEntry[] = [];
  for (const { cardNumber, count } of list.cards) {
    const entry = byCardNumber.get(cardNumber);
    if (!entry) {
      missing.push(cardNumber);
      continue;
    }
    entriesUsed.push(entry);
    for (let i = 0; i < count; i++) deck.push(entry.definition);
  }

  if (missing.length > 0) {
    throw new Error(`Tutorial: local catalog is missing ${list.id} card(s): ${missing.join(', ')}.`);
  }
  if (deck.length !== DECK_SIZE) {
    throw new Error(`Tutorial: ${list.id} decklist resolves to ${deck.length} cards, expected ${DECK_SIZE}.`);
  }
  // 5-1-2-2, the unambiguous mono-colour case: both tutorial lists are single
  // -coloured under a single-coloured Leader, so this is a plain equality
  // check rather than the multicolour subset reading the deck validator has
  // to reason about.
  const offColour = entriesUsed.filter((entry) => !entry.definition.colors.includes(list.color));
  if (offColour.length > 0) {
    throw new Error(`Tutorial: ${list.id} contains card(s) that do not match the Leader's ${list.color}: ${offColour.map((e) => e.definition.cardNumber).join(', ')}.`);
  }

  return { leader: leader as TutorialCatalogEntry, deck, entriesUsed };
}

function buildSetupInputs(catalog: TutorialCatalogEntry[], scenario: TutorialScenarioDef): { p1: PlayerSetupInput; p2: PlayerSetupInput; defs: Record<string, CardDefinition>; images: Record<string, string | null> } {
  const unique = uniqueByCardNumber(catalog);
  const byCardNumber = new Map(unique.map((entry) => [entry.definition.cardNumber, entry]));

  const playerSide = resolveDeckList(byCardNumber, scenario.decks.player);
  const instructorSide = resolveDeckList(byCardNumber, scenario.decks.instructor);

  const p1: PlayerSetupInput = { playerId: PLAYER_A_ID, leader: playerSide.leader.definition, deck: playerSide.deck, donCard: GENERIC_DON_CARD_DEFINITION, donDeckSize: 10 };
  const p2: PlayerSetupInput = { playerId: PLAYER_B_ID, leader: instructorSide.leader.definition, deck: instructorSide.deck, donCard: GENERIC_DON_CARD_DEFINITION, donDeckSize: 10 };

  const defs: Record<string, CardDefinition> = { [GENERIC_DON_CARD_DEFINITION.cardDefinitionId]: GENERIC_DON_CARD_DEFINITION };
  const images: Record<string, string | null> = { [GENERIC_DON_CARD_DEFINITION.cardDefinitionId]: null };
  for (const entry of [playerSide.leader, instructorSide.leader, ...playerSide.entriesUsed, ...instructorSide.entriesUsed]) {
    defs[entry.definition.cardDefinitionId] = entry.definition;
    images[entry.definition.cardDefinitionId] = entry.imageUrl;
  }

  return { p1, p2, defs, images };
}

/**
 * Reorders `playerId`'s deck so `plan` describes the top of it, with every
 * unpinned card keeping its shuffled order beneath. Pure zone surgery on
 * `deck.cardIds` — no card changes zone, face state or owner, so the deck
 * the engine deals from is in every other respect the one
 * createPreGameState built.
 *
 * Throws when a pinned card number is not in the deck in sufficient
 * quantity: that means tutorialDecks.ts and tutorialScript.ts have drifted
 * apart, which must fail loudly at build time rather than halfway through
 * the lesson.
 */
export function stackDeck(state: GameState, defs: Record<string, CardDefinition>, playerId: string, plan: readonly DeckStackSlot[]): GameState {
  const player = state.players[playerId];
  if (!player) return state;

  const pool = [...player.deck.cardIds];
  const numberOf = (instanceId: string) => defs[state.cardsById[instanceId]?.cardDefinitionId]?.cardNumber;

  // Pass 1: claim every pinned card, so a `null` slot can never swallow a
  // card a later slot still needs.
  const claimed = new Map<number, string>();
  plan.forEach((slot, depth) => {
    if (slot === null) return;
    const index = pool.findIndex((instanceId) => numberOf(instanceId) === slot);
    if (index === -1) {
      throw new Error(`Tutorial: cannot stack ${playerId}'s deck — no copy of ${slot} left for depth ${depth}. tutorialDecks.ts and tutorialScript.ts are out of sync.`);
    }
    claimed.set(depth, pool[index]);
    pool.splice(index, 1);
  });

  // Pass 2: fill the `null` slots from what is left, in shuffled order.
  const top: string[] = [];
  plan.forEach((_slot, depth) => {
    const pinned = claimed.get(depth);
    if (pinned) {
      top.push(pinned);
      return;
    }
    const next = pool.shift();
    if (next) top.push(next);
  });

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, deck: { ...player.deck, cardIds: [...top, ...pool] } },
    },
  };
}

export async function buildTutorialScenario(scenario: TutorialScenarioDef): Promise<TutorialScenario> {
  const catalog = await loadTutorialCatalog();
  const { p1, p2, defs, images } = buildSetupInputs(catalog, scenario);

  // Fixed seed per scenario: a lesson must be identical for every player and
  // on every restart, and the e2e tests assert exact outcomes against it.
  // decidingPlayerId is the INSTRUCTOR because the official scenarios have
  // the studying player lose the rock-paper-scissors throw and go second.
  const result = createPreGameState(p1, p2, {
    decidingPlayerId: PLAYER_B_ID,
    rngState: { seed: scenario.rngSeed, cursor: 0 },
  });
  if (!result.ok) {
    throw new Error(`Tutorial: failed to build '${scenario.id}': ${result.reasons.join('; ')}`);
  }

  // Depths: [0..4] opening hand, [5..9] Life, [10..] one per Draw Phase.
  let state = stackDeck(result.state, defs, PLAYER_A_ID, [
    ...scenario.openingHand,
    ...scenario.life.player,
    ...scenario.draws.player,
  ]);
  state = stackDeck(state, defs, PLAYER_B_ID, [
    ...scenario.instructorOpeningHand,
    ...scenario.life.instructor,
    ...scenario.draws.instructor,
  ]);

  // The one knob that separates Basic Game Flow from the effect scenarios.
  // 'off' is not a stub: it is the official scenario's own printed caveat
  // ("we will ignore card effects that activate when a card is played"),
  // enforced by giving the engine nothing to fire.
  const registry: EffectTemplateRegistry = scenario.effects === 'curated' ? buildCuratedEffectRegistry(defs) : {};

  return { state, defs, images, registry, studyingPlayerId: PLAYER_A_ID, opponentPlayerId: PLAYER_B_ID };
}

/** Exported for the e2e test, which asserts the opening hand really is the scripted one. */
export const TUTORIAL_OPENING_HAND_SIZE = OPENING_HAND_SIZE;
