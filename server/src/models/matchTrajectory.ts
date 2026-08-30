/**
 * A recorded match, stored as an action stream (see shared/replay.ts).
 *
 * Kept in its OWN collection rather than folded into matchHistory: this data
 * has a different purpose (AI training), a different lifetime (it can be
 * pruned or re-derived without losing a player's record), a different size,
 * and a different consent story. matchHistory is the player's record of what
 * happened; this is research material about how it happened.
 */
import type { ObjectId } from 'mongodb';
import type { MatchTrajectory } from '../../../shared/replay';

export interface MatchTrajectoryDocument {
  _id?: ObjectId;
  /** Set for online matches; absent for client-uploaded VS CPU games. */
  roomCode?: string;
  /**
   * Who this recording belongs to. For an uploaded VS CPU match it is the
   * uploader; for an online match, both seated accounts. Used for deletion
   * on request, and to rate-limit uploads.
   */
  userIds: string[];
  source: MatchTrajectory['source'];
  engineBuild: string;
  cardDataHash: string;
  /** Denormalized for cheap querying without unpacking the trajectory. */
  leaderCardNumbers: string[];
  actionCount: number;
  winnerSeatId: string | null;
  reason: string;
  /**
   * False for anything a client uploaded: this service has no card catalog to
   * replay against (see trajectories/routes.ts). The offline export replays
   * every record and refuses the ones that do not reconstruct, so nothing
   * downstream ever trusts an unverified row.
   */
  verified: boolean;
  trajectory: MatchTrajectory;
  createdAt: Date;
}
