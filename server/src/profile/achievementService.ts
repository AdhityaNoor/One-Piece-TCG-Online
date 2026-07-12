/**
 * Achievement progress evaluation. Computed from REAL stored data only —
 * matchHistory (every finished GameRoom match, ranked or casual — see
 * server/src/rooms/GameRoom.ts persistHistory, which writes here
 * unconditionally), rankedProfiles (rank/placement), and socialGraphs
 * (friend count). Result is cached on ProfileDocument.achievementsCache and
 * recomputed only when stale, matching statisticsService's strategy
 * (project rule: "Do not calculate expensive lifetime aggregates on every
 * page request").
 *
 * Known gap (documented, not silently faked): deck-count-based achievements
 * (e.g. "save 5 decks") cannot be verified server-side because saved decks
 * are local-storage-only (see src/cards/decks/deckStorage.ts) and never
 * reach the backend except as featured-deck summaries or ranked queue
 * submissions. Progress for those achievements reflects only what the
 * client has told the server (via `context.localDeckCount`), defaulting to
 * 0 rather than being fabricated.
 */
import { matchHistory, profiles, rankedProfiles, socialGraphs } from '../db/mongo';
import { ACHIEVEMENT_CATALOG } from './achievementCatalog';
import { DEFAULT_RANKED_SEASON_CONFIG, rankDefinition } from '../../../shared/ranked';
import type { AchievementProgress } from '../../../shared/profile';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — same order of magnitude as statisticsService.

export interface AchievementEvalContext {
  /** Client-reported count of locally saved decks — see module doc gap note. Omit if unknown. */
  localDeckCount?: number;
}

function clampProgress(value: number, target: number): number {
  return Math.max(0, Math.min(target, value));
}

async function computeWinStreaks(userId: string): Promise<{ current: number; highest: number }> {
  const docs = await matchHistory()
    .find({ 'seats.userId': userId })
    .sort({ endedAt: 1 })
    .project({ winnerUserId: 1, endedAt: 1 })
    .toArray();
  let current = 0;
  let highest = 0;
  for (const doc of docs) {
    if (doc.winnerUserId === userId) {
      current += 1;
      highest = Math.max(highest, current);
    } else {
      current = 0;
    }
  }
  return { current, highest };
}

export class AchievementService {
  async evaluate(userId: string, context: AchievementEvalContext = {}): Promise<AchievementProgress[]> {
    const [matchesPlayed, matchesWon, rankedProfileDocs, socialGraph, streaks] = await Promise.all([
      matchHistory().countDocuments({ 'seats.userId': userId }),
      matchHistory().countDocuments({ 'seats.userId': userId, winnerUserId: userId }),
      rankedProfiles().find({ playerId: userId }).toArray(),
      socialGraphs().findOne({ userId }),
      computeWinStreaks(userId),
    ]);

    const highestSeasonRankOrder = rankedProfileDocs.reduce((max, doc) => Math.max(max, rankDefinition(doc.highestSeasonRank).order), -1);
    const anyPlacementComplete = rankedProfileDocs.some((doc) => doc.placementMatchesCompleted >= DEFAULT_RANKED_SEASON_CONFIG.placementMatches);
    const friendCount = socialGraph?.friends.length ?? 0;
    const localDeckCount = context.localDeckCount ?? 0;

    const rawProgress: Record<string, number> = {
      first_win: matchesWon,
      ten_wins: matchesWon,
      twentyfive_wins: matchesWon,
      hundred_wins: matchesWon,
      ten_matches: matchesPlayed,
      fifty_matches: matchesPlayed,
      two_hundred_matches: matchesPlayed,
      win_streak_5: streaks.highest,
      win_streak_10: streaks.highest,
      placement_complete: anyPlacementComplete ? 1 : 0,
      reach_supernova: highestSeasonRankOrder >= rankDefinition('supernova').order ? 1 : 0,
      reach_yonko: highestSeasonRankOrder >= rankDefinition('yonko').order ? 1 : 0,
      reach_pirate_king: highestSeasonRankOrder >= rankDefinition('pirate_king').order ? 1 : 0,
      save_5_decks: localDeckCount,
      add_first_friend: friendCount,
    };

    const now = new Date().toISOString();
    return ACHIEVEMENT_CATALOG.map((def) => {
      const progress = clampProgress(rawProgress[def.id] ?? 0, def.targetValue);
      const completed = progress >= def.targetValue;
      return {
        achievementId: def.id,
        progress,
        targetValue: def.targetValue,
        completed,
        completedAt: completed ? now : null,
      } satisfies AchievementProgress;
    });
  }

  /** Cache-aware read used by routes — recomputes only when the cache is stale or missing. Preserves previously-recorded completedAt timestamps rather than resetting them to "now" on every recompute. */
  async getCachedOrRecompute(userId: string, context: AchievementEvalContext = {}): Promise<AchievementProgress[]> {
    const profile = await profiles().findOne({ userId });
    const cached = profile?.achievementsCache;
    const isFresh = cached && Date.now() - Date.parse(cached.computedAt) < CACHE_TTL_MS;
    if (isFresh && cached) return cached.entries;

    const fresh = await this.evaluate(userId, context);
    const merged = fresh.map((entry) => {
      const previous = cached?.entries.find((e) => e.achievementId === entry.achievementId);
      if (entry.completed && previous?.completed && previous.completedAt) {
        return { ...entry, completedAt: previous.completedAt };
      }
      return entry;
    });

    await profiles().updateOne(
      { userId },
      { $set: { achievementsCache: { computedAt: new Date().toISOString(), entries: merged }, updatedAt: new Date().toISOString() } },
    );
    return merged;
  }
}
