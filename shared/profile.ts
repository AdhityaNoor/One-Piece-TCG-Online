/**
 * Player Profile wire contract, shared by the Vercel frontend and the Cloud
 * Run backend. Types only — no runtime, no dependencies — matching
 * shared/auth.ts and shared/ranked.ts's "both src/ and server/src import
 * this without a build step" rule.
 *
 * Layering (mirrors the engine's Layer 1/2 vs UI split for identity data):
 *  - PublicUser (shared/auth.ts)   = authentication identity. Never touched here.
 *  - PlayerProfile                 = public-ish profile document (this file).
 *  - PrivateAccountSettings        = account/security data, owner-only, never
 *                                    served from the public profile endpoint.
 *  - RankedProfile (shared/ranked.ts) = ranked progression. Referenced by
 *                                    playerId, never duplicated in here.
 *  - MatchHistoryDocument / RankedMatchHistoryEntry = match records, owned by
 *                                    their own collections. This file only
 *                                    defines the unified read-shape
 *                                    (ProfileMatchHistoryEntry) the profile
 *                                    UI consumes.
 *
 * Golden rule mirrored from shared/auth.ts: nothing in PlayerProfile or its
 * DTOs may carry hidden MMR, password material, email, or full deck
 * contents. Those live in PrivateAccountSettings / InternalRankedProfile /
 * local SavedDeck storage and are never sent to a public-profile viewer.
 */

// ---- privacy -----------------------------------------------------------

export type ProfileVisibility = 'public' | 'friends' | 'private';

/** Deck-specific visibility needs one more state than the generic three. */
export type DeckVisibility = 'private' | 'friends' | 'public' | 'public_after_match' | 'leader_only';

export interface ProfilePrivacySettings {
  profileVisibility: ProfileVisibility;
  matchHistoryVisibility: ProfileVisibility;
  rankedStatsVisibility: ProfileVisibility;
  casualStatsVisibility: ProfileVisibility;
  deckVisibility: ProfileVisibility;
  achievementVisibility: ProfileVisibility;
  onlineStatusVisibility: ProfileVisibility;
  regionVisibility: ProfileVisibility;
  friendsListVisibility: ProfileVisibility;
  recentOpponentsVisibility: ProfileVisibility;
  /**
   * Exception to the generic rule (documented, per spec): public leaderboard
   * rank/position stays visible for leaderboard integrity even when
   * profileVisibility/rankedStatsVisibility is 'private'. This flag only
   * controls whether the profile PAGE also shows the rank; the leaderboard
   * itself (GET /ranked/leaderboard) is unaffected either way.
   */
  showRankOnLeaderboardRegardlessOfPrivacy: boolean;
}

export const DEFAULT_PRIVACY_SETTINGS: ProfilePrivacySettings = {
  profileVisibility: 'public',
  matchHistoryVisibility: 'public',
  rankedStatsVisibility: 'public',
  casualStatsVisibility: 'public',
  deckVisibility: 'public',
  achievementVisibility: 'public',
  onlineStatusVisibility: 'public',
  regionVisibility: 'private',
  friendsListVisibility: 'friends',
  recentOpponentsVisibility: 'friends',
  showRankOnLeaderboardRegardlessOfPrivacy: true,
};

// ---- cosmetics -----------------------------------------------------------

export type CosmeticType =
  | 'avatar'
  | 'banner'
  | 'frame'
  | 'title'
  | 'badge'
  | 'card_back'
  | 'board_skin'
  | 'match_intro_effect'
  | 'victory_effect'
  | 'emote_set';

export type CosmeticRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type CosmeticUnlockSource = 'default' | 'season_reward' | 'achievement' | 'event' | 'locked';

export interface CosmeticDefinition {
  id: string;
  type: CosmeticType;
  name: string;
  description: string;
  rarity: CosmeticRarity;
  unlockSource: CosmeticUnlockSource;
  /** Human-readable unlock requirement, display only ("Reach Supernova this season"). Null for default items. */
  unlockRequirement: string | null;
  icon: string;
}

export interface EquippedCosmetics {
  avatar: string | null;
  banner: string | null;
  frame: string | null;
  title: string | null;
  badge: string | null;
  cardBack: string | null;
  boardSkin: string | null;
  matchIntroEffect: string | null;
  victoryEffect: string | null;
  emoteSet: string | null;
}

export const DEFAULT_EQUIPPED_COSMETICS: EquippedCosmetics = {
  avatar: 'avatar_straw_hat',
  banner: 'banner_east_blue',
  frame: null,
  title: 'title_rookie_pirate',
  badge: null,
  cardBack: 'cardback_default',
  boardSkin: null,
  matchIntroEffect: null,
  victoryEffect: null,
  emoteSet: null,
};

/** What GET /profile/me/cosmetics returns — inventory + what's equipped, catalog joined in. */
export interface CosmeticInventoryEntry {
  item: CosmeticDefinition;
  owned: boolean;
  equipped: boolean;
}

// ---- achievements ----------------------------------------------------------

export type AchievementCategory =
  | 'ranked'
  | 'collection'
  | 'deck_building'
  | 'match_milestones'
  | 'leader_mastery'
  | 'seasonal'
  | 'social'
  | 'events'
  | 'special';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  targetValue: number;
  rarity: CosmeticRarity;
  hidden: boolean;
  seasonal: boolean;
  reward: string | null;
}

export interface AchievementProgress {
  achievementId: string;
  progress: number;
  targetValue: number;
  completed: boolean;
  completedAt: string | null;
}

/** Achievement definition + this player's progress, joined for display. */
export interface AchievementView {
  definition: AchievementDefinition;
  progress: AchievementProgress;
  featured: boolean;
}

// ---- deck showcase -----------------------------------------------------

/**
 * Deliberately NOT a SavedDeck. Decks are local-storage-only snapshots (see
 * src/cards/decks/savedDeck.ts) — a public viewer on a different device can
 * never read another player's localStorage, so the profile owner uploads
 * this lightweight summary when marking a deck "featured". Uploading a
 * summary rather than the full 51-card snapshot also satisfies "do not
 * expose deck internals accidentally when private": there is no decklist to
 * leak because the full decklist never leaves the owner's device.
 */
export interface FeaturedDeckSummary {
  deckId: string;
  name: string;
  leaderCardNumber: string;
  leaderName: string;
  leaderImageUrl: string | null;
  colors: string[];
  cardBackImageUrl: string | null;
  formatId: string;
  formatStatus: 'legal' | 'extra' | 'banned' | 'unknown';
  cardCount: number;
  rankedEligible: boolean;
  visibility: DeckVisibility;
  favorite: boolean;
  updatedAt: string;
  /** Only present once per-deck match tracking exists — see known limitations. */
  usageCount: number | null;
  wins: number | null;
  losses: number | null;
}

// ---- statistics ----------------------------------------------------------

export interface MatchTypeStatistics {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak: number;
  highestStreak: number;
  concessions: number;
  disconnects: number;
  abandonments: number;
  averageDurationSeconds: number | null;
  fastestVictorySeconds: number | null;
  longestMatchSeconds: number | null;
}

export const EMPTY_MATCH_TYPE_STATISTICS: MatchTypeStatistics = {
  matches: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  winRate: 0,
  currentStreak: 0,
  highestStreak: 0,
  concessions: 0,
  disconnects: 0,
  abandonments: 0,
  averageDurationSeconds: null,
  fastestVictorySeconds: null,
  longestMatchSeconds: null,
};

export interface LeaderUsageStatistic {
  leaderCardNumber: string;
  leaderName: string;
  matches: number;
  wins: number;
  winRate: number;
}

export interface StatisticsSummary {
  /** ISO instant this summary was computed — lets the UI show "as of" and lets the service cache/skip recompute. */
  computedAt: string;
  /** Whether this is a fully computed aggregate or a partial/incomplete one (e.g. a section's source service was unavailable). */
  complete: boolean;
  lifetime: {
    ranked: MatchTypeStatistics;
    casual: MatchTypeStatistics;
    cpu: MatchTypeStatistics;
    combined: MatchTypeStatistics;
  };
  currentSeason: {
    seasonId: string | null;
    ranked: MatchTypeStatistics;
  };
  mostPlayedLeader: LeaderUsageStatistic | null;
  mostSuccessfulLeader: LeaderUsageStatistic | null;
  seasonsParticipated: number;
  rankedPromotions: number;
  rankedDemotions: number;
  highestLifetimeRank: string;
}

// ---- social --------------------------------------------------------------

export type SocialRelationship = 'none' | 'friends' | 'outgoing_request' | 'incoming_request' | 'blocked_by_viewer' | 'blocking_viewer';

export interface FriendSummary {
  userId: string;
  username: string;
  onlineStatus: 'online' | 'offline' | 'unknown';
  favoriteLeaderCardNumber: string | null;
  since: string;
}

export interface FriendRequestSummary {
  userId: string;
  username: string;
  requestedAt: string;
}

// ---- match history ---------------------------------------------------------

export type ProfileMatchType = 'ranked' | 'casual' | 'hotseat' | 'cpu';
export type ProfileMatchResultType = 'normal' | 'concession' | 'timeout' | 'disconnect' | 'abandonment' | 'admin' | 'server_failure' | 'unknown';

/** Unified read-shape over rankedMatches (rich) and matchHistory (sparse casual/hotseat/cpu). Fields the source collection can't supply are null, never fabricated. */
export interface ProfileMatchHistoryEntry {
  matchId: string;
  matchType: ProfileMatchType;
  result: 'win' | 'loss' | 'draw' | 'unknown';
  resultType: ProfileMatchResultType;
  opponentName: string | null;
  opponentUserId: string | null;
  playerLeaderName: string | null;
  opponentLeaderName: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  season: string | null;
  rankBefore: string | null;
  rankAfter: string | null;
  rankedPointDelta: number | null;
  promoted: boolean;
  demoted: boolean;
  deckSnapshotDeckId: string | null;
}

export interface ProfileMatchHistoryPage {
  entries: ProfileMatchHistoryEntry[];
  nextCursor: string | null;
}

export interface ProfileMatchDetail extends ProfileMatchHistoryEntry {
  gameEngineVersion: string | null;
  rulesetVersion: string | null;
  actionCount: number | null;
}

// ---- moderation ------------------------------------------------------------

export type ModerationStatus = 'active' | 'warned' | 'suspended' | 'deleted';

// ---- the profile document itself -----------------------------------------

/** Fields ANY viewer may receive, subject to per-field privacy filtering server-side. Never includes hidden MMR, email, or moderation notes. */
export interface PlayerProfile {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  region: string | null;
  preferredLanguage: string | null;
  timeZone: string | null;
  favoriteLeaderCardNumber: string | null;
  statusMessage: string | null;
  equippedCosmetics: EquippedCosmetics;
  featuredDeckIds: string[];
  featuredAchievementIds: string[];
  createdAt: string; // "Sailing Since"
  lastActiveAt: string;
  profileVersion: number;
}

/** GET /profile/me and GET /profile/:username response payload (header + light context). Heavier sections (stats/history/achievements/cosmetics) are separate endpoints per the "no oversized endpoint" rule. */
export interface ProfileHeaderResponse {
  profile: PlayerProfile;
  isOwner: boolean;
  privacy: ProfilePrivacySettings | null; // null unless isOwner
  relationship: SocialRelationship;
  moderationStatus: ModerationStatus | null; // null unless isOwner
  ranked: {
    rank: string;
    rankName: string;
    division: string | null;
    rankedPoints: number;
    inPlacement: boolean;
    seasonId: string | null;
  } | null; // null when ranked stats are private to this viewer
  featuredDecks: FeaturedDeckSummary[];
  visibleSections: ProfileSectionId[];
}

export type ProfileSectionId =
  | 'overview'
  | 'ranked'
  | 'match_history'
  | 'deck_showcase'
  | 'statistics'
  | 'achievements'
  | 'cosmetics'
  | 'social'
  | 'settings'
  | 'account';

/** Not-found / private / blocked / suspended states the public route can return instead of a 200 body — the frontend renders a matching empty state rather than a generic error. */
export type PublicProfileErrorCode =
  | 'NOT_FOUND'
  | 'PRIVATE'
  | 'BLOCKED'
  | 'SUSPENDED'
  | 'DELETED'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'USERNAME_TAKEN'
  | 'RESERVED_NAME'
  | 'INTERNAL';

export interface ProfileApiErrorBody {
  error: string;
  code: PublicProfileErrorCode;
  details?: unknown;
}

// ---- request DTOs ----------------------------------------------------------

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  region?: string | null;
  preferredLanguage?: string | null;
  timeZone?: string | null;
  favoriteLeaderCardNumber?: string | null;
  statusMessage?: string | null;
}

/** Username changes are validated/rate-limited separately from the general profile update — see profileService.changeUsername. */
export interface ChangeUsernameRequest {
  username: string;
}

export interface UpdatePrivacyRequest {
  privacy: Partial<ProfilePrivacySettings>;
}

export interface UpdateFeaturedDecksRequest {
  featuredDecks: FeaturedDeckSummary[];
}

export interface UpdateFeaturedAchievementsRequest {
  featuredAchievementIds: string[];
}

export interface EquipCosmeticRequest {
  itemId: string;
  slot: CosmeticType;
}

export interface ReportPlayerRequest {
  reason: 'harassment' | 'cheating' | 'inappropriate_name' | 'inappropriate_content' | 'other';
  details: string;
}

// ---- account (owner-only, never served by the public route) --------------

export interface PrivateAccountSettings {
  email: string;
  emailVerified: boolean;
  linkedProviders: string[];
  createdAt: string;
  usernameChangeHistory: { previousUsername: string; changedAt: string }[];
  activeSessionCount: number;
}

export interface AccountDeletionRequestBody {
  confirmationPhrase: string;
}
