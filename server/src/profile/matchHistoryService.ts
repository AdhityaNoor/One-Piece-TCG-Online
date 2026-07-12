/**
 * Unified, paginated match history — merges matchHistory (every finished
 * GameRoom match; see GameRoom.persistHistory) with rankedMatches (the
 * richer ranked-only record: leader identity, rank deltas, deck snapshot
 * reference) into the single ProfileMatchHistoryEntry read-shape the
 * profile UI consumes (shared/profile.ts).
 *
 * matchHistory is the pagination spine (cursor = endedAt ISO string,
 * descending) because it is the ONLY collection guaranteed to contain every
 * match for a user, ranked or casual — rankedMatches only covers ranked.
 * Each page's matches are then enriched from rankedMatches where a
 * corresponding record exists (matched by roomCode).
 *
 * Simplification (documented, not hidden): matchType/result/resultType
 * filters are applied AFTER enrichment, on the already-fetched page, rather
 * than pushed into the initial Mongo query — matchHistory has no matchType
 * field to filter on directly. At this project's current match volume this
 * is fine; a future migration could denormalize matchType onto
 * matchHistory to make these filters exact at the Mongo-query level and
 * guarantee full pages.
 */
import type { Filter } from 'mongodb';
import { matchHistory, rankedMatches } from '../db/mongo';
import type { MatchHistoryDocument } from '../models/matchHistory';
import { classifyCasualResultType } from './resultClassification';
import type {
  ProfileMatchHistoryEntry,
  ProfileMatchHistoryPage,
  ProfileMatchResultType,
  ProfileMatchType,
} from '../../../shared/profile';

export interface MatchHistoryFilters {
  matchType?: ProfileMatchType;
  result?: 'win' | 'loss' | 'draw';
  resultType?: ProfileMatchResultType;
  opponentUsername?: string;
  season?: string;
  startDate?: string;
  endDate?: string;
}

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

export class MatchHistoryService {
  async getPage(userId: string, cursor: string | null, limit: number, filters: MatchHistoryFilters = {}): Promise<ProfileMatchHistoryPage> {
    const pageSize = Math.max(1, Math.min(PAGE_SIZE_MAX, limit || PAGE_SIZE_DEFAULT));

    const query: Filter<MatchHistoryDocument> = { 'seats.userId': userId };
    if (cursor) query.endedAt = { $lt: new Date(cursor) };
    if (filters.startDate) query.endedAt = { ...(query.endedAt as object), $gte: new Date(filters.startDate) };
    if (filters.endDate) query.endedAt = { ...(query.endedAt as object), $lte: new Date(filters.endDate) };
    if (filters.opponentUsername) query['seats.username'] = { $regex: escapeRegExp(filters.opponentUsername), $options: 'i' };

    // Over-fetch slightly so post-enrichment filtering still tends to fill a
    // full page in the common case, without unbounded scanning.
    const docs = await matchHistory()
      .find(query)
      .sort({ endedAt: -1 })
      .limit(pageSize * 3)
      .toArray();

    const roomCodes = docs.map((d) => d.roomCode);
    const rankedDocs = roomCodes.length
      ? await rankedMatches()
          .find({ roomCode: { $in: roomCodes }, 'participants.playerId': userId, status: { $in: ['finalized', 'invalidated'] } })
          .toArray()
      : [];
    const rankedByRoomCode = new Map(rankedDocs.map((doc) => [doc.roomCode, doc]));

    let entries: ProfileMatchHistoryEntry[] = docs.map((doc) => {
      const ranked = doc.roomCode ? rankedByRoomCode.get(doc.roomCode) : undefined;
      if (ranked) {
        const self = ranked.participants.find((p) => p.playerId === userId);
        const opponent = ranked.participants.find((p) => p.playerId !== userId);
        return {
          matchId: String(ranked._id ?? doc._id ?? doc.roomCode),
          matchType: 'ranked',
          result: self?.update?.result === 'win' ? 'win' : self?.update?.result === 'loss' ? 'loss' : self?.update?.result === 'draw' ? 'draw' : 'unknown',
          resultType: (self?.update?.resultType ?? 'normal') as ProfileMatchResultType,
          opponentName: opponent?.displayName ?? doc.seats.find((s) => s.userId !== userId)?.username ?? null,
          opponentUserId: opponent?.playerId ?? doc.seats.find((s) => s.userId !== userId)?.userId ?? null,
          playerLeaderName: self?.leaderName ?? null,
          opponentLeaderName: opponent?.leaderName ?? null,
          startedAt: doc.startedAt.toISOString(),
          endedAt: doc.endedAt.toISOString(),
          durationSeconds: Math.max(0, Math.round((doc.endedAt.getTime() - doc.startedAt.getTime()) / 1000)),
          season: ranked.seasonId,
          rankBefore: self?.update?.rankBefore ?? null,
          rankAfter: self?.update?.rankAfter ?? null,
          rankedPointDelta: self?.update?.rankedPointDelta ?? null,
          promoted: self?.update?.promoted ?? false,
          demoted: self?.update?.demoted ?? false,
          deckSnapshotDeckId: self?.deckSnapshot?.deckId ?? null,
        } satisfies ProfileMatchHistoryEntry;
      }

      const won = doc.winnerUserId === userId;
      const lost = doc.winnerUserId !== null && doc.winnerUserId !== userId;
      return {
        matchId: String(doc._id ?? doc.roomCode),
        matchType: 'casual',
        result: doc.winnerUserId === null ? 'draw' : won ? 'win' : lost ? 'loss' : 'unknown',
        resultType: classifyCasualResultType(doc.reason),
        opponentName: doc.seats.find((s) => s.userId !== userId)?.username ?? null,
        opponentUserId: doc.seats.find((s) => s.userId !== userId)?.userId ?? null,
        playerLeaderName: null, // not tracked for casual matches — see module doc
        opponentLeaderName: null,
        startedAt: doc.startedAt.toISOString(),
        endedAt: doc.endedAt.toISOString(),
        durationSeconds: Math.max(0, Math.round((doc.endedAt.getTime() - doc.startedAt.getTime()) / 1000)),
        season: null,
        rankBefore: null,
        rankAfter: null,
        rankedPointDelta: null,
        promoted: false,
        demoted: false,
        deckSnapshotDeckId: null,
      } satisfies ProfileMatchHistoryEntry;
    });

    if (filters.matchType) entries = entries.filter((e) => e.matchType === filters.matchType);
    if (filters.result) entries = entries.filter((e) => e.result === filters.result);
    if (filters.resultType) entries = entries.filter((e) => e.resultType === filters.resultType);
    if (filters.season) entries = entries.filter((e) => e.season === filters.season);

    const page = entries.slice(0, pageSize);
    const nextCursor = page.length === pageSize && page.length > 0 ? page[page.length - 1].endedAt : null;
    return { entries: page, nextCursor };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
