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
import express, { Router, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { env } from '../config/env';
import { requireAuth } from '../auth/middleware';
import { users } from '../db/mongo';
import { AchievementService } from './achievementService';
import { CosmeticService } from './cosmeticService';
import { MatchHistoryService } from './matchHistoryService';
import { ModerationService } from './moderationService';
import { ProfileImageService } from './profileImageService';
import { ProfileService } from './profileService';
import { loadAvatarDisplayFields } from './avatarJoin';
import { SocialService } from './socialService';
import { StatisticsService } from './statisticsService';
import { ACHIEVEMENT_CATALOG } from './achievementCatalog';
import { PROFILE_IMAGE_SOURCE_SPEC, PROFILE_IMAGE_SPECS, isProfileImageKind } from '../../../shared/profileImage';
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
const profileImageService = new ProfileImageService();

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

  // ---- uploaded profile images (owner-only) --------------------------------

  /**
   * Raw binary in, not multipart and not a base64 JSON field.
   *
   * express.json (mounted app-wide in index.ts with a 1mb ceiling) only
   * parses application/json, so an image/webp body flows past it untouched
   * and this router-level parser is what reads it — which is how these two
   * routes get their own, larger limit without widening the ceiling on
   * every other JSON endpoint in the app. Base64-in-JSON was the
   * alternative and would have inflated every upload by a third for
   * nothing; multipart would have added a dependency to parse a single
   * unnamed part.
   *
   * `type: () => true` accepts whatever Content-Type arrives on purpose:
   * the declared type is not evidence of anything, and the real format
   * check is the magic-byte sniff in validateProfileImageBytes. The limit
   * is the largest per-kind ceiling, with the exact per-kind limit enforced
   * by that same validator.
   */
  const rawImageBody = express.raw({
    type: () => true,
    limit: Math.max(
      PROFILE_IMAGE_SPECS.avatar.maxUploadBytes,
      PROFILE_IMAGE_SPECS.banner.maxUploadBytes,
      // The originals kept for repositioning are full-frame and larger than
      // any cropped output; this parser serves those routes too.
      PROFILE_IMAGE_SOURCE_SPEC.maxUploadBytes,
    ),
  });

  /**
   * `no-store` is not boilerplate here. Express attaches an ETag to every
   * res.json by default, so this endpoint answers 304 on any repeat visit
   * and the browser replays its cached copy — which means a client that
   * once saw `uploadsEnabled: false` would keep seeing it after the server
   * was given a BLOB_READ_WRITE_TOKEN, with no way for the player to tell
   * why the upload option never appeared. This reports live server
   * configuration; it must never be served from a cache.
   */
  router.get('/me/images/status', async (_req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      res.set('Cache-Control', 'no-store');
      res.json({ uploadsEnabled: profileImageService.isEnabled() });
    });
  });

  router.post('/me/images/:kind', rawImageBody, async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const kind = req.params.kind;
      if (!isProfileImageKind(kind)) throw new ProfileServiceError(400, 'VALIDATION', 'Image kind must be avatar or banner.');
      const body = req.body;
      if (!Buffer.isBuffer(body)) throw new ProfileServiceError(400, 'VALIDATION', 'Send the image as a raw binary body.');
      // The crop transform rides in the query string rather than the body,
      // because the body IS the image. normalizeTransform coerces and
      // clamps whatever arrives, so malformed params degrade to a centred,
      // unzoomed crop instead of 400-ing an otherwise valid upload.
      res.json({ customImages: await profileImageService.upload(userId(req), kind, body, req.query) });
    });
  });

  router.post('/me/images/:kind/source', rawImageBody, async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const kind = req.params.kind;
      if (!isProfileImageKind(kind)) throw new ProfileServiceError(400, 'VALIDATION', 'Image kind must be avatar or banner.');
      const body = req.body;
      if (!Buffer.isBuffer(body)) throw new ProfileServiceError(400, 'VALIDATION', 'Send the image as a raw binary body.');
      res.json({ customImages: await profileImageService.attachSource(userId(req), kind, body) });
    });
  });

  router.delete('/me/images/:kind', async (req, res) => {
    await handle(res, async () => {
      ensureEnabled();
      const kind = req.params.kind;
      if (!isProfileImageKind(kind)) throw new ProfileServiceError(400, 'VALIDATION', 'Image kind must be avatar or banner.');
      res.json({ customImages: await profileImageService.remove(userId(req), kind) });
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
      // Avatar join for friend/request rows (SocialTab thumbnails). Shared
      // with GET /profile/search via avatarJoin.ts so an uploaded photo can
      // never show on one list and not the other — profiles() is keyed by
      // the same userId string as the social graph, no ObjectId conversion.
      const avatarOf = await loadAvatarDisplayFields([...graph.friends, ...graph.incomingRequests, ...graph.outgoingRequests]);

      const friends: FriendSummary[] = graph.friends.map((id) => ({ userId: id, username: usernameOf(id), onlineStatus: 'unknown', favoriteLeaderCardNumber: null, since: graph.updatedAt, ...avatarOf(id) }));
      const incoming: FriendRequestSummary[] = graph.incomingRequests.map((id) => ({ userId: id, username: usernameOf(id), requestedAt: graph.updatedAt, ...avatarOf(id) }));
      const outgoing: FriendRequestSummary[] = graph.outgoingRequests.map((id) => ({ userId: id, username: usernameOf(id), requestedAt: graph.updatedAt, ...avatarOf(id) }));
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
