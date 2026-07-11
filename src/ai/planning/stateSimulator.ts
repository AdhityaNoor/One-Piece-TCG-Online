import type { GameAction } from '../../engine/actions';
import { executeAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import { generateLegalActions, type LegalActionContext } from '../utilities/legalActions';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import type { StrategicContext } from '../strategy/types';

const MAX_AUTO_RESOLVE_STEPS = 32;

export function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export interface SimulateResult {
  state: GameState;
  steps: number;
  unresolvedChoices: number;
  failed: boolean;
  reason?: string;
}

export interface SimulateOptions {
  state: GameState;
  action: GameAction;
  playerId: string;
  defs: CardDefinitionLookup;
  registry: EffectTemplateRegistry;
  createActionId: () => string;
  strategic?: StrategicContext;
}

function legalCtx(
  state: GameState,
  actingPlayerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
): LegalActionContext {
  return { state, playerId: actingPlayerId, defs, registry, createActionId };
}

function pickBestLegalAction(
  state: GameState,
  actingPlayerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
  cpuPlayerId: string,
  strategic?: StrategicContext,
): GameAction | null {
  const ctx = legalCtx(state, actingPlayerId, defs, registry, createActionId);
  const legal = generateLegalActions(ctx);
  if (legal.length === 0) return null;

  const perspective = actingPlayerId === cpuPlayerId ? cpuPlayerId : actingPlayerId;
  const strat = actingPlayerId === cpuPlayerId
    ? strategic ?? buildStrategicContext(state, cpuPlayerId, defs, registry)
    : buildStrategicContext(state, actingPlayerId, defs, registry);

  let best = legal[0];
  let bestScore = -Infinity;
  for (const action of legal) {
    const score = scoreActionStrategic(state, action, perspective, defs, registry, strat);
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  return best;
}

export function autoResolvePendingChoices(
  state: GameState,
  cpuPlayerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
  strategic?: StrategicContext,
): SimulateResult {
  let current = state;
  let steps = 0;

  while (current.pendingChoices.length > 0 && steps < MAX_AUTO_RESOLVE_STEPS) {
    const choice = current.pendingChoices[0];
    const actingPlayerId = choice.playerId;

    const best = pickBestLegalAction(
      current,
      actingPlayerId,
      defs,
      registry,
      createActionId,
      cpuPlayerId,
      strategic,
    );
    if (!best) {
      return {
        state: current,
        steps,
        unresolvedChoices: current.pendingChoices.length,
        failed: true,
        reason: 'no legal choice resolution',
      };
    }

    try {
      const result = executeAction(current, best, defs, registry);
      current = result.state;
      steps += 1;
    } catch (err) {
      return {
        state: current,
        steps,
        unresolvedChoices: current.pendingChoices.length,
        failed: true,
        reason: err instanceof Error ? err.message : 'execute failed',
      };
    }
  }

  return {
    state: current,
    steps,
    unresolvedChoices: current.pendingChoices.length,
    failed: current.pendingChoices.length > 0,
    reason: current.pendingChoices.length > 0 ? 'max steps or stuck pending' : undefined,
  };
}

export function simulateAction(options: SimulateOptions): SimulateResult {
  const { action, playerId, defs, registry, createActionId, strategic } = options;
  let current = cloneGameState(options.state);

  try {
    const result = executeAction(current, action, defs, registry);
    current = result.state;
  } catch (err) {
    return {
      state: options.state,
      steps: 0,
      unresolvedChoices: options.state.pendingChoices.length,
      failed: true,
      reason: err instanceof Error ? err.message : 'execute failed',
    };
  }

  const resolved = autoResolvePendingChoices(current, playerId, defs, registry, createActionId, strategic);
  return {
    state: resolved.state,
    steps: 1 + resolved.steps,
    unresolvedChoices: resolved.unresolvedChoices,
    failed: resolved.failed,
    reason: resolved.reason,
  };
}

export function canContinueLookahead(state: GameState, playerId: string): boolean {
  if (state.gameOver) return false;
  if (state.pendingChoices.length > 0) return false;
  if (state.currentBattle) return false;
  return state.currentPhase === 'main' && state.activePlayerId === playerId;
}

export { pickBestLegalAction };
