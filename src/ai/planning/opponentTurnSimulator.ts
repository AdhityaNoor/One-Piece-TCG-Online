import type { GameAction } from '../../engine/actions';
import { executeAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import { generateLegalActions } from '../utilities/legalActions';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import type { StrategicContext } from '../strategy/types';
import {
  autoResolvePendingChoices,
  cloneGameState,
  pickBestLegalAction,
} from './stateSimulator';

const MAX_OPPONENT_ATTACKS = 4;
const MAX_BATTLE_STEPS = 20;
const MAX_PHASE_ADVANCE_STEPS = 24;

export interface OpponentProjectionResult {
  state: GameState;
  attacksSimulated: number;
  failed: boolean;
  reason?: string;
}

function defendingPlayerId(state: GameState): string | null {
  if (!state.currentBattle) return null;
  try {
    return getOpponentId(state, state.activePlayerId);
  } catch {
    return null;
  }
}

function battleActingPlayerId(state: GameState): string | null {
  const battle = state.currentBattle;
  if (!battle) return null;
  if (battle.step === 'block' || battle.step === 'counter') {
    return defendingPlayerId(state);
  }
  return null;
}

export function resolveBattleToCompletion(
  state: GameState,
  cpuPlayerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
  strategic?: StrategicContext,
): GameState {
  let current = state;
  let steps = 0;

  while (current.currentBattle && !current.gameOver && steps < MAX_BATTLE_STEPS) {
    const actingPlayerId = battleActingPlayerId(current);
    if (!actingPlayerId) break;

    const legal = generateLegalActions({
      state: current,
      playerId: actingPlayerId,
      defs,
      registry,
      createActionId,
    });
    if (legal.length === 0) break;

    const best = pickBestLegalAction(
      current,
      actingPlayerId,
      defs,
      registry,
      createActionId,
      cpuPlayerId,
      strategic,
    );
    if (!best) break;

    try {
      const result = executeAction(current, best, defs, registry);
      current = result.state;
      const resolved = autoResolvePendingChoices(current, cpuPlayerId, defs, registry, createActionId, strategic);
      current = resolved.state;
      steps += 1;
    } catch {
      break;
    }
  }

  return current;
}

function opponentAttackActions(
  state: GameState,
  opponentId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
): GameAction[] {
  return generateLegalActions({
    state,
    playerId: opponentId,
    defs,
    registry,
    createActionId,
  }).filter((action) => action.type === 'DECLARE_ATTACK');
}

function pickBestOpponentAttack(
  state: GameState,
  opponentId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
): GameAction | null {
  const attacks = opponentAttackActions(state, opponentId, defs, registry, createActionId);
  if (attacks.length === 0) return null;

  const opponentStrategic = buildStrategicContext(state, opponentId, defs, registry);
  let best = attacks[0];
  let bestScore = -Infinity;
  for (const action of attacks) {
    const score = scoreActionStrategic(state, action, opponentId, defs, registry, opponentStrategic);
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  return best;
}

export function advanceCpuEndTurnToOpponentMain(
  state: GameState,
  cpuPlayerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
  strategic?: StrategicContext,
): OpponentProjectionResult {
  let current = cloneGameState(state);
  if (current.gameOver) {
    return { state: current, attacksSimulated: 0, failed: false };
  }

  if (current.currentPhase === 'main' && current.activePlayerId === cpuPlayerId && !current.currentBattle) {
    try {
      const endResult = executeAction(
        current,
        { type: 'END_MAIN_PHASE', actionId: createActionId(), playerId: cpuPlayerId },
        defs,
        registry,
      );
      current = endResult.state;
      const resolved = autoResolvePendingChoices(current, cpuPlayerId, defs, registry, createActionId, strategic);
      if (resolved.failed && resolved.unresolvedChoices > 0) {
        return { state: resolved.state, attacksSimulated: 0, failed: true, reason: resolved.reason };
      }
      current = resolved.state;
    } catch (err) {
      return {
        state: current,
        attacksSimulated: 0,
        failed: true,
        reason: err instanceof Error ? err.message : 'end turn failed',
      };
    }
  }

  let steps = 0;
  while (
    !current.gameOver &&
    steps < MAX_PHASE_ADVANCE_STEPS &&
    current.pendingChoices.length > 0
  ) {
    const resolved = autoResolvePendingChoices(current, cpuPlayerId, defs, registry, createActionId, strategic);
    current = resolved.state;
    if (resolved.failed) {
      return { state: current, attacksSimulated: 0, failed: true, reason: resolved.reason };
    }
    steps += 1;
  }

  return { state: current, attacksSimulated: 0, failed: false };
}

export function simulateOpponentAttackPhase(
  state: GameState,
  cpuPlayerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
  strategic?: StrategicContext,
): OpponentProjectionResult {
  let current = cloneGameState(state);
  if (current.gameOver) {
    return { state: current, attacksSimulated: 0, failed: false };
  }

  const opponentId = getOpponentId(current, cpuPlayerId);
  let attacksSimulated = 0;

  for (let i = 0; i < MAX_OPPONENT_ATTACKS; i += 1) {
    if (current.gameOver) break;
    if (current.pendingChoices.length > 0) {
      const resolved = autoResolvePendingChoices(current, cpuPlayerId, defs, registry, createActionId, strategic);
      current = resolved.state;
      if (resolved.failed) {
        return { state: current, attacksSimulated, failed: true, reason: resolved.reason };
      }
    }
    if (current.currentBattle) {
      current = resolveBattleToCompletion(current, cpuPlayerId, defs, registry, createActionId, strategic);
      continue;
    }
    if (current.currentPhase !== 'main' || current.activePlayerId !== opponentId) break;

    const attack = pickBestOpponentAttack(current, opponentId, defs, registry, createActionId);
    if (!attack) break;

    try {
      const result = executeAction(current, attack, defs, registry);
      current = result.state;
      attacksSimulated += 1;
      const resolved = autoResolvePendingChoices(current, cpuPlayerId, defs, registry, createActionId, strategic);
      current = resolved.state;
      if (resolved.failed && resolved.unresolvedChoices > 0) {
        return { state: current, attacksSimulated, failed: true, reason: resolved.reason };
      }
      current = resolveBattleToCompletion(current, cpuPlayerId, defs, registry, createActionId, strategic);
    } catch (err) {
      return {
        state: current,
        attacksSimulated,
        failed: true,
        reason: err instanceof Error ? err.message : 'attack failed',
      };
    }
  }

  return { state: current, attacksSimulated, failed: false };
}

export function projectOpponentTurn(
  state: GameState,
  cpuPlayerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
  strategic?: StrategicContext,
): OpponentProjectionResult {
  const opponentId = getOpponentId(state, cpuPlayerId);
  let current = cloneGameState(state);

  if (current.currentPhase === 'main' && current.activePlayerId === cpuPlayerId && !current.currentBattle) {
    const advanced = advanceCpuEndTurnToOpponentMain(current, cpuPlayerId, defs, registry, createActionId, strategic);
    if (advanced.failed) return advanced;
    current = advanced.state;
  }

  if (current.currentPhase === 'main' && current.activePlayerId === opponentId) {
    return simulateOpponentAttackPhase(current, cpuPlayerId, defs, registry, createActionId, strategic);
  }

  return { state: current, attacksSimulated: 0, failed: false };
}

export function shouldProjectOpponentTurn(
  action: GameAction,
  state: GameState,
  cpuPlayerId: string,
): 'full' | 'blend' | 'none' {
  if (state.gameOver) return 'none';
  if (action.type === 'END_MAIN_PHASE') return 'full';
  const opponentId = getOpponentId(state, cpuPlayerId);
  if (state.activePlayerId === opponentId && state.currentPhase === 'main' && !state.currentBattle) {
    return 'full';
  }
  if (state.currentPhase === 'main' && state.activePlayerId === cpuPlayerId && !state.currentBattle) {
    return 'blend';
  }
  return 'none';
}

export const MID_TURN_PESSIMISM_BLEND = 0.35;
