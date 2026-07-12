import { rankedSeasons } from '../db/mongo';
import { DEFAULT_RANKED_SEASON_CONFIG, type RankedSeasonConfig } from '../../../shared/ranked';
import { RankedServiceError } from './errors';

export class RankedSeasonService {
  async getActiveSeason(): Promise<RankedSeasonConfig> {
    const nowIso = new Date().toISOString();
    const existing = await rankedSeasons().findOne({
      status: 'active',
      startsAt: { $lte: nowIso },
      endsAt: { $gt: nowIso },
    });
    if (existing) return stripMongo(existing);

    if (process.env.RANKED_AUTO_CREATE_SEASON === 'true') {
      const created = {
        ...DEFAULT_RANKED_SEASON_CONFIG,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await rankedSeasons().updateOne({ id: created.id }, { $setOnInsert: created }, { upsert: true });
      const doc = await rankedSeasons().findOne({ id: created.id });
      if (doc) return stripMongo(doc);
    }

    throw new RankedServiceError(503, 'NO_ACTIVE_SEASON', 'No active ranked season is available.');
  }

  async getOrCreateDevelopmentSeason(): Promise<RankedSeasonConfig> {
    const nowIso = new Date().toISOString();
    await rankedSeasons().updateOne(
      { id: DEFAULT_RANKED_SEASON_CONFIG.id },
      {
        $setOnInsert: {
          ...DEFAULT_RANKED_SEASON_CONFIG,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      },
      { upsert: true },
    );
    const doc = await rankedSeasons().findOne({ id: DEFAULT_RANKED_SEASON_CONFIG.id });
    if (!doc) throw new RankedServiceError(500, 'INTERNAL', 'Could not initialize the default ranked season.');
    return stripMongo(doc);
  }
}

function stripMongo(doc: RankedSeasonConfig & { _id?: unknown; createdAt?: string; updatedAt?: string }): RankedSeasonConfig {
  const { _id: _ignored, createdAt: _createdAt, updatedAt: _updatedAt, ...season } = doc;
  return season;
}

