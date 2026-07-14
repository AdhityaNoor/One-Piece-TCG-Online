/**
 * Player Profile REST surface. Every route requires auth (router.use(
 * requireAuth), matching ranked/routes.ts's pattern) — this app has no
 * anonymous public web presence (see App.tsx's launch gate), so "public
 * player profile" here means "visible to any signed-in player subject to
 * privacy settings", not "visible to the open internet". Documented as a
 * scope decision in the deliverables summary, not an oversight.
 *
 * Route surface is intentionally split into small, purpose-specific
 * responses (project rule: "Do not use one oversized profile endpoint for
 * every screen") rather than one endpoint returning everything.
 */
import { Router, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { env } from '../config/env';
import { requireAuth } from '../auth/middleware';
import { profiles, users } from '../db/mongo';
import { AchievementService } from './achievementService';
import { CosmeticService } from './cosmeticService';
import { MatchHistoryService } from './matchHistoryService';
import { ModerationService } from './moderationService';
import { ProfileService } from './profileService';
import { SocialService } from './socialService';
import { StatisticsService } from './statisticsService';
import { ACHIEVEMENT_CATALOG } from './achievementCatalog';
import { ProfileServiceError, sendProfileError } from './errors';
import type {
  AchievementView,
  BlockedPlayerSummary,
  ChangeUsernameRequest,
  EquipCosmeticRequest,
  FriendRequestSummary,
  FriendSummary,
  ProfileMatchType,
  ReportPlayerRequest,
  UpdateFeaturedAchievementsRequest,
  UpdateFeaturedDecksRequest,
  UpdatePrivacyRequest,
  UpdateProfileRequest,
} from '../../../shared/profile';

const profileService = new ProfileService();
const statisticsService = new StatisticsService();
const achievementService = new AchievementService();
const cosmeticService = new CosmeticService();
const socialService = new SocialService();
const moderationService = new ModerationService();
const matchHistoryService = new MatchHistoryService();

function userId(req: Request): string {
  return req.auth!.sub;
}

async function handle(res: Response, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (cause) {
    sendProfileError(res, cause);
  }
}

function ensureEnabled(): void {
  if (!env.profileEnabled) throw new ProfileServiceError(503, 'VALIDATION', 'Player profiles are disabled on this backend.');
}

async function buildAchievementViews(targetUserId: string, featuredIds: string[], localDeckCount?: number): Promise<AchievementView[]> {
  const progress = await achievementService.getCachedOrRecompute(targetUserId, { localDeckCount });
  const featuredSet = new Set(featuredIds);
  return ACHIEVEMENT_CATALOG.map((definition) => {
    const entry = progress.find((p) => p.achievementId === definition.id)!;
    return { definition, progress: entry, featured: featuredSet.has(definition.id) };
  });
}

export function profileRouter(): Router {
  const router = Router();
  router.use(requireAuth);
  router.use((req, _res, next) => {
    void profileService.touchLastActive(userId(req)).catch(() => undefined);
    next();
  });

  // ---- own profile -------------------------------------------------------

  router.get('/me', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      res.json(await profileService.getOwnHeader(userId(req)));
    });
  });

  router.patch('/me', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      await profileService.updateProfile(userId(req), (req.body ?? {}) as UpdateProfileRequest);
      res.json(await profileService.getOwnHeader(userId(req)));
    });
  });

  router.patch('/me/username', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      await profileService.changeUsername(userId(req), (req.body ?? {}) as ChangeUsernameRequest);
      res.json(await profileService.getOwnHeader(userId(req)));
    });
  });

  router.patch('/me/privacy', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const privacy = await profileService.updatePrivacy(userId(req), (req.body ?? {}) as UpdatePrivacyRequest);
      res.json({ privacy });
    });
  });

  router.put('/me/featured-decks', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const featuredDecks = await profileService.updateFeaturedDecks(userId(req), (req.body ?? {}) as UpdateFeaturedDecksRequest);
      res.json({ featuredDecks });
    });
  });

  router.put('/me/featured-achievements', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const progress = await achievementService.getCachedOrRecompute(userId(req));
      const completed = new Set(progress.filter((p) => p.completed).map((p) => p.achievementId));
      const featuredAchievementIds = await profileService.updateFeaturedAchievements(userId(req), (req.body ?? {}) as UpdateFeaturedAchievementsRequest, completed);
      res.json({ featuredAchievementIds });
    });
  });

  router.get('/me/account', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      res.json({ account: await profileService.getPrivateAccountSettings(userId(req)) });
    });
  });

  // ---- statistics / achievements / cosmetics / match history (self) -----

  router.get('/me/statistics', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      res.json({ statistics: await statisticsService.getCachedOrRecompute(userId(req)) });
    });
  });

  router.get('/me/achievements', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const localDeckCount = typeof req.query.localDeckCount === 'string' ? Number(req.query.localDeckCount) : undefined;
      const header = await profileService.getOwnHeader(userId(req));
      res.json({ achievements: await buildAchievementViews(userId(req), header.profile.featuredAchievementIds, localDeckCount) });
    });
  });

  router.get('/me/cosmetics', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getOwnHeader(userId(req));
      res.json({ inventory: await cosmeticService.listInventory(userId(req), header.profile.equippedCosmetics) });
    });
  });

  router.post('/me/cosmetics/equip', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const body = (req.body ?? {}) as EquipCosmeticRequest;
      if (!body.itemId || !body.slot) throw new ProfileServiceError(400, 'VALIDATION', 'itemId and slot are required.');
      await profileService.getOwnHeader(userId(req));
      res.json({ equippedCosmetics: await cosmeticService.equip(userId(req), body.itemId, body.slot) });
    });
  });

  router.post('/me/cosmetics/unequip', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const slot = (req.body as { slot?: EquipCosmeticRequest['slot'] } | undefined)?.slot;
      if (!slot) throw new ProfileServiceError(400, 'VALIDATION', 'slot is required.');
      await profileService.getOwnHeader(userId(req));
      res.json({ equippedCosmetics: await cosmeticService.unequip(userId(req), slot) });
    });
  });

  router.get('/me/match-history', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      res.json(await matchHistoryService.getPage(userId(req), typeof req.query.cursor === 'string' ? req.query.cursor : null, Number(req.query.limit ?? 20), {
        matchType: req.query.matchType as ProfileMatchType | undefined,
        result: req.query.result as 'win' | 'loss' | 'draw' | undefined,
        opponentUsername: typeof req.query.opponent === 'string' ? req.query.opponent : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
      }));
    });
  });

  // ---- social (self) -------------------------------------------------------

  router.get('/me/social', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const graph = await socialService.getGraph(userId(req));
      const ids = [...graph.friends, ...graph.incomingRequests, ...graph.outgoingRequests, ...graph.blocked].map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      }).filter((id): id is ObjectId => id !== null);
      const userDocs = ids.length ? await users().find({ _id: { $in: ids } }).project({ username: 1 }).toArray() : [];
      const usernameOf = (id: string): string => userDocs.find((u) => u._id!.toHexString() === id)?.username ?? 'Unknown Pirate';
      // Avatar join for friend/request rows (SocialTab thumbnails) — profiles()
      // is keyed by the same userId string as the social graph, so a plain
      // $in on that field is enough; no ObjectId conversion needed here.
      const rawIds = [...graph.friends, ...graph.incomingRequests, ...graph.outgoingRequests];
      const profileDocs = rawIds.length
        ? await profiles().find({ userId: { $in: rawIds } }).project({ userId: 1, 'equippedCosmetics.avatar': 1 }).toArray()
        : [];
      const avatarOf = (id: string): string | null => profileDocs.find((p) => p.userId === id)?.equippedCosmetics?.avatar ?? null;

      const friends: FriendSummary[] = graph.friends.map((id) => ({ userId: id, username: usernameOf(id), onlineStatus: 'unknown', favoriteLeaderCardNumber: null, since: graph.updatedAt, avatarCatalogId: avatarOf(id) }));
      const incoming: FriendRequestSummary[] = graph.incomingRequests.map((id) => ({ userId: id, username: usernameOf(id), requestedAt: graph.updatedAt, avatarCatalogId: avatarOf(id) }));
      const outgoing: FriendRequestSummary[] = graph.outgoingRequests.map((id) => ({ userId: id, username: usernameOf(id), requestedAt: graph.updatedAt, avatarCatalogId: avatarOf(id) }));
      const blocked: BlockedPlayerSummary[] = graph.blocked.map((id) => ({ userId: id, username: usernameOf(id) }));
      res.json({ friends, incomingRequests: incoming, outgoingRequests: outgoing, blocked, blockedCount: blocked.length });
    });
  });

  // ---- search ---------------------------------------------------------------

  router.get('/search', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      res.json({ results: await profileService.searchPlayers(q, Number(req.query.limit ?? 10)) });
    });
  });

  // ---- public profile (by username) -----------------------------------------

  router.get('/:username', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      res.json(await profileService.getHeaderForUsername(req.params.username, userId(req)));
    });
  });

  router.get('/:username/statistics', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getHeaderForUsername(req.params.username, userId(req));
      if (!header.visibleSections.includes('statistics')) {
        res.json({ statistics: null, visible: false });
        return;
      }
      res.json({ statistics: await statisticsService.getCachedOrRecompute(header.profile.userId), visible: true });
    });
  });

  router.get('/:username/achievements', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getHeaderForUsername(req.params.username, userId(req));
      if (!header.visibleSections.includes('achievements')) {
        res.json({ achievements: [], visible: false });
        return;
      }
      res.json({ achievements: await buildAchievementViews(header.profile.userId, header.profile.featuredAchievementIds), visible: true });
    });
  });

  router.get('/:username/match-history', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getHeaderForUsername(req.params.username, userId(req));
      if (!header.visibleSections.includes('match_history')) {
        res.json({ entries: [], nextCursor: null, visible: false });
        return;
      }
      const page = await matchHistoryService.getPage(header.profile.userId, typeof req.query.cursor === 'string' ? req.query.cursor : null, Number(req.query.limit ?? 20), {
        matchType: req.query.matchType as ProfileMatchType | undefined,
        result: req.query.result as 'win' | 'loss' | 'draw' | undefined,
      });
      res.json({ ...page, visible: true });
    });
  });

  router.post('/:username/report', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getHeaderForUsername(req.params.username, userId(req));
      await moderationService.submitReport(userId(req), header.profile.userId, (req.body ?? {}) as ReportPlayerRequest);
      res.status(204).end();
    });
  });

  router.post('/:username/friend-request', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getHeaderForUsername(req.params.username, userId(req));
      await socialService.sendFriendRequest(userId(req), header.profile.userId);
      res.status(204).end();
    });
  });

  router.post('/:username/friend-accept', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getHeaderForUsername(req.params.username, userId(req));
      await socialService.acceptFriendRequest(userId(req), header.profile.userId);
      res.status(204).end();
    });
  });

  router.post('/:username/friend-decline', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getHeaderForUsername(req.params.username, userId(req));
      await socialService.declineFriendRequest(userId(req), header.profile.userId);
      res.status(204).end();
    });
  });

  router.delete('/:username/friend', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getHeaderForUsername(req.params.username, userId(req));
      await socialService.removeFriend(userId(req), header.profile.userId);
      res.status(204).end();
    });
  });

  router.post('/:username/block', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const header = await profileService.getHeaderForUsername(req.params.username, userId(req)).catch(async (cause) => {
        // A block target might itself be blocking the viewer (which would
        // normally 403 the lookup) — resolve the raw user record instead so
        // blocking is still possible in that edge case.
        if (cause instanceof ProfileServiceError && cause.code === 'BLOCKED') {
          const user = await users().findOne({ username: req.params.username });
          if (!user) throw cause;
          return { profile: { userId: user._id!.toHexString() } } as { profile: { userId: string } };
        }
        throw cause;
      });
      await socialService.blockUser(userId(req), header.profile.userId);
      await moderationService.recordAudit(header.profile.userId, userId(req), 'player_blocked', {});
      res.status(204).end();
    });
  });

  router.delete('/:username/block', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const user = await users().findOne({ username: req.params.username });
      if (!user) throw new ProfileServiceError(404, 'NOT_FOUND', 'Player not found.');
      await socialService.unblockUser(userId(req), user._id!.toHexString());
      res.status(204).end();
    });
  });

  return router;
}
