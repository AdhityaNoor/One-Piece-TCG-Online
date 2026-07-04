/**
 * Casual-lobby room model — the seam between the UI and a future
 * authoritative multiplayer server.
 *
 * Everything here is plain, JSON-serializable data (project rule: "Game
 * state, game actions, logs, and pending choices must be JSON-serializable"
 * — the lobby that FEEDS a match holds itself to the same bar so a room can
 * round-trip a websocket/REST boundary unchanged). No engine types leak in:
 * a Room references the host's deck only by a `hostDeckId` string, never a
 * SavedDeck/GameState object, exactly like navigationStore references an
 * in-progress match by deck id.
 *
 * `RoomService` is the ONLY thing the Casual lobby UI talks to. The local
 * mock (mockRoomService.ts) and a later `NetworkRoomService` (hitting the
 * real server) implement the same async interface, so swapping transports
 * never touches a screen or store (project rule: "design local hotseat as if
 * every click will later become a network request" — the lobby's clicks are
 * already async requests against this interface).
 */
import type { Color } from '../../engine/state/card';

/** Just enough of the host's Leader to render a room card (leader art + colors). Cosmetic; never used for rules. */
export interface RoomLeaderPreview {
  /** = CardDefinition.cardNumber of the leader. */
  definitionId: string;
  name: string;
  imageUrl: string | null;
  colors: Color[];
}

export type RoomStatus =
  /** Accepting a challenger. */
  | 'open'
  /** A match has started in this room (a challenger joined). */
  | 'in-progress';

export interface Room {
  roomId: string;
  /** Host's display name (their Settings username, or a mock handle). */
  hostName: string;
  status: RoomStatus;
  leader: RoomLeaderPreview;
  /**
   * Loadable SavedDeck id the host is bringing. The mock points this at a
   * real local deck so a joined match can actually build a GameState; a real
   * server would instead ship the opponent's normalized deck snapshot over
   * the wire (the mock deliberately cheats by reusing local decks).
   */
  hostDeckId: string;
  /** Epoch ms, for "newest first" ordering and staleness. */
  createdAt: number;
}

export interface CreateRoomInput {
  hostName: string;
  deckId: string;
  leader: RoomLeaderPreview;
}

export type JoinRoomResult =
  | { ok: true; room: Room }
  | { ok: false; reason: string };

/**
 * Transport-agnostic lobby API. Async by design even for the local mock, so
 * UI/stores are written against the network shape from day one. A future
 * `NetworkRoomService` implements this same interface over the real server.
 */
export interface RoomService {
  /** Snapshot of currently joinable/visible rooms, newest first. */
  listRooms(): Promise<Room[]>;
  /** Publish a room hosted by the local player. Resolves with the created room. */
  createRoom(input: CreateRoomInput): Promise<Room>;
  /** Attempt to join `roomId`. Fails if it is gone or no longer open. */
  joinRoom(roomId: string): Promise<JoinRoomResult>;
  /** Tear down / leave a room (host cancelling, or challenger backing out). No-op if unknown. */
  leaveRoom(roomId: string): Promise<void>;
}
