/**
 * Top-level game state.
 * Source of truth: Comprehensive Rules, Section 6 "Game Progression",
 * Section 1 "Game Overview", Section 9 "Rule Processing".
 *
 * GameState must be fully JSON-serializable (project ground rule) — no
 * class instances, Map/Set, functions, or undefined values inside it.
 */
import type { CardInstance } from './card';
import type { PlayerState } from './player';
import type { GameLogEntry } from '../logs/logEntry';
import type { PendingChoice } from '../events/pendingChoice';
import type { RngState } from '../rng/rng';

/**
 * 6-1-1. Battle (Section 7) is a Main Phase action, not a 6th phase — see
 * BattleState. 'setup' is NOT one of the 5 turn phases from 6-1-1 — it's the
 * pre-game procedure of Section 5 ("Game Setup"), which happens once, before
 * turn 1's Refresh Phase begins (5-2-1-8). Modeled as a Phase value (rather
 * than a separate state machine outside GameState) so setup actions
 * (CHOOSE_GOING_FIRST, MULLIGAN_DECISION) flow through the exact same
 * validate/execute dispatch pipeline as every other action — see
 * src/engine/setup.
 */
export type Phase = 'setup' | 'refresh' | 'draw' | 'don' | 'main' | 'end';

/** Sub-steps within the 'setup' phase. See src/engine/setup for the reducers. */
export type SetupStage = 'awaitingGoingFirstChoice' | 'awaitingMulliganDecision';

/**
 * Active only while currentPhase === 'setup'; null afterward. Tracks the
 * parts of Comprehensive Rules Section 5 that are genuine player decisions
 * (5-2-1-4/5-2-1-5 going first/second, 5-2-1-6 mulligan) — the purely
 * procedural parts (5-2-1-1 through 5-2-1-3, DON!! deck placement) are not
 * actions and are folded directly into GameState by createPreGameState.
 */
export interface SetupState {
  /**
   * 5-2-1-4: whichever player won Rock-Paper-Scissors-or-similar and gets to
   * decide whether THEY go first or second. The RPS-or-similar mechanism
   * itself is explicitly out of the engine's scope (5-2-1-4-1: "No
   * intervention of any kind is allowed in the player's decision") — the
   * caller (UI/app layer) resolves that out-of-band and supplies the result
   * here as plain data.
   */
  decidingPlayerId: string;
  stage: SetupStage;
  /** Filled in by executeChooseGoingFirst once 5-2-1-5 resolves. */
  goingFirstPlayerId?: string;
  goingSecondPlayerId?: string;
}

/** 7-1-1 through 7-1-5. */
export type BattleStep = 'attack' | 'block' | 'counter' | 'damage' | 'endOfBattle';

/** Active only while a Battle (6-5-6) is in progress; null otherwise. */
export interface BattleState {
  attackerInstanceId: string;
  /** Leader or Character CardInstance id; re-targeted if [Blocker] activates (7-1-2-1). */
  targetInstanceId: string;
  step: BattleStep;
  /** [Blocker] used this battle? Capped at one activation (7-1-2-1). */
  blockerUsed: boolean;
}

/** 1-2-1-1, 9-2-1, 1-2-3 (concession), 1-2-5 (card-effect win/loss). */
export type GameOverReason = 'lifeDamageAtZero' | 'deckedOut' | 'concession' | 'cardEffect' | 'draw';

/** Duration tags drive expiry in Refresh/End Phase processing (6-2-1, 6-6-1-2, 6-6-1-3, 7-1-5-3). */
export type ContinuousEffectDuration =
  | 'untilStartOfNextTurn'
  | 'endOfTurn'
  | 'endOfOpponentsTurn'
  | 'duringThisTurn'
  | 'duringThisBattle'
  | 'permanent';

export interface ContinuousEffectRecord {
  id: string;
  sourceInstanceId: string;
  ownerId: string;
  duration: ContinuousEffectDuration;
  /** Free-text description for now; structured effect payload is future work (see blueprint doc, Known Limitations). */
  description: string;
}

export interface GameState {
  /** 0 during the 'setup' phase (Section 5 hasn't reached 5-2-1-8 yet); 1 from the moment the first turn begins. */
  turnNumber: number;
  /**
   * "Turn player" (4-3-1) once currentPhase !== 'setup'. During 'setup',
   * this instead tracks whose input is required next (the deciding player
   * for the going-first choice, then whichever player's mulligan decision
   * is outstanding) — there is no "turn player" yet at that point.
   */
  activePlayerId: string;
  currentPhase: Phase;
  currentBattle: BattleState | null;
  /** Section 5 ("Game Setup") progress; null once 5-2-1-8 has happened. See SetupState. */
  setupState: SetupState | null;
  players: Record<string, PlayerState>;
  /** Single source of truth for every card in the game, keyed by instanceId. Zones store ids only. */
  cardsById: Record<string, CardInstance>;
  rng: RngState;
  continuousEffects: ContinuousEffectRecord[];
  /** Keyed by `${cardInstanceId}:${effectId}`; cleared on that instance's owner's Refresh Phase. */
  oncePerTurnUsage: Record<string, true>;
  pendingChoices: PendingChoice[];
  log: GameLogEntry[];
  gameOver: { winnerId: string | null; reason: GameOverReason } | null;
  /** Gates 6-3-1 (no draw), 6-4-1 (1 DON!!), 6-5-6-1 (no battle) first-turn exceptions. */
  isFirstTurnOfGame: boolean;
}
