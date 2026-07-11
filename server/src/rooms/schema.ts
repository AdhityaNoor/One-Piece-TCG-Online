/**
 * Colyseus synced room state. Deliberately SMALL and NON-SECRET: seats +
 * lifecycle only. The authoritative GameState is NOT here — it is sent to each
 * client individually and redacted per seat (see rooms/GameRoom.ts +
 * game/redaction.ts), because shared room state is identical for every client
 * and therefore cannot hold per-seat hidden information.
 */
import { Schema, MapSchema, type } from '@colyseus/schema';

export class SeatState extends Schema {
  /** Engine seat id: 'p1' | 'p2'. */
  @type('string') seatId = '';
  @type('string') userId = '';
  @type('string') username = '';
  @type('boolean') connected = false;
  @type('boolean') ready = false;
}

export class GameRoomState extends Schema {
  /** 'lobby' | 'in-game' | 'ended' (RoomPhase). */
  @type('string') phase = 'lobby';
  /** Short shareable code the host relays to the other player. */
  @type('string') roomCode = '';
  /** Winner seat id once ended (empty otherwise). */
  @type('string') winnerId = '';
  /** GameOverReason once ended (empty otherwise). */
  @type('string') endReason = '';
  /** sessionId -> seat. Two entries max. */
  @type({ map: SeatState }) seats = new MapSchema<SeatState>();
}
