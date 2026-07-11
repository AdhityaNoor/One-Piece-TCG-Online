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

async function ensureIndexes(database: Db): Promise<void> {
  // Case-insensitive unique email so signup can't create duplicates by case.
  await database
    .collection('users')
    .createIndex({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
}

/** For graceful shutdown / tests. */
export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
}
