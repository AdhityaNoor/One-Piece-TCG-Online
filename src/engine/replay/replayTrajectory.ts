/**
 * Turns a recorded MatchTrajectory back into the sequence of decisions that
 * produced it — the inverse of recorder.ts, and the thing that actually makes
 * a recording useful.
 *
 * Each step is `(what the acting seat could see, what they did, whether they
 * went on to win)`. That triple is the raw material for every downstream use:
 * fitting evaluator weights, training a policy prior, or just watching a
 * replay back.
 *
 * TWO PROPERTIES THIS FILE EXISTS TO GUARANTEE
 *
 * 1. NO GOD VIEW. Every emitted state is passed through redactStateForSeat for
 *    the seat that acted. Training on full information is the classic fatal
 *    mistake in imperfect-information games: the model learns to condition on
 *    the opponent's hand, scores beautifully in validation, and plays badly in
 *    a real game where that input is a sentinel. The redaction here is the SAME
 *    code path the server uses to send state over the wire, so there is one
 *    visibility rule, not two.
 *
 * 2. NO SILENT DIVERGENCE. Card data and engine rules change between recording
 *    and replay. Every recorded checkpoint is verified; the first mismatch
 *    stops the replay and is reported. A partially-diverged replay yields the
 *    steps up to that point and a reason — never a full, quietly-wrong dataset.
 */
import type { MatchTrajectory } from '../../../shared/replay';
import { MATCH_TRAJECTORY_SCHEMA_VERSION } from '../../../shared/replay';
import type { GameAction } from '../actions/action';
import { executeAction, validateAction } from '../actions';
import type { EffectTemplateRegistry } from '../effects';
import { createPreGameState, type PlayerSetupInput } from '../setup';
import type { CardDefinition } from '../state/card';
import type { CardDefinitionLookup } from '../rules/shared';
import type { GameState } from '../state/game';
import { redactStateForSeat } from '../view/redactState';
import { checksumState } from './stateChecksum';
import { hashCardDataForCardNumbers } from './cardDataHash';

export interface ReplayStep {
  /** Index into trajectory.actions. */
  index: number;
  actingSeatId: string;
  turnNumber: number;
  phase: string;
  /**
   * The state BEFORE the action, serialized and redacted to the acting seat.
   * This is the model's input; it never contains hidden information.
   */
  visibleStateJson: string;
  action: GameAction;
  /** -1 when the recorder did not measure it. */
  legalActionCount: number;
  decisionMs: number | null;
  /**
   * Label for the acting seat: 1 won, 0 lost, 0.5 draw or unfinished.
   * Filled in once the whole trajectory is replayed and the winner is known.
   */
  outcomeForActor: number;
  /**
   * Whatever `ReplayOptions.annotateDecision` returned for this step, verbatim.
   *
   * Exists so the training export can attach things this layer must not know
   * about — the enumerated alternatives, AI feature vectors — without the
   * replay engine growing a dependency on src/ai. Undefined when no annotator
   * was supplied, or when the annotator threw.
   */
  annotation?: unknown;
}

export type ReplayFailureReason =
  | 'schema-version'
  | 'card-data-drift'
  | 'missing-definition'
  | 'setup-failed'
  | 'action-rejected'
  | 'checksum-mismatch';

export interface ReplayResult {
  ok: boolean;
  steps: ReplayStep[];
  finalState: GameState | null;
  /** Set when the replay stopped early. */
  failure?: { reason: ReplayFailureReason; atActionIndex: number | null; detail: string };
}

export interface ReplayOptions {
  /** Definitions for every card number the trajectory names. */
  defs: CardDefinitionLookup;
  registry: EffectTemplateRegistry;
  /** The generic DON!! definition, as handed to createPreGameState. */
  donCardDefinition: CardDefinition;
  /**
   * Skip the cardDataHash comparison. Only for deliberately re-reading old
   * recordings after a known-safe catalog change — never for training data.
   */
  allowCardDataDrift?: boolean;
  /**
   * Recompute how many actions the actor could legally have taken, for
   * recordings that did not measure it live.
   *
   * The live server deliberately does NOT measure this: enumerating legal
   * actions on every intent would cost real players latency to produce a
   * number that is perfectly recomputable here, offline, from the exact same
   * state. Pass the AI's generateLegalActions to fill it in. Left out, those
   * steps keep -1 and trainableSteps() drops them.
   */
  countLegalActions?: (state: GameState, playerId: string) => number;
  /**
   * Attach caller-defined data to each decision, computed from the state the
   * actor faced.
   *
   * The training pipeline needs the actions the actor did NOT take: "they
   * played this card" is only a preference if you know what else was on the
   * table. Enumerating those needs the AI's legal-action generator and its
   * feature extractor, neither of which belongs in the engine — so the caller
   * passes a function instead and this layer stays generic.
   *
   * Throwing is treated as "no annotation" rather than a replay failure: an
   * annotator is an observer, and a bug in one must not be able to invalidate
   * an otherwise perfectly reconstructed match.
   */
  annotateDecision?: (state: GameState, action: GameAction, playerId: string) => unknown;
  /**
   * The SAME repair the live game applied to its card definitions before
   * handing them to the engine (cards/normalization/engineDefinition.ts).
   *
   * Saved decks embed stale snapshots, so the app repairs printed keyword
   * flags and splits compound types on the way in. Replaying against raw
   * catalog rows would therefore be replaying with DIFFERENT cards — a
   * [Rush] that was not there, a type that does not match a gate — and the
   * states quietly diverge. Injected rather than imported so the engine layer
   * keeps no dependency on the cards layer.
   */
  normalizeDefinition?: (definition: CardDefinition) => CardDefinition;
}

function fail(
  steps: ReplayStep[],
  reason: ReplayFailureReason,
  atActionIndex: number | null,
  detail: string,
  finalState: GameState | null = null,
): ReplayResult {
  return { ok: false, steps, finalState, failure: { reason, atActionIndex, detail } };
}

function definitionsFor(
  trajectory: MatchTrajectory,
  defs: CardDefinitionLookup,
  normalize: (definition: CardDefinition) => CardDefinition,
): { defs: CardDefinitionLookup; byNumber: Map<string, CardDefinition>; missing: string[] } {
  const raw = new Map<string, CardDefinition>();
  for (const def of Object.values(defs)) raw.set(def.cardNumber, def);

  const byNumber = new Map<string, CardDefinition>();
  const missing: string[] = [];
  const lookup: CardDefinitionLookup = {};

  for (const seat of trajectory.seats) {
    for (const cardNumber of [seat.leaderCardNumber, ...seat.deckCardNumbers]) {
      if (byNumber.has(cardNumber)) continue;
      const found = raw.get(cardNumber) ?? defs[cardNumber];
      if (!found) {
        if (!missing.includes(cardNumber)) missing.push(cardNumber);
        continue;
      }
      const def = normalize(found);
      byNumber.set(cardNumber, def);
      lookup[def.cardDefinitionId] = def;
    }
  }
  return { defs: lookup, byNumber, missing };
}

/** Every card number the trajectory names, leaders included. */
function trajectoryCardNumbers(trajectory: MatchTrajectory): string[] {
  return trajectory.seats.flatMap((seat) => [seat.leaderCardNumber, ...seat.deckCardNumbers]);
}

function setupInputFor(
  seat: MatchTrajectory['seats'][number],
  byNumber: Map<string, CardDefinition>,
  donCardDefinition: CardDefinition,
): PlayerSetupInput | null {
  const leader = byNumber.get(seat.leaderCardNumber);
  if (!leader) return null;
  const deck: CardDefinition[] = [];
  for (const cardNumber of seat.deckCardNumbers) {
    const def = byNumber.get(cardNumber);
    if (!def) return null;
    deck.push(def);
  }
  return {
    playerId: seat.seatId,
    leader: { ...leader, category: 'leader', life: leader.life ?? 5 },
    deck,
    donCard: donCardDefinition,
    donDeckSize: seat.donDeckSize,
  };
}

export function replayTrajectory(trajectory: MatchTrajectory, options: ReplayOptions): ReplayResult {
  const steps: ReplayStep[] = [];

  if (trajectory.schemaVersion !== MATCH_TRAJECTORY_SCHEMA_VERSION) {
    return fail(steps, 'schema-version', null,
      `Recorded with schema v${trajectory.schemaVersion}, this build reads v${MATCH_TRAJECTORY_SCHEMA_VERSION}.`);
  }

  const normalize = options.normalizeDefinition ?? ((definition: CardDefinition) => definition);
  const resolved = definitionsFor(trajectory, options.defs, normalize);
  if (resolved.missing.length > 0) {
    return fail(steps, 'missing-definition', null,
      `Card definitions unavailable: ${resolved.missing.slice(0, 8).join(', ')}${resolved.missing.length > 8 ? ` (+${resolved.missing.length - 8})` : ''}.`);
  }

  const currentHash = hashCardDataForCardNumbers(
    trajectoryCardNumbers(trajectory),
    (cardNumber) => resolved.byNumber.get(cardNumber),
  );
  if (!options.allowCardDataDrift && currentHash !== trajectory.cardDataHash) {
    return fail(steps, 'card-data-drift', null,
      `Card data changed since recording (recorded ${trajectory.cardDataHash}, now ${currentHash}). Replaying would produce states that never happened.`);
  }

  const byNumber = resolved.byNumber;

  const [seatA, seatB] = trajectory.seats;
  if (!seatA || !seatB) return fail(steps, 'setup-failed', null, 'A trajectory needs exactly two seats.');

  const inputA = setupInputFor(seatA, byNumber, options.donCardDefinition);
  const inputB = setupInputFor(seatB, byNumber, options.donCardDefinition);
  if (!inputA || !inputB) return fail(steps, 'setup-failed', null, 'Could not rebuild both decks.');

  const defs: CardDefinitionLookup = {
    ...resolved.defs,
    [options.donCardDefinition.cardDefinitionId]: options.donCardDefinition,
    [inputA.leader.cardDefinitionId]: inputA.leader,
    [inputB.leader.cardDefinitionId]: inputB.leader,
  };

  const created = createPreGameState(inputA, inputB, {
    decidingPlayerId: trajectory.decidingPlayerId,
    rngState: { seed: trajectory.rngSeed, cursor: 0 },
  });
  if (!created.ok) return fail(steps, 'setup-failed', null, created.reasons.join('; '));

  const checkpointAt = new Map(trajectory.checkpoints.map((c) => [c.afterActionIndex, c.checksum]));
  let state = created.state;

  for (const [index, recorded] of trajectory.actions.entries()) {
    const action = recorded.action;
    const before = state;

    const validation = validateAction(before, action, defs, options.registry);
    if (!validation.legal) {
      return fail(steps, 'action-rejected', index,
        `Action ${index} (${action.type}) was accepted when recorded but is illegal now: ${validation.reasons.join('; ')}. The rules changed under this recording.`,
        before);
    }

    let legalActionCount = recorded.legalActionCount;
    if (legalActionCount < 0 && options.countLegalActions) {
      try {
        legalActionCount = options.countLegalActions(before, action.playerId);
      } catch {
        legalActionCount = -1;
      }
    }

    let annotation: unknown;
    if (options.annotateDecision) {
      try {
        annotation = options.annotateDecision(before, action, action.playerId);
      } catch {
        annotation = undefined;
      }
    }

    // Capture the decision BEFORE applying it — the model sees the position it
    // was choosing from, redacted to the seat that was choosing.
    steps.push({
      index,
      actingSeatId: action.playerId,
      turnNumber: before.turnNumber,
      phase: String(before.currentPhase),
      visibleStateJson: redactStateForSeat(before, action.playerId).json,
      action,
      legalActionCount,
      decisionMs: recorded.decisionMs,
      outcomeForActor: 0.5,
      annotation,
    });

    state = executeAction(before, action, defs, options.registry).state;

    const expected = checkpointAt.get(index);
    if (expected !== undefined) {
      const actual = checksumState(state);
      if (actual !== expected) {
        return fail(steps, 'checksum-mismatch', index,
          `State diverged at action ${index} (expected ${expected}, got ${actual}). Everything after this point is untrustworthy.`,
          state);
      }
    }
  }

  const winner = state.gameOver?.winnerId ?? trajectory.outcome?.winnerSeatId ?? null;
  if (winner !== null) {
    for (const step of steps) {
      step.outcomeForActor = step.actingSeatId === winner ? 1 : 0;
    }
  }

  return { ok: true, steps, finalState: state };
}

/**
 * Steps worth learning from: the actor had a real choice. A forced action
 * teaches nothing about preference and would dilute the signal, and a step
 * whose legal count was never measured cannot be judged either way.
 */
export function trainableSteps(steps: readonly ReplayStep[]): ReplayStep[] {
  return steps.filter((step) => step.legalActionCount > 1);
}
