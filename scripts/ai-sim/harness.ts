/**
 * Headless CPU-vs-CPU harness.
 *
 * Mirrors the exact dispatch path of src/app/store/matchStore.ts (V1 registry
 * OR V2 runtime override + post-action effects) and drives BOTH seats with
 * src/ai/chooseAction, so the AI here behaves identically to the app's
 * useCpuTurnController. Diagnostics only — nothing in /src imports this.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chooseAction, generateLegalActions } from '../../src/ai';
import type { CpuDifficulty } from '../../src/ai';
import type { EvaluatorWeights } from '../../src/ai/evaluation/weights';
import { executeAction, validateAction, type GameAction } from '../../src/engine/actions';
import { createPreGameState, type PlayerSetupInput } from '../../src/engine/setup';
import { buildCuratedEffectRegistry } from '../../src/cards/effectTemplates';
import { buildV2EffectRuntimeRegistry } from '../../src/cards/effectCompiler_V2/runtimeCatalog_V2';
import { createEmptyEffectRuntimeSidecars_V2, type EffectRuntimeSidecars_V2 } from '../../src/engine/effects_V2/dispatcher_V2';
import { applyV2EffectsForAction, executeV2ActionOverride } from '../../src/engine/effects_V2/engineAdapter_V2';
import type { EffectRuntimeBundle_V2 } from '../../src/engine/effects_V2/runtime_V2';
import { GENERIC_DON_CARD_DEFINITION } from '../../src/cards/decks/genericDonCard';
import { createTrajectoryRecorder, hashCardDataForCardNumbers, type TrajectoryRecorder } from '../../src/engine/replay';
import { normalizeEngineCardDefinition } from '../../src/cards/normalization/engineDefinition';
import type { MatchTrajectory, TrajectorySeat } from '../../shared/replay';
import { getActingPlayerId } from '../../src/board/projection';
import type { CardDefinition } from '../../src/engine/state/card';
import type { CardDefinitionLookup } from '../../src/engine/rules/shared';
import type { GameState } from '../../src/engine/state/game';
import type { EffectTemplateRegistry } from '../../src/engine/effects';

const HERE = dirname(fileURLToPath(import.meta.url));
const SETS_DIR = resolve(HERE, '../../public/cards/sets');

export function loadCatalog(): CardDefinition[] {
  if (!existsSync(SETS_DIR)) throw new Error(`missing ${SETS_DIR}`);
  const defs: CardDefinition[] = [];
  for (const file of readdirSync(SETS_DIR).filter((n) => n.endsWith('.json'))) {
    const rows = JSON.parse(readFileSync(resolve(SETS_DIR, file), 'utf8')) as { definition?: CardDefinition }[];
    if (!Array.isArray(rows)) continue;
    // Normalized on the way in, exactly as the app does for a saved deck, so
    // self-play is played with the same cards a real match uses — and so a
    // recording from either source replays identically.
    for (const row of rows) if (row.definition) defs.push(normalizeEngineCardDefinition(row.definition));
  }
  return defs;
}

/** Build a plausible 50-card deck for a leader: same-colour, 4-of, cost curve. */
export function buildDeckFor(leader: CardDefinition, catalog: CardDefinition[]): CardDefinition[] {
  const colors = new Set(leader.colors ?? []);
  const pool = catalog.filter(
    (d) =>
      (d.category === 'character' || d.category === 'event' || d.category === 'stage') &&
      (d.colors ?? []).some((c) => colors.has(c)),
  );
  const sharesType = (d: CardDefinition) => (d.types ?? []).some((t) => (leader.types ?? []).includes(t));
  const cost = (d: CardDefinition) => d.baseCost ?? 0;
  const sorted = [...pool].sort((a, b) => {
    const s = Number(sharesType(b)) - Number(sharesType(a));
    if (s) return s;
    return cost(a) - cost(b) || a.cardNumber.localeCompare(b.cardNumber);
  });
  const deck: CardDefinition[] = [];
  const buckets = [
    { max: 2, want: 16 },
    { max: 4, want: 20 },
    { max: 99, want: 14 },
  ];
  for (const bucket of buckets) {
    let filled = 0;
    for (const def of sorted) {
      if (filled >= bucket.want) break;
      if (cost(def) > bucket.max) continue;
      if (deck.some((d) => d.cardNumber === def.cardNumber)) continue;
      const copies = Math.min(4, bucket.want - filled);
      for (let i = 0; i < copies; i++) deck.push(def);
      filled += copies;
    }
  }
  while (deck.length < 50 && sorted.length > 0) deck.push(sorted[deck.length % sorted.length]);
  return deck.slice(0, 50);
}

export interface HarnessOptions {
  mode: 'v1' | 'v2';
  difficulty: CpuDifficulty;
  seed: string;
  maxActions?: number;
  /** Capture a MatchTrajectory while playing — see src/engine/replay. */
  record?: boolean;
  /**
   * Per-seat evaluation weights, so two weight sets can face each other in one
   * process. Omitted seats use the shipped baseline.
   */
  weightsBySeat?: Record<string, EvaluatorWeights | undefined>;
  /**
   * Wall-clock ceiling for ONE game. Without it a single pathological match can
   * stall a batch indefinitely: a Leader that cannot attack (OP04-001) grinds
   * out enormous games, and at hard difficulty every decision costs ~120ms, so
   * one game can outlast an entire arena slice. A timed-out game is reported
   * as `timedOut` and counted as a draw — visible, rather than silently
   * dropped, because systematically discarding long games would hide a
   * candidate that CAUSES long games.
   */
  deadlineMs?: number;
  onAction?: (info: {
    index: number;
    playerId: string;
    action: GameAction;
    ok: boolean;
    reasons?: string[];
    legalCount: number;
    state: GameState;
    decisionMs: number;
  }) => void;
}

export interface HarnessRig {
  state: GameState;
  defs: CardDefinitionLookup;
  registry: EffectTemplateRegistry;
  runtime: EffectRuntimeBundle_V2 | null;
  sidecars: EffectRuntimeSidecars_V2 | null;
  /** Present when buildRig was asked to record; see runMatch. */
  recorder?: TrajectoryRecorder;
}

/** Build stamp for self-play recordings — the harness is not a released build. */
export const SELF_PLAY_ENGINE_BUILD = 'self-play-harness';

function trajectorySeat(
  seatId: string,
  leader: CardDefinition,
  deck: CardDefinition[],
  difficulty: CpuDifficulty,
): TrajectorySeat {
  return {
    seatId,
    userId: null,
    controller: 'cpu',
    cpuDifficulty: difficulty,
    leaderCardNumber: leader.cardNumber,
    deckCardNumbers: deck.map((d) => d.cardNumber),
    donDeckSize: 10,
  };
}

let actionCounter = 0;
export const createActionId = (): string => `sim-act-${++actionCounter}`;

export function makeSetupInput(playerId: string, leader: CardDefinition, deck: CardDefinition[]): PlayerSetupInput {
  return {
    playerId,
    leader: { ...leader, category: 'leader', life: leader.life ?? 5 },
    deck,
    donCard: GENERIC_DON_CARD_DEFINITION,
    donDeckSize: 10,
  };
}

export function buildRig(
  leaderA: CardDefinition,
  deckA: CardDefinition[],
  leaderB: CardDefinition,
  deckB: CardDefinition[],
  opts: HarnessOptions,
): HarnessRig {
  const defs: CardDefinitionLookup = {};
  for (const def of [leaderA, leaderB, ...deckA, ...deckB, GENERIC_DON_CARD_DEFINITION]) {
    defs[def.cardDefinitionId] = def;
  }
  const created = createPreGameState(
    makeSetupInput('p1', leaderA, deckA),
    makeSetupInput('p2', leaderB, deckB),
    { decidingPlayerId: 'p1', rngState: { seed: opts.seed, cursor: 0 } },
  );
  if (!created.ok) throw new Error(`createPreGameState failed: ${created.reasons.join('; ')}`);

  const registry = opts.mode === 'v2' ? {} : buildCuratedEffectRegistry(defs);
  const runtime = opts.mode === 'v2' ? buildV2EffectRuntimeRegistry(defs).runtime : null;
  const sidecars = runtime ? createEmptyEffectRuntimeSidecars_V2() : null;

  const recorder = opts.record
    ? createTrajectoryRecorder({
        source: 'self-play',
        engineBuild: SELF_PLAY_ENGINE_BUILD,
        // Same seat-scoped set the replay will hash.
        cardDataHash: hashCardDataForCardNumbers(
          [leaderA, leaderB, ...deckA, ...deckB].map((def) => def.cardNumber),
          (cardNumber) =>
            [leaderA, leaderB, ...deckA, ...deckB].find((def) => def.cardNumber === cardNumber),
        ),
        rngSeed: opts.seed,
        decidingPlayerId: 'p1',
        seats: [
          trajectorySeat('p1', leaderA, deckA, opts.difficulty),
          trajectorySeat('p2', leaderB, deckB, opts.difficulty),
        ],
      })
    : undefined;

  return { state: created.state, defs, registry, runtime, sidecars, recorder };
}

/** Exactly matchStore.dispatch(), minus presentation/audio. */
export function dispatch(rig: HarnessRig, action: GameAction): { ok: boolean; reasons: string[] } {
  const { state, defs, registry, runtime, sidecars } = rig;
  if (runtime) {
    const handled = executeV2ActionOverride({ state, defs, runtime, sidecars, action });
    if (handled.handled) {
      if (!handled.ok) return { ok: false, reasons: handled.reasons };
      rig.state = handled.state;
      rig.sidecars = handled.sidecars;
      return { ok: true, reasons: [] };
    }
  }
  const validation = validateAction(state, action, defs, registry);
  if (!validation.legal) return { ok: false, reasons: validation.reasons };
  const result = executeAction(state, action, defs, registry);
  let nextState = result.state;
  let nextSidecars = sidecars;
  if (runtime) {
    const applied = applyV2EffectsForAction({
      previousState: state,
      state: result.state,
      defs,
      runtime,
      sidecars,
      action,
      log: result.log,
    });
    nextState = applied.state;
    nextSidecars = applied.sidecars;
  }
  rig.state = nextState;
  rig.sidecars = nextSidecars;
  return { ok: true, reasons: [] };
}

export function runMatch(
  rig: HarnessRig,
  opts: HarnessOptions,
): { rig: HarnessRig; actions: number; stuck: boolean; timedOut: boolean } {
  const max = opts.maxActions ?? 4000;
  const deadline = opts.deadlineMs ? Date.now() + opts.deadlineMs : null;
  let i = 0;
  let stuckRuns = 0;
  while (i < max && !rig.state.gameOver) {
    if (deadline !== null && Date.now() > deadline) {
      return { rig, actions: i, stuck: false, timedOut: true };
    }
    const acting = getActingPlayerId(rig.state);
    const legal = generateLegalActions({
      state: rig.state,
      playerId: acting,
      defs: rig.defs,
      registry: rig.registry,
      createActionId,
    });
    const t0 = performance.now();
    const decision = chooseAction({
      state: rig.state,
      playerId: acting,
      defs: rig.defs,
      registry: rig.registry,
      config: { difficulty: opts.difficulty, seed: opts.seed, weights: opts.weightsBySeat?.[acting] },
      createActionId,
    });
    const decisionMs = performance.now() - t0;
    const action = decision?.action ?? legal[0] ?? null;
    if (!action) {
      stuckRuns += 1;
      if (stuckRuns > 2) return { rig, actions: i, stuck: true, timedOut: false };
      continue;
    }
    const before = rig.state;
    const res = dispatch(rig, action);
    i += 1;
    opts.onAction?.({ index: i, playerId: acting, action, ok: res.ok, reasons: res.reasons, legalCount: legal.length, state: before, decisionMs });
    if (!res.ok) {
      stuckRuns += 1;
      if (stuckRuns > 4) return { rig, actions: i, stuck: true, timedOut: false };
    } else {
      stuckRuns = 0;
      // Only ACCEPTED actions enter the recording: a rejected action never
      // happened, and replaying one would desync the stream from the state.
      rig.recorder?.record(action, rig.state, { legalActionCount: legal.length, decisionMs });
    }
  }
  return { rig, actions: i, stuck: false, timedOut: false };
}

/** Play one match and return its recording. Convenience for the dump script. */
export function recordMatch(
  leaderA: CardDefinition,
  deckA: CardDefinition[],
  leaderB: CardDefinition,
  deckB: CardDefinition[],
  opts: HarnessOptions,
): { trajectory: MatchTrajectory; rig: HarnessRig; stuck: boolean } {
  const rig = buildRig(leaderA, deckA, leaderB, deckB, { ...opts, record: true });
  const result = runMatch(rig, { ...opts, record: true });
  const trajectory = rig.recorder!.finish(rig.state);
  return { trajectory, rig: result.rig, stuck: result.stuck };
}
