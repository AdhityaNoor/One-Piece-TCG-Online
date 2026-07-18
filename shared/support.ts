/**
 * "Report a Bug" wire contract, shared by the MatchScreen bug-report UI and
 * the backend support surface (server/src/support/routes.ts).
 *
 * Project rule alignment: this is diagnostic data about a match, not GameState
 * itself, so it never touches the engine's validate/execute path (same
 * boundary MatchChatPanel documents for chat — see that file's doc comment).
 * The payload DOES embed a full GameLogEntry[] ("record the battle log
 * verbosely" requirement), which is why `log` imports the real engine type
 * instead of `unknown[]` — a report is only useful for debugging if the log
 * shape is exact, and `shared/` already imports engine types elsewhere (see
 * shared/multiplayer.ts's GameAction import; server/tsconfig.json includes
 * ../src so this resolves on both sides).
 */
import type { GameLogEntry } from '../src/engine/logs/logEntry';

export type SupportErrorCode = 'VALIDATION' | 'UNAUTHORIZED' | 'INTERNAL';

export interface SupportApiErrorBody {
  error: string;
  code: SupportErrorCode;
  details?: unknown;
}

/**
 * Normalized snapshot of the card the reporter picked from the match's play
 * history. Deliberately NOT a live reference (no re-fetch from the card API,
 * no pointer into GameState) — same "stable local snapshot" rule
 * shared/decks/savedDeck.ts follows: a bug report must still make sense if
 * the card catalog changes or the match/room is long gone by the time
 * someone triages it. `cardText` is stored as raw text for a human triager
 * to read, never as anything executable (project rule: never treat API/
 * definition card text as executable effect logic).
 */
export interface BugReportCardSnapshot {
  cardInstanceId: string;
  cardDefinitionId: string;
  cardNumber: string | null;
  cardName: string | null;
  cardText: string | null;
  /**
   * The specific sub-effect/ability the reporter picked out of `cardText`
   * (e.g. one bracketed [Trigger]/[On Play] segment out of several), when the
   * card had more than one and the reporter narrowed it down. Null when the
   * card has only one segment (nothing to choose between) or the reporter
   * left it as "not specific". Raw text only, same rule as cardText — never
   * treated as executable effect logic.
   */
  selectedEffectText: string | null;
}

/**
 * TODO: 'online' doesn't yet distinguish Casual from Ranked — matchStore
 * only exposes a boolean `onlineMode`, with no ranked/casual signal
 * surfaced to MatchScreen (see rankedStore.ts / onlineStore.ts). Split this
 * into 'online-casual' | 'online-ranked' once that signal exists rather than
 * guessing here.
 */
export type MatchModeTag = 'local-hotseat' | 'vs-cpu' | 'casual-mock' | 'online';

export interface SubmitBugReportRequest {
  /** Free-text description of the issue, required. */
  description: string;
  matchMode: MatchModeTag;
  /** Colyseus roomCode for online matches; null for anything with no server-side room (local hotseat/VS CPU/casual mock). Descriptive only — never looked up server-side. */
  matchId: string | null;
  turnNumber: number;
  phase: string;
  /** The card the reporter selected from the play-history picker, if any — reporting a bug doesn't require pinning it to one card. */
  selectedCard: BugReportCardSnapshot | null;
  /** Full cumulative GameLogEntry[] at the moment of reporting — the "verbose battle log" requirement. */
  log: GameLogEntry[];
  /** __APP_VERSION__ at report time, for triage; null if unavailable (e.g. non-Vite test harness). */
  clientVersion: string | null;
}

export interface SubmitBugReportResponse {
  id: string;
}
