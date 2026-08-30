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
import type { CpuDifficulty } from '../../ai';
import { GENERIC_DON_CARD_DEFINITION } from '../../cards/decks/genericDonCard';
import type { SavedDeck } from '../../cards/decks/savedDeck';
import type { DeckConstructionEntry } from '../../cards/decks/deckValidation';
import type { GameAction } from '../../engine/actions';
import { validateAction, executeAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { mintRuntimeInstanceId } from '../../engine/rules/shared/mintInstance';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { buildCuratedEffectRegistry } from '../../cards/effectTemplates';
import { buildV2EffectRuntimeRegistry } from '../../cards/effectCompiler_V2/runtimeCatalog_V2';
import type { EffectRuntimeBundle_V2 } from '../../engine/effects_V2/runtime_V2';
import { createEmptyEffectRuntimeSidecars_V2, type EffectRuntimeSidecars_V2 } from '../../engine/effects_V2/dispatcher_V2';
import { validateDeckConstruction_V2 } from '../../engine/effects_V2/deckConstruction_V2';
import {
  applyV2EffectsForAction,
  executeV2ActionOverride,
} from '../../engine/effects_V2/engineAdapter_V2';
import { hashSeed } from '../../engine/rng';
import { createPreGameState, resolveDonDeckSize, type PlayerSetupInput } from '../../engine/setup';
import type { CardDefinition, CardInstance } from '../../engine/state/card';
import type { GameState } from '../../engine/state';
import type { GameLogEntry } from '../../engine/logs/logEntry';
import { buildAccessoriesByPlayer, buildCardDefinitionLookup, buildCardImageLookup, resolveLeaderDonDeckSize, savedDeckToPlayerSetupInput, type ResolvedDeckAccessories } from '../lib/savedDeckToSetupInput';
import { parseMovementSpecs } from '../../animations/cardMovement/parseLogEntries';
import { applyMovementPresentation } from '../../animations/cardMovement/presentationHints';
import { buildTurnSequence } from '../../animations/phaseAnnounce/buildTurnSequence';
import { parseSoundCues, soundManager } from '../../audio';
import { useSettingsStore } from './settingsStore';
import { useCardAnimationStore } from './cardAnimationStore';
import { usePhaseAnnounceStore } from './phaseAnnounceStore';
import { EFFECT_RUNTIME_MODE } from '../config/effectRuntimeMode';
import { createTrajectoryRecorder, hashCardDataForCardNumbers, type TrajectoryRecorder } from '../../engine/replay';
import { generateLegalActions } from '../../ai';
import { submitTrajectory } from '../../multiplayer/net/trajectoryClient';
import type { TrajectorySeat } from '../../../shared/replay';

/**
 * Splits a dispatch's log delta into (a) ordinary card movement, presented
 * immediately as before (playing a card, attacking, DON!! given mid-turn —
 * anything with no turn/phase-transition marker in it), and (b) the
 * turn-change + Refresh -> Draw -> DON!! -> Main sequence, handed to
 * phaseAnnounceStore as ONE ordered queue of steps that each own their own
 * banner AND (for phase steps) card flights — see buildTurnSequence.ts /
 * phaseAnnounceStore.ts doc comments for why this needed to be a single
 * queue instead of the turn-change banner and phase banners running as two
 * separate systems on two separate clocks. Called from every dispatch()
 * exit point below instead of enqueuing straight to cardAnimationStore.
 */
function presentLogDelta(
  prevState: GameState,
  delta: GameLogEntry[],
  images: Record<string, string | null>,
  localPlayerId: string | null,
): void {
  if (delta.length === 0) return;
  const animationsEnabled = useSettingsStore.getState().animationsEnabled;
  const { preStepEntries, steps } = buildTurnSequence(prevState, delta, images, localPlayerId, animationsEnabled);

  if (animationsEnabled && preStepEntries.length > 0) {
    const specs = applyMovementPresentation(parseMovementSpecs(prevState, preStepEntries, images), localPlayerId);
    useCardAnimationStore.getState().enqueue(specs);
  }
  if (steps.length > 0) {
    usePhaseAnnounceStore.getState().enqueue(steps);
  }

  // Sound follows the SAME split. Cues for the mid-turn entries fire now;
  // cues for a phase step are carried ON that step and released by
  // phaseAnnounceStore at the moment the step becomes current, so a Draw
  // Phase riffle can never play three banners early. Delays inside a batch
  // are pre-computed by parseSoundCues to line up with the card flights.
  const cueOptions = { localPlayerId, animationsEnabled };
  if (preStepEntries.length > 0) {
    soundManager.playEvents(parseSoundCues(prevState, preStepEntries, cueOptions));
  }
}

/**
 * Build the match's card-effect registry from curated V1 EffectProgram data.
 * Raw CardDefinition.text is never compiled or executed at runtime; it is only
 * display/reference text. A card gets behavior only when its cardNumber has an
 * explicit reviewed program in /src/cards/effectTemplates/curatedPrograms.ts.
 */
function buildRegistryFromDefs(defs: CardDefinitionLookup): EffectTemplateRegistry {
  if (EFFECT_RUNTIME_MODE === 'v2') return {};
  return buildCuratedEffectRegistry(defs);
}

function buildV2RuntimeFromDefs(defs: CardDefinitionLookup): EffectRuntimeBundle_V2 | null {
  if (EFFECT_RUNTIME_MODE !== 'v2') return null;
  const result = buildV2EffectRuntimeRegistry(defs);
  console.info(`[effects:v2] loaded ${result.summary.v2AbilityCount} native V2 abilities for ${result.summary.cardCount} cards.`);
  return result.runtime;
}

function savedDeckMainEntries(deck: SavedDeck): DeckConstructionEntry[] {
  return deck.cards.map((snapshot) => ({
    definition: snapshot.definition,
    quantity: snapshot.quantity,
  }));
}

function validateSavedDeckConstruction_V2(deck: SavedDeck, runtime: EffectRuntimeBundle_V2): string[] {
  return validateDeckConstruction_V2(deck.leader.definition, savedDeckMainEntries(deck), runtime).reasons
    .map((reason) => `${deck.name}: ${reason}`);
}

/**
 * VS CPU decision logging, opt-in and off by default.
 *
 * Enable with `?cpudebug=1` on the URL, or `localStorage.optcgCpuDebug = '1'`.
 * When on, every CPU decision prints its ranked candidate actions and the
 * strategic context behind them (see ai/debug/decisionTrace.ts), which is the
 * only practical way to tell "the CPU chose to pass" apart from "the CPU had
 * nothing legal to do". Reading it must never throw in a non-browser context
 * (tests, SSR), hence the guards.
 */
function readCpuDebugFlag(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('cpudebug') ?? params.get('cpuDebug');
    if (fromQuery !== null) return fromQuery !== '0' && fromQuery !== 'false';
    return window.localStorage?.getItem('optcgCpuDebug') === '1';
  } catch {
    return false;
  }
}

/**
 * VS CPU match recording (see src/engine/replay).
 *
 * Held OUTSIDE the zustand store on purpose: it is not UI state, nothing
 * renders from it, and putting it in the store would re-render the whole match
 * screen on every recorded action. `startMatch` replaces it, `dispatch` feeds
 * it, and the end of the game seals and uploads it.
 *
 * Every entry point here is wrapped so that a recording fault can never take a
 * match down with it — this feature is strictly a passenger.
 */
let cpuTrajectoryRecorder: TrajectoryRecorder | null = null;

function recordingEnabled(): boolean {
  try {
    return useSettingsStore.getState().contributeMatchData !== false;
  } catch {
    return false;
  }
}

function engineBuildStamp(): string {
  try {
    return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown';
  } catch {
    return 'unknown';
  }
}

function trajectorySeatFor(
  seatId: string,
  input: PlayerSetupInput,
  cpuPlayerIds: readonly string[],
  cpuDifficulty: CpuDifficulty,
): TrajectorySeat {
  const isCpu = cpuPlayerIds.includes(seatId);
  return {
    seatId,
    // Left null on purpose: the ingest endpoint attributes an upload to the
    // authenticated account that sent it, so a client-supplied user id would
    // be both redundant and untrustworthy.
    userId: null,
    controller: isCpu ? 'cpu' : 'human',
    ...(isCpu ? { cpuDifficulty } : {}),
    leaderCardNumber: input.leader.cardNumber,
    // The EXPANDED, pre-shuffle order actually handed to createPreGameState —
    // the seeded shuffle is applied to this list, so any other order replays
    // into a different game.
    deckCardNumbers: input.deck.map((def) => def.cardNumber),
    // Resolve the same default the engine would, so a replay rebuilds the same
    // DON!! deck rather than silently falling back to a different size.
    donDeckSize: resolveDonDeckSize(input),
  };
}

/**
 * How many actions the acting seat could legally have chosen instead. Without
 * it a forced move is indistinguishable from a deliberate one, and forced
 * moves carry no preference signal at all. Computed on the state BEFORE the
 * action, and never allowed to throw.
 */
function countLegalActions(state: GameState, playerId: string, defs: CardDefinitionLookup, registry: EffectTemplateRegistry): number {
  try {
    return generateLegalActions({
      state,
      playerId,
      defs,
      registry,
      createActionId,
    }).length;
  } catch {
    return -1;
  }
}

/** Append an ACCEPTED action to the recording. Never throws. */
function recordAcceptedAction(action: GameAction, stateAfter: GameState, legalActionCount: number): void {
  if (!cpuTrajectoryRecorder) return;
  try {
    cpuTrajectoryRecorder.record(action, stateAfter, { legalActionCount });
  } catch {
    cpuTrajectoryRecorder = null;
  }
}

/**
 * Seal and upload once the match is genuinely over. Fire-and-forget: the
 * player is already looking at the result screen and must never wait on, or
 * be shown an error from, a research upload.
 */
function finalizeRecordingIfFinished(stateAfter: GameState): void {
  if (!cpuTrajectoryRecorder || !stateAfter.gameOver) return;
  const recorder = cpuTrajectoryRecorder;
  cpuTrajectoryRecorder = null;
  try {
    const trajectory = recorder.finish(stateAfter);
    // Dev-only escape hatch: with ?cpudebug=1 the finished recording is also
    // parked on window so it can be inspected without a backend configured.
    try {
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('cpudebug')) {
        (window as unknown as { __lastTrajectory?: unknown }).__lastTrajectory = trajectory;
        console.info(`[replay] recorded ${trajectory.actions.length} actions, winner=${trajectory.outcome?.winnerSeatId ?? 'none'}`);
      }
    } catch {
      // never let a debug aid affect the match
    }
    // authStore is imported lazily rather than at module scope: it transitively
    // pulls in savedDecksStore, which reads localStorage while its module
    // initialises. A static import here would drag `window` into every
    // node-environment test that touches matchStore.
    void import('./authStore')
      .then(({ useAuthStore }) => submitTrajectory(trajectory, useAuthStore.getState().token))
      .catch(() => undefined);
  } catch {
    // A recording that cannot be sealed is simply discarded.
  }
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

  const p1Leader = leaders[0] ?? fallbackLeader('PLAYTEST-P1');
  const p2Leader = leaders[1] ?? fallbackLeader('PLAYTEST-P2');

  return {
    reasons,
    p1Input: {
      playerId: PLAYER_A_ID,
      leader: p1Leader,
      deck: pickDeckCards(deckPool, 50, 11),
      donCard: GENERIC_DON_CARD_DEFINITION,
      donDeckSize: resolveLeaderDonDeckSize(p1Leader, 10),
    },
    p2Input: {
      playerId: PLAYER_B_ID,
      leader: p2Leader,
      deck: pickDeckCards(deckPool, 50, 101),
      donCard: GENERIC_DON_CARD_DEFINITION,
      donDeckSize: resolveLeaderDonDeckSize(p2Leader, 10),
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

function capPlayTestDonPool(state: GameState, playerId: string, maxDon: number): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  const attached = attachedDonIds(state, playerId);
  const costIds = [...player.costArea.cardIds];
  const donDeckIds = [...player.donDeck.cardIds];
  const totalDon = costIds.length + donDeckIds.length;
  let excess = Math.max(0, totalDon - maxDon);
  if (excess === 0) return state;

  const cardsById = { ...state.cardsById };
  while (excess > 0 && donDeckIds.length > 0) {
    const id = donDeckIds.pop() as string;
    delete cardsById[id];
    excess -= 1;
  }

  for (let i = costIds.length - 1; i >= 0 && excess > 0; i -= 1) {
    const id = costIds[i];
    if (attached.has(id)) continue;
    costIds.splice(i, 1);
    delete cardsById[id];
    excess -= 1;
  }

  return {
    ...state,
    cardsById,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        donDeck: { ...player.donDeck, cardIds: donDeckIds },
        costArea: { ...player.costArea, cardIds: costIds },
      },
    },
  };
}

interface MatchStoreState {
  state: GameState | null;
  defs: CardDefinitionLookup;
  /** Curated card effects injected into every validate/execute call, so [On Play]/[Activate: Main]/etc. fire in-game. Keyed by cardNumber (== cardDefinitionId). */
  registry: EffectTemplateRegistry;
  /** Opt-in V2 sidecar. Loaded only in dev:v2; not passed into V1 validate/execute until a V2 interpreter exists. */
  v2EffectRuntime: EffectRuntimeBundle_V2 | null;
  /** Non-authoritative V2 simulation sidecars. Kept outside GameState so V1 gameplay remains authoritative. */
  v2EffectSidecars: EffectRuntimeSidecars_V2 | null;
  /** cardDefinitionId -> cosmetic image URL, for board/zoom UI only — never read by the engine. See savedDeckToSetupInput.ts. */
  cardImagesByDefinitionId: Record<string, string | null>;
  /** engine playerId -> resolved cosmetic accessory art (deck/DON sleeves, DON card art), for the board projection only — never read by the engine. See savedDeckToSetupInput.ts buildAccessoriesByPlayer. */
  accessoriesByPlayerId: Record<string, ResolvedDeckAccessories>;
  /** Which two SavedDeck ids the live match was started with (+ presentation fingerprint), so the Match screen can tell "still the requested match" apart from "navigated here with different decks/mode" without restarting on every re-render. */
  startedWithDeckIds: { a: string; b: string; presentationKey: string } | null;
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
  /** CPU-controlled seat ids for vs CPU mode. Never read by the engine. */
  cpuPlayerIds: string[];
  cpuDifficulty: CpuDifficulty;
  cpuDebug: boolean;
  playTestMode: boolean;
  playTestErrors: PlayTestErrorLogEntry[];
  onlineMode: boolean;
  onlineSendIntent: ((action: GameAction) => void) | null;

  /**
   * `decidingPlayerId` is the winner of the out-of-band pre-game toss (rule
   * 5-2-1-4-1) — Rock-Paper-Scissors for VS AI, a direct pick in Hot Seat.
   * Resolved by the UI BEFORE this is called, because it is an INPUT to
   * createPreGameState rather than something the engine can be asked for
   * afterwards. Omitted only by callers with no toss of their own (Play Test,
   * the tutorial), which fall back to the seat/seed derivation.
   */
  startMatch(deckA: SavedDeck, deckB: SavedDeck, presentation?: MatchPresentation, decidingPlayerId?: string): MatchStartResult;
  hydrateOnlineMatch(params: {
    state: GameState;
    defs: CardDefinitionLookup;
    images?: Record<string, string | null>;
    localPlayerId: string;
    playerNames: Record<string, string>;
    sendIntent: (action: GameAction) => void;
  }): void;
  /**
   * Online-mode counterpart to dispatch()'s own presentLogDelta calls below.
   * dispatch() short-circuits (sends the intent to the server, never runs
   * the engine locally) whenever onlineMode is true, so the turn-change/
   * phase-announce queue and card-flight queue never got fed for online
   * matches — see onlineStore.ts's wireRoom(), which calls this from its
   * ServerMessage.Log handler using the GameState captured just before the
   * paired ServerMessage.State message overwrote it (the server always sends
   * State then Log for the same action).
   */
  presentOnlineLogDelta(prevState: GameState, delta: GameLogEntry[]): void;
  startPlayTest(entries: PlayTestCatalogEntry[]): MatchStartResult;
  playTestAddCardToHand(playerId: string, cardDefinitionId: string): MatchDispatchResult;
  playTestAddCardToDeckTop(playerId: string, cardDefinitionId: string): MatchDispatchResult;
  playTestSetLeader(playerId: string, cardDefinitionId: string): MatchDispatchResult;
  playTestAdjustDon(playerId: string, delta: number): MatchDispatchResult;
  playTestForceTurn(playerId: string): MatchDispatchResult;
  recordPlayTestError(message: string, data?: Omit<PlayTestErrorLogEntry, 'id' | 'timestamp' | 'message'>): void;
  clearPlayTestErrors(): void;
  dispatch(action: GameAction): MatchDispatchResult;
  /**
   * Phase 2 asset preload seam (see matchAssetPreload.ts): swaps
   * `cardImagesByDefinitionId` for a preloaded map (remote URLs replaced by
   * local `blob:` URLs where caching succeeded). Deliberately a separate
   * action from startMatch() rather than a parameter on it — preloading is
   * async and startMatch() itself must stay synchronous, so MatchScreen
   * calls this once startMatch() has returned and the preload promise
   * resolves. A plain `set()` would work too; this exists so callers outside
   * the store never reach for raw `.setState()`.
   */
  applyCardImages(images: Record<string, string | null>): void;
  reset(): void;
}

import type { MatchPresentation } from './navigationStore';

/** Label a seat: its username if one was provided, else the raw engine id (hotseat shows p1/p2). */
export function resolvePlayerName(playerId: string, playerNames: Record<string, string>): string {
  return playerNames[playerId] ?? playerId;
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  state: null,
  defs: {},
  registry: {},
  v2EffectRuntime: null,
  v2EffectSidecars: null,
  cardImagesByDefinitionId: {},
  accessoriesByPlayerId: {},
  startedWithDeckIds: null,
  startError: null,
  localPlayerId: null,
  playerNames: {},
  cpuPlayerIds: [],
  cpuDifficulty: 'normal',
  cpuDebug: false,
  playTestMode: false,
  playTestErrors: readPersistedPlayTestErrors(),
  onlineMode: false,
  onlineSendIntent: null,

  startMatch(deckA, deckB, presentation, requestedDecidingPlayerId) {
    // Pull the match cue set into memory now, while decks are still being
    // validated — a cue whose asset is still downloading when its moment
    // arrives is dropped rather than played late (audio/soundManager.ts).
    void soundManager.preload('match');
    const p1Input = savedDeckToPlayerSetupInput(deckA, PLAYER_A_ID);
    const p2Input = savedDeckToPlayerSetupInput(deckB, PLAYER_B_ID);
    const defs = buildCardDefinitionLookup([deckA, deckB]);
    const v2EffectRuntime = buildV2RuntimeFromDefs(defs);

    if (EFFECT_RUNTIME_MODE === 'v2' && v2EffectRuntime) {
      const v2DeckReasons = [
        ...validateSavedDeckConstruction_V2(deckA, v2EffectRuntime),
        ...validateSavedDeckConstruction_V2(deckB, v2EffectRuntime),
      ];
      if (v2DeckReasons.length > 0) {
        set({
          state: null,
          defs: {},
          registry: {},
          v2EffectRuntime: null,
          v2EffectSidecars: null,
          cardImagesByDefinitionId: {},
          accessoriesByPlayerId: {},
          startedWithDeckIds: null,
          startError: v2DeckReasons,
          localPlayerId: null,
          playerNames: {},
          cpuPlayerIds: [],
          cpuDifficulty: 'normal',
          cpuDebug: false,
          playTestMode: false,
          onlineMode: false,
          onlineSendIntent: null,
        });
        return { ok: false, reasons: v2DeckReasons };
      }
    }

    const isCpu = presentation?.mode === 'cpu';
    const localPlayerId = presentation?.localPlayerId ?? (isCpu ? PLAYER_A_ID : null);
    const playerNames = presentation?.playerNames ?? {};
    const cpuPlayerIds = isCpu ? presentation.cpuPlayerIds : [];
    const cpuDifficulty = isCpu ? presentation.difficulty : 'normal';
    const cpuDebug = isCpu ? (presentation.cpuDebug ?? readCpuDebugFlag()) : false;

    // The seed is the root of randomness for this match — it does not itself
    // need to be deterministic (cf. shuffling a real deck before play), only
    // every DRAW from it does (createSeededRng makes that true).
    const seed = generateRandomId('seed');

    // 5-2-1-4-1: the going-first-or-second DECISION is explicitly out of the
    // engine's scope ("no intervention of any kind is allowed"); resolving WHO
    // gets to make that decision is the same kind of out-of-band input, and it
    // now comes from a real Rock-Paper-Scissors round (VS AI) or a direct pick
    // (Hot Seat), resolved by the UI before this call — see PreGameDecider.
    //
    // The fallback behind it serves callers that have no toss at all: Play
    // Test and the tutorial build a board directly. It keeps the previous
    // behaviour (local seat if there is one, else seed-derived) so those flows
    // are untouched.
    const decidingPlayerId =
      requestedDecidingPlayerId ?? localPlayerId ?? (hashSeed(seed) % 2 === 0 ? PLAYER_A_ID : PLAYER_B_ID);

    const result = createPreGameState(p1Input, p2Input, {
      decidingPlayerId,
      rngState: { seed, cursor: 0 },
    });

    if (!result.ok) {
      set({
        state: null,
        defs: {},
        registry: {},
        v2EffectRuntime: null,
        v2EffectSidecars: null,
        cardImagesByDefinitionId: {},
        accessoriesByPlayerId: {},
        startedWithDeckIds: null,
        startError: result.reasons,
        localPlayerId: null,
        playerNames: {},
        cpuPlayerIds: [],
        cpuDifficulty: 'normal',
        cpuDebug: false,
        playTestMode: false,
        onlineMode: false,
        onlineSendIntent: null,
      });
      return { ok: false, reasons: result.reasons };
    }

    set({
      state: result.state,
      defs,
      registry: buildRegistryFromDefs(defs),
      v2EffectRuntime,
      v2EffectSidecars: v2EffectRuntime ? createEmptyEffectRuntimeSidecars_V2() : null,
      cardImagesByDefinitionId: buildCardImageLookup([deckA, deckB]),
      accessoriesByPlayerId: buildAccessoriesByPlayer([
        { playerId: PLAYER_A_ID, deck: deckA },
        { playerId: PLAYER_B_ID, deck: deckB },
      ]),
      startedWithDeckIds: { a: deckA.deckId, b: deckB.deckId, presentationKey: presentation ? JSON.stringify(presentation) : '' },
      startError: null,
      localPlayerId,
      playerNames,
      cpuPlayerIds,
      cpuDifficulty,
      cpuDebug,
      playTestMode: false,
      onlineMode: false,
      onlineSendIntent: null,
    });

    // Begin recording this match (src/engine/replay). VS CPU only: Casual is a
    // hotseat where both seats are the same human, which is not play data.
    cpuTrajectoryRecorder = null;
    if (isCpu && recordingEnabled()) {
      try {
        cpuTrajectoryRecorder = createTrajectoryRecorder({
          source: 'vs-cpu',
          engineBuild: engineBuildStamp(),
          // Hash the seat-scoped set (both leaders + every deck entry) using
          // the SAME normalized definitions the engine is playing with, so a
          // replay compares like for like.
          cardDataHash: hashCardDataForCardNumbers(
            [p1Input, p2Input].flatMap((input) => [
              input.leader.cardNumber,
              ...input.deck.map((def) => def.cardNumber),
            ]),
            (cardNumber) =>
              [p1Input, p2Input]
                .flatMap((input) => [input.leader, ...input.deck])
                .find((def) => def.cardNumber === cardNumber),
          ),
          rngSeed: seed,
          decidingPlayerId,
          seats: [
            trajectorySeatFor(PLAYER_A_ID, p1Input, cpuPlayerIds, cpuDifficulty),
            trajectorySeatFor(PLAYER_B_ID, p2Input, cpuPlayerIds, cpuDifficulty),
          ],
        });
      } catch {
        cpuTrajectoryRecorder = null;
      }
    }

    return { ok: true };
  },

  hydrateOnlineMatch({ state, defs, images = {}, localPlayerId, playerNames, sendIntent }) {
    useCardAnimationStore.getState().clear();
    const v2EffectRuntime = buildV2RuntimeFromDefs(defs);
    set({
      state,
      defs,
      registry: buildRegistryFromDefs(defs),
      v2EffectRuntime,
      v2EffectSidecars: v2EffectRuntime ? createEmptyEffectRuntimeSidecars_V2() : null,
      cardImagesByDefinitionId: images,
      // Online matches don't (yet) sync deck accessories; default chrome falls
      // back automatically when a seat has no resolved accessories.
      accessoriesByPlayerId: {},
      startedWithDeckIds: null,
      startError: null,
      localPlayerId,
      playerNames,
      cpuPlayerIds: [],
      cpuDifficulty: 'normal',
      cpuDebug: false,
      playTestMode: false,
      onlineMode: true,
      onlineSendIntent: sendIntent,
    });
  },

  presentOnlineLogDelta(prevState, delta) {
    const { cardImagesByDefinitionId, localPlayerId } = get();
    presentLogDelta(prevState, delta, cardImagesByDefinitionId, localPlayerId);
  },

  startPlayTest(entries) {
    const setup = buildPlayTestSetup(entries);
    if (setup.reasons.length > 0) {
      const error = createPlayTestError('Could not start Play Test.', { reasons: setup.reasons });
      const errors = [...get().playTestErrors, error];
      persistPlayTestErrors(errors);
      set({ state: null, v2EffectRuntime: null, v2EffectSidecars: null, startError: setup.reasons, playTestMode: true, playTestErrors: errors, onlineMode: false, onlineSendIntent: null });
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
      set({ state: null, v2EffectRuntime: null, v2EffectSidecars: null, startError: result.reasons, playTestMode: true, playTestErrors: errors, onlineMode: false, onlineSendIntent: null });
      return { ok: false, reasons: result.reasons };
    }

    const lookups = buildPlayTestLookups(entries);
    const v2EffectRuntime = buildV2RuntimeFromDefs(lookups.defs);
    set({
      state: readyPlayTestState(result.state),
      defs: lookups.defs,
      registry: buildRegistryFromDefs(lookups.defs),
      v2EffectRuntime,
      v2EffectSidecars: v2EffectRuntime ? createEmptyEffectRuntimeSidecars_V2() : null,
      cardImagesByDefinitionId: lookups.images,
      accessoriesByPlayerId: {},
      startedWithDeckIds: null,
      startError: null,
      localPlayerId: null,
      playerNames: { [PLAYER_A_ID]: 'Play Test P1', [PLAYER_B_ID]: 'Play Test P2' },
      playTestMode: true,
      onlineMode: false,
      onlineSendIntent: null,
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

  playTestAddCardToDeckTop(playerId, cardDefinitionId) {
    const { state, defs } = get();
    if (!state) return { ok: false, reasons: ['No match is in progress.'] };
    const definition = defs[cardDefinitionId];
    if (!definition) return { ok: false, reasons: [`Unknown card definition ${cardDefinitionId}.`] };
    if (definition.category === 'leader' || definition.category === 'don') {
      return { ok: false, reasons: ['Only Character, Event, and Stage cards can be injected into deck.'] };
    }
    const player = state.players[playerId];
    if (!player) return { ok: false, reasons: [`Unknown player ${playerId}.`] };

    const minted = mintRuntimeInstanceId(state);
    const instance: CardInstance = {
      instanceId: minted.id,
      cardDefinitionId,
      ownerId: playerId,
      controllerId: playerId,
      currentZone: 'deck',
      orientation: null,
      faceState: 'faceDown',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: [],
      ...(definition.basePower !== undefined ? { currentPower: definition.basePower } : {}),
      ...(definition.baseCost !== undefined ? { currentCost: definition.baseCost } : {}),
    };
    const next = appendGameLog(
      {
        ...minted.state,
        cardsById: { ...minted.state.cardsById, [minted.id]: instance },
        players: {
          ...minted.state.players,
          [playerId]: { ...player, deck: { ...player.deck, cardIds: [minted.id, ...player.deck.cardIds] } },
        },
      },
      `Play Test placed ${definition.cardNumber} ${definition.name} on top of ${playerId}'s deck.`,
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
    const withLeader = {
      ...state,
      cardsById: { ...state.cardsById, [leader.instanceId]: updatedLeader },
      players: {
        ...state.players,
        [playerId]: { ...player, leaderLifeValue: definition.life ?? player.leaderLifeValue },
      },
    };
    const withDonLimit = capPlayTestDonPool(withLeader, playerId, resolveLeaderDonDeckSize(definition, 10));
    const next = appendGameLog(
      withDonLimit,
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
    const { state, defs, registry, localPlayerId, playTestMode, onlineMode, onlineSendIntent, v2EffectRuntime, v2EffectSidecars } = get();
    if (!state) {
      return { ok: false, reasons: ['No match is in progress.'] };
    }
    // Must be measured on the state BEFORE the action, and only when we are
    // actually recording — enumerating legal actions is not free.
    const recordedLegalCount = cpuTrajectoryRecorder ? countLegalActions(state, action.playerId, defs, registry) : -1;
    if (onlineMode) {
      if (!onlineSendIntent) return { ok: false, reasons: ['Online transport is not connected.'] };
      onlineSendIntent(action);
      return { ok: true };
    }
    if (action.type === 'RETURN_GIVEN_DON' && localPlayerId !== null && get().cpuPlayerIds.length === 0) {
      return { ok: false, reasons: ['Returning given DON!! is not allowed in Casual matches.'] };
    }
    if (EFFECT_RUNTIME_MODE === 'v2' && v2EffectRuntime) {
      try {
        const handled = executeV2ActionOverride({
          state,
          defs,
          runtime: v2EffectRuntime,
          sidecars: v2EffectSidecars,
          action,
        });
        if (handled.handled) {
          if (!handled.ok) {
            if (playTestMode) get().recordPlayTestError('V2 Play Test action failed validation.', { actionType: action.type, reasons: handled.reasons, details: { action } });
            return { ok: false, reasons: handled.reasons };
          }
          const { cardImagesByDefinitionId } = get();
          presentLogDelta(state, handled.log, cardImagesByDefinitionId, localPlayerId);
          set({ state: handled.state, v2EffectSidecars: handled.sidecars });
          recordAcceptedAction(action, handled.state, recordedLegalCount);
          finalizeRecordingIfFinished(handled.state);
          return { ok: true };
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (playTestMode) get().recordPlayTestError('V2 Play Test action threw during execution.', { actionType: action.type, reasons: [message], details: { action } });
        return { ok: false, reasons: [message] };
      }
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
    presentLogDelta(state, result.log, cardImagesByDefinitionId, localPlayerId);
    let nextState = result.state;
    let nextLog = result.log;
    let nextV2EffectSidecars = v2EffectSidecars;
    if (v2EffectRuntime) {
      try {
        const applied = applyV2EffectsForAction({
          previousState: state,
          state: result.state,
          defs,
          runtime: v2EffectRuntime,
          sidecars: v2EffectSidecars,
          action,
          log: result.log,
        });
        nextState = applied.state;
        nextLog = [...nextLog, ...applied.log];
        nextV2EffectSidecars = applied.sidecars;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (playTestMode) {
          get().recordPlayTestError('V2 effect execution threw after core execution.', { actionType: action.type, reasons: [message], details: { action } });
        } else {
          console.warn('[effects:v2] effect execution failed', e);
        }
      }
    }
    if (nextLog.length > result.log.length) {
      presentLogDelta(result.state, nextLog.slice(result.log.length), cardImagesByDefinitionId, localPlayerId);
    }
    set({ state: nextState, v2EffectSidecars: nextV2EffectSidecars });
    recordAcceptedAction(action, nextState, recordedLegalCount);
    finalizeRecordingIfFinished(nextState);
    return { ok: true };
  },

  applyCardImages(images) {
    set({ cardImagesByDefinitionId: images });
  },

  reset() {
    // An abandoned match is not a result; discard rather than upload.
    cpuTrajectoryRecorder = null;
    useCardAnimationStore.getState().clear();
    usePhaseAnnounceStore.getState().clear();
    set({ state: null, defs: {}, registry: {}, v2EffectRuntime: null, v2EffectSidecars: null, cardImagesByDefinitionId: {}, accessoriesByPlayerId: {}, startedWithDeckIds: null, startError: null, localPlayerId: null, playerNames: {}, cpuPlayerIds: [], cpuDifficulty: 'normal', cpuDebug: false, playTestMode: false, onlineMode: false, onlineSendIntent: null });
  },
}));
