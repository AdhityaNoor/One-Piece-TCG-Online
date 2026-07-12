/**
 * Core profile CRUD + the header-response assembly used by both GET
 * /profile/me and GET /profile/:username (project rule: same shape for
 * "own profile" and "public player profile" modes, gated by isOwner +
 * server-side privacy filtering — never two divergent code paths that could
 * drift and leak a field one of them forgot to guard).
 */
import { ObjectId } from 'mongodb';
import { profiles, usernameHistory, users } from '../db/mongo';
import { toPublicUser, type UserDocument } from '../auth/userModel';
import type { ProfileDocument } from '../models/profile';
import { RankedProfileService } from '../ranked/profileService';
import { RankedSeasonService } from '../ranked/seasonService';
import { SocialService } from './socialService';
import { ModerationService } from './moderationService';
import { isProfileBlockedForViewer, isProfileVisibleAtAll, resolveSectionVisibility, type ViewerContext } from './privacyService';
import {
  isUsernameChangeAllowed,
  validateBio,
  validateDisplayName,
  validateImageUrl,
  validateStatusMessage,
  validateUsernameFormat,
} from './validation';
import { ProfileServiceError } from './errors';
import {
  DEFAULT_EQUIPPED_COSMETICS,
  DEFAULT_PRIVACY_SETTINGS,
  type ChangeUsernameRequest,
  type FeaturedDeckSummary,
  type PlayerProfile,
  type ProfileHeaderResponse,
  type ProfilePrivacySettings,
  type ProfileSectionId,
  type UpdateFeaturedAchievementsRequest,
  type UpdateFeaturedDecksRequest,
  type UpdatePrivacyRequest,
  type UpdateProfileRequest,
} from '../../../shared/profile';

const MAX_FEATURED_DECKS = 6;
const MAX_FEATURED_ACHIEVEMENTS = 6;

const social = new SocialService();
const moderation = new ModerationService();
const rankedProfileService = new RankedProfileService();

function docToPlayerProfile(doc: ProfileDocument, username: string): PlayerProfile {
  return {
    userId: doc.userId,
    username,
    displayName: doc.displayName,
    bio: doc.bio,
    region: doc.region,
    preferredLanguage: doc.preferredLanguage,
    timeZone: doc.timeZone,
    favoriteLeaderCardNumber: doc.favoriteLeaderCardNumber,
    statusMessage: doc.statusMessage,
    equippedCosmetics: doc.equippedCosmetics,
    featuredDeckIds: doc.featuredDeckIds,
    featuredAchievementIds: doc.featuredAchievementIds,
    createdAt: doc.createdAt,
    lastActiveAt: doc.lastActiveAt,
    profileVersion: doc.profileVersion,
  };
}

export class ProfileService {
  async getOrCreateProfileDoc(userId: string, fallbackDisplayName: string): Promise<ProfileDocument> {
    const existing = await profiles().findOne({ userId });
    if (existing) return existing;

    const nowIso = new Date().toISOString();
    const doc: ProfileDocument = {
      userId,
      displayName: fallbackDisplayName,
      bio: '',
      region: null,
      preferredLanguage: null,
      timeZone: null,
      favoriteLeaderCardNumber: null,
      statusMessage: null,
      equippedCosmetics: { ...DEFAULT_EQUIPPED_COSMETICS },
      featuredDeckIds: [],
      featuredDecks: [],
      featuredAchievementIds: [],
      privacy: { ...DEFAULT_PRIVACY_SETTINGS },
      moderationStatus: 'active',
      profileVersion: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastActiveAt: nowIso,
      statisticsCache: null,
      achievementsCache: null,
    };
    await profiles().updateOne({ userId }, { $setOnInsert: doc }, { upsert: true });
    return (await profiles().findOne({ userId }))!;
  }

  private async getOrCreateProfileDocForUser(userId: string): Promise<ProfileDocument> {
    const user = await this.findUserById(userId);
    if (!user) throw new ProfileServiceError(404, 'NOT_FOUND', 'Account no longer exists.');
    return this.getOrCreateProfileDoc(userId, user.username);
  }

  async touchLastActive(userId: string): Promise<void> {
    await profiles().updateOne({ userId }, { $set: { lastActiveAt: new Date().toISOString() } }, { upsert: false });
  }

  private async findUserByUsername(username: string): Promise<UserDocument | null> {
    return users().findOne({ username: username.trim() }, { collation: { locale: 'en', strength: 2 } });
  }

  private async findUserById(userId: string): Promise<UserDocument | null> {
    try {
      return await users().findOne({ _id: new ObjectId(userId) });
    } catch {
      return null;
    }
  }

  /**
   * Assembles the header response for BOTH own-profile and public-profile
   * routes. `viewerUserId` is null for an unauthenticated request (public
   * route only — GET /profile/me always requires auth via middleware).
   */
  async getHeaderForUsername(username: string, viewerUserId: string | null): Promise<ProfileHeaderResponse> {
    const targetUser = await this.findUserByUsername(username);
    if (!targetUser) throw new ProfileServiceError(404, 'NOT_FOUND', 'Player not found.');
    return this.assembleHeader(targetUser, viewerUserId);
  }

  async getOwnHeader(userId: string): Promise<ProfileHeaderResponse> {
    const user = await this.findUserById(userId);
    if (!user) throw new ProfileServiceError(404, 'NOT_FOUND', 'Account no longer exists.');
    return this.assembleHeader(user, userId);
  }

  private async assembleHeader(targetUser: UserDocument, viewerUserId: string | null): Promise<ProfileHeaderResponse> {
    const targetUserId = targetUser._id!.toHexString();
    const isOwner = viewerUserId === targetUserId;
    const doc = await this.getOrCreateProfileDoc(targetUserId, targetUser.username);

    if (doc.moderationStatus === 'deleted') throw new ProfileServiceError(404, 'DELETED', 'This account has been deleted.');
    if (doc.moderationStatus === 'suspended' && !isOwner) throw new ProfileServiceError(403, 'SUSPENDED', 'This profile is unavailable.');

    const relationship = isOwner || !viewerUserId ? 'none' : await social.relationshipOf(viewerUserId, targetUserId);
    const viewer: ViewerContext = { isOwner, relationship };

    if (isProfileBlockedForViewer(viewer)) {
      throw new ProfileServiceError(403, 'BLOCKED', 'This profile is not available to you.');
    }
    if (!isProfileVisibleAtAll(doc.privacy, viewer)) {
      throw new ProfileServiceError(403, 'PRIVATE', 'This profile is private.');
    }

    const sections = resolveSectionVisibility(doc.privacy, viewer);
    const visibleSections: ProfileSectionId[] = (
      [
        ['overview', sections.overview],
        ['ranked', sections.ranked],
        ['match_history', sections.matchHistory],
        ['deck_showcase', sections.deckShowcase],
        ['statistics', sections.statistics],
        ['achievements', sections.achievements],
        ['cosmetics', sections.cosmetics],
        ['social', sections.social],
      ] as [ProfileSectionId, boolean][]
    )
      .filter(([, visible]) => visible)
      .map(([id]) => id);
    if (isOwner) visibleSections.push('settings', 'account');

    let ranked: ProfileHeaderResponse['ranked'] = null;
    if (sections.ranked) {
      try {
        const seasons = new RankedSeasonService();
        const season = await seasons.getActiveSeason().catch(() => seasons.getOrCreateDevelopmentSeason());
        const publicRanked = await rankedProfileService.getPublicProfile(targetUserId, season);
        ranked = {
          rank: publicRanked.rank,
          rankName: publicRanked.rankName,
          division: publicRanked.division,
          rankedPoints: publicRanked.rankedPoints,
          inPlacement: publicRanked.inPlacement,
          seasonId: publicRanked.seasonId,
        };
      } catch {
        ranked = null;
      }
    }

    const profile = docToPlayerProfile(doc, targetUser.username);
    // Region is nulled out at the payload level (not just hidden by the
    // client) when the section is not visible to this viewer — the actual
    // enforcement point (project rule: server must not send private data
    // and rely on the UI to hide it).
    if (!sections.region) profile.region = null;

    return {
      profile,
      isOwner,
      privacy: isOwner ? doc.privacy : null,
      relationship,
      moderationStatus: isOwner ? doc.moderationStatus : null,
      ranked,
      featuredDecks: sections.deckShowcase ? doc.featuredDecks : [],
      visibleSections,
    };
  }

  async updateProfile(userId: string, patch: UpdateProfileRequest): Promise<void> {
    const doc = await this.getOrCreateProfileDocForUser(userId);
    const update: Partial<ProfileDocument> = { updatedAt: new Date().toISOString() };
    const auditMeta: Record<string, unknown> = {};

    if (patch.displayName !== undefined) {
      const result = validateDisplayName(patch.displayName);
      if (!result.ok) throw new ProfileServiceError(400, 'VALIDATION', result.reason!);
      update.displayName = result.value!;
      auditMeta.displayNameChanged = true;
    }
    if (patch.bio !== undefined) {
      const result = validateBio(patch.bio);
      if (!result.ok) throw new ProfileServiceError(400, 'VALIDATION', result.reason!);
      update.bio = result.value!;
      auditMeta.bioChanged = true;
    }
    if (patch.statusMessage !== undefined) {
      if (patch.statusMessage === null) {
        update.statusMessage = null;
      } else {
        const result = validateStatusMessage(patch.statusMessage);
        if (!result.ok) throw new ProfileServiceError(400, 'VALIDATION', result.reason!);
        update.statusMessage = result.value!;
      }
    }
    if (patch.region !== undefined) update.region = patch.region ? patch.region.slice(0, 60) : null;
    if (patch.preferredLanguage !== undefined) update.preferredLanguage = patch.preferredLanguage ? patch.preferredLanguage.slice(0, 35) : null;
    if (patch.timeZone !== undefined) update.timeZone = patch.timeZone ? patch.timeZone.slice(0, 60) : null;
    if (patch.favoriteLeaderCardNumber !== undefined) update.favoriteLeaderCardNumber = patch.favoriteLeaderCardNumber;

    update.profileVersion = doc.profileVersion + 1;
    await profiles().updateOne({ userId }, { $set: update });
    if (Object.keys(auditMeta).length > 0) {
      await moderation.recordAudit(userId, userId, auditMeta.bioChanged ? 'bio_change' : 'display_name_change', auditMeta);
    }
  }

  async changeUsername(userId: string, body: ChangeUsernameRequest): Promise<void> {
    const format = validateUsernameFormat(body.username);
    if (!format.ok || !format.value) throw new ProfileServiceError(400, 'VALIDATION', format.reason ?? 'Invalid username.');
    const username = format.value;

    const lastChange = await usernameHistory().find({ userId }).sort({ changedAt: -1 }).limit(1).next();
    const nowIso = new Date().toISOString();
    if (!isUsernameChangeAllowed(lastChange?.changedAt ?? null, nowIso)) {
      throw new ProfileServiceError(429, 'RATE_LIMITED', 'Username can only be changed once every 30 days.');
    }

    const currentUser = await this.findUserById(userId);
    if (!currentUser) throw new ProfileServiceError(404, 'NOT_FOUND', 'Account no longer exists.');
    if (currentUser.username === username) return; // no-op

    try {
      await users().updateOne({ _id: new ObjectId(userId) }, { $set: { username } });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) {
        throw new ProfileServiceError(409, 'USERNAME_TAKEN', 'That username is already taken.');
      }
      throw err;
    }

    await usernameHistory().insertOne({ userId, previousUsername: currentUser.username, newUsername: username, changedAt: nowIso });
    await moderation.recordAudit(userId, userId, 'username_change', { from: currentUser.username, to: username });
  }

  async updatePrivacy(userId: string, body: UpdatePrivacyRequest): Promise<ProfilePrivacySettings> {
    const doc = await this.getOrCreateProfileDocForUser(userId);
    validatePrivacyPatch(body.privacy ?? {});
    const next: ProfilePrivacySettings = { ...doc.privacy, ...body.privacy };
    await profiles().updateOne({ userId }, { $set: { privacy: next, updatedAt: new Date().toISOString() } });
    return next;
  }

  async updateFeaturedDecks(userId: string, body: UpdateFeaturedDecksRequest): Promise<FeaturedDeckSummary[]> {
    await this.getOrCreateProfileDocForUser(userId);
    if (body.featuredDecks.length > MAX_FEATURED_DECKS) {
      throw new ProfileServiceError(400, 'VALIDATION', `You can feature at most ${MAX_FEATURED_DECKS} decks.`);
    }
    // These summaries are client-uploaded (decks are local-storage-only —
    // see shared/profile.ts FeaturedDeckSummary doc comment) and rendered on
    // OTHER players' profiles. Text fields are trimmed/length-capped (React
    // renders them as text children, so it auto-escapes — no manual HTML
    // escaping needed there, matching how bio/displayName are handled).
    // Image URLs get the stricter check since those DO become `src`
    // attributes: only http(s) absolute URLs are accepted.
    const sanitized: FeaturedDeckSummary[] = body.featuredDecks.map((deck) => {
      if (!deck.deckId || !deck.name) {
        throw new ProfileServiceError(400, 'VALIDATION', 'Each featured deck needs a deckId and a name.');
      }
      const name = deck.name.trim().slice(0, 60);
      const leaderName = (deck.leaderName ?? '').trim().slice(0, 60);
      const leaderImageUrl = deck.leaderImageUrl ? validateImageUrl(deck.leaderImageUrl) : { ok: true as const, value: '' };
      const cardBackImageUrl = deck.cardBackImageUrl ? validateImageUrl(deck.cardBackImageUrl) : { ok: true as const, value: '' };
      if (!leaderImageUrl.ok || !cardBackImageUrl.ok) {
        throw new ProfileServiceError(400, 'VALIDATION', 'Featured deck image URLs must be valid http(s) URLs.');
      }
      return {
        ...deck,
        name,
        leaderName,
        leaderImageUrl: leaderImageUrl.value || null,
        cardBackImageUrl: cardBackImageUrl.value || null,
        colors: (deck.colors ?? []).slice(0, 6).map((color) => String(color).slice(0, 20)),
      };
    });

    const featuredDeckIds = sanitized.map((deck) => deck.deckId);
    await profiles().updateOne(
      { userId },
      { $set: { featuredDeckIds, featuredDecks: sanitized, updatedAt: new Date().toISOString() } },
    );
    return sanitized;
  }

  async updateFeaturedAchievements(userId: string, body: UpdateFeaturedAchievementsRequest, completedAchievementIds: Set<string>): Promise<string[]> {
    await this.getOrCreateProfileDocForUser(userId);
    if (body.featuredAchievementIds.length > MAX_FEATURED_ACHIEVEMENTS) {
      throw new ProfileServiceError(400, 'VALIDATION', `You can feature at most ${MAX_FEATURED_ACHIEVEMENTS} achievements.`);
    }
    for (const id of body.featuredAchievementIds) {
      if (!completedAchievementIds.has(id)) {
        throw new ProfileServiceError(400, 'VALIDATION', `Achievement "${id}" has not been earned yet and cannot be featured.`);
      }
    }
    await profiles().updateOne(
      { userId },
      { $set: { featuredAchievementIds: body.featuredAchievementIds, updatedAt: new Date().toISOString() } },
    );
    return body.featuredAchievementIds;
  }

  /** Prefix search on username, capped and generically-shaped to resist enumeration (project rule). */
  async searchPlayers(query: string, limit: number): Promise<{ userId: string; username: string }[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const safeLimit = Math.max(1, Math.min(20, limit || 10));
    const docs = await users()
      .find({ username: { $regex: `^${escapeRegExp(trimmed)}`, $options: 'i' } })
      .project({ username: 1 })
      .limit(safeLimit)
      .toArray();
    return docs.map((doc) => ({ userId: doc._id!.toHexString(), username: doc.username }));
  }

  async getPrivateAccountSettings(userId: string): Promise<{ email: string; emailVerified: boolean; linkedProviders: string[]; createdAt: string; usernameChangeHistory: { previousUsername: string; changedAt: string }[]; activeSessionCount: number }> {
    const user = await this.findUserById(userId);
    if (!user) throw new ProfileServiceError(404, 'NOT_FOUND', 'Account no longer exists.');
    const publicUser = toPublicUser(user);
    const history = await usernameHistory().find({ userId }).sort({ changedAt: -1 }).limit(10).toArray();
    return {
      email: publicUser.email,
      emailVerified: true, // no verification flow exists yet — see known limitations
      linkedProviders: ['password'],
      createdAt: publicUser.createdAt,
      usernameChangeHistory: history.map((h) => ({ previousUsername: h.previousUsername, changedAt: h.changedAt })),
      // Stateless JWT (no server session store — see auth/routes.ts doc comment), so
      // there is no real session list to report; always 1 (this request's own token).
      activeSessionCount: 1,
    };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validatePrivacyPatch(patch: Partial<ProfilePrivacySettings>): void {
  const visibilityKeys: Array<keyof Omit<ProfilePrivacySettings, 'showRankOnLeaderboardRegardlessOfPrivacy'>> = [
    'profileVisibility',
    'matchHistoryVisibility',
    'rankedStatsVisibility',
    'casualStatsVisibility',
    'deckVisibility',
    'achievementVisibility',
    'onlineStatusVisibility',
    'regionVisibility',
    'friendsListVisibility',
    'recentOpponentsVisibility',
  ];
  for (const key of visibilityKeys) {
    const value = patch[key];
    if (value !== undefined && value !== 'public' && value !== 'friends' && value !== 'private') {
      throw new ProfileServiceError(400, 'VALIDATION', `Invalid privacy value for ${key}.`);
    }
  }
  const leaderboard = patch.showRankOnLeaderboardRegardlessOfPrivacy;
  if (leaderboard !== undefined && typeof leaderboard !== 'boolean') {
    throw new ProfileServiceError(400, 'VALIDATION', 'Invalid leaderboard visibility override.');
  }
}
