/**
 * Server-side reuse of the frontend's deterministic engine. This file is the
 * ONLY place the backend touches the engine, and it is a thin adapter — it
 * adds no rules of its own. It mirrors, on the server, exactly what
 * matchStore.startMatch()/dispatch() do in the browser, because the engine
 * was explicitly written so "every click will later become a network
 * request" (project ground rule). We import the engine source directly from
 * ../../../src; those modules are pure and JSON-serializable (no browser
 * globals), so they run unchanged under Node.
 *
 * Authority model: the client sends a GameAction intent; the server validates
 * and executes it here. Client-owned game state is never trusted — the only
 * state that matters is the GameState held in the GameRoom's memory.
 */
import { validateAction, executeAction, type GameAction } from '../../../src/engine/actions';
import { createPreGameState } from '../../../src/engine/setup';
import { hashSeed } from '../../../src/engine/rng';
import type { GameState } from '../../../src/engine/state';
import type { CardDefinition } from '../../../src/engine/state/card';
import type { CardDefinitionLookup } from '../../../src/engine/rules/shared';
import { redactStateForSeat } from './redaction';
import type { EffectTemplateRegistry } from '../../../src/engine/effects';
import type { GameLogEntry } from '../../../src/engine/logs/logEntry';
import { buildCuratedEffectRegistry } from '../../../src/cards/effectTemplates';
import { migrateSavedDeck, type SavedDeck } from '../../../src/cards/decks/savedDeck';
import {
  savedDeckToPlayerSetupInput,
  buildCardDefinitionLookup,
} from '../../../src/app/lib/savedDeckToSetupInput';

/** Fixed engine seat ids, identical to the frontend's PLAYER_A_ID/PLAYER_B_ID. */
export const SEAT_P1 = 'p1';
export const SEAT_P2 = 'p2';

export type MatchStartResult =
  | { ok: true; session: GameSession }
  | { ok: false; reasons: string[] };

export type ApplyResult =
  | { ok: true; log: GameLogEntry[] }
  | { ok: false; reasons: string[] };

/**
 * Validate an untrusted deck blob received from a client into a SavedDeck.
 * Uses the SAME migrator the frontend's deckStorage uses, so a deck saved in
 * the browser round-trips over the wire without a second schema definition.
 */
export function parseClientDeck(raw: unknown): SavedDeck | null {
  return migrateSavedDeck(raw);
}

/**
 * Holds one match's authoritative state in memory. Created once both seats
 * are ready with a valid deck. Not serializable itself; only `.state` is
 * (that's what gets broadcast).
 */
export class GameSession {
  private constructor(
    public state: GameState,
    private readonly defs: CardDefinitionLookup,
    private readonly registry: EffectTemplateRegistry,
    public readonly seed: string,
  ) {}

  /**
   * Build a fresh pre-game state from the two seats' decks. `p1Deck` occupies
   * SEAT_P1, `p2Deck` occupies SEAT_P2. The deciding player (who chooses to go
   * first/second, an out-of-band step per rule 5-2-1-4-1) is derived from the
   * seed, mirroring hotseat.
   */
  static start(p1Deck: SavedDeck, p2Deck: SavedDeck): MatchStartResult {
    const p1Input = savedDeckToPlayerSetupInput(p1Deck, SEAT_P1);
    const p2Input = savedDeckToPlayerSetupInput(p2Deck, SEAT_P2);

    const seed = `srv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const decidingPlayerId = hashSeed(seed) % 2 === 0 ? SEAT_P1 : SEAT_P2;

    const result = createPreGameState(p1Input, p2Input, {
      decidingPlayerId,
      rngState: { seed, cursor: 0 },
    });
    if (!result.ok) return { ok: false, reasons: result.reasons };

    const defs = buildCardDefinitionLookup([p1Deck, p2Deck]);
    const registry = buildCuratedEffectRegistry(defs);
    return { ok: true, session: new GameSession(result.state, defs, registry, seed) };
  }

  /**
   * Validate + execute one intent. On success advances `this.state` and
   * returns the log delta; on illegal input leaves state untouched and
   * returns the reasons (which the room relays to the offending client only).
   *
   * `seatId` is the authenticated seat of the sender: we do not currently
   * re-derive per-action ownership here beyond what the engine validators
   * already enforce (turn/priority ownership lives inside the engine). See
   * GameRoom for the seat-binding guard.
   */
  apply(action: GameAction): ApplyResult {
    const validation = validateAction(this.state, action, this.defs, this.registry);
    if (!validation.legal) return { ok: false, reasons: validation.reasons };
    const result = executeAction(this.state, action, this.defs, this.registry);
    this.state = result.state;
    return { ok: true, log: result.log };
  }

  isOver(): boolean {
    return this.state.gameOver !== null;
  }

  winnerId(): string | null {
    return this.state.gameOver?.winnerId ?? null;
  }

  reason(): string {
    return this.state.gameOver?.reason ?? 'unknown';
  }

  /** JSON-serializable snapshot of the FULL state (server-internal use only). */
  serialize(): string {
    return JSON.stringify(this.state);
  }

  /**
   * The view to send to one seat: a redacted GameState plus ONLY the card
   * definitions that seat is entitled to see. Never leaks the opponent's
   * hidden cards or full decklist (see redaction.ts).
   */
  viewForSeat(seatId: string): { json: string; defs: Record<string, CardDefinition> } {
    const { json, definitionIds } = redactStateForSeat(this.state, seatId);
    const defs: Record<string, CardDefinition> = {};
    for (const id of definitionIds) {
      const def = this.defs[id];
      if (def) defs[id] = def;
    }
    return { json, defs };
  }
}
