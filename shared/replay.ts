/**
 * Recorded-match contract, shared by the client (VS CPU), the server (online
 * rooms) and the offline self-play harness.
 *
 * WHY AN ACTION STREAM AND NOT STATE SNAPSHOTS
 * The engine is deterministic: setup instance ids are minted from
 * playerId+index (engine/setup/instanceIds.ts), mid-game ids come from
 * GameState.nextInstanceSeq, and every shuffle/draw runs through the seeded
 * RNG in GameState.rng. So `seed + decklists + the ordered actions` is a
 * LOSSLESS record — replaying it regenerates every intermediate state exactly.
 * That makes a whole match a few KB instead of a few hundred, and the same
 * record doubles as the replay feature.
 *
 * The cost of that choice is that a recording is only as reproducible as the
 * code that made it. Two stamps make drift LOUD rather than silent:
 *   - `engineBuild`  — rules changed under us.
 *   - `cardDataHash` — a card definition changed under us (this project
 *     re-derives printed keywords and repairs catalog data regularly, so this
 *     is a real, recurring hazard, not a theoretical one).
 * `checkpoints` then catches divergence at the exact action it starts, so a
 * silently-wrong replay can never become training data.
 *
 * HIDDEN INFORMATION
 * Nothing here is redacted, because nothing here is a state: an action stream
 * reveals only what was DONE. Redaction happens at replay time, per acting
 * seat, in engine/replay/replayTrajectory.ts. That is deliberate — training on
 * a god view teaches the model to use information it cannot have at inference.
 */
import type { GameAction } from '../src/engine/actions/action';

export const MATCH_TRAJECTORY_SCHEMA_VERSION = 1;

/** Where a recording came from. Data quality differs sharply between these. */
export type TrajectorySource = 'vs-cpu' | 'online' | 'self-play';

export type SeatController = 'human' | 'cpu';

export interface TrajectorySeat {
  /** Engine seat id — 'p1' | 'p2'. */
  seatId: string;
  /** Null for a CPU seat or an unauthenticated local player. */
  userId: string | null;
  controller: SeatController;
  /** Present only for a CPU seat. */
  cpuDifficulty?: 'easy' | 'normal' | 'hard';
  leaderCardNumber: string;
  /**
   * Main deck as card numbers in the EXACT pre-shuffle order handed to
   * createPreGameState. Order matters: the seeded shuffle is applied to this
   * list, so a different order replays into a different game.
   */
  deckCardNumbers: string[];
  donDeckSize: number;
}

/** A checksum of the full state after a given action, for divergence detection. */
export interface TrajectoryCheckpoint {
  afterActionIndex: number;
  checksum: string;
}

export interface RecordedAction {
  /** Replayed verbatim, actionId included — ids appear in effect bookkeeping. */
  action: GameAction;
  /**
   * How many actions the actor could legally have taken instead. A decision
   * with one legal action carries no signal and should be dropped from
   * training; without this you cannot tell those apart after the fact.
   */
  legalActionCount: number;
  /** Wall-clock ms the actor spent deciding. Null when not measured. */
  decisionMs: number | null;
}

export interface TrajectoryOutcome {
  /** Null on a draw. */
  winnerSeatId: string | null;
  /** GameOverReason from the engine. */
  reason: string;
  turnNumber: number;
}

export interface MatchTrajectory {
  schemaVersion: number;
  source: TrajectorySource;
  /** Opaque build stamp of the engine that produced this recording. */
  engineBuild: string;
  /** Hash over every CardDefinition used by this match. */
  cardDataHash: string;
  rngSeed: string;
  /** Who chose to go first (5-2-1-4) — an input to createPreGameState. */
  decidingPlayerId: string;
  seats: TrajectorySeat[];
  actions: RecordedAction[];
  checkpoints: TrajectoryCheckpoint[];
  /** Null if the match was abandoned rather than finished. */
  outcome: TrajectoryOutcome | null;
  startedAt: string;
  endedAt: string | null;
}

/** Request body for POST /api/trajectories (client-recorded VS CPU matches). */
export interface SubmitTrajectoryRequest {
  trajectory: MatchTrajectory;
}
