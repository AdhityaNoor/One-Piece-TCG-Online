/**
 * Opening hand / mulligan quality and search-target priorities
 * (guide acceptance: search targets from game plan; mulligan keep vs redraw).
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { GamePhase, StrategicContext } from '../strategy/types';
import { ownHandIds } from '../visibility/playerView';
import { computeLeaderSynergy } from '../analysis/synergyAnalyzer';
import { buildCardStrategicProfile, scoreProfileForMode } from '../analysis/cardStrategicProfile';
import { scoreHandCardPlay, type EffectScoreContext } from '../heuristics/effectValue';
import { analyzeLeaderStrategy } from '../strategy/leaderStrategyAnalyzer';

export const MULLIGAN_KEEP_THRESHOLD = 34;

export interface OpeningHandAnalysis {
  keepScore: number;
  shouldRedraw: boolean;
  characterCount: number;
  earlyPlayCount: number;
  synergyCount: number;
  brickPenalty: number;
}

function isEarlyCost(cost: number): boolean {
  return cost <= 3;
}

function isCurveCost(cost: number): boolean {
  return cost >= 1 && cost <= 4;
}

/**
 * Score whether the current hand is worth keeping through mulligan.
 * Higher = better keep. Redraw when below MULLIGAN_KEEP_THRESHOLD.
 */
export function analyzeOpeningHand(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic?: StrategicContext,
): OpeningHandAnalysis {
  const leader = strategic?.leader ?? analyzeLeaderStrategy(state, playerId, defs, registry);
  const hand = ownHandIds(state, playerId);
  const ctx: EffectScoreContext = { state, playerId, defs, registry };

  let keepScore = 8;
  let characterCount = 0;
  let earlyPlayCount = 0;
  let synergyCount = 0;
  let highCostOnly = hand.length > 0;
  let totalCost = 0;
  let counterCount = 0;
  let engineValue = 0;

  for (const id of hand) {
    const inst = state.cardsById[id];
    if (!inst) continue;
    const def = getDefinition(defs, inst);
    const cost = def.baseCost ?? 0;
    totalCost += cost;
    if (cost <= 4) highCostOnly = false;

    const synergy = computeLeaderSynergy(leader, inst.cardDefinitionId, defs, state, id);
    if (synergy >= 8) synergyCount += 1;

    const profile = buildCardStrategicProfile(inst.cardDefinitionId, registry, {
      ...ctx,
      sourceInstanceId: id,
      sourceCardDefinitionId: inst.cardDefinitionId,
    });
    engineValue += profile.engineValue + profile.searchValue * 0.5;

    if (def.category === 'character') {
      characterCount += 1;
      keepScore += 10;
      if (isEarlyCost(cost)) {
        earlyPlayCount += 1;
        keepScore += 14;
        if (cost <= 2) keepScore += 6;
      } else if (isCurveCost(cost)) {
        keepScore += 6;
      } else {
        keepScore -= 4; // 5+ cost openers are often bricks
      }
      if (def.hasRush) keepScore += 4;
      if (def.hasBlocker) keepScore += 3;
    } else if (def.category === 'event') {
      keepScore += 3;
      if ((def.counter ?? 0) > 0) {
        counterCount += 1;
        keepScore += 4;
      }
    } else if (def.category === 'stage') {
      keepScore += synergy >= 8 ? 8 : 2;
    }

    keepScore += synergy * 0.9;
    keepScore += scoreHandCardPlay(ctx, id) * 0.15;
  }

  if (characterCount === 0) keepScore -= 28;
  if (earlyPlayCount === 0 && characterCount > 0) keepScore -= 16;
  if (earlyPlayCount >= 2) keepScore += 8;
  if (synergyCount >= 2) keepScore += 10;
  if (synergyCount === 0 && leader.requiredTypes.length > 0) keepScore -= 8;

  let brickPenalty = 0;
  if (highCostOnly && hand.length >= 3) {
    brickPenalty = 22;
    keepScore -= brickPenalty;
  }
  if (characterCount > 0 && totalCost / characterCount >= 5.5) {
    brickPenalty += 10;
    keepScore -= 10;
  }

  // Combo / engine leaders want at least one setup piece.
  if (leader.preferredPlans.includes('combo_setup') || leader.resourceEngine >= 12) {
    if (engineValue >= 8) keepScore += 8;
    else keepScore -= 6;
  }

  // Mild counter density is fine; all-counter no board is not.
  if (counterCount >= 3 && earlyPlayCount === 0) keepScore -= 10;

  keepScore += hand.length * 0.5;

  return {
    keepScore,
    shouldRedraw: keepScore < MULLIGAN_KEEP_THRESHOLD,
    characterCount,
    earlyPlayCount,
    synergyCount,
    brickPenalty,
  };
}

export function scoreMulliganDecision(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  redraw: boolean,
): number {
  const analysis = analyzeOpeningHand(state, playerId, defs, registry, strategic);
  if (redraw) {
    return analysis.shouldRedraw ? 70 : 12 - (analysis.keepScore - MULLIGAN_KEEP_THRESHOLD) * 0.4;
  }
  return analysis.shouldRedraw ? 14 - (MULLIGAN_KEEP_THRESHOLD - analysis.keepScore) * 0.3 : 65 + analysis.keepScore * 0.15;
}

/**
 * Extra search-target bias from game phase + leader plan.
 */
export function scoreSearchTargetForPlan(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  instanceId: string,
): number {
  const inst = ctx.state.cardsById[instanceId];
  if (!inst) return -20;
  const def = getDefinition(ctx.defs, inst);
  const cost = def.baseCost ?? 0;
  const profile = buildCardStrategicProfile(inst.cardDefinitionId, ctx.registry, {
    ...ctx,
    sourceInstanceId: instanceId,
    sourceCardDefinitionId: inst.cardDefinitionId,
  });

  const leaderBonus = computeLeaderSynergy(
    strategic.leader,
    inst.cardDefinitionId,
    ctx.defs,
    ctx.state,
    instanceId,
  );

  let score =
    scoreProfileForMode(profile, strategic.modeWeights) +
    leaderBonus * 1.5 +
    scoreHandCardPlay(ctx, instanceId) * 0.55;

  const phase: GamePhase = strategic.gamePhase;
  const activeDon =
    ctx.state.players[ctx.playerId]?.costArea.cardIds.filter(
      (id) => ctx.state.cardsById[id]?.donRested === false,
    ).length ?? 0;

  if (phase === 'early') {
    if (isEarlyCost(cost)) score += 14;
    if (cost <= activeDon + 2) score += 8;
    if (cost >= 6) score -= 12;
    score += profile.engineValue * 0.6 + profile.boardDevelopment * 0.5;
    score += profile.setupTags.includes('setup') || profile.setupTags.includes('engine') ? 8 : 0;
  } else if (phase === 'mid') {
    if (isCurveCost(cost)) score += 8;
    if (cost <= activeDon + 1) score += 6;
    score += profile.engineValue * 0.4 + profile.removalValue * 0.35;
  } else {
    // late
    score += profile.finisherValue * 0.9 + profile.offensiveValue * 0.5;
    if ((def.basePower ?? 0) >= 7000) score += 6;
    if (isEarlyCost(cost) && profile.engineValue < 4) score -= 4;
  }

  if (strategic.mode === 'combo_setup' || strategic.mode === 'develop') {
    score += profile.engineValue * 0.5 + profile.futureValue * 0.4;
  }
  if (strategic.mode === 'pressure' || strategic.mode === 'lethal_search') {
    score += profile.finisherValue * 0.7 + profile.offensiveValue * 0.45;
  }
  if (strategic.mode === 'defend' || strategic.mode === 'recovery') {
    if (def.hasBlocker || (def.counter ?? 0) >= 2000) score += 10;
  }

  // Prefer leader-type pieces when the Leader plan lists type requirements.
  if (strategic.leader.requiredTypes.length > 0 && leaderBonus < 8) {
    score -= 6;
  }

  return score;
}
