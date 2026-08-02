/**
 * Awards profile XP when a match finishes.
 *
 * The curve and award table live in shared/progression.ts so the server and
 * client never disagree; this file only decides WHO gets WHAT and persists it.
 *
 * Design notes:
 *  - Only `experiencePoints` is stored. Level is always derived on read, so
 *    retuning the curve needs no migration.
 *  - $inc, not read-modify-write: two matches finishing at once must not lose
 *    an award to a lost update.
 *  - Awards are best-effort. XP is cosmetic, so a failure here must never
 *    fail the match result itself — callers log and continue.
 *  - `profileVersion` is deliberately NOT bumped: that field tracks
 *    user-edited profile content for optimistic concurrency, and an
 *    XP tick is neither user-edited nor something a stale editor should clash
 *    with.
 */
import { profiles } from '../db/mongo';
import { xpForMatch, type MatchMode, type MatchOutcome } from '../../../shared/progression';

export interface MatchXpParticipant {
  userId: string | null;
  outcome: MatchOutcome;
}

export class ProgressionService {
  /**
   * Award XP to every participant of a finished match. Returns the number of
   * profiles updated (useful for logging/tests); never throws.
   */
  async awardMatchXp(participants: MatchXpParticipant[], mode: MatchMode): Promise<number> {
    let updated = 0;
    for (const participant of participants) {
      // Guests / unauthenticated seats have no profile to credit.
      if (!participant.userId) continue;
      const amount = xpForMatch(mode, participant.outcome);
      if (amount <= 0) continue;
      try {
        const result = await profiles().updateOne(
          { userId: participant.userId },
          {
            $inc: { experiencePoints: amount },
            $set: { updatedAt: new Date().toISOString() },
          },
        );
        updated += result.modifiedCount;
      } catch (err) {
        console.error('[ProgressionService] failed to award XP to', participant.userId, err);
      }
    }
    return updated;
  }
}

/**
 * Map a finished match to per-player outcomes.
 *
 * A null winner means a draw for everyone — that covers genuine draws and
 * server-side aborts alike. Deciding this here (rather than inline at the call
 * site) keeps the win/loss/draw rule in one testable place.
 */
export function outcomesForMatch(
  seats: Array<{ userId: string | null }>,
  winnerUserId: string | null,
): MatchXpParticipant[] {
  return seats.map((seat) => ({
    userId: seat.userId,
    outcome: !winnerUserId ? 'draw' : seat.userId === winnerUserId ? 'win' : 'loss',
  }));
}
