/**
 * Persisted record of a FINISHED match (project rule: "Persist final match
 * result/history when available"). Written once when a GameRoom's match ends;
 * live in-progress state is never stored here — that stays in room memory.
 */
import type { ObjectId } from 'mongodb';

export interface MatchHistoryDocument {
  _id?: ObjectId;
  roomCode: string;
  /** engine seat id -> user id, so history can be queried per player. */
  seats: { seatId: string; userId: string; username: string }[];
  winnerUserId: string | null;
  /** GameOverReason string from the engine (e.g. concede, deck-out, life-loss). */
  reason: string;
  /** Total server-applied intents, a cheap proxy for match length. */
  actionCount: number;
  startedAt: Date;
  endedAt: Date;
}
