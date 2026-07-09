/**
 * Holds the live, authoritative GameState for the local hotseat match in
 * progress. This is the ONE place in /src/app allowed to call the engine's
 * validate/execute dispatch pair (engine/actions/dispatch.ts) directly —
 * every other store/component reads `state`/`defs` from here and calls
 * `dispatch()`, never `cardsById`/`players`/etc. mutators of its own
 * (project rule: "the UI must never directly mutate game state").
 *
 * `dispatch()` is deliberately the SAME {state, action, defs} -> {state,
 * log, pendingChoices} round trip a future network-authoritative server
 * would run — see project ground rule "design local hotseat as if every
 * click will later become a network request." Nothing here decides
 * legality; `validateAction`/`executeAction` do that (Layer 1/2). This
 * store is just the synchronous local transport for now.
 */
import { create } from 'zustand';
import { GENERIC_DON_CARD_DEFINITION } from '../../cards/decks/genericDonCard';
import type { SavedDeck } from '../../cards/decks/savedDeck';
import type { GameAction } from '../../engine/actions';
import { validateAction, executeAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { mintRuntimeInstanceId } from '../../engine/rules/shared/mintInstance';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { buildCuratedEffectRegistry } from '../../cards/effectTemplates';
import { hashSeed } from '../../engine/rng';
import { createPreGameState, type PlayerSetupInput } from '../../engine/setup';
import type { CardDefinition, CardInstance } from '../../engine/state/card';
import type { GameState } from '../../engine/state';
import type { GameLogEntry } from '../../engine/logs/logEntry';
import { buildCardDefinitionLookup, buildCardImageLookup, savedDeckToPlayerSetupInput } from '../lib/savedDeckToSetupInput';
import { parseMovementSpecs } from '../../animations/cardMovement/parseLogEntries';
import { applyMovementPresentation } from '../../animations/cardMovement/presentationHints';
import { useSettingsStore } from './settingsStore';
import { useCardAnimationStore } from './cardAnimationStore';

/**
 * Build the match's card-effect registry from curated EffectProgram data.
 * Raw CardDefinition.text is never compiled or executed at runtime; it is only
 * display/reference text. A card gets behavior only when its cardNumber has an
 * explicit reviewed program in /src/cards/effectTemplates/curatedPrograms.ts.
 */
function buildRegistryFromDefs(defs: CardDefinitionLookup): EffectTemplateRegistry {
  return buildCuratedEffectRegistry(defs);
}

/** Fixed, stable player ids for the local hotseat match — both sides are the same human, alternating. */
export const PLAYER_A_ID = 'p1';
export const PLAYER_B_ID = 'p2';

export type MatchStartResult = { ok: true } | { ok: false; reasons: string[] };
export type MatchDispatchResult = { ok: true } | { ok: false; reasons: string[] };

export interface PlayTestCatalogEntry {
  definition: CardDefinition;
  imageUrl: string | null;
  setCode: string;
}

export interface PlayTestErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  actionType?: string;
  reasons?: string[];
  details?: Record<string, unknown>;
}

const PLAY_TEST_ERROR_LOG_KEY = 'optcg.playTest.errorLog.v1';

function generateRandomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** New id for GameAction.actionId — see action.ts: "unique per dispatch, useful for replay/dedup over network." */
export function createActionId(): string {
  return generateRandomId('action');
}

function readPersistedPlayTestErrors(): PlayTestErrorLogEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLAY_TEST_ERROR_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is PlayTestErrorLogEntry => typeof entry?.id === 'string' && typeof entry?.message === 'string') : [];
  } catch {
    return [];
  }
}

function persistPlayTestErrors(entries: PlayTestErrorLogEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PLAY_TEST_ERROR_LOG_KEY, JSON.stringify(entries.slice(-500), null, 2));
}

function createPlayTestError(message: string, data?: Omit<PlayTestErrorLogEntry, 'id' | 'timestamp' | 'message'>): PlayTestErrorLogEntry {
  return {
    id: generateRandomId('playtest-error'),
    timestamp: new Date().toISOString(),
    message,
    ...data,
  };
}

function appendGameLog(state: GameState, message: string, actorPlayerId: string | null = null): GameState {
  const sequence = state.log.length + 1;
  const entry: GameLogEntry = {
    id: `playtest-log-${sequence}`,
    sequence,
    turnNumber: state.turnNumber,
    phase: state.currentPhase,
    actorPlayerId,
    type: 'EFFECT_RESOLVED',
    message,
    data: { debug: true },
    relatedCardInstanceIds: [],
    visibility: 'public',
    causedByActionId: null,
  };
  return { ...state, log: [...state.log, entry] };
}

function byCardNumber(entries: PlayTestCatalogEntry[]): PlayTestCatalogEntry[] {
  const seen = new Set<string>();
  const unique: PlayTestCatalogEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.definition.cardDefinitionId)) continue;
    seen.add(entry.definition.cardDefinitionId);
    unique.push(entry);
  }
  return unique;
}

function pickDeckCards(pool: CardDefinition[], count: number, offset: number): CardDefinition[] {
  if (pool.length === 0) return [];
  return Array.from({ length: count }, (_, index) => pool[(index * 37 + offset) % pool.length]);
}

function buildPlayTestSetup(entries: PlayTestCatalogEntry[]): { p1Input: PlayerSetupInput; p2Input: PlayerSetupInput; reasons: string[] } {
  const unique = byCardNumber(entries);
  const leaders = unique.filter((entry) => entry.definition.category === 'leader').map((entry) => entry.definition);
  const deckPool = unique
    .filter((entry) => entry.definition.category === 'character' || entry.definition.category === 'event' || entry.definition.category === 'stage')
    .map((entry) => entry.definition);

  const reasons: string[] = [];
  if (leaders.length < 2) reasons.push('Play Test needs at least 2 Leader definitions in the catalog.');
  if (deckPool.length === 0) reasons.push('Play Test needs at least 1 main-deck definition in the catalog.');

  return {
    reasons,
    p1Input: {
      playerId: PLAYER_A_ID,
      leader: leaders[0] ?? fallbackLeader('PLAYTEST-P1'),
      deck: pickDeckCards(deckPool, 50, 11),
      donCard: GENERIC_DON_CARD_DEFINITION,
      donDeckSize: 10,
    },
    p2Input: {
      playerId: PLAYER_B_ID,
      leader: leaders[1] ?? fallbackLeader('PLAYTEST-P2'),
      deck: pickDeckCards(deckPool, 50, 101),
      donCard: GENERIC_DON_CARD_DEFINITION,
      donDeckSize: 10,
    },
  };
}

function fallbackLeader(cardDefinitionId: string): CardDefinition {
  return {
    cardDefinitionId,
    name: cardDefinitionId,
    category: 'leader',
    colors: ['red'],
    types: [],
    attributes: ['strike'],
    basePower: 5000,
    text: '',
    life: 5,
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    hasBanish: false,
    isUnblockable: false,
    cardNumber: cardDefinitionId,
  };
}

function dealPlayTestLife(state: GameState, playerId: string): GameState {
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
      [playerId]: {
        ...player,
        hasGoneFirst: playerId === PLAYER_A_ID,
        deck: { ...player.deck, cardIds: deckIds },
        lifeArea: { ...player.lifeArea, cardIds: lifeIds },
      },
    },
  };
}

function readyPlayTestState(state: GameState): GameState {
  let next = dealPlayTestLife(state, PLAYER_A_ID);
  next = dealPlayTestLife(next, PLAYER_B_ID);
  next = {
    ...next,
    turnNumber: 1,
    activePlayerId: PLAYER_A_ID,
    currentPhase: 'main',
    setupState: null,
    pendingChoices: [],
    currentBattle: null,
    isFirstTurnOfGame: false,
  };
  return appendGameLog(next, 'Play Test sandbox started with generated decks and random searchable deck contents.');
}

function buildPlayTestLookups(entries: PlayTestCatalogEntry[]): { defs: CardDefinitionLookup; images: Record<string, string | null> } {
  const defs: CardDefinitionLookup = {};
  const images: Record<string, string | null> = {};
  for (const entry of byCardNumber(entries)) {
    defs[entry.definition.cardDefinitionId] = entry.definition;
    images[entry.definition.cardDefinitionId] = entry.imageUrl;
  }
  defs[GENERIC_DON_CARD_DEFINITION.cardDefinitionId] = GENERIC_DON_CARD_DEFINITION;
  images[GENERIC_DON_CARD_DEFINITION.cardDefinitionId] = null;
  return { defs, images };
}

function attachedDonIds(state: GameState, playerId: string): Set<string> {
  const ids = new Set<string>();
  for (const card of Object.values(state.cardsById)) {
    if (card.controllerId !== playerId) continue;
    for (const donId of card.donAttached) ids.add(donId);
  }
  return ids;
}

interface MatchStoreState {
  state: GameState | null;
  defs: CardDefinitionLookup;
  /** Curated card effects injected into every validate/execute call, so [On Play]/[Activate: Main]/etc. fire in-game. Keyed by cardNumber (== cardDefinitionId). */
  registry: EffectTemplateRegistry;
  /** cardDefinitionId -> cosmetic image URL, for board/zoom UI only — never read by the engine. See savedDeckToSetupInput.ts. */
  cardImagesByDefinitionId: Record<string, string | null>;
  /** Which two SavedDeck ids the live match was started with, so the Match screen can tell "still the requested match" apart from "navigated here with different decks" without restarting on every re-render. */
  startedWithDeckIds: { a: string; b: string } | null;
  /** Reasons the most recent startMatch() call failed, for the Match screen to display. Cleared on the next successful start. */
  startError: string[] | null;
  /**
   * Presentation-only seat binding (Layer 3). `null` == classic hotseat: the
   * board follows whose turn it is and seats read p1/p2. Non-null (Casual)
   * pins the board to this seat's perspective and forces IT to be the
   * out-of-band deciding player, so the local client can always take the
   * first pre-game decision. Never read by the engine — GameState is
   * identical either way.
   */
  localPlayerId: string | null;
  /** engine playerId -> display username, for board/log/banner labels. Empty == label by id. Never read by the engine. */
  playerNames: Record<string, string>;
  playTestMode: boolean;
  playTestErrors: PlayTestErrorLogEntry[];

  startMatch(deckA: SavedDeck, deckB: SavedDeck, presentation?: MatchPresentation): MatchStartResult;
  startPlayTest(entries: PlayTestCatalogEntry[]): MatchStartResult;
  playTestAddCardToHand(playerId: string, cardDefinitionId: string): MatchDispatchResult;
  playTestSetLeader(playerId: string, cardDefinitionId: string): MatchDispatchResult;
  playTestAdjustDon(playerId: string, delta: number): MatchDispatchResult;
  playTestForceTurn(playerId: string): MatchDispatchResult;
  recordPlayTestError(message: string, data?: Omit<PlayTestErrorLogEntry, 'id' | 'timestamp' | 'message'>): void;
  clearPlayTestErrors(): void;
  dispatch(action: GameAction): MatchDispatchResult;
  reset(): void;
}

/** Optional UI seat/label config for a match (see MatchStoreState.localPlayerId). */
export interface MatchPresentation {
  localPlayerId?: string;
  playerNames?: Record<string, string>;
}

/** Label a seat: its username if one was provided, else the raw engine id (hotseat shows p1/p2). */
export function resolvePlayerName(playerId: string, playerNames: Record<string, string>): string {
  return playerNames[playerId] ?? playerId;
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  state: null,
  defs: {},
  registry: {},
  cardImagesByDefinitionId: {},
  startedWithDeckIds: null,
  startError: null,
  localPlayerId: null,
  playerNames: {},
  playTestMode: false,
  playTestErrors: readPersistedPlayTestErrors(),

  startMatch(deckA, deckB, presentation) {
    const p1Input = savedDeckToPlayerSetupInput(deckA, PLAYER_A_ID);
    const p2Input = savedDeckToPlayerSetupInput(deckB, PLAYER_B_ID);

    const localPlayerId = presentation?.localPlayerId ?? null;
    const playerNames = presentation?.playerNames ?? {};

    // The seed is the root of randomness for this match — it does not itself
    // need to be deterministic (cf. shuffling a real deck before play), only
    // every DRAW from it does (createSeededRng makes that true).
    const seed = generateRandomId('seed');

    // 5-2-1-4-1: the going-first-or-second DECISION is explicitly out of the
    // engine's scope ("no intervention of any kind is allowed"); resolving
    // WHO gets to make that decision (the real-life coin-flip/RPS-or-similar
    // step) is the same kind of out-of-band input. In hotseat it is derived
    // from the match seed (reproducible pre-game flow). In a Casual match the
    // local seat is made the deciding player, so this single-client build can
    // always take the first pre-game decision itself rather than stalling on
    // a not-yet-connected opponent — still a purely out-of-band choice.
    const decidingPlayerId =
      localPlayerId ?? (hashSeed(seed) % 2 === 0 ? PLAYER_A_ID : PLAYER_B_ID);

    const result = createPreGameState(p1Input, p2Input, {
      decidingPlayerId,
      rngState: { seed, cursor: 0 },
    });

    if (!result.ok) {
      set({ state: null, defs: {}, registry: {}, cardImagesByDefinitionId: {}, startedWithDeckIds: null, startError: result.reasons, localPlayerId: null, playerNames: {}, playTestMode: false });
      return { ok: false, reasons: result.reasons };
    }

    const defs = buildCardDefinitionLookup([deckA, deckB]);
    set({
      state: result.state,
      defs,
      registry: buildRegistryFromDefs(defs),
      cardImagesByDefinitionId: buildCardImageLookup([deckA, deckB]),
      startedWithDeckIds: { a: deckA.deckId, b: deckB.deckId },
      startError: null,
      localPlayerId,
      playerNames,
      playTestMode: false,
    });
    return { ok: true };
  },

  startPlayTest(entries) {
    const setup = buildPlayTestSetup(entries);
    if (setup.reasons.length > 0) {
      const error = createPlayTestError('Could not start Play Test.', { reasons: setup.reasons });
      const errors = [...get().playTestErrors, error];
      persistPlayTestErrors(errors);
      set({ state: null, startError: setup.reasons, playTestMode: true, playTestErrors: errors });
      return { ok: false, reasons: setup.reasons };
    }

    const seed = generateRandomId('playtest-seed');
    const result = createPreGameState(setup.p1Input, setup.p2Input, {
      decidingPlayerId: PLAYER_A_ID,
      rngState: { seed, cursor: 0 },
    });
    if (!result.ok) {
      const error = createPlayTestError('Engine rejected generated Play Test setup.', { reasons: result.reasons });
      const errors = [...get().playTestErrors, error];
      persistPlayTestErrors(errors);
      set({ state: null, startError: result.reasons, playTestMode: true, playTestErrors: errors });
      return { ok: false, reasons: result.reasons };
    }

    const lookups = buildPlayTestLookups(entries);
    set({
      state: readyPlayTestState(result.state),
      defs: lookups.defs,
      registry: buildRegistryFromDefs(lookups.defs),
      cardImagesByDefinitionId: lookups.images,
      startedWithDeckIds: null,
      startError: null,
      localPlayerId: null,
      playerNames: { [PLAYER_A_ID]: 'Play Test P1', [PLAYER_B_ID]: 'Play Test P2' },
      playTestMode: true,
    });
    return { ok: true };
  },

  playTestAddCardToHand(playerId, cardDefinitionId) {
    const { state, defs } = get();
    if (!state) return { ok: false, reasons: ['No match is in progress.'] };
    const definition = defs[cardDefinitionId];
    if (!definition) return { ok: false, reasons: [`Unknown card definition ${cardDefinitionId}.`] };
    if (definition.category === 'leader' || definition.category === 'don') {
      return { ok: false, reasons: ['Only Character, Event, and Stage cards can be injected into hand.'] };
    }
    const player = state.players[playerId];
    if (!player) return { ok: false, reasons: [`Unknown player ${playerId}.`] };

    const minted = mintRuntimeInstanceId(state);
    const instance: CardInstance = {
      instanceId: minted.id,
      cardDefinitionId,
      ownerId: playerId,
      controllerId: playerId,
      currentZone: 'hand',
      orientation: null,
      faceState: 'faceDown',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: [playerId],
      ...(definition.basePower !== undefined ? { currentPower: definition.basePower } : {}),
      ...(definition.baseCost !== undefined ? { currentCost: definition.baseCost } : {}),
    };
    const next = appendGameLog(
      {
        ...minted.state,
        cardsById: { ...minted.state.cardsById, [minted.id]: instance },
        players: {
          ...minted.state.players,
          [playerId]: { ...player, hand: { ...player.hand, cardIds: [...player.hand.cardIds, minted.id] } },
        },
      },
      `Play Test added ${definition.cardNumber} ${definition.name} to ${playerId}'s hand.`,
      playerId,
    );
    set({ state: next });
    return { ok: true };
  },

  playTestSetLeader(playerId, cardDefinitionId) {
    const { state, defs } = get();
    if (!state) return { ok: false, reasons: ['No match is in progress.'] };
    const definition = defs[cardDefinitionId];
    if (!definition) return { ok: false, reasons: [`Unknown card definition ${cardDefinitionId}.`] };
    if (definition.category !== 'leader') return { ok: false, reasons: [`${definition.cardNumber} is not a Leader.`] };
    const player = state.players[playerId];
    if (!player) return { ok: false, reasons: [`Unknown player ${playerId}.`] };
    const leader = state.cardsById[player.leaderInstanceId];
    if (!leader) return { ok: false, reasons: [`${playerId} has no leader instance.`] };

    const updatedLeader: CardInstance = {
      ...leader,
      cardDefinitionId,
      currentPower: definition.basePower,
      orientation: leader.orientation ?? 'active',
      faceState: 'faceUp',
      revealedTo: 'all',
    };
    const next = appendGameLog(
      {
        ...state,
        cardsById: { ...state.cardsById, [leader.instanceId]: updatedLeader },
        players: {
          ...state.players,
          [playerId]: { ...player, leaderLifeValue: definition.life ?? player.leaderLifeValue },
        },
      },
      `Play Test set ${playerId}'s Leader to ${definition.cardNumber} ${definition.name}.`,
      playerId,
    );
    set({ state: next });
    return { ok: true };
  },

  playTestAdjustDon(playerId, delta) {
    const { state } = get();
    if (!state) return { ok: false, reasons: ['No match is in progress.'] };
    const player = state.players[playerId];
    if (!player) return { ok: false, reasons: [`Unknown player ${playerId}.`] };
    if (delta === 0) return { ok: true };

    const cardsById = { ...state.cardsById };
    let nextPlayer = player;
    const moved: string[] = [];
    if (delta > 0) {
      const donDeckIds = [...player.donDeck.cardIds];
      const costIds = [...player.costArea.cardIds];
      for (let i = 0; i < delta && donDeckIds.length > 0; i++) {
        const id = donDeckIds.shift() as string;
        moved.push(id);
        costIds.push(id);
        cardsById[id] = { ...cardsById[id], currentZone: 'costArea', faceState: 'faceUp', donRested: false, revealedTo: 'all' };
      }
      nextPlayer = { ...player, donDeck: { ...player.donDeck, cardIds: donDeckIds }, costArea: { ...player.costArea, cardIds: costIds } };
    } else {
      const attached = attachedDonIds(state, playerId);
      const costIds = [...player.costArea.cardIds];
      const donDeckIds = [...player.donDeck.cardIds];
      for (let i = costIds.length - 1; i >= 0 && moved.length < Math.abs(delta); i--) {
        const id = costIds[i];
        if (attached.has(id)) continue;
        costIds.splice(i, 1);
        moved.push(id);
        donDeckIds.unshift(id);
        cardsById[id] = { ...cardsById[id], currentZone: 'donDeck', faceState: 'faceDown', donRested: false, revealedTo: 'all' };
      }
      nextPlayer = { ...player, donDeck: { ...player.donDeck, cardIds: donDeckIds }, costArea: { ...player.costArea, cardIds: costIds } };
    }

    if (moved.length === 0) {
      return { ok: false, reasons: [delta > 0 ? 'No DON!! cards remain in the DON!! deck.' : 'No unattached DON!! cards are available to remove.'] };
    }
    const next = appendGameLog(
      { ...state, cardsById, players: { ...state.players, [playerId]: nextPlayer } },
      `Play Test ${delta > 0 ? 'added' : 'removed'} ${moved.length} DON!! for ${playerId}.`,
      playerId,
    );
    set({ state: next });
    return { ok: true };
  },

  playTestForceTurn(playerId) {
    const { state } = get();
    if (!state) return { ok: false, reasons: ['No match is in progress.'] };
    if (!state.players[playerId]) return { ok: false, reasons: [`Unknown player ${playerId}.`] };
    const next = appendGameLog(
      {
        ...state,
        activePlayerId: playerId,
        currentPhase: 'main',
        currentBattle: null,
        pendingChoices: [],
        turnNumber: state.activePlayerId === playerId ? state.turnNumber : state.turnNumber + 1,
      },
      `Play Test forced turn priority to ${playerId}.`,
      playerId,
    );
    set({ state: next });
    return { ok: true };
  },

  recordPlayTestError(message, data) {
    const error = createPlayTestError(message, data);
    const errors = [...get().playTestErrors, error].slice(-500);
    persistPlayTestErrors(errors);
    set({ playTestErrors: errors });
  },

  clearPlayTestErrors() {
    persistPlayTestErrors([]);
    set({ playTestErrors: [] });
  },

  dispatch(action) {
    const { state, defs, registry, localPlayerId, playTestMode } = get();
    if (!state) {
      return { ok: false, reasons: ['No match is in progress.'] };
    }
    if (action.type === 'RETURN_GIVEN_DON' && localPlayerId !== null) {
      return { ok: false, reasons: ['Returning given DON!! is not allowed in Casual matches.'] };
    }
    const validation = validateAction(state, action, defs, registry);
    if (!validation.legal) {
      if (playTestMode) {
        get().recordPlayTestError('Play Test action failed validation.', { actionType: action.type, reasons: validation.reasons, details: { action } });
      }
      return { ok: false, reasons: validation.reasons };
    }
    // executeAction re-validates internally — see dispatch.ts doc comment.
    // That's intentional, harmless redundancy, not a bug to "optimize away".
    let result: ReturnType<typeof executeAction>;
    try {
      result = executeAction(state, action, defs, registry);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (playTestMode) {
        get().recordPlayTestError('Play Test action threw during execution.', { actionType: action.type, reasons: [message], details: { action } });
      }
      return { ok: false, reasons: [message] };
    }
    const { cardImagesByDefinitionId } = get();
    if (useSettingsStore.getState().animationsEnabled && result.log.length > 0) {
      const specs = applyMovementPresentation(
        parseMovementSpecs(state, result.log, cardImagesByDefinitionId),
        localPlayerId,
      );
      useCardAnimationStore.getState().enqueue(specs);
    }
    set({ state: result.state });
    return { ok: true };
  },

  reset() {
    useCardAnimationStore.getState().clear();
    set({ state: null, defs: {}, registry: {}, cardImagesByDefinitionId: {}, startedWithDeckIds: null, startError: null, localPlayerId: null, playerNames: {}, playTestMode: false });
  },
}));
