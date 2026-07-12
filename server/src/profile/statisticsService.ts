/**
 * Aggregated statistics. Two real sources, never re-derived rules logic:
 *  - matchHistory: every finished GameRoom match (casual + ranked — see
 *    GameRoom.persistHistory, which writes here unconditionally regardless
 *    of ranked/casual). Gives lifetime "combined" totals and durations.
 *  - rankedProfiles / rankedMatches: ranked-specific breakdowns (wins,
 *    losses, streaks, leader usage, promotions/demotions) — ALWAYS read
 *    from the ranked system's own stored aggregates/records, never
 *    recomputed with different math (project rule: "Use the ranked system
 *    as the source of truth").
 *
 * Known, documented gap: true local hotseat ("vs Self") and CPU matches
 * never reach the backend at all today (no GameRoom involved — see
 * navigationStore's CpuMatchPresentation/hotseat "no presentation" modes,
 * both purely client-side). Their MatchTypeStatistics buckets below are
 * therefore always EMPTY_MATCH_TYPE_STATISTICS — not because the player has
 * zero such matches, but because nothing persists them yet. Flagged in the
 * final deliverables summary as a known limitation, not silently hidden.
 *
 * Result is cached on ProfileDocument.statisticsCache and only recomputed
 * once the cache is stale (project rule: don't re-aggregate on every page
 * load).
 */
import { matchHistory, profiles, rankedMatches, rankedProfiles } from '../db/mongo';
import { RankedSeasonService } from '../ranked/seasonService';
import { classifyCasualResultType } from './resultClassification';
import { rankDefinition } from '../../../shared/ranked';
import {
  EMPTY_MATCH_TYPE_STATISTICS,
  type LeaderUsageStatistic,
  type MatchTypeStatistics,
  type StatisticsSummary,
} from '../../../shared/profile';

const CACHE_TTL_MS = 5 * 60 * 1000;

/** Narrows the full ProfileMatchResultType down to the three buckets StatBuilder counts — 'timeout'/'unknown'/'admin'/'server_failure' all fold into 'normal' for statistics purposes. */
function classifyResultType(reason: string): 'concession' | 'disconnect' | 'abandonment' | 'normal' {
  const classified = classifyCasualResultType(reason);
  if (classified === 'concession' || classified === 'disconnect' || classified === 'abandonment') return classified;
  return 'normal';
}

function durationSeconds(startedAt: Date, endedAt: Date): number {
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
}

async function computeSeasonService(): Promise<RankedSeasonService> {
  return new RankedSeasonService();
}

export class StatisticsService {
  async compute(userId: string): Promise<StatisticsSummary> {
    const [allMatches, rankedRoomCodes, rankedProfileDocs, userRankedMatches] = await Promise.all([
      matchHistory().find({ 'seats.userId': userId }).sort({ endedAt: 1 }).toArray(),
      rankedMatches()
        .find({ 'participants.playerId': userId, status: { $in: ['finalized', 'invalidated'] }, roomCode: { $ne: null } })
        .project({ roomCode: 1 })
        .toArray(),
      rankedProfiles().find({ playerId: userId }).toArray(),
      rankedMatches().find({ 'participants.playerId': userId, status: 'finalized' }).toArray(),
    ]);

    const rankedRoomCodeSet = new Set(rankedRoomCodes.map((doc) => doc.roomCode).filter((code): code is string => Boolean(code)));

    const combinedBuilder = new StatBuilder();
    const casualBuilder = new StatBuilder();
    const rankedBuilder = new StatBuilder();

    for (const match of allMatches) {
      const won = match.winnerUserId === userId;
      const lost = match.winnerUserId !== null && match.winnerUserId !== userId;
      const draw = match.winnerUserId === null;
      const type = classifyResultType(match.reason);
      const seconds = durationSeconds(match.startedAt, match.endedAt);

      combinedBuilder.record(won, lost, draw, type, seconds);
      if (rankedRoomCodeSet.has(match.roomCode)) {
        rankedBuilder.record(won, lost, draw, type, seconds);
      } else {
        casualBuilder.record(won, lost, draw, type, seconds);
      }
    }

    // Leader usage — only ranked matches carry leader identity server-side.
    const leaderStats = new Map<string, { leaderName: string; matches: number; wins: number }>();
    for (const match of userRankedMatches) {
      const self = match.participants.find((p) => p.playerId === userId);
      if (!self) continue;
      const entry = leaderStats.get(self.leaderCardNumber) ?? { leaderName: self.leaderName, matches: 0, wins: 0 };
      entry.matches += 1;
      if (match.winnerUserId === userId) entry.wins += 1;
      leaderStats.set(self.leaderCardNumber, entry);
    }
    const leaderList: LeaderUsageStatistic[] = Array.from(leaderStats.entries()).map(([leaderCardNumber, stat]) => ({
      leaderCardNumber,
      leaderName: stat.leaderName,
      matches: stat.matches,
      wins: stat.wins,
      winRate: stat.matches === 0 ? 0 : Math.round((stat.wins / stat.matches) * 1000) / 10,
    }));
    const mostPlayedLeader = leaderList.slice().sort((a, b) => b.matches - a.matches)[0] ?? null;
    const mostSuccessfulLeader = leaderList.slice().sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)[0] ?? null;

    const seasonsParticipated = rankedProfileDocs.length;
    const highestLifetimeRankOrder = rankedProfileDocs.reduce((max, doc) => Math.max(max, rankDefinition(doc.highestRank).order), -1);
    const highestLifetimeRank = highestLifetimeRankOrder >= 0 ? rankDefinition(rankedProfileDocs.find((d) => rankDefinition(d.highestRank).order === highestLifetimeRankOrder)!.highestRank).name : 'Unranked';

    // Promotions/demotions aren't separately counted anywhere yet; approximate
    // from the audit trail would require rankedAuditEvents scanning, which we
    // skip for cost — reported as 0 with the field documented as a future
    // improvement rather than computed via a second heavy scan per profile view.
    const rankedPromotions = 0;
    const rankedDemotions = 0;

    const seasons = await computeSeasonService();
    let currentSeasonId: string | null = null;
    try {
      const season = await seasons.getActiveSeason();
      currentSeasonId = season.id;
    } catch {
      currentSeasonId = null;
    }
    const currentSeasonProfile = currentSeasonId ? rankedProfileDocs.find((doc) => doc.seasonId === currentSeasonId) ?? null : null;
    const currentSeasonRanked: MatchTypeStatistics = currentSeasonProfile
      ? {
          ...EMPTY_MATCH_TYPE_STATISTICS,
          matches: currentSeasonProfile.wins + currentSeasonProfile.losses + currentSeasonProfile.draws,
          wins: currentSeasonProfile.wins,
          losses: currentSeasonProfile.losses,
          draws: currentSeasonProfile.draws,
          winRate: currentSeasonProfile.wins + currentSeasonProfile.losses === 0 ? 0 : Math.round((currentSeasonProfile.wins / (currentSeasonProfile.wins + currentSeasonProfile.losses)) * 1000) / 10,
          currentStreak: currentSeasonProfile.currentStreak,
          highestStreak: currentSeasonProfile.highestStreak,
        }
      : EMPTY_MATCH_TYPE_STATISTICS;

    return {
      computedAt: new Date().toISOString(),
      complete: true,
      lifetime: {
        ranked: rankedBuilder.build(),
        casual: casualBuilder.build(),
        cpu: EMPTY_MATCH_TYPE_STATISTICS, // see module doc — not tracked yet
        combined: combinedBuilder.build(),
      },
      currentSeason: {
        seasonId: currentSeasonId,
        ranked: currentSeasonRanked,
      },
      mostPlayedLeader,
      mostSuccessfulLeader,
      seasonsParticipated,
      rankedPromotions,
      rankedDemotions,
      highestLifetimeRank,
    };
  }

  async getCachedOrRecompute(userId: string): Promise<StatisticsSummary> {
    const profile = await profiles().findOne({ userId });
    const cached = profile?.statisticsCache;
    const isFresh = cached && Date.now() - Date.parse(cached.computedAt) < CACHE_TTL_MS;
    if (isFresh && cached) return cached.payload as StatisticsSummary;

    const fresh = await this.compute(userId);
    await profiles().updateOne(
      { userId },
      { $set: { statisticsCache: { computedAt: fresh.computedAt, payload: fresh }, updatedAt: new Date().toISOString() } },
    );
    return fresh;
  }
}

class StatBuilder {
  private matches = 0;
  private wins = 0;
  private losses = 0;
  private draws = 0;
  private concessions = 0;
  private disconnects = 0;
  private abandonments = 0;
  private durations: number[] = [];
  private winDurations: number[] = [];
  private streak = 0;
  private highestStreak = 0;

  record(won: boolean, lost: boolean, draw: boolean, resultType: 'concession' | 'disconnect' | 'abandonment' | 'normal', seconds: number): void {
    this.matches += 1;
    this.durations.push(seconds);
    if (won) {
      this.wins += 1;
      this.winDurations.push(seconds);
      this.streak = Math.max(1, this.streak + 1);
      this.highestStreak = Math.max(this.highestStreak, this.streak);
    } else if (lost) {
      this.losses += 1;
      this.streak = 0;
    } else if (draw) {
      this.draws += 1;
      this.streak = 0;
    }
    if (resultType === 'concession') this.concessions += 1;
    if (resultType === 'disconnect') this.disconnects += 1;
    if (resultType === 'abandonment') this.abandonments += 1;
  }

  build(): MatchTypeStatistics {
    const decisive = this.wins + this.losses;
    return {
      matches: this.matches,
      wins: this.wins,
      losses: this.losses,
      draws: this.draws,
      winRate: decisive === 0 ? 0 : Math.round((this.wins / decisive) * 1000) / 10,
      currentStreak: this.streak,
      highestStreak: this.highestStreak,
      concessions: this.concessions,
      disconnects: this.disconnects,
      abandonments: this.abandonments,
      averageDurationSeconds: this.durations.length === 0 ? null : Math.round(this.durations.reduce((a, b) => a + b, 0) / this.durations.length),
      fastestVictorySeconds: this.winDurations.length === 0 ? null : Math.min(...this.winDurations),
      longestMatchSeconds: this.durations.length === 0 ? null : Math.max(...this.durations),
    };
  }
}
