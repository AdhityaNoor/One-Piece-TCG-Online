/**
 * Counter-aware lethal planning: when a Life swing can be stopped by estimated
 * hand Counters, prefer baiting low-cost pieces or securing overkill first.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { GameState } from '../../engine/state/game';
import { opponentPublicCardIds } from '../visibility/playerView';
import {
  estimateOpponentCounterCapacity,
  type OpponentCounterEstimate,
} from './opponentCounterEstimate';
import { analyzeAttackTrade } from './attackTradeEvaluator';
import type { LethalLineAnalysis } from '../planning/lethalLineAnalyzer';

/** Low-cost rested characters worth baiting Counters from before lethal. */
const BAIT_MAX_COST = 4;
const BAIT_MAX_POWER = 5000;

export interface CounterAwareLethalAnalysis {
  estimate: OpponentCounterEstimate;
  attackerPower: number;
  leaderPower: number;
  powerMargin: number;
  /** True when margin beats the likely Counter spend. */
  survivesEstimatedCounters: boolean;
  /** Extra power still needed to clear estimated Counters. */
  overkillDeficit: number;
  shouldSecureOverkill: boolean;
  shouldBaitCountersFirst: boolean;
  baitTargetIds: string[];
}

function isLowCostBaitTarget(
  state: GameState,
  defs: CardDefinitionLookup,
  instanceId: string,
): boolean {
  const inst = state.cardsById[instanceId];
  if (!inst || inst.currentZone !== 'characterArea' || inst.orientation !== 'rested') {
    return false;
  }
  const def = getDefinition(defs, inst);
  const cost = def.baseCost ?? 99;
  const power = computeCurrentPower(defs, state, instanceId);
  return cost <= BAIT_MAX_COST || power <= BAIT_MAX_POWER;
}

/**
 * Rested opponent characters we can KO that are cheap enough to bait Counters.
 */
export function findCounterBaitTargets(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  attackerInstanceIds: string[],
): string[] {
  const candidates = opponentPublicCardIds(state, playerId).filter((id) =>
    isLowCostBaitTarget(state, defs, id),
  );

  const scored: Array<{ id: string; score: number }> = [];
  for (const targetId of candidates) {
    let bestDelta = -Infinity;
    for (const attackerId of attackerInstanceIds) {
      const trade = analyzeAttackTrade(state, defs, attackerId, targetId);
      if (!trade.winsTrade) continue;
      bestDelta = Math.max(bestDelta, trade.powerDelta);
    }
    if (bestDelta < 0) continue;

    const inst = state.cardsById[targetId]!;
    const def = getDefinition(defs, inst);
    const cost = def.baseCost ?? 5;
    // Prefer cheaper / lower-power baits (easier Counter decisions for opponent).
    const score = 40 - cost * 6 - computeCurrentPower(defs, state, targetId) / 500 + bestDelta / 2000;
    scored.push({ id: targetId, score });
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.id);
}

export function analyzeCounterAwareLeaderAttack(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  attackerInstanceId: string,
  targetInstanceId: string,
  estimate?: OpponentCounterEstimate,
  line?: LethalLineAnalysis,
): CounterAwareLethalAnalysis {
  const counterEstimate = estimate ?? estimateOpponentCounterCapacity(state, playerId, defs);
  const trade = analyzeAttackTrade(state, defs, attackerInstanceId, targetInstanceId);
  const powerMargin = trade.powerDelta;
  const estimatedSpend = counterEstimate.estimatedLikelySpend;
  const overkillDeficit = Math.max(0, estimatedSpend - Math.max(0, powerMargin));
  const survivesEstimatedCounters = trade.winsTrade && powerMargin >= estimatedSpend;

  const nearLethal =
    !!line &&
    (line.canCloseThisTurn ||
      line.oneAttackFromLethal ||
      (line.hasOpenLethalLine && line.opponentLife <= 2));

  const attackerIds =
    line?.remainingActiveAttackers.map((a) => a.instanceId) ?? [attackerInstanceId];
  const baitTargetIds = findCounterBaitTargets(state, playerId, defs, attackerIds);

  const shouldSecureOverkill =
    nearLethal &&
    trade.winsTrade &&
    !survivesEstimatedCounters &&
    counterEstimate.handCount > 0 &&
    overkillDeficit > 0;

  const shouldBaitCountersFirst =
    nearLethal &&
    trade.winsTrade &&
    !survivesEstimatedCounters &&
    counterEstimate.handCount >= 2 &&
    baitTargetIds.length > 0 &&
    // Keep at least one attacker for the Life swing after baiting.
    attackerIds.length >= 2;

  return {
    estimate: counterEstimate,
    attackerPower: trade.attackerPower,
    leaderPower: trade.targetPower,
    powerMargin,
    survivesEstimatedCounters,
    overkillDeficit,
    shouldSecureOverkill,
    shouldBaitCountersFirst,
    baitTargetIds,
  };
}

/**
 * Score adjustment for a leader attack under Counter uncertainty.
 * Positive when overkill is secured; negative when Counters likely stop a thin swing.
 */
export function scoreCounterAwareLeaderAttack(
  analysis: CounterAwareLethalAnalysis,
  opts: { isClosingLethal: boolean },
): number {
  if (!opts.isClosingLethal) {
    // Non-lethal Life pressure: mild preference for margin over estimated spend.
    if (analysis.survivesEstimatedCounters) return 8;
    if (analysis.estimate.handCount === 0) return 4;
    return -Math.min(25, analysis.overkillDeficit / 200);
  }

  if (analysis.estimate.handCount === 0) return 20;

  if (analysis.survivesEstimatedCounters) {
    // Reward comfortable overkill; exact covers still fine.
    const comfort = analysis.powerMargin - analysis.estimate.estimatedLikelySpend;
    return 28 + Math.min(20, comfort / 250);
  }

  // Thin lethal into a defended hand — discourage committing now.
  let penalty = 55 + analysis.overkillDeficit / 80;
  if (analysis.shouldBaitCountersFirst) penalty += 35;
  else if (analysis.shouldSecureOverkill) penalty += 20;
  if (analysis.estimate.handCount >= 5) penalty += 12;
  return -penalty;
}

/**
 * Bonus for attacking a low-cost bait target before a Counter-threatened lethal.
 */
export function scoreCounterBaitAttack(
  analysis: CounterAwareLethalAnalysis,
  targetInstanceId: string,
): number {
  if (!analysis.shouldBaitCountersFirst) return 0;
  if (!analysis.baitTargetIds.includes(targetInstanceId)) return 0;
  const rank = analysis.baitTargetIds.indexOf(targetInstanceId);
  return 70 - rank * 8;
}

/**
 * Extra value for attaching DON!! that creates Counter-beating overkill on a lethal attacker.
 */
export function scoreOverkillDonForLethal(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  targetInstanceId: string,
  line: LethalLineAnalysis,
  estimate?: OpponentCounterEstimate,
): number {
  const counterEstimate = estimate ?? estimateOpponentCounterCapacity(state, playerId, defs);
  if (counterEstimate.handCount === 0) return 0;
  if (!line.hasOpenLethalLine && !line.canCloseThisTurn && !line.oneAttackFromLethal) return 0;

  const opponentId = getOpponentId(state, playerId);
  const leaderId = state.players[opponentId]?.leaderInstanceId;
  if (!leaderId) return 0;

  const target = state.cardsById[targetInstanceId];
  if (!target || target.orientation !== 'active') return 0;
  if (target.currentZone !== 'leaderArea' && target.currentZone !== 'characterArea') return 0;

  const power = computeCurrentPower(defs, state, targetInstanceId);
  const leaderPower = computeCurrentPower(defs, state, leaderId);
  const marginNow = power - leaderPower;
  const marginAfter = marginNow + 1000;

  if (marginNow < 0) return 0; // enabling the hit is handled elsewhere
  if (marginNow >= counterEstimate.estimatedLikelySpend) return 0; // already safe

  if (marginAfter >= counterEstimate.estimatedLikelySpend) {
    return 40 + Math.min(15, counterEstimate.estimatedLikelySpend / 400);
  }
  // Partial overkill toward the threshold.
  return 12 + Math.min(10, (marginAfter - marginNow) / 200);
}
