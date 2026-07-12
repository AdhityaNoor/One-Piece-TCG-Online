import type { ObjectId } from 'mongodb';
import type {
  RankedDivision,
  RankedMatchResult,
  RankedProfile,
  RankedRankId,
  RankedRatingUpdate,
  RankedResultType,
  RankedSeasonConfig,
  RankedSeasonStatus,
} from '../../../shared/ranked';
import type { SavedDeck } from '../../../src/cards/decks/savedDeck';

export interface RankedProfileDocument extends RankedProfile {
  _id?: ObjectId;
}

export interface RankedSeasonDocument extends RankedSeasonConfig {
  _id?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export interface RankedMatchParticipantDocument {
  playerId: string;
  displayName: string;
  seatId: string;
  deckSnapshot: SavedDeck;
  leaderCardNumber: string;
  leaderName: string;
  ratingBefore?: {
    hiddenMmr: number;
    uncertainty: number;
    rank: RankedRankId;
    division: RankedDivision | null;
    rankedPoints: number;
  };
  ratingAfter?: {
    hiddenMmr: number;
    uncertainty: number;
    rank: RankedRankId;
    division: RankedDivision | null;
    rankedPoints: number;
  };
  update?: RankedRatingUpdate;
}

export interface RankedMatchDocument {
  _id?: ObjectId;
  seasonId: string;
  roomId: string | null;
  roomCode: string | null;
  status: 'assigned' | 'in_game' | 'finalized' | 'invalidated';
  participants: RankedMatchParticipantDocument[];
  winnerUserId: string | null;
  loserUserId: string | null;
  resultType: RankedResultType | null;
  resultReason: string | null;
  actionCount: number;
  serverVersion: string;
  gameEngineVersion: string;
  rulesetVersion: string;
  createdAt: string;
  assignedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  finalizedAt: string | null;
}

export interface RankedQueueEntryDocument {
  _id?: ObjectId;
  playerId: string;
  seasonId: string;
  region: string;
  hiddenMmr: number;
  status: 'queued' | 'matched' | 'cancelled' | 'expired';
  queuedAt: string;
  matchedAt?: string;
  matchId?: string;
  roomId?: string;
}

export interface RankedPenaltyDocument {
  _id?: ObjectId;
  playerId: string;
  seasonId: string;
  reason: 'abandonment' | 'queue_spam' | 'moderation';
  severity: number;
  startsAt: string;
  expiresAt: string;
  evidence: Record<string, unknown>;
}

export interface RankedAuditEventDocument {
  _id?: ObjectId;
  playerId?: string;
  seasonId?: string;
  matchId?: string;
  type:
    | 'queue_join'
    | 'queue_leave'
    | 'match_assigned'
    | 'result_finalized'
    | 'duplicate_result'
    | 'invalid_deck'
    | 'penalty_applied'
    | 'security_flag';
  at: string;
  payload: Record<string, unknown>;
}

export interface RankedLeaderboardSnapshotDocument {
  _id?: ObjectId;
  seasonId: string;
  status: RankedSeasonStatus;
  createdAt: string;
  entries: Array<{
    position: number;
    playerId: string;
    displayName: string;
    rank: RankedRankId;
    division: RankedDivision | null;
    rankedPoints: number;
    wins: number;
    losses: number;
    hiddenMmr: number;
  }>;
}

