/**
 * MongoDB Atlas connection (native driver — no Mongoose, to keep the image
 * small and the data layer explicit). One shared MongoClient for the process.
 *
 * Project rule boundary: Mongo holds PERSISTENT data only (users, finished
 * match history). It is NEVER the live match store — live GameState lives in
 * Colyseus room memory (see src/rooms/GameRoom.ts).
 */
import { MongoClient, type Collection, type Db } from 'mongodb';
import { env } from '../config/env';
import type { UserDocument } from '../auth/userModel';
import type { MatchHistoryDocument } from '../models/matchHistory';
import type { BugReportDocument } from '../models/bugReport';
import type { AdminDocument } from '../models/admin';
import type { FeatureFlagDocument } from '../models/featureFlag';
import type { HomeBannerDocument } from '../models/homeBanner';
import type { CardLegalityOverrideDocument } from '../models/cardLegalityOverride';
import type {
  RankedAuditEventDocument,
  RankedLeaderboardSnapshotDocument,
  RankedMatchDocument,
  RankedPenaltyDocument,
  RankedProfileDocument,
  RankedQueueEntryDocument,
  RankedSeasonDocument,
} from '../models/ranked';
import type {
  CosmeticInventoryDocument,
  ModerationAuditDocument,
  PlayerReportDocument,
  ProfileDocument,
  SocialGraphDocument,
  UsernameHistoryDocument,
} from '../models/profile';

let client: MongoClient | null = null;
let db: Db | null = null;

/** Connect once at boot. Safe to call again — returns the existing db. */
export async function connectMongo(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(env.mongoUri, {
    // Keep the pool modest; Cloud Run scales by instance, not by huge pools.
    maxPoolSize: 10,
    retryWrites: true,
  });
  await client.connect();
  // Database name is taken from the URI path; fall back to a sensible default.
  db = client.db();
  await ensureIndexes(db);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('Mongo not connected yet — call connectMongo() at boot.');
  return db;
}

export function users(): Collection<UserDocument> {
  return getDb().collection<UserDocument>('users');
}

export function matchHistory(): Collection<MatchHistoryDocument> {
  return getDb().collection<MatchHistoryDocument>('matchHistory');
}

export function rankedProfiles(): Collection<RankedProfileDocument> {
  return getDb().collection<RankedProfileDocument>('rankedProfiles');
}

export function rankedSeasons(): Collection<RankedSeasonDocument> {
  return getDb().collection<RankedSeasonDocument>('rankedSeasons');
}

export function rankedMatches(): Collection<RankedMatchDocument> {
  return getDb().collection<RankedMatchDocument>('rankedMatches');
}

export function rankedQueueEntries(): Collection<RankedQueueEntryDocument> {
  return getDb().collection<RankedQueueEntryDocument>('rankedQueueEntries');
}

export function rankedPenalties(): Collection<RankedPenaltyDocument> {
  return getDb().collection<RankedPenaltyDocument>('rankedPenalties');
}

export function rankedAuditEvents(): Collection<RankedAuditEventDocument> {
  return getDb().collection<RankedAuditEventDocument>('rankedAuditEvents');
}

export function rankedLeaderboardSnapshots(): Collection<RankedLeaderboardSnapshotDocument> {
  return getDb().collection<RankedLeaderboardSnapshotDocument>('rankedLeaderboardSnapshots');
}

export function profiles(): Collection<ProfileDocument> {
  return getDb().collection<ProfileDocument>('profiles');
}

export function usernameHistory(): Collection<UsernameHistoryDocument> {
  return getDb().collection<UsernameHistoryDocument>('usernameHistory');
}

export function cosmeticInventories(): Collection<CosmeticInventoryDocument> {
  return getDb().collection<CosmeticInventoryDocument>('cosmeticInventories');
}

export function socialGraphs(): Collection<SocialGraphDocument> {
  return getDb().collection<SocialGraphDocument>('socialGraphs');
}

export function moderationAuditEvents(): Collection<ModerationAuditDocument> {
  return getDb().collection<ModerationAuditDocument>('moderationAuditEvents');
}

export function playerReports(): Collection<PlayerReportDocument> {
  return getDb().collection<PlayerReportDocument>('playerReports');
}

export function bugReports(): Collection<BugReportDocument> {
  return getDb().collection<BugReportDocument>('bugReports');
}

// ---- Admin CMS (server/src/admin*, server/src/adminAuth) ------------------

export function admins(): Collection<AdminDocument> {
  return getDb().collection<AdminDocument>('admins');
}

export function featureFlags(): Collection<FeatureFlagDocument> {
  return getDb().collection<FeatureFlagDocument>('featureFlags');
}

export function homeBanners(): Collection<HomeBannerDocument> {
  return getDb().collection<HomeBannerDocument>('homeBanners');
}

export function cardLegalityOverrides(): Collection<CardLegalityOverrideDocument> {
  return getDb().collection<CardLegalityOverrideDocument>('cardLegalityOverrides');
}

async function ensureIndexes(database: Db): Promise<void> {
  // Case-insensitive unique email so signup can't create duplicates by case.
  await database
    .collection('users')
    .createIndex({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

  // Case-insensitive unique username — this doubles as the public profile
  // handle (/profile/:username). Wrapped in try/catch: if any pre-existing
  // dev/seed data already has duplicate usernames this index creation would
  // otherwise fail and take the whole boot down with it. See docs on the
  // migration step this implies for any such environment.
  try {
    await database
      .collection('users')
      .createIndex({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
  } catch (err) {
    console.warn('[mongo] could not create unique username index (likely pre-existing duplicates) — profile username changes will not be race-safe until this is resolved:', err);
  }

  await database.collection('rankedProfiles').createIndex({ playerId: 1, seasonId: 1 }, { unique: true });
  await database.collection('rankedProfiles').createIndex({ seasonId: 1, hiddenMmr: -1 });
  await database.collection('rankedProfiles').createIndex({ seasonId: 1, rank: 1, rankedPoints: -1 });

  await database.collection('rankedSeasons').createIndex({ status: 1, startsAt: 1, endsAt: 1 });

  await database.collection('rankedMatches').createIndex({ seasonId: 1, finalizedAt: -1 });
  await database.collection('rankedMatches').createIndex({ 'participants.playerId': 1, endedAt: -1 });
  await database.collection('rankedMatches').createIndex({ status: 1, roomId: 1 });

  await database.collection('rankedQueueEntries').createIndex({ playerId: 1, seasonId: 1, status: 1 });
  await database.collection('rankedQueueEntries').createIndex({ status: 1, seasonId: 1, region: 1, hiddenMmr: 1, queuedAt: 1 });

  await database.collection('rankedPenalties').createIndex({ playerId: 1, seasonId: 1, expiresAt: 1 });
  await database.collection('rankedAuditEvents').createIndex({ playerId: 1, at: -1 });
  await database.collection('rankedAuditEvents').createIndex({ matchId: 1, type: 1 });
  await database.collection('rankedLeaderboardSnapshots').createIndex({ seasonId: 1, createdAt: -1 });

  // Profile system — see server/src/models/profile.ts.
  await database.collection('profiles').createIndex({ userId: 1 }, { unique: true });
  await database.collection('profiles').createIndex({ 'privacy.profileVisibility': 1 });
  await database.collection('profiles').createIndex({ lastActiveAt: -1 });
  await database.collection('profiles').createIndex({ region: 1 });
  await database.collection('profiles').createIndex({ favoriteLeaderCardNumber: 1 });
  await database.collection('profiles').createIndex({ updatedAt: -1 });

  await database.collection('usernameHistory').createIndex({ userId: 1, changedAt: -1 });

  await database.collection('cosmeticInventories').createIndex({ userId: 1 }, { unique: true });

  await database.collection('socialGraphs').createIndex({ userId: 1 }, { unique: true });

  await database.collection('moderationAuditEvents').createIndex({ targetUserId: 1, at: -1 });
  await database.collection('moderationAuditEvents').createIndex({ action: 1, at: -1 });

  await database.collection('playerReports').createIndex({ targetUserId: 1, createdAt: -1 });
  await database.collection('playerReports').createIndex({ reporterUserId: 1, createdAt: -1 });

  // Bug reports — see server/src/support/routes.ts + models/bugReport.ts.
  await database.collection('bugReports').createIndex({ reporterUserId: 1, createdAt: -1 });
  await database.collection('bugReports').createIndex({ status: 1, createdAt: -1 });
  await database.collection('bugReports').createIndex({ validity: 1, createdAt: -1 });

  // Admin CMS — see server/src/models/{admin,featureFlag,homeBanner,cardLegalityOverride}.ts.
  await database
    .collection('admins')
    .createIndex({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

  await database.collection('featureFlags').createIndex({ key: 1 }, { unique: true });

  await database.collection('homeBanners').createIndex({ active: 1, sortOrder: 1 });

  await database.collection('cardLegalityOverrides').createIndex({ cardNumber: 1 }, { unique: true });
}

/** For graceful shutdown / tests. */
export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
}
