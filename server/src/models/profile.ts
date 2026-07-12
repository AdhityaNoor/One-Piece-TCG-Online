/**
 * Player Profile persistence shapes. Split into several small collections
 * (project rule: separate authentication identity / public profile data /
 * private settings / social data / cosmetic inventory / moderation
 * metadata) rather than one giant document, so:
 *  - privacy filtering only ever has ONE document shape to reason about
 *    (ProfileDocument) when building a public response;
 *  - social/cosmetic/moderation writes never risk a lost-update race against
 *    an unrelated profile-field edit;
 *  - each collection gets its own narrow index.
 *
 * No ranked data, match records, deck contents, or achievement progress
 * source-of-truth is duplicated here — ProfileDocument only ever stores IDs
 * (featuredDeckIds, featuredAchievementIds) plus the lightweight uploaded
 * FeaturedDeckSummary snapshots (see shared/profile.ts doc comment on why
 * those summaries, not full decks, are stored).
 */
import type { ObjectId } from 'mongodb';
import type {
  AchievementProgress,
  EquippedCosmetics,
  FeaturedDeckSummary,
  ModerationStatus,
  ProfilePrivacySettings,
} from '../../../shared/profile';

export interface ProfileDocument {
  _id?: ObjectId;
  userId: string; // = users()._id.toHexString(), unique
  displayName: string;
  bio: string;
  region: string | null;
  preferredLanguage: string | null;
  timeZone: string | null;
  favoriteLeaderCardNumber: string | null;
  statusMessage: string | null;
  equippedCosmetics: EquippedCosmetics;
  featuredDeckIds: string[];
  featuredDecks: FeaturedDeckSummary[]; // uploaded summaries, keyed by deckId matching featuredDeckIds
  featuredAchievementIds: string[];
  privacy: ProfilePrivacySettings;
  moderationStatus: ModerationStatus;
  profileVersion: number;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  /** Cached statistics blob + when it was computed — statisticsService recomputes when stale rather than on every request. */
  statisticsCache: {
    computedAt: string;
    payload: unknown; // StatisticsSummary, stored opaque here to avoid a duplicate type import cycle
  } | null;
  /** Cached achievement progress — same recompute-when-stale strategy. */
  achievementsCache: {
    computedAt: string;
    entries: AchievementProgress[];
  } | null;
}

export interface UsernameHistoryDocument {
  _id?: ObjectId;
  userId: string;
  previousUsername: string;
  newUsername: string;
  changedAt: string;
}

export interface CosmeticInventoryDocument {
  _id?: ObjectId;
  userId: string;
  ownedItemIds: string[];
  updatedAt: string;
}

export interface SocialGraphDocument {
  _id?: ObjectId;
  userId: string;
  friends: string[];
  outgoingRequests: string[];
  incomingRequests: string[];
  blocked: string[];
  updatedAt: string;
}

export type ModerationAuditAction =
  | 'username_change'
  | 'display_name_change'
  | 'bio_change'
  | 'report_submitted'
  | 'player_blocked'
  | 'player_unblocked'
  | 'profile_hidden'
  | 'forced_rename'
  | 'cosmetic_removed'
  | 'suspension_applied'
  | 'suspension_lifted';

export interface ModerationAuditDocument {
  _id?: ObjectId;
  targetUserId: string;
  actorUserId: string; // who performed the action (self for username_change, a moderator for suspension_applied)
  action: ModerationAuditAction;
  at: string;
  /** Never store raw biography/status-message text here — reference only (project rule: don't log private bio text). */
  metadata: Record<string, unknown>;
}

export interface PlayerReportDocument {
  _id?: ObjectId;
  reporterUserId: string;
  targetUserId: string;
  reason: 'harassment' | 'cheating' | 'inappropriate_name' | 'inappropriate_content' | 'other';
  details: string;
  createdAt: string;
  status: 'open' | 'reviewed' | 'dismissed';
}
