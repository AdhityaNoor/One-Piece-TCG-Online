/**
 * Match recording and replay.
 *
 * A match is stored as `seed + decklists + the ordered action stream`, which
 * the deterministic engine can replay back into every intermediate state.
 * See ../../../shared/replay.ts for why, and replayTrajectory.ts for the two
 * guarantees that make a replay safe to learn from.
 */
export { checksumState, canonicalStateProjection } from './stateChecksum';
export { hashCardData, hashCardDataForCardNumbers } from './cardDataHash';
export {
  createTrajectoryRecorder,
  DEFAULT_CHECKPOINT_INTERVAL,
  type RecordActionMeta,
  type TrajectoryRecorder,
  type TrajectoryRecorderInit,
} from './recorder';
export {
  replayTrajectory,
  trainableSteps,
  type ReplayFailureReason,
  type ReplayOptions,
  type ReplayResult,
  type ReplayStep,
} from './replayTrajectory';
