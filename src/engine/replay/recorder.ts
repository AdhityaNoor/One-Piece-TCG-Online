/**
 * Accumulates a match into a MatchTrajectory as it is played.
 *
 * The recorder is deliberately dumb and pure: it appends an action, takes a
 * checksum every N actions, and hands back a plain object. All three call
 * sites (VS CPU in matchStore, online in GameRoom, offline self-play) share
 * it so a recording means the same thing wherever it came from.
 *
 * It records an action only AFTER the engine accepted it. A rejected action
 * never happened as far as the game is concerned, and replaying one would
 * desynchronise the stream from the state it is supposed to reproduce.
 */
import type {
  MatchTrajectory,
  RecordedAction,
  TrajectoryCheckpoint,
  TrajectorySeat,
  TrajectorySource,
} from '../../../shared/replay';
import { MATCH_TRAJECTORY_SCHEMA_VERSION } from '../../../shared/replay';
import type { GameAction } from '../actions/action';
import type { GameState } from '../state/game';
import { checksumState } from './stateChecksum';

/**
 * Checksum cadence. Every action would double the record's size for no extra
 * safety — divergence, once it starts, never heals, so sampling finds it
 * within a few actions either way. 10 keeps a full match under a handful of
 * checkpoints while still naming the turn a drift began on.
 */
export const DEFAULT_CHECKPOINT_INTERVAL = 10;

export interface TrajectoryRecorderInit {
  source: TrajectorySource;
  engineBuild: string;
  cardDataHash: string;
  rngSeed: string;
  decidingPlayerId: string;
  seats: TrajectorySeat[];
  checkpointInterval?: number;
  /** Injected clock, so tests are deterministic. */
  now?: () => string;
}

export interface RecordActionMeta {
  legalActionCount?: number;
  decisionMs?: number | null;
}

export interface TrajectoryRecorder {
  /** Call AFTER the engine accepted `action`, with the state it produced. */
  record(action: GameAction, stateAfter: GameState, meta?: RecordActionMeta): void;
  /** Seal the recording. Safe to call more than once; the first result stands. */
  finish(finalState: GameState | null): MatchTrajectory;
  /** Actions recorded so far — for size guards at the call site. */
  actionCount(): number;
}

export function createTrajectoryRecorder(init: TrajectoryRecorderInit): TrajectoryRecorder {
  const now = init.now ?? (() => new Date().toISOString());
  const interval = init.checkpointInterval ?? DEFAULT_CHECKPOINT_INTERVAL;
  const actions: RecordedAction[] = [];
  const checkpoints: TrajectoryCheckpoint[] = [];
  const startedAt = now();
  let sealed: MatchTrajectory | null = null;

  return {
    record(action, stateAfter, meta) {
      if (sealed) return;
      actions.push({
        action,
        // -1 reads as "not measured" and is distinguishable from a genuine 1,
        // which means the actor had no choice and the row carries no signal.
        legalActionCount: meta?.legalActionCount ?? -1,
        decisionMs: meta?.decisionMs ?? null,
      });
      const index = actions.length - 1;
      if (index % interval === interval - 1) {
        checkpoints.push({ afterActionIndex: index, checksum: checksumState(stateAfter) });
      }
    },

    finish(finalState) {
      if (sealed) return sealed;
      // Always checkpoint the final position, whatever the interval landed on:
      // it is the one state a replay must reproduce to be trusted at all.
      if (finalState && actions.length > 0) {
        const lastIndex = actions.length - 1;
        if (checkpoints[checkpoints.length - 1]?.afterActionIndex !== lastIndex) {
          checkpoints.push({ afterActionIndex: lastIndex, checksum: checksumState(finalState) });
        }
      }
      sealed = {
        schemaVersion: MATCH_TRAJECTORY_SCHEMA_VERSION,
        source: init.source,
        engineBuild: init.engineBuild,
        cardDataHash: init.cardDataHash,
        rngSeed: init.rngSeed,
        decidingPlayerId: init.decidingPlayerId,
        seats: init.seats,
        actions,
        checkpoints,
        outcome: finalState?.gameOver
          ? {
              winnerSeatId: finalState.gameOver.winnerId,
              reason: String(finalState.gameOver.reason),
              turnNumber: finalState.turnNumber,
            }
          : null,
        startedAt,
        endedAt: now(),
      };
      return sealed;
    },

    actionCount() {
      return actions.length;
    },
  };
}
