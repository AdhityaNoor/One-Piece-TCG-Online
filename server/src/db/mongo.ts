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
import type {
  RankedAuditEventDocument,
  RankedLeaderboardSnapshotDocument,
  RankedMatchDocument,
  RankedPenaltyDocument,
  RankedProfileDocument,
  RankedQueueEntryDocument,
  RankedSeasonDocument,
} from '../models/ranked';

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

async function ensureIndexes(database: Db): Promise<void> {
  // Case-insensitive unique email so signup can't create duplicates by case.
  await database
    .collection('users')
    .createIndex({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

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
}

/** For graceful shutdown / tests. */
export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
}
