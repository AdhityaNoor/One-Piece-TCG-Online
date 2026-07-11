/**
 * Realtime multiplayer wire contract shared by the frontend Colyseus client
 * and the backend GameRoom. Types only.
 *
 * Design choice: the authoritative engine GameState is NOT re-modelled as a
 * Colyseus @schema tree (that would duplicate the entire engine state shape
 * and rot instantly). Instead the room keeps the engine's own
 * JSON-serializable GameState as a single serialized string in room state
 * (`gameStateJson`). The engine is the one source of truth — the server runs
 * validate/execute, re-serializes, and the client re-parses. This matches
 * the project's ground rule that GameState is JSON-serializable and that the
 * hotseat dispatch was "designed as if every click will later become a
 * network request".
 *
 * `import type` pulls the concrete GameAction shape from the engine so client
 * and server agree on intents at compile time; it erases at build time and
 * adds no runtime coupling.
 */
import type { GameAction } from '../src/engine/actions/action';

/** Colyseus room registered under this name; both sides must agree. */
export const GAME_ROOM_NAME = 'game';

/** Lifecycle of a GameRoom, surfaced to the UI for status display. */
export type RoomPhase = 'lobby' | 'in-game' | 'ended';

/** One occupant of a seat, as mirrored in synced room state (no secrets). */
export interface SeatView {
  seatId: string; // engine player id: 'p1' | 'p2'
  userId: string;
  username: string;
  connected: boolean;
  ready: boolean;
}

/**
 * Options passed on `client.joinOrCreate` / `joinById`. The JWT is verified
 * in the room's onAuth — an unauthenticated connection is rejected before a
 * seat is granted.
 */
export interface JoinOptions {
  token: string;
  /** Short human-shareable code when joining a specific room by id. */
  roomCode?: string;
}

// ---- client -> server messages ---------------------------------------------

export const ClientMessage = {
  /** Declare ready and hand the server this seat's self-contained SavedDeck. */
  Ready: 'ready',
  Unready: 'unready',
  /** A single player intent (GameAction). Server validates before applying. */
  Intent: 'intent',
} as const;

export interface ReadyPayload {
  /** A full SavedDeck JSON snapshot. Typed `unknown` on the wire; the server
   *  re-validates it with migrateSavedDeck before trusting it (never trust a
   *  client-owned deck blindly). */
  deck: unknown;
}

export interface IntentPayload {
  action: GameAction;
}

// ---- server -> client messages ---------------------------------------------

export const ServerMessage = {
  /** Sent to a client whose intent/ready was rejected (validation reasons). */
  Rejected: 'rejected',
  /**
   * The authoritative GameState, REDACTED for THIS client's seat (opponent's
   * hand/deck/face-down life blanked). Delivered per-seat as a message rather
   * than via shared room state, because Colyseus room state is identical for
   * every client and therefore cannot hold per-seat secrets. Sent on match
   * start, after every applied intent, and on (re)join.
   */
  State: 'state',
  /** New log entries since the last message, filtered to what this seat may see. */
  Log: 'log',
  /** The match has started; the first per-seat State message follows. */
  MatchStarted: 'match-started',
  /** The match ended (concede / rules game-over). */
  MatchEnded: 'match-ended',
} as const;

export interface StatePayload {
  /** Serialized, per-seat-redacted engine GameState (JSON). */
  json: string;
  /**
   * Card definitions for ONLY the cards this seat may currently see, keyed by
   * cardDefinitionId. Lets the client render names/art/text for visible cards
   * without ever receiving the opponent's hidden decklist. Opaque here
   * (`CardDefinition` lives in the engine); the client casts it.
   */
  defs: Record<string, unknown>;
  /**
   * Display-only image URLs for the same visible card definitions above,
   * keyed by cardDefinitionId. These come from each player's SavedDeck
   * snapshot, not from executable rules data.
   */
  images?: Record<string, string | null>;
}

export interface RejectedPayload {
  /** Which message was rejected, for the UI to contextualize. */
  of: 'ready' | 'intent';
  reasons: string[];
}

export interface LogPayload {
  /** Opaque engine LogEntry objects, JSON-serializable. Client appends them. */
  entries: unknown[];
}

export interface MatchEndedPayload {
  winnerId: string | null;
  reason: string;
}
