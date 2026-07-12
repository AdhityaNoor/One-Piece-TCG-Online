import { ObjectId } from 'mongodb';
import { rankedAuditEvents, rankedMatches, rankedProfiles } from '../db/mongo';
import type { RankedMatchDocument } from '../models/ranked';
import {
  applyRankedUpdate,
  calculateRankedRatingUpdate,
  type RankedMatchResult,
  type RankedProfile,
  type RankedResultType,
  type RankedSeasonConfig,
} from '../../../shared/ranked';

export interface FinalizeRankedMatchInput {
  matchId: string;
  winnerUserId: string | null;
  resultType: RankedResultType;
  resultReason: string;
  actionCount: number;
  startedAt: Date | null;
  endedAt: Date;
  season: RankedSeasonConfig;
}

export class RankedResultService {
  async finalizeMatch(input: FinalizeRankedMatchInput): Promise<void> {
    const match = await rankedMatches().findOne({ _id: new ObjectId(input.matchId) });
    if (!match) return;
    if (match.status === 'finalized' || match.status === 'invalidated') {
      await rankedAuditEvents().insertOne({
        type: 'duplicate_result',
        matchId: input.matchId,
        seasonId: match.seasonId,
        at: new Date().toISOString(),
        payload: { winnerUserId: input.winnerUserId, resultReason: input.resultReason },
      });
      return;
    }
    if (match.participants.length !== 2) return;

    const [a, b] = match.participants;
    const profileA = await rankedProfiles().findOne({ playerId: a.playerId, seasonId: match.seasonId });
    const profileB = await rankedProfiles().findOne({ playerId: b.playerId, seasonId: match.seasonId });
    if (!profileA || !profileB) return;

    const nowIso = input.endedAt.toISOString();
    const resultA = resultFor(a.playerId, input.winnerUserId, input.resultType);
    const resultB = resultFor(b.playerId, input.winnerUserId, input.resultType);
    const updateA = calculateRankedRatingUpdate({
      player: stripMongo(profileA),
      opponent: stripMongo(profileB),
      result: resultA,
      resultType: input.resultType,
      config: input.season,
      nowIso,
    });
    const updateB = calculateRankedRatingUpdate({
      player: stripMongo(profileB),
      opponent: stripMongo(profileA),
      result: resultB,
      resultType: input.resultType,
      config: input.season,
      nowIso,
    });
    const nextA = applyRankedUpdate(stripMongo(profileA), updateA, nowIso, input.season);
    const nextB = applyRankedUpdate(stripMongo(profileB), updateB, nowIso, input.season);

    await rankedProfiles().updateOne({ playerId: a.playerId, seasonId: match.seasonId }, { $set: nextA });
    await rankedProfiles().updateOne({ playerId: b.playerId, seasonId: match.seasonId }, { $set: nextB });

    const participants = match.participants.map((participant) => {
      const before = participant.playerId === a.playerId ? profileA : profileB;
      const after = participant.playerId === a.playerId ? nextA : nextB;
      const update = participant.playerId === a.playerId ? updateA : updateB;
      return {
        ...participant,
        ratingBefore: snapshot(before),
        ratingAfter: snapshot(after),
        update,
      };
    });

    await rankedMatches().updateOne(
      { _id: match._id, status: { $ne: 'finalized' } },
      {
        $set: {
          status: input.resultType === 'server_failure' ? 'invalidated' : 'finalized',
          participants,
          winnerUserId: input.winnerUserId,
          loserUserId: input.winnerUserId ? match.participants.find((p) => p.playerId !== input.winnerUserId)?.playerId ?? null : null,
          resultType: input.resultType,
          resultReason: input.resultReason,
          actionCount: input.actionCount,
          startedAt: input.startedAt?.toISOString() ?? match.startedAt,
          endedAt: input.endedAt.toISOString(),
          finalizedAt: nowIso,
        },
      },
    );

    await rankedAuditEvents().insertOne({
      type: 'result_finalized',
      matchId: input.matchId,
      seasonId: match.seasonId,
      at: nowIso,
      payload: { winnerUserId: input.winnerUserId, resultType: input.resultType, updates: [updateA, updateB] },
    });
  }
}

function resultFor(playerId: string, winnerUserId: string | null, resultType: RankedResultType): RankedMatchResult {
  if (resultType === 'server_failure' || resultType === 'admin') return 'invalidated';
  if (!winnerUserId) return 'draw';
  return winnerUserId === playerId ? 'win' : 'loss';
}

function snapshot(profile: RankedProfile) {
  return {
    hiddenMmr: profile.hiddenMmr,
    uncertainty: profile.uncertainty,
    rank: profile.rank,
    division: profile.division,
    rankedPoints: profile.rankedPoints,
  };
}

function stripMongo(profile: RankedProfile & { _id?: unknown }): RankedProfile {
  const { _id: _ignored, ...rest } = profile;
  return rest;
}
