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
import { Room, type Client, type Delayed } from '@colyseus/core';
import { ObjectId } from 'mongodb';
import { GameRoomState, SeatState } from './schema';
import { verifyToken } from '../auth/jwt';
import { isSuspended } from '../auth/moderationGate';
import { GameSession, parseClientDeck, SEAT_P1, SEAT_P2 } from '../game/matchEngine';
import { filterLogForSeat } from '../game/redaction';
import { matchHistory, matchTrajectories, rankedMatches } from '../db/mongo';
import type { JwtClaims } from '../../../shared/auth';
import type { SavedDeck } from '../../../src/cards/decks/savedDeck';
import type { GameAction } from '../../../src/engine/actions';
import type { GameLogEntry } from '../../../src/engine/logs/logEntry';
import { RankedResultService } from '../ranked/resultService';
import { ProgressionService, outcomesForMatch } from '../profile/progressionService';
import { RankedSeasonService } from '../ranked/seasonService';
import { RankedQueueService } from '../ranked/queueService';
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
  type RpsPickPayload,
  type RpsUpdatePayload,
  type JoinOptions,
} from '../../../shared/multiplayer';
import { shouldRecordMatch } from '../../../shared/matchRecordingConsent';
import {
  applyRpsPick,
  createRpsToss,
  nextRpsRound,
  rpsPublicView,
  RPS_REVEAL_MS,
  type RpsTossState,
} from '../../../shared/rps';

/** The two seats a toss is played between, in the order applyRpsPick expects. */
const RPS_SIDES: readonly [string, string] = [SEAT_P1, SEAT_P2];

const RECONNECT_WINDOW_SECONDS = 30;
/** Ranked-only per-seat chess clock: 20 minutes, ticking only on that seat's own turn. */
const RANKED_CLOCK_MS = 20 * 60 * 1000;
const CLOCK_TICK_MS = 1000;
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
  /**
   * This seat's answer to the "Share match data" setting, from its join
   * options. See the joint-consent rule in startMatchWith().
   */
  contributeMatchData: boolean;
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
  /**
   * Pre-game Rock-Paper-Scissors, live between "both seats ready" and "match
   * started". Null at every other time. Its presence is what stops a seat
   * un-readying out from under a round in progress (see handleUnready).
   */
  private rps: RpsTossState | null = null;
  /**
   * The pause between broadcasting a decided round and acting on it. Held so
   * it can be cancelled: if a seat leaves during the reveal, the match must
   * not start (or a new round open) for a room that no longer has two players.
   */
  private rpsRevealTimer: Delayed | null = null;
  /** Ranked-only chess-clock driver (see startRankedClock/tickRankedClock). Null in Casual/VS-CPU rooms. */
  private clockTimer: Delayed | null = null;
  private clockLastTickAt = 0;

  onCreate(options: { roomCode?: string } & RankedRoomOptions): void {
    this.seatReservationTimeout = 5;
    this.setState(new GameRoomState());
    this.state.roomCode = options.roomCode?.trim() || shortCode();
    this.rankedMatchId = options.rankedMatchId ?? null;
    this.rankedSeasonId = options.rankedSeasonId ?? null;
    this.rankedParticipants = options.rankedParticipants ?? [];
    this.state.isRanked = this.rankedMatchId !== null;
    // Ranked rooms are pre-assigned to exactly two matched players (enforced in
    // onAuth below) — they must never show up in the Casual lobby's open-room
    // list, or a matched player could join their own ranked room directly from
    // the room browser, skipping the queue's "Enter Match" step entirely.
    void this.setPrivate(this.state.isRanked);

    this.onMessage(ClientMessage.Ready, (client, payload: ReadyPayload) => this.handleReady(client, payload));
    this.onMessage(ClientMessage.Unready, (client) => this.handleUnready(client));
    this.onMessage(ClientMessage.Intent, (client, payload: IntentPayload) => this.handleIntent(client, payload));
    this.onMessage(ClientMessage.Chat, (client, payload: ChatPayload) => this.handleChat(client, payload));
    this.onMessage(ClientMessage.RpsPick, (client, payload: RpsPickPayload) => this.handleRpsPick(client, payload));

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

  onJoin(client: Client, options?: JoinOptions): void {
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
      // Absent means yes: that is the client's shipped default, and it keeps an
      // older build that does not send the field behaving as it does today.
      contributeMatchData: options?.contributeMatchData !== false,
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
    // Both decks are already committed and the toss is under way; letting one
    // seat withdraw here would either strand the other mid-round or hand them a
    // free re-roll after seeing that their opponent had locked in.
    if (this.rps) return;
    const binding = this.bindings.get(client.sessionId);
    const seat = this.state.seats.get(client.sessionId);
    if (binding) binding.deck = null;
    if (seat) seat.ready = false;
  }

  /**
   * Both decks are in. The match does NOT start here any more — first the two
   * seats play Rock-Paper-Scissors to decide which of them gets the 5-2-1-4
   * going-first choice. startMatchWith() below is the half that actually
   * builds the session, once that toss has a winner.
   */
  private maybeStartMatch(): void {
    const bindings = Array.from(this.bindings.values());
    if (bindings.length < 2 || !bindings.every((b) => b.deck !== null)) return;
    if (this.rps) return; // a toss is already running

    const p1 = bindings.find((b) => b.seatId === SEAT_P1);
    const p2 = bindings.find((b) => b.seatId === SEAT_P2);
    if (!p1?.deck || !p2?.deck) return;

    this.beginRpsRound(createRpsToss());
  }

  /** Open a fresh round and tell both seats. Round 1 opens the toss; later rounds follow a draw. */
  private beginRpsRound(state: RpsTossState): void {
    this.rps = state;
    this.broadcastRps();
  }

  /**
   * Publish the current round. Everything except `resolved` comes from
   * rpsPublicView, which is the redacted projection — it carries who has
   * locked in and never what they chose. Choices reach a client only via
   * `resolved`, i.e. only once neither seat can still act on them.
   */
  private broadcastRps(resolved?: RpsUpdatePayload['resolved']): void {
    if (!this.rps) return;
    const view = rpsPublicView(this.rps, RPS_SIDES);
    const payload: RpsUpdatePayload = {
      round: view.round,
      lockedSeatIds: view.lockedIds,
      ...(resolved ? { resolved } : {}),
    };
    this.broadcast(ServerMessage.Rps, payload);
  }

  private handleRpsPick(client: Client, payload: RpsPickPayload): void {
    const binding = this.bindings.get(client.sessionId);
    if (!binding || !this.rps) return;

    // applyRpsPick owns every way a pick can fail to count: wrong round (a
    // click that raced a draw), unknown seat, malformed choice, or a seat
    // trying to change an answer it already locked in.
    const outcome = applyRpsPick(this.rps, RPS_SIDES, binding.seatId, payload?.round, payload?.choice);
    if (outcome.kind === 'ignored') return;

    this.rps = outcome.state;
    if (outcome.kind === 'locked') {
      this.broadcastRps();
      return;
    }

    this.broadcastRps({ picks: outcome.picks, winnerSeatId: outcome.winnerId });

    // Both clients need the resolved payload to actually be the current one
    // for as long as the reveal takes to play. Advancing in this same tick
    // would overwrite it before either player saw who threw what — the round
    // would be decided by a panel that flickered.
    const winnerId = outcome.winnerId;
    const resolvedState = outcome.state;
    this.scheduleAfterReveal(() => {
      if (winnerId === null) {
        this.beginRpsRound(nextRpsRound(resolvedState));
        return;
      }
      this.startMatchWith(winnerId);
    });
  }

  /** Run `next` once the reveal has had its time, replacing any pending one. */
  private scheduleAfterReveal(next: () => void): void {
    this.clearRpsRevealTimer();
    this.rpsRevealTimer = this.clock.setTimeout(() => {
      this.rpsRevealTimer = null;
      // A departure during the reveal clears the toss; there is nothing left
      // to advance, and the room has already dropped back to the lobby.
      if (!this.rps) return;
      next();
    }, RPS_REVEAL_MS);
  }

  private clearRpsRevealTimer(): void {
    this.rpsRevealTimer?.clear();
    this.rpsRevealTimer = null;
  }

  private startMatchWith(decidingSeatId: string): void {
    const bindings = Array.from(this.bindings.values());
    const p1 = bindings.find((b) => b.seatId === SEAT_P1);
    const p2 = bindings.find((b) => b.seatId === SEAT_P2);
    if (!p1?.deck || !p2?.deck) return;

    // Joint consent — the rule (and why it is joint) lives in
    // shared/matchRecordingConsent.ts, so the settings copy the player reads
    // and the behaviour the server enforces cannot drift apart.
    const recordMatch = shouldRecordMatch([p1, p2]);
    const started = GameSession.start(p1.deck, p2.deck, decidingSeatId, { record: recordMatch });
    if (!started.ok) {
      this.broadcast(ServerMessage.Rejected, { of: 'ready', reasons: started.reasons } satisfies RejectedPayload);
      this.state.seats.forEach((s: SeatState) => (s.ready = false));
      bindings.forEach((b) => (b.deck = null));
      this.rps = null;
      this.clearRpsRevealTimer();
      return;
    }

    this.rps = null;
    this.clearRpsRevealTimer();
    this.session = started.session;
    this.startedAt = new Date();
    this.state.phase = 'in-game';
    this.startRankedClock();
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

  /**
   * Ranked only. Both seats start with the full 20 minutes; the interval
   * below decrements only whichever seat currently holds `activePlayerId`
   * (i.e. whose TURN it is — not fine-grained action/priority ownership, so
   * e.g. a defending player's Block/Counter Step still counts against the
   * attacking player's clock, matching "resumes only on their respective
   * turn" from the design ask; a priority-level clock is a possible future
   * refinement, not implemented here). Colyseus syncs `SeatState.remainingMs`
   * to both clients automatically on every mutation — no extra message type
   * needed for the live countdown.
   */
  private startRankedClock(): void {
    if (!this.rankedMatchId || !this.session) return;
    for (const seat of this.state.seats.values()) seat.remainingMs = RANKED_CLOCK_MS;
    this.clockLastTickAt = Date.now();
    this.clockTimer?.clear();
    this.clockTimer = this.clock.setInterval(() => this.tickRankedClock(), CLOCK_TICK_MS);
  }

  private stopRankedClock(): void {
    this.clockTimer?.clear();
    this.clockTimer = null;
  }

  private findSeatStateBySeatId(seatId: string): SeatState | null {
    for (const seat of this.state.seats.values()) {
      if (seat.seatId === seatId) return seat;
    }
    return null;
  }

  private tickRankedClock(): void {
    if (!this.rankedMatchId || !this.session || this.state.phase !== 'in-game') return;
    const now = Date.now();
    const elapsed = now - this.clockLastTickAt;
    this.clockLastTickAt = now;

    const activeSeatId = this.session.state.activePlayerId;
    const seatState = this.findSeatStateBySeatId(activeSeatId);
    if (!seatState) return;

    seatState.remainingMs = Math.max(0, seatState.remainingMs - elapsed);
    if (seatState.remainingMs <= 0) void this.handleClockTimeout(activeSeatId);
  }

  private async handleClockTimeout(seatId: string): Promise<void> {
    if (!this.session || this.session.isOver()) return;
    this.stopRankedClock();

    const result = this.session.forceTimeout(seatId, `server-timeout-${seatId}-${Date.now()}`);
    if (!result.ok) {
      console.error('[GameRoom] failed to end match on clock timeout:', result.reasons);
      return;
    }

    this.actionCount += 1;
    this.broadcastStatePerSeat();
    this.broadcastLogPerSeat(result.log);
    await this.endMatch();
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
    this.stopRankedClock();
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
      // Profile XP for everyone who played. Awarded for BOTH ranked and casual
      // (level measures time played, not standing — see shared/progression.ts),
      // and deliberately after the history insert: XP is cosmetic, so a failure
      // here must never cost us the match record.
      try {
        await new ProgressionService().awardMatchXp(
          outcomesForMatch(seats, winnerUserId),
          this.rankedMatchId ? 'ranked' : 'casual',
        );
      } catch (err) {
        console.error('[GameRoom] failed to award match XP:', err);
      }

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

    await this.persistTrajectory(seats, winnerSeat);
  }

  /**
   * Store the recorded action stream for AI training (see src/engine/replay).
   *
   * Separate from persistHistory and deliberately last: the match record and
   * the player's ranked/XP outcomes are the things that MUST land. This is
   * research material, so every failure here is swallowed — a recording is
   * never worth costing someone their result.
   *
   * Unlike a client upload this one is trustworthy by construction: the server
   * produced every action in it. It is still marked unverified until the
   * offline export replays it, because "the server wrote it" does not mean the
   * rules have not changed underneath it since.
   */
  private async persistTrajectory(
    seats: { seatId: string; userId: string; username: string }[],
    winnerSeat: string | null,
  ): Promise<void> {
    if (!this.session) return;
    try {
      const trajectory = this.session.finishRecording();
      if (!trajectory || trajectory.actions.length === 0) return;

      // The engine layer has no notion of accounts, so attribute seats here,
      // where the seat -> user bindings actually live.
      const userIdBySeat = new Map(seats.map((seat) => [seat.seatId, seat.userId]));
      const attributed = {
        ...trajectory,
        seats: trajectory.seats.map((seat) => ({
          ...seat,
          userId: userIdBySeat.get(seat.seatId) ?? null,
        })),
      };

      await matchTrajectories().insertOne({
        roomCode: this.state.roomCode,
        userIds: seats.map((seat) => seat.userId).filter((id): id is string => !!id),
        source: 'online',
        engineBuild: attributed.engineBuild,
        cardDataHash: attributed.cardDataHash,
        leaderCardNumbers: attributed.seats.map((seat) => seat.leaderCardNumber),
        actionCount: attributed.actions.length,
        winnerSeatId: winnerSeat,
        reason: this.session.reason(),
        verified: false,
        trajectory: attributed,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error('[GameRoom] failed to persist match trajectory:', err);
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
    // A departure before the match starts abandons any toss in progress. The
    // remaining seat drops back to the lobby rather than waiting forever on a
    // pick that can no longer arrive; a new opponent starts a fresh round 1.
    if (this.state.phase === 'lobby' && this.rps) {
      this.rps = null;
      this.clearRpsRevealTimer();
      this.state.seats.forEach((s: SeatState) => (s.ready = false));
      this.bindings.forEach((b) => (b.deck = null));
    }
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

  onDispose(): void {
    this.stopRankedClock();
    this.clearRankedAssignments();
  }

  /** Release both players' ranked-queue "matched" assignment once this room is
   *  torn down — covers a normal match end, a forced-concession end, AND the
   *  case where nobody (or only one player) ever actually joined before the
   *  seat-reservation window expired. Without this, RankedQueueService.status()
   *  would keep reporting `state: 'matched'` with this room's (now-dead)
   *  roomId forever — a stale assignment that never expires — so a player's
   *  next visit to the Ranked screen would show "Enter Match" immediately
   *  without ever queueing. clearAssignment() is a plain Map.delete, so this
   *  is safe to call unconditionally on every dispose. */
  private clearRankedAssignments(): void {
    if (this.rankedParticipants.length === 0) return;
    const queueService = new RankedQueueService();
    for (const participant of this.rankedParticipants) {
      queueService.clearAssignment(participant.playerId);
    }
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
