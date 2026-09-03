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

import type { RpsChoice } from './rps';

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
  /** Ranked-only chess-clock time remaining, in ms. -1 when not tracked (Casual/VS-CPU/hotseat). */
  remainingMs: number;
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
  /**
   * This seat's answer to the "Share match data" privacy setting.
   *
   * The setting has always existed client-side, but it only ever gated the VS
   * CPU upload — online matches were recorded by the server regardless, which
   * made the toggle a promise the product did not keep. It travels with the
   * join so the room knows each seat's answer before a match can start.
   *
   * Omitted is treated as `true`, matching the client default, so an older
   * build that does not send it behaves exactly as it does today.
   */
  contributeMatchData?: boolean;
}

// ---- client -> server messages ---------------------------------------------

export const ClientMessage = {
  /** Declare ready and hand the server this seat's self-contained SavedDeck. */
  Ready: 'ready',
  Unready: 'unready',
  /** A single player intent (GameAction). Server validates before applying. */
  Intent: 'intent',
  /**
   * A chat line from this seat. Deliberately NOT a GameAction/intent — chat
   * is table talk, not a rules-affecting player action, so it never touches
   * the engine, GameState, or the action-dispatch/validation pipeline. It
   * still rides the same authoritative room so the server can attribute a
   * message to a real seat and rate-limit it.
   */
  Chat: 'chat',
  /**
   * This seat's Rock-Paper-Scissors pick for the pre-game round that decides
   * WHICH player chooses to go first or second (5-2-1-4). Like Chat, and
   * unlike Intent, it is not a GameAction: it happens before a GameState
   * exists at all.
   */
  RpsPick: 'rps-pick',
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

export interface ChatPayload {
  /** Raw text from the sender. Server trims/clamps before broadcasting. */
  message: string;
}

export interface RpsPickPayload {
  /**
   * Which round this pick is for. The server ignores a pick whose round does
   * not match the one in progress, so a click that raced a draw resolution
   * cannot be silently counted as an answer to the NEXT round.
   */
  round: number;
  choice: RpsChoice;
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
  /** A chat line, echoed to every seat in the room (including the sender). */
  Chat: 'chat',
  /** Pre-game Rock-Paper-Scissors progress; see RpsUpdatePayload. */
  Rps: 'rps',
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

/**
 * State of the pre-game RPS, broadcast to both seats on every change.
 *
 * The split between `lockedSeatIds` and `resolved` is a rule, not a
 * convenience: while a round is in progress the server sends only WHO has
 * locked in, never WHAT they picked. Sending the first pick early would let
 * the slower player read it off the wire and win every toss they wanted to.
 * Choices appear only in `resolved`, once neither seat can still act on them.
 */
export interface RpsUpdatePayload {
  /** 1-based. Increments on every draw. */
  round: number;
  /** Seats that have locked a pick for THIS round. Choices withheld — see above. */
  lockedSeatIds: string[];
  /** Present only once both seats have picked and the round is decided. */
  resolved?: {
    /** Both seats' picks, keyed by seat id, revealed together. */
    picks: Record<string, RpsChoice>;
    /**
     * The seat that won the right to choose going first or second. `null` is a
     * DRAW, not an error: another round follows and a fresh update with the
     * next `round` arrives immediately after this one.
     */
    winnerSeatId: string | null;
  };
}

export interface ChatBroadcastPayload {
  /** Engine player id: 'p1' | 'p2' — matches SeatView.seatId / GameState player ids. */
  seatId: string;
  username: string;
  message: string;
  /** Server epoch ms, so clients can order/label consistently. */
  sentAt: number;
}
