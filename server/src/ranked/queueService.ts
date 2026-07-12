import { matchMaker } from '@colyseus/core';
import { rankedAuditEvents, rankedMatches, rankedQueueEntries } from '../db/mongo';
import { GAME_ROOM_NAME } from '../../../shared/multiplayer';
import {
  currentQueueMmrRange,
  type RankedProfile,
  type RankedQueueStatus,
  type RankedSeasonConfig,
} from '../../../shared/ranked';
import type { SavedDeck } from '../../../src/cards/decks/savedDeck';
import { SEAT_P1, SEAT_P2 } from '../game/matchEngine';
import { RankedServiceError } from './errors';
import type { RankedRoomOptions } from './roomOptions';

interface QueueEntry {
  playerId: string;
  displayName: string;
  seasonId: string;
  region: string;
  hiddenMmr: number;
  queuedAt: string;
  deckSnapshot: SavedDeck;
}

interface MatchAssignment {
  playerId: string;
  seasonId: string;
  matchId: string;
  roomId: string;
  opponentName: string;
  matchedAt: string;
}

const queue = new Map<string, QueueEntry>();
const assignments = new Map<string, MatchAssignment>();
let queueMutex: Promise<void> = Promise.resolve();

export class RankedQueueService {
  async joinQueue(input: {
    profile: RankedProfile;
    season: RankedSeasonConfig;
    deckSnapshot: SavedDeck;
    region?: string;
  }): Promise<RankedQueueStatus> {
    return withQueueLock(async () => {
      const { profile, season, deckSnapshot } = input;
      if (assignments.has(profile.playerId)) return this.status(profile.playerId, season);
      if (queue.has(profile.playerId)) throw new RankedServiceError(409, 'QUEUE_CONFLICT', 'Player is already in ranked queue.');

      const entry: QueueEntry = {
        playerId: profile.playerId,
        displayName: profile.displayName,
        seasonId: season.id,
        region: input.region ?? 'global',
        hiddenMmr: profile.hiddenMmr,
        queuedAt: new Date().toISOString(),
        deckSnapshot,
      };

      const candidate = findCandidate(entry, season);
      if (candidate) {
        queue.delete(candidate.playerId);
        return this.assignMatch(candidate, entry, season);
      }

      queue.set(entry.playerId, entry);
      await rankedQueueEntries().insertOne({
        playerId: entry.playerId,
        seasonId: entry.seasonId,
        region: entry.region,
        hiddenMmr: entry.hiddenMmr,
        status: 'queued',
        queuedAt: entry.queuedAt,
      });
      await rankedAuditEvents().insertOne({
        type: 'queue_join',
        playerId: entry.playerId,
        seasonId: entry.seasonId,
        at: entry.queuedAt,
        payload: { region: entry.region, hiddenMmr: entry.hiddenMmr },
      });
      return queuedStatus(entry, season);
    });
  }

  async leaveQueue(playerId: string, season: RankedSeasonConfig): Promise<RankedQueueStatus> {
    return withQueueLock(async () => {
      const existing = queue.get(playerId);
      if (existing) {
        queue.delete(playerId);
        await rankedQueueEntries().updateMany(
          { playerId, seasonId: season.id, status: 'queued' },
          { $set: { status: 'cancelled' } },
        );
        await rankedAuditEvents().insertOne({
          type: 'queue_leave',
          playerId,
          seasonId: season.id,
          at: new Date().toISOString(),
          payload: {},
        });
      }
      return this.status(playerId, season);
    });
  }

  status(playerId: string, season: RankedSeasonConfig): RankedQueueStatus {
    const assigned = assignments.get(playerId);
    if (assigned) {
      return {
        state: 'matched',
        seasonId: assigned.seasonId,
        queuedAt: null,
        estimatedMessage: 'Match found. Enter the room to begin.',
        roomId: assigned.roomId,
        matchId: assigned.matchId,
        opponentName: assigned.opponentName,
      };
    }
    const entry = queue.get(playerId);
    if (!entry) {
      return { state: 'idle', seasonId: season.id, queuedAt: null, estimatedMessage: 'Not currently in ranked queue.' };
    }
    return queuedStatus(entry, season);
  }

  clearAssignment(playerId: string): void {
    assignments.delete(playerId);
  }

  private async assignMatch(a: QueueEntry, b: QueueEntry, season: RankedSeasonConfig): Promise<RankedQueueStatus> {
    if (a.playerId === b.playerId) throw new RankedServiceError(409, 'QUEUE_CONFLICT', 'A player cannot match against themselves.');
    const nowIso = new Date().toISOString();
    const inserted = await rankedMatches().insertOne({
      seasonId: season.id,
      roomId: null,
      roomCode: null,
      status: 'assigned',
      participants: [
        participant(a, SEAT_P1),
        participant(b, SEAT_P2),
      ],
      winnerUserId: null,
      loserUserId: null,
      resultType: null,
      resultReason: null,
      actionCount: 0,
      serverVersion: process.env.K_REVISION ?? process.env.npm_package_version ?? 'local',
      gameEngineVersion: process.env.npm_package_version ?? '0.1.0',
      rulesetVersion: season.formatId,
      createdAt: nowIso,
      assignedAt: nowIso,
      startedAt: null,
      endedAt: null,
      finalizedAt: null,
    });
    const matchId = inserted.insertedId.toHexString();
    const roomOptions: RankedRoomOptions = {
      rankedMatchId: matchId,
      rankedSeasonId: season.id,
      rankedParticipants: [
        { playerId: a.playerId, displayName: a.displayName, seatId: SEAT_P1, deckSnapshot: a.deckSnapshot },
        { playerId: b.playerId, displayName: b.displayName, seatId: SEAT_P2, deckSnapshot: b.deckSnapshot },
      ],
    };
    const room = await matchMaker.createRoom(GAME_ROOM_NAME, roomOptions);
    await rankedMatches().updateOne(
      { _id: inserted.insertedId },
      { $set: { roomId: room.roomId, roomCode: (room.metadata as { roomCode?: string } | undefined)?.roomCode ?? null } },
    );
    const assignmentA = {
      playerId: a.playerId,
      seasonId: season.id,
      matchId,
      roomId: room.roomId,
      opponentName: b.displayName,
      matchedAt: nowIso,
    };
    const assignmentB = {
      playerId: b.playerId,
      seasonId: season.id,
      matchId,
      roomId: room.roomId,
      opponentName: a.displayName,
      matchedAt: nowIso,
    };
    assignments.set(a.playerId, assignmentA);
    assignments.set(b.playerId, assignmentB);
    await rankedQueueEntries().updateMany(
      { playerId: { $in: [a.playerId, b.playerId] }, seasonId: season.id, status: 'queued' },
      { $set: { status: 'matched', matchedAt: nowIso, matchId, roomId: room.roomId } },
    );
    await rankedAuditEvents().insertOne({
      type: 'match_assigned',
      matchId,
      seasonId: season.id,
      at: nowIso,
      payload: { playerIds: [a.playerId, b.playerId], roomId: room.roomId, mmrGap: Math.abs(a.hiddenMmr - b.hiddenMmr) },
    });
    return {
      state: 'matched',
      seasonId: season.id,
      queuedAt: null,
      estimatedMessage: 'Match found. Enter the room to begin.',
      roomId: room.roomId,
      matchId,
      opponentName: b.displayName,
    };
  }
}

function findCandidate(entry: QueueEntry, season: RankedSeasonConfig): QueueEntry | null {
  const now = Date.now();
  const candidates = Array.from(queue.values())
    .filter((candidate) => candidate.seasonId === entry.seasonId && candidate.playerId !== entry.playerId)
    .filter((candidate) => {
      const candidateWait = Math.max(0, Math.floor((now - Date.parse(candidate.queuedAt)) / 1000));
      const entryRange = currentQueueMmrRange(0, season);
      const candidateRange = currentQueueMmrRange(candidateWait, season);
      const range = Math.max(entryRange, candidateRange);
      return Math.abs(candidate.hiddenMmr - entry.hiddenMmr) <= range;
    })
    .sort((a, b) => Math.abs(a.hiddenMmr - entry.hiddenMmr) - Math.abs(b.hiddenMmr - entry.hiddenMmr));
  return candidates[0] ?? null;
}

function queuedStatus(entry: QueueEntry, season: RankedSeasonConfig): RankedQueueStatus {
  const waitSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(entry.queuedAt)) / 1000));
  const range = currentQueueMmrRange(waitSeconds, season);
  return {
    state: 'queued',
    seasonId: entry.seasonId,
    queuedAt: entry.queuedAt,
    estimatedMessage: waitSeconds < 15 ? 'Searching nearby waters.' : `Search widened to about ${range} rating. Still prioritizing fair matches.`,
  };
}

function participant(entry: QueueEntry, seatId: string) {
  return {
    playerId: entry.playerId,
    displayName: entry.displayName,
    seatId,
    deckSnapshot: entry.deckSnapshot,
    leaderCardNumber: entry.deckSnapshot.leader.cardNumber,
    leaderName: entry.deckSnapshot.leader.definition.name,
  };
}

async function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = queueMutex;
  let release!: () => void;
  queueMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

