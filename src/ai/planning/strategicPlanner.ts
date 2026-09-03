import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { CpuDifficulty } from '../types';
import type { StrategicContext } from '../strategy/types';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { terminalStateScore } from '../evaluation/matchObjective';
import { analyzeLethalLine, prematureEndMainPenalty } from './lethalLineAnalyzer';
import { shouldPrioritizeLethal } from '../evaluation/lethalEstimator';
import { analyzeAttackTrade } from '../evaluation/attackTradeEvaluator';
import { actionShapingFor, getEvaluatorWeights } from '../evaluation/weights';
import { actionFeatureContextFor } from '../evaluation/actionFeatures';
import { policyPriorBonus } from '../evaluation/policyPrior';

export interface StrategicScoreResult {
  score: number;
  strategic: StrategicContext;
  trace: string[];
}

export function scoreWithStrategy(
  state: GameState,
  action: GameAction,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic?: StrategicContext,
  createActionId?: () => string,
): StrategicScoreResult {
  const ctx = strategic ?? buildStrategicContext(state, playerId, defs, registry);
  const terminal = terminalStateScore(state, playerId);
  if (terminal !== null) {
    return { score: terminal, strategic: ctx, trace: [`terminal:${terminal > 0 ? 'win' : 'loss'}`] };
  }

  const raw = scoreActionStrategic(state, action, playerId, defs, registry, ctx, createActionId);
  const weights = getEvaluatorWeights();
  // Per-action-type shaping (evaluation/weights.ts). Identity by default, so
  // this is a no-op until a fitted or tuned set says otherwise.
  const shaping = actionShapingFor(weights, action.type);
  // The fitted action prior, added AFTER shaping so its `strength` stays in the
  // evaluator's own score units rather than being rescaled by a per-type knob.
  // Absent by default — see evaluation/policyPrior.ts for why it stays off
  // until the arena says otherwise.
  const prior = weights.policyPrior
    ? policyPriorBonus(
        weights.policyPrior,
        actionFeatureContextFor(state, defs, registry, playerId),
        action,
      )
    : 0;
  const base = raw * shaping.scale + shaping.bias + prior;
  const trace = [
    `mode:${ctx.mode}`,
    `utility:${ctx.objective.utility.toFixed(1)}`,
    `lethal:${ctx.objective.currentLethalProbability.toFixed(0)}%`,
    `leader:${ctx.leader.description}`,
    ...(prior !== 0 ? [`prior:${prior.toFixed(2)}`] : []),
  ];

  return { score: base, strategic: ctx, trace };
}

export function planActionScore(
  state: GameState,
  action: GameAction,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  difficulty: CpuDifficulty,
  strategic?: StrategicContext,
  createActionId?: () => string,
): number {
  const { score, strategic: ctx } = scoreWithStrategy(
    state,
    action,
    playerId,
    defs,
    registry,
    strategic,
    createActionId,
  );

  if (difficulty !== 'hard') return score;

  let adjusted = score;
  const lethalLine = analyzeLethalLine(state, playerId, defs);
  const lethalPriority = shouldPrioritizeLethal(ctx.victory, ctx.survival.immediateLossRisk);
  const endPenalty = prematureEndMainPenalty(lethalLine, ctx.mode, lethalPriority);

  if (action.type === 'END_MAIN_PHASE') {
    if (endPenalty > 0) adjusted -= endPenalty * 0.25;
    else if (ctx.mode === 'lethal_search') adjusted -= 25;
  }
  if (action.type === 'DECLARE_ATTACK') {
    const trade = analyzeAttackTrade(state, defs, action.attackerInstanceId, action.targetInstanceId);
    if (trade.winsTrade) {
      adjusted += 15;
      const target = state.cardsById[action.targetInstanceId];
      if (target?.currentZone === 'leaderArea' && lethalLine.hasOpenLethalLine) adjusted += 12;
    } else {
      adjusted -= 40;
    }
  }
  if (
    (action.type === 'PLAY_CHARACTER' || action.type === 'PLAY_STAGE') &&
    ctx.mode === 'recovery'
  ) {
    adjusted += 5;
  }

  return adjusted;
}
