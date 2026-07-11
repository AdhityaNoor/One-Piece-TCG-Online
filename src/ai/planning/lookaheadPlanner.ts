import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext } from '../strategy/types';
import { evaluateState } from '../evaluation/stateEvaluator';
import { generateLegalActions } from '../utilities/legalActions';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { canContinueLookahead, simulateAction } from './stateSimulator';
import { planActionScore } from './strategicPlanner';
import {
  MID_TURN_PESSIMISM_BLEND,
  projectOpponentTurn,
  shouldProjectOpponentTurn,
} from './opponentTurnSimulator';
import { analyzeLethalLine } from './lethalLineAnalyzer';
import {
  findSequencedLethalFirstSteps,
  rankFollowUpForSequencedLethal,
} from './lethalSequencePlanner';
import { analyzeAttackTrade } from '../evaluation/attackTradeEvaluator';
import { turnPlanFirstActionScores } from './sequenceGenerator';

export const LOOKAHEAD_TOP_K = 8;
export const LOOKAHEAD_FOLLOW_UP_K = 4;
export const LOOKAHEAD_DEPTH = 2;

const HEURISTIC_BLEND = 0.35;
const SIMULATION_BLEND = 0.65;
const UNRESOLVED_PENALTY = 18;
/** Must stay below any opponent-turn projected END_MAIN / mid-turn blend score. */
const LOSING_ATTACK_LOOKAHEAD_FLOOR = -1_000_000_000;

function isLosingAttack(
  state: GameState,
  action: GameAction,
  defs: CardDefinitionLookup,
): boolean {
  if (action.type !== 'DECLARE_ATTACK') return false;
  return !analyzeAttackTrade(state, defs, action.attackerInstanceId, action.targetInstanceId).winsTrade;
}

function applyPessimisticUtility(
  state: GameState,
  action: GameAction,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
  baseUtility: number,
): number {
  const mode = shouldProjectOpponentTurn(action, state, playerId);
  if (mode === 'none') return baseUtility;

  const projected = projectOpponentTurn(state, playerId, defs, registry, createActionId, strategic);
  if (projected.failed) return baseUtility;

  const afterThreat = evaluateState(projected.state, playerId, defs, registry);
  if (mode === 'full') return afterThreat;
  return baseUtility * (1 - MID_TURN_PESSIMISM_BLEND) + afterThreat * MID_TURN_PESSIMISM_BLEND;
}

export interface LookaheadScoreResult {
  score: number;
  heuristicScore: number;
  simulatedUtility: number | null;
  depth: number;
  failed: boolean;
}

export function scoreActionWithLookahead(
  state: GameState,
  action: GameAction,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  heuristicScore: number,
  createActionId: () => string,
  depth = LOOKAHEAD_DEPTH,
): LookaheadScoreResult {
  // Losing power races must not be rescued by post-battle simulation (no damage ≠ good line).
  // Floor must beat opponent-turn pessimism on END_MAIN, which can be hundreds of thousands negative.
  if (isLosingAttack(state, action, defs)) {
    return {
      score: Math.min(heuristicScore, LOSING_ATTACK_LOOKAHEAD_FLOOR),
      heuristicScore,
      simulatedUtility: null,
      depth: 0,
      failed: false,
    };
  }

  const sim = simulateAction({
    state,
    action,
    playerId,
    defs,
    registry,
    createActionId,
    strategic,
  });

  if (sim.failed) {
    return {
      score: heuristicScore,
      heuristicScore,
      simulatedUtility: null,
      depth: 1,
      failed: true,
    };
  }

  let utility = evaluateState(sim.state, playerId, defs, registry);
  utility -= sim.unresolvedChoices * UNRESOLVED_PENALTY;
  utility = applyPessimisticUtility(
    sim.state,
    action,
    playerId,
    defs,
    registry,
    strategic,
    createActionId,
    utility,
  );

  let reachedDepth = 1;

  if (depth >= 2 && canContinueLookahead(sim.state, playerId)) {
    const lineAfterFirst = analyzeLethalLine(sim.state, playerId, defs);
    const followUps = generateLegalActions({
      state: sim.state,
      playerId,
      defs,
      registry,
      createActionId,
    });

    const ranked = followUps
      .map((follow) => ({
        follow,
        score:
          scoreActionStrategic(sim.state, follow, playerId, defs, registry, strategic, createActionId) +
          rankFollowUpForSequencedLethal(action, follow, sim.state, strategic, lineAfterFirst),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, LOOKAHEAD_FOLLOW_UP_K);

    for (const { follow } of ranked) {
      const sim2 = simulateAction({
        state: sim.state,
        action: follow,
        playerId,
        defs,
        registry,
        createActionId,
        strategic,
      });
      if (sim2.failed) continue;
      let u2 = evaluateState(sim2.state, playerId, defs, registry);
      u2 -= sim2.unresolvedChoices * UNRESOLVED_PENALTY;
      u2 = applyPessimisticUtility(
        sim2.state,
        follow,
        playerId,
        defs,
        registry,
        strategic,
        createActionId,
        u2,
      );
      utility = Math.max(utility, u2);
      reachedDepth = 2;
    }
  }

  const blended = heuristicScore * HEURISTIC_BLEND + utility * SIMULATION_BLEND;

  return {
    score: blended,
    heuristicScore,
    simulatedUtility: utility,
    depth: reachedDepth,
    failed: false,
  };
}

export function rankActionsWithLookahead(
  state: GameState,
  actions: GameAction[],
  heuristicScores: Map<string, number>,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
): Map<string, number> {
  const sorted = [...actions].sort(
    (a, b) => (heuristicScores.get(JSON.stringify(b)) ?? 0) - (heuristicScores.get(JSON.stringify(a)) ?? 0),
  );
  const sequencedFirst =
    strategic.mode === 'lethal_search'
      ? findSequencedLethalFirstSteps(
          state,
          playerId,
          defs,
          registry,
          strategic,
          createActionId,
          analyzeLethalLine(state, playerId, defs),
        )
      : [];
  const sequencedKeys = new Set(sequencedFirst.map((a) => JSON.stringify(a)));
  // Never spend lookahead budget on power-losing attacks — they keep a hard floor below.
  const topK = [
    ...sequencedFirst,
    ...sorted.filter((a) => !sequencedKeys.has(JSON.stringify(a)) && !isLosingAttack(state, a, defs)),
  ].slice(0, LOOKAHEAD_TOP_K);
  const finalScores = new Map<string, number>();

  for (const action of actions) {
    const key = JSON.stringify(action);
    const heuristic = heuristicScores.get(key) ?? 0;
    // Apply floor to every losing attack, including those outside top-K.
    // Otherwise mild heuristic scores (~-150) beat projected END_MAIN (~-650k).
    if (isLosingAttack(state, action, defs)) {
      finalScores.set(key, Math.min(heuristic, LOSING_ATTACK_LOOKAHEAD_FLOOR));
    } else {
      finalScores.set(key, heuristic);
    }
  }

  for (const action of topK) {
    const key = JSON.stringify(action);
    const heuristic = heuristicScores.get(key) ?? 0;
    const { score } = scoreActionWithLookahead(
      state,
      action,
      playerId,
      defs,
      registry,
      strategic,
      heuristic,
      createActionId,
    );
    finalScores.set(key, score);
  }

  // Full turn-plan candidates: boost opening actions of strong complete lines.
  const planScores = turnPlanFirstActionScores(
    state,
    playerId,
    defs,
    registry,
    strategic,
    createActionId,
    actions,
    heuristicScores,
  );
  for (const [key, planScore] of planScores) {
    if (!finalScores.has(key)) continue;
    const current = finalScores.get(key)!;
    // Never rescue losing attacks via plan boost.
    if (current <= LOSING_ATTACK_LOOKAHEAD_FLOOR) continue;
    finalScores.set(key, Math.max(current, planScore));
  }

  return finalScores;
}

export function planActionScoreWithLookahead(
  state: GameState,
  action: GameAction,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
): number {
  const heuristic = planActionScore(state, action, playerId, defs, registry, 'hard', strategic);
  const { score } = scoreActionWithLookahead(
    state,
    action,
    playerId,
    defs,
    registry,
    strategic,
    heuristic,
    createActionId,
  );
  return score;
}
