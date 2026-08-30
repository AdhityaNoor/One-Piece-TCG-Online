/**
 * Victory projection.
 *
 * Life damage is counted in ATTACKS, never in summed power — see
 * ./attackPotential.ts for the rule citations. The previous implementation
 * compared the board's total power to `opponentLife * 1000`, which reported a
 * lone 5000-power Leader as 95% lethal against 4 Life and as four points of
 * expected damage. Because that number was produced entirely by ACTIVE bodies,
 * it collapsed to zero the moment the Leader attacked and rested, so every
 * simulated line that actually attacked scored far below simply ending the
 * turn. That is what made the CPU pass its turns doing nothing.
 *
 * Two horizons are reported, and only one of them is spent by attacking:
 * `currentTurnLethalProbability` is about the swings still available now,
 * while `nextTurnLethalProbability` measures the whole board as it will stand
 * after the Refresh Phase — so it survives attacking, and the evaluator no
 * longer treats using the board as losing it.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import type { GameState } from '../../engine/state/game';
import type { VictoryProjection } from '../strategy/types';
import { opponentLifeCount } from '../visibility/playerView';
import { estimateOpponentCounterCapacity } from './opponentCounterEstimate';
import { damagePotential } from './attackPotential';

/** Probability that a lethal-sized set of attacks is not undone by Counters. */
function counterSurvivalFactor(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  attackerPowers: number[],
): number {
  if (attackerPowers.length === 0) return 1;
  const opponentId = getOpponentId(state, playerId);
  const leaderId = state.players[opponentId]?.leaderInstanceId;
  if (!leaderId) return 1;

  const estimate = estimateOpponentCounterCapacity(state, playerId, defs);
  if (estimate.estimatedLikelySpend <= 0) return 1;

  const leaderPower = computeCurrentPower(defs, state, leaderId);
  // Margin the opponent must erase on the swing they most want to stop.
  const bestMargin = Math.max(0, ...attackerPowers.map((p) => p - leaderPower));
  if (bestMargin >= estimate.estimatedLikelySpend) return 1;
  const coverage = bestMargin / Math.max(1, estimate.estimatedLikelySpend);
  return 0.35 + 0.5 * coverage;
}

export function estimateVictory(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): VictoryProjection {
  const opponentLife = opponentLifeCount(state, playerId);
  const now = damagePotential(state, playerId, defs, 'thisTurn');
  const next = damagePotential(state, playerId, defs, 'nextTurn');

  const survival = counterSurvivalFactor(state, playerId, defs, now.attackers.map((a) => a.power));

  // Lethal THIS turn: the swings still available have to cover the remaining
  // Life on their own. Anything short of that is proportional progress.
  const closesNow = opponentLife > 0 && now.rawLifeDamage >= opponentLife;
  const currentTurnLethalProbability = opponentLife <= 0
    ? 0
    : closesNow
      ? 0.95 * survival
      : Math.min(0.7, (now.lifeDamage / opponentLife) * 0.55);

  // Lethal NEXT turn: measured on the refreshed board, so it is unaffected by
  // having attacked. Life the opponent has already lost this turn makes this
  // strictly easier, which is what rewards attacking now.
  const lifeAfterThisTurn = Math.max(0, opponentLife - now.lifeDamage);
  const nextTurnLethalProbability = lifeAfterThisTurn <= 0
    ? 0.95
    : next.rawLifeDamage >= lifeAfterThisTurn
      ? 0.8
      : Math.min(0.7, (next.rawLifeDamage / lifeAfterThisTurn) * 0.5);

  return {
    opponentCurrentLife: opponentLife,
    currentTurnLethalProbability: currentTurnLethalProbability * 100,
    nextTurnLethalProbability: nextTurnLethalProbability * 100,
    expectedSuccessfulLifeDamage: now.lifeDamage,
    nextTurnLifeDamagePotential: next.rawLifeDamage,
    availableAttackers: now.attackers.length,
    boardAttackers: next.attackers.length,
  };
}

export function lethalHorizonScore(victory: VictoryProjection): number {
  if (victory.currentTurnLethalProbability >= 90) return 120;
  if (victory.currentTurnLethalProbability >= 60) return 70;
  // Board that can close NEXT turn is real equity and must not read as zero
  // just because this turn's swings are already spent.
  return (
    victory.expectedSuccessfulLifeDamage * 12 +
    victory.nextTurnLifeDamagePotential * 6 +
    victory.boardAttackers * 4
  );
}

export function shouldPrioritizeLethal(victory: VictoryProjection, survivalRisk: number): boolean {
  return victory.currentTurnLethalProbability >= 75 || (victory.currentTurnLethalProbability >= 50 && survivalRisk < 0.3);
}
