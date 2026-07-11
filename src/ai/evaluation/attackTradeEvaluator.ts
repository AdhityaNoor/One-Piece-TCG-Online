import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import type { GameState } from '../../engine/state/game';

export interface AttackTradeAnalysis {
  attackerPower: number;
  targetPower: number;
  powerDelta: number;
  winsTrade: boolean;
  /** Engine requires attackerPower >= targetPower for damage/KO (7-1-4). */
  dealsDamageIfUncountered: boolean;
}

export function analyzeAttackTrade(
  state: GameState,
  defs: CardDefinitionLookup,
  attackerInstanceId: string,
  targetInstanceId: string,
): AttackTradeAnalysis {
  const attackerPower = computeCurrentPower(defs, state, attackerInstanceId);
  const targetPower = computeCurrentPower(defs, state, targetInstanceId);
  const powerDelta = attackerPower - targetPower;
  const winsTrade = powerDelta >= 0;
  return {
    attackerPower,
    targetPower,
    powerDelta,
    winsTrade,
    dealsDamageIfUncountered: winsTrade,
  };
}

export interface AttackTradeScoreInput {
  trade: AttackTradeAnalysis;
  isLeaderTarget: boolean;
  whenAttackingValue: number;
  /** Life/lethal bonuses only apply when the trade can succeed. */
  lethalBonus: number;
  removalBonus: number;
  sequencedBonus: number;
}

export function scoreAttackTrade(input: AttackTradeScoreInput): number {
  const { trade, isLeaderTarget, whenAttackingValue, lethalBonus, removalBonus, sequencedBonus } = input;

  if (trade.winsTrade) {
    let score = trade.attackerPower / 1000 + removalBonus + sequencedBonus + whenAttackingValue * 0.35;
    if (isLeaderTarget) score += lethalBonus;
    return score;
  }

  const deficit = Math.abs(trade.powerDelta);
  let score = whenAttackingValue * 0.4;
  score -= 45 + deficit / 250;
  if (isLeaderTarget) {
    score -= 55;
  } else {
    score -= 30;
  }
  const effectRescue = whenAttackingValue >= 45 ? whenAttackingValue * 0.55 : 0;
  return Math.min(-90 + effectRescue, score);
}
