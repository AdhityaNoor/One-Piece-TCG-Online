import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import type { GameState } from '../../engine/state/game';
import type { VictoryProjection } from '../strategy/types';
import { opponentLifeCount } from '../visibility/playerView';
import { estimateOpponentCounterCapacity } from './opponentCounterEstimate';
import { analyzeLethalLine } from '../planning/lethalLineAnalyzer';

export function estimateVictory(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): VictoryProjection {
  const player = state.players[playerId];
  const opponentLife = opponentLifeCount(state, playerId);
  let availableAttackers = 0;
  let totalPower = 0;

  const leaderId = player?.leaderInstanceId;
  if (leaderId) {
    const leader = state.cardsById[leaderId];
    if (leader?.orientation === 'active' && !leader.summoningSick) {
      availableAttackers += 1;
      totalPower += computeCurrentPower(defs, state, leaderId);
    }
  }

  for (const id of player?.characterArea.cardIds ?? []) {
    const inst = state.cardsById[id];
    if (!inst || inst.orientation !== 'active' || inst.summoningSick) continue;
    availableAttackers += 1;
    totalPower += computeCurrentPower(defs, state, id);
  }

  const lifeDamageThreshold = opponentLife * 1000;
  let currentTurnLethalProbability =
    totalPower >= lifeDamageThreshold ? 0.95 : (totalPower / Math.max(1, lifeDamageThreshold)) * 0.7;

  // Discount "lethal" that estimated hand Counters can still stop.
  const line = analyzeLethalLine(state, playerId, defs);
  const counterEstimate = estimateOpponentCounterCapacity(state, playerId, defs);
  if (line.canCloseThisTurn || line.oneAttackFromLethal) {
    const opponentId = getOpponentId(state, playerId);
    const oppLeaderId = state.players[opponentId]?.leaderInstanceId;
    if (oppLeaderId && counterEstimate.estimatedLikelySpend > 0) {
      const bestMargin = Math.max(
        0,
        ...line.remainingActiveAttackers.map((a) => a.power - computeCurrentPower(defs, state, oppLeaderId)),
      );
      if (bestMargin < counterEstimate.estimatedLikelySpend) {
        const coverage = bestMargin / Math.max(1, counterEstimate.estimatedLikelySpend);
        currentTurnLethalProbability *= 0.35 + 0.5 * coverage;
      }
    }
  }

  const nextTurnLethalProbability = Math.min(0.9, currentTurnLethalProbability + availableAttackers * 0.08);
  const expectedSuccessfulLifeDamage = totalPower >= lifeDamageThreshold ? opponentLife : totalPower / 1000;

  return {
    opponentCurrentLife: opponentLife,
    currentTurnLethalProbability: currentTurnLethalProbability * 100,
    nextTurnLethalProbability: nextTurnLethalProbability * 100,
    expectedSuccessfulLifeDamage,
    availableAttackers,
  };
}

export function lethalHorizonScore(victory: VictoryProjection): number {
  if (victory.currentTurnLethalProbability >= 90) return 120;
  if (victory.currentTurnLethalProbability >= 60) return 70;
  return victory.expectedSuccessfulLifeDamage * 12 + victory.availableAttackers * 4;
}

export function shouldPrioritizeLethal(victory: VictoryProjection, survivalRisk: number): boolean {
  return victory.currentTurnLethalProbability >= 75 || (victory.currentTurnLethalProbability >= 50 && survivalRisk < 0.3);
}
