/**
 * Rock-Paper-Scissors: the out-of-band step that decides WHICH PLAYER gets to
 * choose going first or second (Comprehensive Rules 5-2-1-4).
 *
 * Lives in shared/ because both sides need the identical implementation: the
 * Colyseus server resolves real multiplayer rounds authoritatively, and the
 * client resolves VS-AI rounds locally. Two copies of "does rock beat paper"
 * is exactly the kind of divergence that produces a game whose result differs
 * depending on who computed it.
 *
 * Deliberately NOT in /src/engine. Rule 5-2-1-4-1 puts this decision outside
 * the game ("no intervention of any kind is allowed"), and the engine models
 * only its OUTPUT — `setupState.decidingPlayerId`, handed to createPreGameState.
 * Nothing here touches GameState, produces a log entry, or is a GameAction.
 */

export type RpsChoice = 'rock' | 'paper' | 'scissors';

/**
 * How long a decided round is held on screen before whatever comes next —
 * another round after a draw, or the match itself after a win.
 *
 * Shared because it is the ONE place both sides can agree on it. The local
 * VS-AI driver waits this long before reporting a winner; the server waits the
 * same before broadcasting the next round or starting the match. Server-side
 * that is not cosmetic: without the pause the resolved broadcast is replaced
 * in the same tick, so the reveal a player is owed never renders at all.
 */
export const RPS_REVEAL_MS = 1100;

/** Every choice, in display order. */
export const RPS_CHOICES: readonly RpsChoice[] = ['rock', 'paper', 'scissors'] as const;

/**
 * What each choice defeats. One table is the whole rule set — `beats` and
 * `resolveRpsRound` both read from it, so the cycle can never disagree with
 * itself the way three separate if-branches can.
 */
const DEFEATS: Record<RpsChoice, RpsChoice> = {
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock',
};

/**
 * Display label, shared by every surface that renders a choice. Only the name
 * lives here — the icons are hands, drawn as SVG in RpsToss.tsx, because a
 * glyph is a rendering concern and this module is meant to stay usable from
 * the server, where there is nothing to draw on.
 */
export const RPS_PRESENTATION: Record<RpsChoice, { label: string }> = {
  rock: { label: 'Rock' },
  paper: { label: 'Paper' },
  scissors: { label: 'Scissors' },
};

export function isRpsChoice(value: unknown): value is RpsChoice {
  return typeof value === 'string' && (RPS_CHOICES as readonly string[]).includes(value);
}

/** True when `a` defeats `b`. Equal choices are a draw, not a win. */
export function beats(a: RpsChoice, b: RpsChoice): boolean {
  return DEFEATS[a] === b;
}

/**
 * Result of one round between two identified sides.
 *
 * `winnerId` is null for a draw — the caller plays another round. It is NOT an
 * error case and needs no special handling beyond re-prompting.
 */
export interface RpsRoundResult<Id extends string = string> {
  winnerId: Id | null;
  loserId: Id | null;
  draw: boolean;
}

/**
 * Resolve one round. Takes ids alongside choices so callers never have to
 * remember which positional argument was "us" — the mistake that turns a
 * win into a loss on one side of the wire only.
 */
export function resolveRpsRound<Id extends string>(
  a: { id: Id; choice: RpsChoice },
  b: { id: Id; choice: RpsChoice },
): RpsRoundResult<Id> {
  if (a.choice === b.choice) return { winnerId: null, loserId: null, draw: true };
  const aWins = beats(a.choice, b.choice);
  return {
    winnerId: aWins ? a.id : b.id,
    loserId: aWins ? b.id : a.id,
    draw: false,
  };
}

/**
 * A uniformly random choice, for the CPU opponent.
 *
 * Takes its randomness as an injected `random` so tests can pin it. Nothing
 * here uses the engine's seeded RNG on purpose: that stream is the game's
 * reproducible randomness (shuffles, coin-flip effects) and this happens
 * before the game exists.
 */
export function randomRpsChoice(random: () => number = Math.random): RpsChoice {
  const index = Math.min(RPS_CHOICES.length - 1, Math.floor(random() * RPS_CHOICES.length));
  return RPS_CHOICES[index];
}

// ---- toss bookkeeping -------------------------------------------------------

/**
 * A toss is a sequence of rounds between two fixed sides, replayed until one
 * of them wins. This is the state machine both callers share: the Colyseus
 * GameRoom drives it for real multiplayer, and the client drives it for VS-AI,
 * so "a draw plays another round" and "a pick is final" cannot drift apart
 * between the two.
 *
 * Kept as plain data plus pure functions rather than a class so the server can
 * hold it in a room field and the client in React state without either needing
 * to think about identity or cloning.
 */
export interface RpsTossState {
  /** 1-based; increments on every draw. */
  round: number;
  /** Picks for the CURRENT round only, cleared when a new round opens. */
  picks: Partial<Record<string, RpsChoice>>;
}

export type RpsPickOutcome =
  /** Not counted: wrong round, unknown side, invalid choice, or that side already picked. */
  | { kind: 'ignored'; state: RpsTossState }
  /** Counted; still waiting on the other side. */
  | { kind: 'locked'; state: RpsTossState }
  /** Both sides are in. `winnerId` is null for a draw — call `nextRpsRound`. */
  | { kind: 'resolved'; state: RpsTossState; picks: Record<string, RpsChoice>; winnerId: string | null };

export function createRpsToss(): RpsTossState {
  return { round: 1, picks: {} };
}

/** Open the next round, discarding the previous round's picks. */
export function nextRpsRound(state: RpsTossState): RpsTossState {
  return { round: state.round + 1, picks: {} };
}

/** Which sides have locked a pick this round. */
export function lockedRpsIds(state: RpsTossState, sides: readonly [string, string]): string[] {
  return sides.filter((id) => state.picks[id] !== undefined);
}

/**
 * The ONLY safe thing to publish while a round is unresolved.
 *
 * `RpsTossState` necessarily holds the picks — whoever is running the toss has
 * to remember them — so the thing that must never cross the wire mid-round is
 * the state itself. Rather than trusting each caller to remember that, this
 * builds the redacted view for them: who has locked in, and nothing else. A
 * caller that leaks a choice early now has to reach past this function to do
 * it, instead of merely forgetting to avoid it.
 */
export function rpsPublicView(
  state: RpsTossState,
  sides: readonly [string, string],
): { round: number; lockedIds: string[] } {
  return { round: state.round, lockedIds: lockedRpsIds(state, sides) };
}

/**
 * Record one side's pick.
 *
 * Two properties this enforces, both of which are the difference between a
 * fair toss and a riggable one:
 *  - A pick is FINAL. Re-sending is ignored, so a side cannot keep changing
 *    its answer while it waits to learn something about the other's.
 *  - Choices are reported back only once BOTH are in: the 'resolved' outcome
 *    carries `picks`, the 'locked' one does not. Note that `state` always
 *    holds the picks made so far — it has to — so it is `rpsPublicView` above,
 *    not this outcome, that decides what is safe to publish mid-round.
 */
export function applyRpsPick(
  state: RpsTossState,
  sides: readonly [string, string],
  id: string,
  round: number,
  choice: unknown,
): RpsPickOutcome {
  if (round !== state.round) return { kind: 'ignored', state };
  if (!sides.includes(id)) return { kind: 'ignored', state };
  if (!isRpsChoice(choice)) return { kind: 'ignored', state };
  if (state.picks[id] !== undefined) return { kind: 'ignored', state };

  const next: RpsTossState = { round: state.round, picks: { ...state.picks, [id]: choice } };
  const [a, b] = sides;
  const aChoice = next.picks[a];
  const bChoice = next.picks[b];
  if (aChoice === undefined || bChoice === undefined) return { kind: 'locked', state: next };

  const result = resolveRpsRound({ id: a, choice: aChoice }, { id: b, choice: bChoice });
  return {
    kind: 'resolved',
    state: next,
    picks: { [a]: aChoice, [b]: bChoice },
    winnerId: result.winnerId,
  };
}
