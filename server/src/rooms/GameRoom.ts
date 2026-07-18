/**
 * Authoritative 1v1 GameRoom.
 *
 * Responsibilities (project rules):
 *  - Reject unauthenticated connections: onAuth verifies the JWT before a
 *    seat is granted.
 *  - Keep state authoritative on the server: the engine GameState lives here
 *    in memory (never in Mongo). Clients send intents only; we validate and
 *    execute via the reused engine (game/matchEngine.ts) and send back the new
 *    state — REDACTED per seat so a client never receives the opponent's
 *    hidden cards or secret log lines (game/redaction.ts).
 *  - Do not trust client-owned game state: the client's SavedDeck is
 *    re-validated with the shared migrator; intents are re-validated by the
 *    engine every time; seat ownership is enforced on each intent.
 *  - Ready flow: both seats send `ready` with their deck; when both are ready
 *    the match starts.
 *  - Reconnect: a dropped client has a short window to rejoin its seat, and is
 *    resent its current per-seat state on return.
 *  - Room list: exposes non-secret metadata (roomCode, host, phase, seat
 *    count) so the lobby can list real open rooms.
 *  - Persist final result to Mongo when the match ends.
 */
import { Room, type Client } from '@colyseus/core';
import { ObjectId } from 'mongodb';
import { GameRoomState, SeatState } from './schema';
import { verifyToken } from '../auth/jwt';
import { isSuspended } from '../auth/moderationGate';
import { GameSession, parseClientDeck, SEAT_P1, SEAT_P2 } from '../game/matchEngine';
import { filterLogForSeat } from '../game/redaction';
import { matchHistory, rankedMatches } from '../db/mongo';
import type { JwtClaims } from '../../../shared/auth';
import type { SavedDeck } from '../../../src/cards/decks/savedDeck';
import type { GameAction } from '../../../src/engine/actions';
import type { GameLogEntry } from '../../../src/engine/logs/logEntry';
import { RankedResultService } from '../ranked/resultService';
import { RankedSeasonService } from '../ranked/seasonService';
import type { RankedRoomOptions, RankedRoomParticipant } from '../ranked/roomOptions';
import type { RankedResultType } from '../../../shared/ranked';
import {
  ClientMessage,
  ServerMessage,
  type IntentPayload,
  type ReadyPayload,
  type RejectedPayload,
  type LogPayload,
  type StatePayload,
  type MatchEndedPayload,
  type ChatPayload,
  type ChatBroadcastPayload,
} from '../../../shared/multiplayer';

const RECONNECT_WINDOW_SECONDS = 30;
/** Table-talk chat, not a rules action — kept well clear of the engine (see
 *  shared/multiplayer.ts ClientMessage.Chat doc). Guards are deliberately
 *  minimal: a length clamp and a per-seat send interval, nothing smarter. */
const CHAT_MAX_LENGTH = 240;
const CHAT_MIN_INTERVAL_MS = 300;

interface SeatBinding {
  seatId: string;
  userId: string;
  username: string;
  deck: SavedDeck | null;
}

export class GameRoom extends Room<{ state: GameRoomState }> {
  maxClients = 2;

  private session: GameSession | null = null;
  private bindings = new Map<string, SeatBinding>();
  private startedAt: Date | null = null;
  private actionCount = 0;
  private historyPersisted = false;
  private rankedMatchId: string | null = null;
  private rankedSeasonId: string | null = null;
  private rankedParticipants: RankedRoomParticipant[] = [];
  private lastChatAt = new Map<string, number>();

  onCreate(options: { roomCode?: string } & RankedRoomOptions): void {
    this.seatReservationTimeout = 5;
    this.setState(new GameRoomState());
    this.state.roomCode = options.roomCode?.trim() || shortCode();
    this.rankedMatchId = options.rankedMatchId ?? null;
    this.rankedSeasonId = options.rankedSeasonId ?? null;
    this.rankedParticipants = options.rankedParticipants ?? [];

    this.onMessage(ClientMessage.Ready, (client, payload: ReadyPayload) => this.handleReady(client, payload));
    this.onMessage(ClientMessage.Unready, (client) => this.handleUnready(client));
    this.onMessage(ClientMessage.Intent, (client, payload: IntentPayload) => this.handleIntent(client, payload));
    this.onMessage(ClientMessage.Chat, (client, payload: ChatPayload) => this.handleChat(client, payload));

    this.syncMetadata();
  }

  // Colyseus 0.16+: the return value of onAuth is assigned to client.auth,
  // which onJoin then reads (the old onJoin `auth` 3rd param was removed).
  async onAuth(_client: Client, options: { token?: string }): Promise<JwtClaims> {
    const claims = options.token ? verifyToken(options.token) : null;
    if (!claims) throw new Error('Unauthorized: a valid token is required to join a match.');
    // Same ban-enforcement check as the REST requireAuth middleware (see
    // auth/moderationGate.ts doc comment) — a suspended account's JWT is
    // otherwise still cryptographically valid, so this is what actually
    // keeps them out of matches.
    if (await isSuspended(claims.sub)) {
      throw new Error('Unauthorized: this account has been suspended.');
    }
    if (this.rankedParticipants.length > 0 && !this.rankedParticipants.some((participant) => participant.playerId === claims.sub)) {
      throw new Error('Unauthorized: this ranked match was assigned to different players.');
    }
    return claims;
  }

  onJoin(client: Client): void {
    const auth = client.auth as JwtClaims;
    const rankedParticipant = this.rankedParticipants.find((participant) => participant.playerId === auth.sub) ?? null;
    const seatId = rankedParticipant?.seatId ?? this.nextFreeSeat();
    if (!seatId) throw new Error('Room is full.');
    if (rankedParticipant && Array.from(this.bindings.values()).some((binding) => binding.userId === auth.sub)) {
      throw new Error('This ranked player already occupies a seat.');
    }

    this.bindings.set(client.sessionId, {
      seatId,
      userId: auth.sub,
      username: rankedParticipant?.displayName ?? auth.username,
      deck: rankedParticipant?.deckSnapshot ?? null,
    });

    const seat = new SeatState();
    seat.seatId = seatId;
    seat.userId = auth.sub;
    seat.username = rankedParticipant?.displayName ?? auth.username;
    seat.connected = true;
    seat.ready = Boolean(rankedParticipant);
    this.state.seats.set(client.sessionId, seat);

    // If a match is already running (e.g. a mid-match reconnect into a seat),
    // resend this client its per-seat state immediately.
    if (this.session && this.state.phase === 'in-game') this.sendStateTo(client);

    this.syncMetadata();
    if (rankedParticipant) this.maybeStartMatch();
  }

  private nextFreeSeat(): string | null {
    const taken = new Set(Array.from(this.bindings.values()).map((b) => b.seatId));
    if (!taken.has(SEAT_P1)) return SEAT_P1;
    if (!taken.has(SEAT_P2)) return SEAT_P2;
    return null;
  }

  private handleReady(client: Client, payload: ReadyPayload): void {
    if (this.rankedMatchId) {
      this.reject(client, 'ready', ['Ranked rooms use the immutable deck snapshot captured at queue time.']);
      return;
    }
    if (this.state.phase !== 'lobby') return;
    const binding = this.bindings.get(client.sessionId);
    const seat = this.state.seats.get(client.sessionId);
    if (!binding || !seat) return;

    const deck = parseClientDeck(payload?.deck);
    if (!deck) {
      this.reject(client, 'ready', ['Your deck could not be read. Save the deck again and retry.']);
      return;
    }
    binding.deck = deck;
    seat.ready = true;
    this.maybeStartMatch();
  }

  private handleUnready(client: Client): void {
    if (this.state.phase !== 'lobby') return;
    const binding = this.bindings.get(client.sessionId);
    const seat = this.state.seats.get(client.sessionId);
    if (binding) binding.deck = null;
    if (seat) seat.ready = false;
  }

  private maybeStartMatch(): void {
    const bindings = Array.from(this.bindings.values());
    if (bindings.length < 2 || !bindings.every((b) => b.deck !== null)) return;

    const p1 = bindings.find((b) => b.seatId === SEAT_P1);
    const p2 = bindings.find((b) => b.seatId === SEAT_P2);
    if (!p1?.deck || !p2?.deck) return;

    const started = GameSession.start(p1.deck, p2.deck);
    if (!started.ok) {
      this.broadcast(ServerMessage.Rejected, { of: 'ready', reasons: started.reasons } satisfies RejectedPayload);
      this.state.seats.forEach((s: SeatState) => (s.ready = false));
      bindings.forEach((b) => (b.deck = null));
      return;
    }

    this.session = started.session;
    this.startedAt = new Date();
    this.state.phase = 'in-game';
    if (this.rankedMatchId) {
      void rankedMatches().updateOne(
        { _id: new ObjectId(this.rankedMatchId) },
        { $set: { status: 'in_game', startedAt: this.startedAt?.toISOString() ?? new Date().toISOString(), roomCode: this.state.roomCode } },
      );
    }
    this.syncMetadata();
    this.broadcast(ServerMessage.MatchStarted, {});
    this.broadcastStatePerSeat();
  }

  private handleIntent(client: Client, payload: IntentPayload): void {
    if (this.state.phase !== 'in-game' || !this.session) {
      this.reject(client, 'intent', ['No match is in progress.']);
      return;
    }
    const binding = this.bindings.get(client.sessionId);
    if (!binding) {
      this.reject(client, 'intent', ['You do not hold a seat in this match.']);
      return;
    }
    const action = payload?.action as GameAction | undefined;
    if (!action || typeof action.type !== 'string') {
      this.reject(client, 'intent', ['Malformed intent.']);
      return;
    }

    // Seat-ownership guard: a player may only submit intents for their own seat.
    if ('playerId' in action && typeof (action as { playerId?: unknown }).playerId === 'string') {
      const owner = (action as { playerId: string }).playerId;
      if (owner !== binding.seatId) {
        this.reject(client, 'intent', [`You may only act as ${binding.seatId}.`]);
        return;
      }
    }

    const result = this.session.apply(action);
    if (!result.ok) {
      this.reject(client, 'intent', result.reasons);
      return;
    }

    this.actionCount += 1;
    this.broadcastStatePerSeat();
    this.broadcastLogPerSeat(result.log);

    if (this.session.isOver()) void this.endMatch();
  }

  /**
   * Chat is deliberately NOT gated on `phase === 'in-game'` — a room's two
   * seats may want to talk before both are ready. It IS gated on holding a
   * seat at all (no anonymous broadcast) and is never run through the
   * engine/session (see shared/multiplayer.ts ClientMessage.Chat doc).
   */
  private handleChat(client: Client, payload: ChatPayload): void {
    const binding = this.bindings.get(client.sessionId);
    if (!binding) return;

    const now = Date.now();
    const last = this.lastChatAt.get(client.sessionId) ?? 0;
    if (now - last < CHAT_MIN_INTERVAL_MS) return;

    const message = typeof payload?.message === 'string' ? payload.message.trim().slice(0, CHAT_MAX_LENGTH) : '';
    if (!message) return;

    this.lastChatAt.set(client.sessionId, now);
    this.broadcast(ServerMessage.Chat, {
      seatId: binding.seatId,
      username: binding.username,
      message,
      sentAt: now,
    } satisfies ChatBroadcastPayload);
  }

  /** Send each connected client its own seat-redacted GameState. */
  private broadcastStatePerSeat(): void {
    for (const client of this.clients) this.sendStateTo(client);
  }

  private sendStateTo(client: Client): void {
    if (!this.session) return;
    const binding = this.bindings.get(client.sessionId);
    if (!binding) return;
    const { json, defs, images } = this.session.viewForSeat(binding.seatId);
    client.send(ServerMessage.State, { json, defs, images } satisfies StatePayload);
  }

  /** Send each client only the log lines its seat may see. */
  private broadcastLogPerSeat(log: GameLogEntry[]): void {
    for (const client of this.clients) {
      const binding = this.bindings.get(client.sessionId);
      if (!binding) continue;
      const entries = filterLogForSeat(log, binding.seatId);
      if (entries.length > 0) client.send(ServerMessage.Log, { entries } satisfies LogPayload);
    }
  }

  private async endMatch(): Promise<void> {
    if (!this.session || this.state.phase === 'ended') return;
    this.state.phase = 'ended';
    this.state.winnerId = this.session.winnerId() ?? '';
    this.state.endReason = this.session.reason();
    this.syncMetadata();
    this.broadcast(ServerMessage.MatchEnded, {
      winnerId: this.session.winnerId(),
      reason: this.session.reason(),
    } satisfies MatchEndedPayload);
    await this.persistHistory();
  }

  private async persistHistory(): Promise<void> {
    if (this.historyPersisted || !this.session || !this.startedAt) return;
    this.historyPersisted = true;
    const bindings = Array.from(this.bindings.values());
    const seats = bindings.map((b) => ({ seatId: b.seatId, userId: b.userId, username: b.username }));
    const winnerSeat = this.session.winnerId();
    const winnerUserId = winnerSeat ? bindings.find((b) => b.seatId === winnerSeat)?.userId ?? null : null;
    try {
      await matchHistory().insertOne({
        roomCode: this.state.roomCode,
        seats,
        winnerUserId,
        reason: this.session.reason(),
        actionCount: this.actionCount,
        startedAt: this.startedAt,
        endedAt: new Date(),
      });
      if (this.rankedMatchId && this.rankedSeasonId) {
        const season = await new RankedSeasonService().getActiveSeason();
        await new RankedResultService().finalizeMatch({
          matchId: this.rankedMatchId,
          winnerUserId,
          resultType: rankedResultType(this.session.reason()),
          resultReason: this.session.reason(),
          actionCount: this.actionCount,
          startedAt: this.startedAt,
          endedAt: new Date(),
          season,
        });
      }
    } catch (err) {
      console.error('[GameRoom] failed to persist match history:', err);
    }
  }

  async onDrop(client: Client, _code?: number): Promise<void> {
    const seat = this.state.seats.get(client.sessionId);
    if (seat) seat.connected = false;

    if (this.state.phase !== 'ended') {
      try {
        await this.allowReconnection(client, RECONNECT_WINDOW_SECONDS);
        const rejoined = this.state.seats.get(client.sessionId);
        if (rejoined) rejoined.connected = true;
        if (this.session && this.state.phase === 'in-game') this.sendStateTo(client);
        return;
      } catch {
        // Window elapsed — fall through to permanent removal.
      }
    }

    await this.endMatchByDeparture(client);
    this.removeClient(client);
  }

  async onLeave(client: Client, _code?: number): Promise<void> {
    await this.endMatchByDeparture(client);
    this.removeClient(client);
  }

  private async endMatchByDeparture(client: Client): Promise<boolean> {
    if (this.state.phase !== 'in-game' || !this.session || this.session.isOver()) return false;
    const binding = this.bindings.get(client.sessionId);
    if (!binding) return false;

    const result = this.session.forceConcede(binding.seatId, `server-departure-${client.sessionId}-${Date.now()}`);
    if (!result.ok) {
      console.error('[GameRoom] failed to end match after player departure:', result.reasons);
      return false;
    }

    this.actionCount += 1;
    this.broadcastStatePerSeat();
    this.broadcastLogPerSeat(result.log);
    await this.endMatch();
    return true;
  }

  private removeClient(client: Client): void {
    this.bindings.delete(client.sessionId);
    this.state.seats.delete(client.sessionId);
    this.lastChatAt.delete(client.sessionId);
    this.syncMetadata();
  }

  /** Publish non-secret room info for the lobby's real room list. */
  private syncMetadata(): void {
    const host = Array.from(this.bindings.values()).find((b) => b.seatId === SEAT_P1);
    void this.setMetadata({
      roomCode: this.state.roomCode,
      hostName: host?.username ?? '',
      phase: this.state.phase,
      players: this.bindings.size,
      maxPlayers: this.maxClients,
    });
  }

  private reject(client: Client, of: RejectedPayload['of'], reasons: string[]): void {
    client.send(ServerMessage.Rejected, { of, reasons } satisfies RejectedPayload);
  }
}

/** Short, unambiguous, human-typeable room code (no easily-confused chars). */
function shortCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function rankedResultType(reason: string): RankedResultType {
  if (reason.includes('server-departure')) return 'disconnect';
  if (reason.includes('concede')) return 'concession';
  if (reason.includes('timeout')) return 'timeout';
  return 'normal';
}
