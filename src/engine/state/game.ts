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
import type { AbilityGate } from '../effects/effectIr';

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
  /** The DECLARE_ATTACK action's original target, kept for log/UI clarity even after a Blocker re-targets (above). */
  originalTargetInstanceId: string;
  step: BattleStep;
  /** [Blocker] used this battle? Capped at one activation (7-1-2-1). */
  blockerUsed: boolean;
  /**
   * Power granted "during this battle" by ACTIVATE_COUNTER_CHARACTER
   * (7-1-3-2-1), keyed by the boosted CardInstance id. A Counter Character's
   * boost target ("1 of your Leader or Character cards") is not necessarily
   * the card currently under attack, so this is tracked per-instance rather
   * than as a single defender bonus. Cleared (the whole BattleState is
   * discarded) at End of Battle (7-1-5) — the duration expires naturally.
   */
  battlePowerBonuses: Record<string, number>;
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

/** Gating condition re-evaluated every time the modifier is read (8-3-2, 10-2-x). */
export interface ContinuousPowerCondition {
  /** [DON!! xN]: the card the modifier applies to has >= N DON!! cards attached (6-5-5, 10-2-x). */
  donAttachedAtLeast?: number;
  /** [Your Turn] / [Opponent's Turn] gating, relative to the modifier's owner. */
  turn?: 'your' | 'opponent';
  /** "If <board state>" gate(s), re-checked on every power read (e.g. "If you have 2 or less Life cards"). */
  gate?: AbilityGate[];
}

/**
 * A dynamic target group for an "aura"/anthem power modifier (e.g. "your
 * {Supernovas}/{Navy} Leaders and Characters gain +1000"). Unlike a single-target
 * modifier, the affected set is resolved at read time, so cards entering play
 * later are covered automatically. Evaluated by computeCurrentPower.
 */
export interface PowerAuraGroup {
  /** The modifier owner's own Leader + Characters. */
  ownLeaderAndCharacters?: true;
  /** Restrict to cards carrying any of these tribal types (OR). Omitted = all. */
  anyOfTypes?: string[];
  /** Exclude the Leader (chars only) — for "all of your Characters" auras. */
  charactersOnly?: boolean;
  /** Target the OPPONENT's Characters instead of the controller's — for "give all of your opponent's Characters -N". */
  opponentCharacters?: boolean;
}

/**
 * A gate evaluated against the modifier's SOURCE card (not the buffed card),
 * re-checked on every read. Used by auras whose activation depends on the
 * source's own state, e.g. X.Drake "[Your Turn] If this Character is rested".
 */
export interface SourceStateCondition {
  /** Source must be rested / active. */
  rested?: boolean;
  /** Source has >= N DON!! attached ([DON!! xN]). */
  donAttachedAtLeast?: number;
  /** [Your Turn]/[Opponent's Turn] relative to the source's owner. */
  turn?: 'your' | 'opponent';
}

/** A structured power delta, evaluated by computeCurrentPower. */
/** Count source for a dynamic "+X power for every N of <source>" scaling modifier. */
export type PowerScaleSource = 'controllerHand' | 'controllerTrash' | 'controllerTrashEvents' | 'controllerRestedDon';

/** Dynamic scaling term: effective bonus = floor(count(per) / step) * amountPer, re-read each time. */
export interface PowerScale {
  per: PowerScaleSource;
  step: number;
  amountPer: number;
}

export interface ContinuousPowerModifier {
  /** Single fixed target. Exactly one of appliesToInstanceId / appliesToGroup is set. */
  appliesToInstanceId?: string;
  /** Dynamic aura target set, resolved at read time. */
  appliesToGroup?: PowerAuraGroup;
  /** Signed power delta (can be negative, e.g. "−2000 power"; 1-3-6-1 allows negative power). */
  amount: number;
  /** Gate evaluated against the buffed (modified) card. Omitted when unconditional. */
  condition?: ContinuousPowerCondition;
  /** Gate evaluated against the SOURCE card. Omitted when the modifier does not depend on source state. */
  sourceCondition?: SourceStateCondition;
  /** Dynamic "+X for every N" scaling term added to `amount` at read time. */
  scale?: PowerScale;
}

export interface ContinuousCostModifier {
  appliesToInstanceId: string;
  /** Signed cost delta; final computed cost is floored at 0. */
  amount: number;
  /** Omitted when the modifier is unconditional. */
  condition?: ContinuousPowerCondition;
}

/** Prevents some or all [Blocker] activations while a specific attacker is attacking. */
export interface ContinuousBlockerRestriction {
  appliesToAttackerInstanceId: string;
  /** Omitted for "cannot activate [Blocker]" with no blocker filter. */
  blockerPowerAtLeast?: number;
}

/** Prevents the target Leader/Character from declaring an attack (7-1-1-1) while this record is active. */
export interface ContinuousAttackRestriction {
  appliesToInstanceId: string;
}

export type ContinuousKeyword = 'rush' | 'blocker' | 'doubleAttack' | 'banish' | 'unblockable';

/** A structured keyword grant applied to one instance, with optional dynamic conditions. */
export interface ContinuousKeywordModifier {
  appliesToInstanceId: string;
  keyword: ContinuousKeyword;
  /** Omitted when the granted keyword is unconditional. */
  condition?: ContinuousPowerCondition;
}

/**
 * Grants "this card cannot be K.O.'d" to one instance (re-evaluated on every K.O.
 * attempt). `scope` distinguishes "cannot be K.O.'d in battle" (7-1-4-2 only) from
 * "cannot be K.O.'d" by any source (battle or card effect).
 */
export interface ContinuousKoImmunityModifier {
  appliesToInstanceId: string;
  scope: 'battle' | 'effect' | 'any';
  /**
   * Restrict a battle immunity to K.O.s dealt by an attacker of this category
   * ("cannot be K.O.'d in battle by Leaders" → 'leader'). Omitted = any attacker.
   */
  attackerCategory?: 'leader' | 'character';
  /** Omitted when the immunity is unconditional. */
  condition?: ContinuousPowerCondition;
}

export interface ContinuousEffectRecord {
  id: string;
  sourceInstanceId: string;
  ownerId: string;
  duration: ContinuousEffectDuration;
  /** Free-text description, for log/debug. */
  description: string;
  /** Structured power delta, when this record modifies power. Omitted for non-power effects. */
  powerModifier?: ContinuousPowerModifier;
  /** Structured cost delta, when this record modifies cost. Omitted for non-cost effects. */
  costModifier?: ContinuousCostModifier;
  /** Structured blocker-activation restriction. Omitted for unrelated continuous effects. */
  blockerRestriction?: ContinuousBlockerRestriction;
  /** Structured attack restriction ("cannot attack"). Omitted for unrelated continuous effects. */
  attackRestriction?: ContinuousAttackRestriction;
  /** Structured keyword grant. Omitted for unrelated continuous effects. */
  keywordModifier?: ContinuousKeywordModifier;
  /** Structured "cannot be K.O.'d" grant. Omitted for unrelated continuous effects. */
  koImmunityModifier?: ContinuousKoImmunityModifier;
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
  /**
   * Monotonic counter used to mint a fresh CardInstance id whenever a
   * Character/Stage/Event card changes zones mid-game (3-1-6 — "treated as
   * a brand-new card", see card.ts's CardInstance doc comment). Setup-minted
   * ids (leader/deck/DON!!) never touch this counter — see
   * setup/instanceIds.ts. Starts at 0 the moment setup hands off to turn 1.
   */
  nextInstanceSeq: number;
}
