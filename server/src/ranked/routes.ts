import { Router, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { env } from '../config/env';
import { requireAuth } from '../auth/middleware';
import { rankedMatches, rankedProfiles } from '../db/mongo';
import {
  RANKED_RANKS,
  toPublicRankedProfile,
  type RankedLeaderboardEntry,
  type RankedMatchHistoryEntry,
  type RankedSeasonConfig,
} from '../../../shared/ranked';
import { RankedDeckValidationService } from './deckValidationService';
import { RankedServiceError, sendRankedError } from './errors';
import { RankedProfileService } from './profileService';
import { RankedQueueService } from './queueService';
import { RankedSeasonService } from './seasonService';

const seasons = new RankedSeasonService();
const profiles = new RankedProfileService();
const decks = new RankedDeckValidationService();
export const rankedQueueService = new RankedQueueService();

export function rankedRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/config', async (_req, res) => {
    res.json({
      enabled: env.rankedEnabled,
      ranks: RANKED_RANKS,
      labels: {
        mode: 'Grand Line Ranked',
        queue: 'Set Sail',
        leaderboard: 'World Rankings',
        season: 'Voyage',
        promotion: 'Bounty Increased',
        demotion: 'Bounty Decreased',
        matchHistory: 'Voyage Log',
        rankedPoints: 'Bounty Points',
      },
    });
  });

  router.get('/season/active', async (_req, res) => {
    await handle(res, async () => {
      const season = await activeSeason();
      res.json({ season });
    });
  });

  router.get('/profile', async (req, res) => {
    await handle(res, async () => {
      const season = await activeSeason();
      res.json({ profile: await profiles.getPublicProfile(req.auth!.sub, season), season });
    });
  });

  router.post('/queue/join', async (req: Request, res: Response) => {
    await handle(res, async () => {
      ensureEnabled();
      const season = await activeSeason();
      const profile = await profiles.getOrCreateProfile(req.auth!.sub, season);
      const deckSnapshot = decks.validateForQueue((req.body as { deck?: unknown } | undefined)?.deck);
      const status = await rankedQueueService.joinQueue({
        profile,
        season,
        deckSnapshot,
        region: typeof req.body?.region === 'string' ? req.body.region : 'global',
      });
      res.json({ status });
    });
  });

  router.post('/queue/leave', async (req, res) => {
    await handle(res, async () => {
      const season = await activeSeason();
      const status = await rankedQueueService.leaveQueue(req.auth!.sub, season);
      res.json({ status });
    });
  });

  router.get('/queue/status', async (req, res) => {
    await handle(res, async () => {
      const season = await activeSeason();
      res.json({ status: rankedQueueService.status(req.auth!.sub, season) });
    });
  });

  router.get('/leaderboard', async (req, res) => {
    await handle(res, async () => {
      const season = await activeSeason();
      const limit = clamp(Number(req.query.limit ?? 50), 1, 100);
      const after = typeof req.query.after === 'string' ? Number(req.query.after) : 0;
      const docs = await rankedProfiles()
        .find({ seasonId: season.id, placementMatchesCompleted: { $gte: season.placementMatches } })
        .sort({ hiddenMmr: -1, wins: -1, updatedAt: 1 })
        .skip(Number.isFinite(after) ? after : 0)
        .limit(limit)
        .toArray();
      const entries: RankedLeaderboardEntry[] = docs.map((doc, index) => {
        const publicProfile = toPublicRankedProfile(doc, season);
        return {
          position: (Number.isFinite(after) ? after : 0) + index + 1,
          playerId: publicProfile.playerId,
          displayName: publicProfile.displayName,
          rank: doc.rank,
          rankName: publicProfile.rankName,
          division: publicProfile.division,
          rankedPoints: publicProfile.rankedPoints,
          wins: publicProfile.wins,
          losses: publicProfile.losses,
          winRate: publicProfile.winRate,
          currentStreak: publicProfile.currentStreak,
          highestSeasonRank: doc.highestSeasonRank,
        };
      });
      res.json({ entries, nextCursor: entries.length === limit ? String((Number.isFinite(after) ? after : 0) + entries.length) : null });
    });
  });

  router.get('/history', async (req, res) => {
    await handle(res, async () => {
      const season = await activeSeason();
      const docs = await rankedMatches()
        .find({ seasonId: season.id, 'participants.playerId': req.auth!.sub, status: { $in: ['finalized', 'invalidated'] } })
        .sort({ endedAt: -1 })
        .limit(25)
        .toArray();
      const entries: RankedMatchHistoryEntry[] = docs.flatMap((match) => {
        const self = match.participants.find((participant) => participant.playerId === req.auth!.sub);
        const opponent = match.participants.find((participant) => participant.playerId !== req.auth!.sub);
        if (!self?.update || !opponent || !match.endedAt || !match.startedAt) return [];
        const started = Date.parse(match.startedAt);
        const ended = Date.parse(match.endedAt);
        return [
          {
            matchId: (match._id as ObjectId).toHexString(),
            seasonId: match.seasonId,
            opponentName: opponent.displayName,
            result: self.update.result,
            resultType: self.update.resultType,
            startedAt: match.startedAt,
            endedAt: match.endedAt,
            durationSeconds: Number.isFinite(started) && Number.isFinite(ended) ? Math.max(0, Math.round((ended - started) / 1000)) : 0,
            rankBefore: self.update.rankBefore,
            divisionBefore: self.update.divisionBefore,
            rankedPointsBefore: self.update.rankedPointsBefore,
            rankAfter: self.update.rankAfter,
            divisionAfter: self.update.divisionAfter,
            rankedPointsAfter: self.update.rankedPointsAfter,
            rankedPointDelta: self.update.rankedPointDelta,
          },
        ];
      });
      res.json({ entries });
    });
  });

  return router;
}

async function activeSeason(): Promise<RankedSeasonConfig> {
  try {
    return await seasons.getActiveSeason();
  } catch (cause) {
    if (!env.isProd) return seasons.getOrCreateDevelopmentSeason();
    throw cause;
  }
}

function ensureEnabled(): void {
  if (!env.rankedEnabled) throw new RankedServiceError(503, 'RANKED_DISABLED', 'Ranked mode is disabled on this backend.');
}

async function handle(res: Response, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (cause) {
    sendRankedError(res, cause);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

