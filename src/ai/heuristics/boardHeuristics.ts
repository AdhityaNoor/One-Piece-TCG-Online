import type { GameState } from '../../engine/state/game';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import { opponentLifeCount, opponentPublicCardIds, ownHandIds, ownLifeCount } from '../visibility/playerView';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { scoreHandCardPlay } from './effectValue';

export function boardStrength(state: GameState, playerId: string, defs: CardDefinitionLookup, registry: EffectTemplateRegistry = {}): number {
  let score = 0;
  const player = state.players[playerId];
  if (!player) return 0;

  const leader = state.cardsById[player.leaderInstanceId];
  if (leader) score += computeCurrentPower(defs, state, leader.instanceId) / 1000;

  for (const id of player.characterArea.cardIds) {
    const inst = state.cardsById[id];
    if (!inst) continue;
    const power = computeCurrentPower(defs, state, id);
    score += power / 1000;
    if (inst.orientation === 'active') score += 1.5;
    score += inst.donAttached.length * 0.5;
    const def = getDefinition(defs, inst);
    if (def.hasBlocker) score += 1;
    if (def.hasRush) score += 0.5;
    if (Object.keys(registry).length > 0) {
      score += scoreHandCardPlay({ state, playerId, defs, registry, sourceInstanceId: id, sourceCardDefinitionId: inst.cardDefinitionId }, id) * 0.08;
    }
  }

  for (const id of ownHandIds(state, playerId)) {
    score += 0.4;
    if (Object.keys(registry).length > 0) {
      score += scoreHandCardPlay({ state, playerId, defs, registry, sourceInstanceId: id, sourceCardDefinitionId: state.cardsById[id]?.cardDefinitionId }, id) * 0.05;
    }
  }
  score += ownLifeCount(state, playerId) * 1.2;
  return score;
}

export function evaluatePosition(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): number {
  const opponentId = Object.keys(state.players).find((id) => id !== playerId);
  if (!opponentId) return 0;
  const self = boardStrength(state, playerId, defs, registry);
  const opp = boardStrength(state, opponentId, defs, registry);
  const lifeDelta = ownLifeCount(state, playerId) - opponentLifeCount(state, playerId);
  return (self - opp) * 10 + lifeDelta * 8;
}

export function threatPower(state: GameState, playerId: string, defs: CardDefinitionLookup): number {
  let max = 0;
  for (const id of opponentPublicCardIds(state, playerId)) {
    max = Math.max(max, computeCurrentPower(defs, state, id));
  }
  return max;
}

export function lethalPressure(state: GameState, playerId: string, defs: CardDefinitionLookup): number {
  const player = state.players[playerId];
  if (!player) return 0;
  let total = 0;
  const leaderId = player.leaderInstanceId;
  if (leaderId) {
    const leader = state.cardsById[leaderId];
    if (leader?.orientation === 'active' && !leader.summoningSick) {
      total += computeCurrentPower(defs, state, leaderId);
    }
  }
  for (const id of player.characterArea.cardIds) {
    const inst = state.cardsById[id];
    if (!inst || inst.orientation !== 'active' || inst.summoningSick) continue;
    total += computeCurrentPower(defs, state, id);
  }
  const oppLife = opponentLifeCount(state, playerId);
  if (total >= oppLife * 1000) return 100;
  return total / Math.max(1, oppLife) / 100;
}

/**
 * Opening-hand quality heuristics used for mulligan and early development.
 * Prefer keeping a curve with 1–3 cost Characters over an all-brick high-cost hand.
 */
export function mulliganScore(state: GameState, playerId: string, defs: CardDefinitionLookup): number {
  // Lightweight fallback when registry/strategic context is unavailable.
  const hand = ownHandIds(state, playerId);
  let characters = 0;
  let early = 0;
  let costSum = 0;
  for (const id of hand) {
    const inst = state.cardsById[id];
    if (!inst) continue;
    const def = getDefinition(defs, inst);
    if (def.category === 'character') {
      characters += 1;
      costSum += def.baseCost ?? 0;
      if ((def.baseCost ?? 0) <= 3) early += 1;
    }
  }
  let score = characters * 12 + early * 10 + costSum * 1.5 + hand.length;
  if (characters === 0) score -= 20;
  if (early === 0 && characters > 0) score -= 12;
  return score;
}
