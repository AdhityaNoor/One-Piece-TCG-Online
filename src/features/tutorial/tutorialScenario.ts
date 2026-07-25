/**
 * Builds a deterministic, scripted GameState for a tutorial chapter using
 * ONLY the engine's own public setup surface (createPreGameState) — the
 * project rule "treat the card API/catalog as data only" applies here too:
 * this module resolves real CardDefinitions from the local catalog, but
 * never fabricates engine behavior for them.
 *
 * Boards are PREDEFINED: both sides always play the fixed decklists in
 * tutorialDecks.ts (player = ST01 Straw Hat Crew, Instructor = ST04 Animal
 * Kingdom Pirates), resolved by card number against the catalog with
 * loud, specific errors when anything is missing — never silent
 * substitution.
 *
 * Simplification (documented limitation, see docs at the bottom of this
 * file): each chapter builds its OWN fresh scenario rather than carrying
 * forward mutations from the previous chapter. "Each chapter unlocks only
 * the mechanic currently being taught" (project spec) is easiest to
 * guarantee this way — chapter 3 always starts from "Leader, no DON!!
 * attached yet", regardless of what chapter 1/2 looked like — and Restart
 * Chapter becomes trivial (just rebuild). The trade-off is that DON!!
 * attached in chapter 3 will not literally still be attached when chapter 4
 * loads; since chapter 4 onward aren't engine-wired this milestone anyway
 * (see tutorialSteps.ts), this costs nothing yet, but is worth revisiting
 * once every chapter is live.
 */
import { createPreGameState, type PlayerSetupInput } from '../../engine/setup';
import type { GameState } from '../../engine/state/game';
import type { CardDefinition } from '../../engine/state/card';
import { GENERIC_DON_CARD_DEFINITION } from '../../cards/decks/genericDonCard';
import { PLAYER_A_ID, PLAYER_B_ID } from '../../app/store/matchStore';
import { loadTutorialCatalog, type TutorialCatalogEntry } from './tutorialCatalog';
import { TUTORIAL_DECKS, type TutorialDeckList } from './tutorialDecks';
import type { TutorialChapterId } from './types';

const DECK_SIZE = 50;
const STARTING_HAND_SIZE = 5;

export interface TutorialScenario {
  state: GameState;
  defs: Record<string, CardDefinition>;
  images: Record<string, string | null>;
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
 * wrong deck.
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

  return { leader: leader as TutorialCatalogEntry, deck, entriesUsed };
}

/**
 * Predefined boards: the studying player always pilots the ST01 Straw Hat
 * list, the Instructor the ST04 Animal Kingdom Pirates list (see
 * tutorialDecks.ts). Every chapter builds from these same two decks, so the
 * teaching content can safely reference specific cards.
 */
function buildSetupInputs(catalog: TutorialCatalogEntry[]): { p1: PlayerSetupInput; p2: PlayerSetupInput; defs: Record<string, CardDefinition>; images: Record<string, string | null> } {
  const unique = uniqueByCardNumber(catalog);
  const byCardNumber = new Map(unique.map((entry) => [entry.definition.cardNumber, entry]));

  const playerSide = resolveDeckList(byCardNumber, TUTORIAL_DECKS.player);
  const instructorSide = resolveDeckList(byCardNumber, TUTORIAL_DECKS.instructor);

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
 * Mirrors runDonPhase.ts's own field transform exactly (see that file) —
 * moves activeCount+restedCount DON!! from donDeck to costArea, face-up.
 * `restedCount` of them arrive rested (donRested: true), so mid-game boards
 * can show already-spent DON!! (the 4-4-2 / 2-7-2 "rest to pay" state)
 * without faking a purchase.
 */
function placeDon(state: GameState, playerId: string, activeCount: number, restedCount = 0): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  const total = activeCount + restedCount;
  const donIds = player.donDeck.cardIds.slice(0, total);
  const remaining = player.donDeck.cardIds.slice(total);
  const cardsById = { ...state.cardsById };
  donIds.forEach((id, index) => {
    cardsById[id] = { ...cardsById[id], currentZone: 'costArea', faceState: 'faceUp', donRested: index >= activeCount };
  });
  return {
    ...state,
    cardsById,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        donDeck: { ...player.donDeck, cardIds: remaining },
        costArea: { ...player.costArea, cardIds: [...donIds, ...player.costArea.cardIds] },
      },
    },
  };
}

/** First deck instance whose definition prints this card number; null when the (shuffled) deck happens not to contain one anymore. */
function findInDeck(state: GameState, defs: Record<string, CardDefinition>, playerId: string, cardNumber: string): string | null {
  const player = state.players[playerId];
  if (!player) return null;
  for (const instanceId of player.deck.cardIds) {
    const def = defs[state.cardsById[instanceId]?.cardDefinitionId];
    if (def?.cardNumber === cardNumber) return instanceId;
  }
  return null;
}

/**
 * Scripts a predefined Character straight from the deck into the Character
 * area — face-up, not summoning-sick (it "was played on an earlier turn"),
 * active or rested per the chapter's teaching need (7-1-1-2: only RESTED
 * opponent Characters are legal attack targets, so defenders are usually
 * placed rested on purpose). Throws when the card number can't be found:
 * a chapter that teaches with a specific card must actually have it.
 */
function putCharacterInPlay(state: GameState, defs: Record<string, CardDefinition>, playerId: string, cardNumber: string, opts: { rested: boolean }): GameState {
  const instanceId = findInDeck(state, defs, playerId, cardNumber);
  if (!instanceId) throw new Error(`Tutorial: could not find ${cardNumber} in ${playerId}'s deck to place on the board.`);
  const player = state.players[playerId];
  return {
    ...state,
    cardsById: {
      ...state.cardsById,
      [instanceId]: {
        ...state.cardsById[instanceId],
        currentZone: 'characterArea',
        faceState: 'faceUp',
        orientation: opts.rested ? 'rested' : 'active',
        summoningSick: false,
        revealedTo: 'all',
      },
    },
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        deck: { ...player.deck, cardIds: player.deck.cardIds.filter((id) => id !== instanceId) },
        characterArea: { ...player.characterArea, cardIds: [...player.characterArea.cardIds, instanceId] },
      },
    },
  };
}

/**
 * Guarantees specific card numbers are in hand (teaching text names them) by
 * swapping deck copies with the last cards of the opening hand. Cards
 * already in hand are left alone; a number missing from BOTH hand and deck
 * throws — same fail-loudly policy as putCharacterInPlay.
 */
function ensureHandHas(state: GameState, defs: Record<string, CardDefinition>, playerId: string, cardNumbers: string[]): GameState {
  let next = state;
  for (const cardNumber of cardNumbers) {
    const player = next.players[playerId];
    const inHand = player.hand.cardIds.some((id) => defs[next.cardsById[id]?.cardDefinitionId]?.cardNumber === cardNumber);
    if (inHand) continue;
    const deckInstanceId = findInDeck(next, defs, playerId, cardNumber);
    if (!deckInstanceId) throw new Error(`Tutorial: could not find ${cardNumber} for ${playerId}'s scripted hand.`);
    // Swap: the deck copy joins the hand; the hand's last card goes to the deck bottom.
    const swappedOutId = player.hand.cardIds[player.hand.cardIds.length - 1];
    next = {
      ...next,
      cardsById: {
        ...next.cardsById,
        [deckInstanceId]: { ...next.cardsById[deckInstanceId], currentZone: 'hand' },
        [swappedOutId]: { ...next.cardsById[swappedOutId], currentZone: 'deck' },
      },
      players: {
        ...next.players,
        [playerId]: {
          ...player,
          deck: { ...player.deck, cardIds: [...player.deck.cardIds.filter((id) => id !== deckInstanceId), swappedOutId] },
          hand: { ...player.hand, cardIds: [...player.hand.cardIds.filter((id) => id !== swappedOutId), deckInstanceId] },
        },
      },
    };
  }
  return next;
}

/**
 * Swaps any [Trigger]-bearing Life cards for trigger-less deck cards, so a
 * scripted battle's Damage Step (7-1-4) resolves without raising a Trigger
 * PendingChoice mid-lesson — Triggers get their own chapter. Face-down
 * states are preserved on both sides of each swap (11-2).
 */
function sanitizeLife(state: GameState, defs: Record<string, CardDefinition>, playerId: string): GameState {
  let next = state;
  const player = () => next.players[playerId];
  for (const lifeCardId of [...player().lifeArea.cardIds]) {
    const lifeDef = defs[next.cardsById[lifeCardId]?.cardDefinitionId];
    if (!lifeDef?.hasTrigger) continue;
    const replacementId = player()
      .deck.cardIds.find((id) => defs[next.cardsById[id]?.cardDefinitionId]?.hasTrigger === false);
    if (!replacementId) break; // no trigger-less card left — leave as-is rather than invent cards
    const current = player();
    next = {
      ...next,
      cardsById: {
        ...next.cardsById,
        [replacementId]: { ...next.cardsById[replacementId], currentZone: 'lifeArea', faceState: 'faceDown', revealedTo: [] },
        [lifeCardId]: { ...next.cardsById[lifeCardId], currentZone: 'deck', faceState: 'faceDown', revealedTo: [] },
      },
      players: {
        ...next.players,
        [playerId]: {
          ...current,
          lifeArea: { ...current.lifeArea, cardIds: current.lifeArea.cardIds.map((id) => (id === lifeCardId ? replacementId : id)) },
          deck: { ...current.deck, cardIds: [...current.deck.cardIds.filter((id) => id !== replacementId), lifeCardId] },
        },
      },
    };
  }
  return next;
}

/** Removes ALL of a player's Life cards (back to the deck bottom) — the "one hit from defeat" board for the finale chapter (1-2-1-1). */
function stripLife(state: GameState, playerId: string): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  const cardsById = { ...state.cardsById };
  for (const id of player.lifeArea.cardIds) {
    cardsById[id] = { ...cardsById[id], currentZone: 'deck', faceState: 'faceDown', revealedTo: [] };
  }
  return {
    ...state,
    cardsById,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        deck: { ...player.deck, cardIds: [...player.deck.cardIds, ...player.lifeArea.cardIds] },
        lifeArea: { ...player.lifeArea, cardIds: [] },
      },
    },
  };
}

/**
 * Starts the defense chapters mid-battle: the Instructor's Leader has just
 * declared an attack on the studying player's Leader (7-1-1). Mirrors
 * executeDeclareAttack's own state shape exactly — attacker rested, full
 * BattleState with the requested step ('block' when the lesson is the Block
 * Step, 'counter' when the scenario has no Blocker and the engine's own
 * skip-empty-Block-Step behavior would land there anyway).
 */
function beginInstructorAttack(state: GameState, attackingPlayerId: string, defendingPlayerId: string, step: 'block' | 'counter'): GameState {
  const attackerLeaderId = state.players[attackingPlayerId].leaderInstanceId;
  const targetLeaderId = state.players[defendingPlayerId].leaderInstanceId;
  return {
    ...state,
    activePlayerId: attackingPlayerId,
    cardsById: {
      ...state.cardsById,
      [attackerLeaderId]: { ...state.cardsById[attackerLeaderId], orientation: 'rested' },
    },
    currentBattle: {
      attackerInstanceId: attackerLeaderId,
      targetInstanceId: targetLeaderId,
      originalTargetInstanceId: targetLeaderId,
      step,
      blockerUsed: false,
      onOpponentsAttackUsedInstanceIds: [],
      battlePowerBonuses: {},
    },
  };
}

/** Deals face-down Life cards from the top of the deck (mirrors 5-2-1-7 / matchStore's playtest dealPlayTestLife transform). */
function dealLife(state: GameState, playerId: string): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  const lifeCount = Math.max(0, player.leaderLifeValue);
  const deckIds = [...player.deck.cardIds];
  const lifeIds: string[] = [];
  const cardsById = { ...state.cardsById };
  for (let i = 0; i < lifeCount && deckIds.length > 0; i++) {
    const cardId = deckIds.shift() as string;
    lifeIds.push(cardId);
    cardsById[cardId] = { ...cardsById[cardId], currentZone: 'lifeArea', faceState: 'faceDown', revealedTo: [] };
  }
  return {
    ...state,
    cardsById,
    players: {
      ...state.players,
      [playerId]: { ...player, hasGoneFirst: playerId === PLAYER_A_ID, deck: { ...player.deck, cardIds: deckIds }, lifeArea: { ...player.lifeArea, cardIds: lifeIds } },
    },
  };
}

/** Draws the opening hand from the top of the deck straight to hand — same zone-surgery shape as dealLife above, targeting `hand` instead of `lifeArea`. */
function drawStartingHand(state: GameState, playerId: string, count: number): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  const deckIds = [...player.deck.cardIds];
  const drawnIds = deckIds.splice(0, count);
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, deck: { ...player.deck, cardIds: deckIds }, hand: { ...player.hand, cardIds: [...player.hand.cardIds, ...drawnIds] } },
    },
  };
}

/**
 * Parks the pre-game state at "turn 3, Main Phase, ready to play" — skips
 * the setup/going-first/mulligan PendingChoice flow entirely (out of scope
 * for a scripted tutorial scenario), same simplification matchStore's Play
 * Test sandbox already uses.
 *
 * Turn THREE, not one, and this matters: 6-5-6-1 forbids battles on either
 * player's first turn (validateDeclareAttack rejects while turnNumber <= 2),
 * so a turn-1 board made every attack chapter's objective illegal — the
 * engine, correctly, said no. Every chapter now presents a mid-game
 * snapshot where attacking is legal.
 */
function readyForMain(state: GameState): GameState {
  return {
    ...state,
    turnNumber: 3,
    activePlayerId: PLAYER_A_ID,
    currentPhase: 'main',
    setupState: null,
    pendingChoices: [],
    currentBattle: null,
    isFirstTurnOfGame: false,
  };
}

/**
 * Chapter-specific deterministic overrides, applied AFTER the shared base
 * scenario (which already gives both sides a mid-game DON!! spread: the
 * studying player 4 active, the Instructor 2 active + 2 rested — see
 * buildTutorialScenario). Cards referenced by number here are from the
 * predefined ST01/ST04 decklists (tutorialDecks.ts), so the teaching
 * dialogue can name them safely.
 */
function applyChapterOverrides(state: GameState, defs: Record<string, CardDefinition>, chapterId: TutorialChapterId): GameState {
  switch (chapterId) {
    // Intro/narration chapters teach over the plain base board.
    case 'cardBasics':
    case 'battlefieldOverview':
    case 'basicRules':
    case 'drawingCards':
    case 'lifeCards':
    case 'donCards': // base board already has active DON!! to give (6-5-5)
      return state;

    // Attack the Instructor's Leader. Their lone Character (no [Blocker])
    // is rested, so the Block Step self-skips and their Life takes the hit.
    case 'leaderAttacks': {
      let next = sanitizeLife(state, defs, PLAYER_B_ID);
      next = putCharacterInPlay(next, defs, PLAYER_B_ID, 'OP08-074', { rested: true }); // Black Maria, 2000
      return next;
    }

    // Play a Character: guarantee the two cards the dialogue names are in hand
    // (Sanji ST21-003 cost 2 / Zoro OP01-025 cost 3 — both payable from 4 active DON!!).
    case 'playingCharacters':
      return ensureHandHas(state, defs, PLAYER_A_ID, ['ST21-003', 'OP01-025']);

    // Your Zoro (5000, ready) vs their RESTED Black Maria (2000) — a clean K.O. (7-1-4-1-2).
    case 'characterAttacks': {
      let next = sanitizeLife(state, defs, PLAYER_B_ID);
      next = putCharacterInPlay(next, defs, PLAYER_A_ID, 'OP01-025', { rested: false });
      next = putCharacterInPlay(next, defs, PLAYER_B_ID, 'OP08-074', { rested: true });
      return next;
    }

    // Mid-battle: Kaido (5000) is attacking your Leader (5000); it's the
    // Counter Step. Nami (+1000) or Sanji (+2000) from hand repels the hit
    // (7-1-3-2-1). Starts at 'counter' because with no Blocker on your board
    // the engine's own Block-Step skip would land there anyway.
    case 'counterStep': {
      let next = sanitizeLife(state, defs, PLAYER_A_ID);
      next = ensureHandHas(next, defs, PLAYER_A_ID, ['ST01-007', 'ST21-003']);
      return beginInstructorAttack(next, PLAYER_B_ID, PLAYER_A_ID, 'counter');
    }

    // Mid-battle at the Block Step: your Chopper (OP10-011, [Blocker], 4000)
    // can throw himself in front of Kaido's attack (7-1-2-1).
    case 'blockers': {
      let next = sanitizeLife(state, defs, PLAYER_A_ID);
      next = putCharacterInPlay(next, defs, PLAYER_A_ID, 'OP10-011', { rested: false });
      return beginInstructorAttack(next, PLAYER_B_ID, PLAYER_A_ID, 'block');
    }

    // Finale: the Instructor has NO Life left — one clean Leader hit wins (1-2-1-1).
    case 'winningTheGame':
      return stripLife(state, PLAYER_B_ID);

    // Events (ST01 runs no [Main] Events) and Triggers (needs the effect
    // runtime) stay content-only this milestone — see tutorialSteps.ts.
    case 'events':
    case 'triggers':
    default:
      return state;
  }
}

export async function buildTutorialScenario(chapterId: TutorialChapterId): Promise<TutorialScenario> {
  const catalog = await loadTutorialCatalog();
  const { p1, p2, defs, images } = buildSetupInputs(catalog);

  const result = createPreGameState(p1, p2, { decidingPlayerId: PLAYER_A_ID, rngState: { seed: `tutorial-${chapterId}`, cursor: 0 } });
  if (!result.ok) {
    throw new Error(`Tutorial: failed to build scenario for '${chapterId}': ${result.reasons.join('; ')}`);
  }

  let state = readyForMain(result.state);
  state = dealLife(state, PLAYER_A_ID);
  state = dealLife(state, PLAYER_B_ID);
  state = drawStartingHand(state, PLAYER_A_ID, STARTING_HAND_SIZE);
  state = drawStartingHand(state, PLAYER_B_ID, STARTING_HAND_SIZE);
  // Shared mid-game DON!! spread (6-4/6-2): you have 4 active to spend; the
  // Instructor shows 2 active + 2 rested — including the RESTED state on
  // purpose, so the board reads like a real game in progress.
  state = placeDon(state, PLAYER_A_ID, 4, 0);
  state = placeDon(state, PLAYER_B_ID, 2, 2);
  state = applyChapterOverrides(state, defs, chapterId);

  return { state, defs, images, studyingPlayerId: PLAYER_A_ID, opponentPlayerId: PLAYER_B_ID };
}
