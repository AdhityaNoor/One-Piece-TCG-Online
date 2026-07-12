import { ObjectId } from 'mongodb';
import { rankedProfiles, users } from '../db/mongo';
import { toPublicUser } from '../auth/userModel';
import {
  createInitialRankedProfile,
  toInternalRankedProfile,
  toPublicRankedProfile,
  type InternalRankedProfile,
  type PublicRankedProfile,
  type RankedProfile,
  type RankedSeasonConfig,
} from '../../../shared/ranked';
import { RankedServiceError } from './errors';

export class RankedProfileService {
  async getOrCreateProfile(playerId: string, season: RankedSeasonConfig): Promise<RankedProfile> {
    const existing = await rankedProfiles().findOne({ playerId, seasonId: season.id });
    if (existing) return stripMongo(existing);

    let displayName = 'Player';
    try {
      const user = await users().findOne({ _id: new ObjectId(playerId) });
      if (user) displayName = toPublicUser(user).username;
    } catch {
      throw new RankedServiceError(404, 'NOT_FOUND', 'Player account was not found.');
    }

    const nowIso = new Date().toISOString();
    const profile = createInitialRankedProfile({ playerId, displayName, seasonId: season.id, nowIso, config: season });
    await rankedProfiles().updateOne({ playerId, seasonId: season.id }, { $setOnInsert: profile }, { upsert: true });
    const doc = await rankedProfiles().findOne({ playerId, seasonId: season.id });
    if (!doc) throw new RankedServiceError(500, 'INTERNAL', 'Could not create ranked profile.');
    return stripMongo(doc);
  }

  async getPublicProfile(playerId: string, season: RankedSeasonConfig): Promise<PublicRankedProfile> {
    return toPublicRankedProfile(await this.getOrCreateProfile(playerId, season), season);
  }

  async getInternalProfile(playerId: string, season: RankedSeasonConfig): Promise<InternalRankedProfile> {
    return toInternalRankedProfile(await this.getOrCreateProfile(playerId, season), season);
  }
}

function stripMongo(doc: RankedProfile & { _id?: unknown }): RankedProfile {
  const { _id: _ignored, ...profile } = doc;
  return profile;
}

