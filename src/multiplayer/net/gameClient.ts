/**
 * Colyseus connection wrapper — the realtime sibling of authClient's REST.
 * Keeps the raw colyseus.js Client/Room instances out of React state (they
 * are not serializable) and exposes a small typed surface the online store
 * drives.
 *
 * Auth: every connection passes the JWT in join options; the server's
 * GameRoom.onAuth rejects anything without a valid token, so an
 * unauthenticated client can never occupy a seat.
 *
 * Room list: `listOpenRooms` queries Colyseus matchmaking for real, currently
 * open rooms (this REPLACES the old locally-generated mock lobby). Each room's
 * non-secret metadata (host name, code, seat count) comes from the server's
 * GameRoom.setMetadata.
 */
import { Client, type Room } from '@colyseus/sdk';
import { GAME_ROOM_NAME, type JoinOptions } from '../../../shared/multiplayer';
import { colyseusUrl } from './backendConfig';

/** Display info for one open room in the lobby list. */
export interface OpenRoomInfo {
  roomId: string;
  roomCode: string;
  hostName: string;
  players: number;
  maxPlayers: number;
}

function client(): Client {
  return new Client(colyseusUrl());
}

/** Host a new match room. The server mints the shareable roomCode. */
export async function createRoom(token: string): Promise<Room> {
  const options: JoinOptions = { token };
  return client().create(GAME_ROOM_NAME, options);
}

/** Join a specific room by its Colyseus roomId (from the lobby list). */
export async function joinRoomById(token: string, roomId: string): Promise<Room> {
  const options: JoinOptions = { token };
  return client().joinById(roomId, options);
}

/**
 * Join by the short human code the host shares. Resolves the code to a roomId
 * via matchmaking metadata; falls back to treating the input as a raw roomId.
 */
export async function joinRoomByCode(token: string, roomCode: string): Promise<Room> {
  const c = client();
  const code = roomCode.trim().toUpperCase();
  const available = await c.getAvailableRooms(GAME_ROOM_NAME).catch(() => []);
  const match = available.find((r) => (r.metadata as { roomCode?: string } | undefined)?.roomCode === code);
  const options: JoinOptions = { token, roomCode: code };
  if (match) return c.joinById(match.roomId, options);
  return c.joinById(code, options);
}

/** Real, currently-joinable rooms (phase 'lobby' with a free seat). */
export async function listOpenRooms(): Promise<OpenRoomInfo[]> {
  const rooms = await client().getAvailableRooms(GAME_ROOM_NAME).catch(() => []);
  return rooms
    .map((r) => {
      const meta = (r.metadata ?? {}) as {
        roomCode?: string;
        hostName?: string;
        phase?: string;
        players?: number;
        maxPlayers?: number;
      };
      return {
        roomId: r.roomId,
        roomCode: meta.roomCode ?? r.roomId,
        hostName: meta.hostName ?? 'Host',
        players: meta.players ?? r.clients,
        maxPlayers: meta.maxPlayers ?? r.maxClients,
        phase: meta.phase ?? 'lobby',
      };
    })
    .filter((r) => r.phase === 'lobby' && r.players < r.maxPlayers)
    .map(({ phase: _phase, ...info }) => info);
}
