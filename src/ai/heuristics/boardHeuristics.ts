import type { GameState } from '../../engine/state/game';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import { opponentLifeCount, opponentPublicCardIds, ownHandIds, ownLifeCount } from '../visibility/playerView';
import { hasEffectiveCombatKeyword } from '../visibility/combatKeywords';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { scoreHandCardPlay } from './effectValue';
import { getEvaluatorWeights } from '../evaluation/weights';
import { damagePotential } from '../evaluation/attackPotential';

export function boardStrength(state: GameState, playerId: string, defs: CardDefinitionLookup, registry: EffectTemplateRegistry = {}): number {
  let score = 0;
  const player = state.players[playerId];
  if (!player) return 0;

  const w = getEvaluatorWeights();
  const leader = state.cardsById[player.leaderInstanceId];
  if (leader) score += (computeCurrentPower(defs, state, leader.instanceId) / 1000) * w.powerPerThousand;

  for (const id of player.characterArea.cardIds) {
    const inst = state.cardsById[id];
    if (!inst) continue;
    const power = computeCurrentPower(defs, state, id);
    score += (power / 1000) * w.powerPerThousand;
    if (inst.orientation === 'active') score += w.activeCharacter;
    score += inst.donAttached.length * w.donAttached;
    const def = getDefinition(defs, inst);
    if (hasEffectiveCombatKeyword(defs, state, id, 'blocker')) score += w.blocker;
    if (hasEffectiveCombatKeyword(defs, state, id, 'rush')) score += w.rush;
    if (Object.keys(registry).length > 0) {
      score += scoreHandCardPlay({ state, playerId, defs, registry, sourceInstanceId: id, sourceCardDefinitionId: inst.cardDefinitionId }, id) * 0.08;
    }
  }

  // Stages sit in their own zone and were previously invisible here, so
  // resolving a Stage read as a card leaving hand for nothing and the CPU
  // scored playing one as a pure loss. A Stage is a permanent that usually
  // carries an [Activate: Main] or a continuous ability, so value it as a
  // body-less permanent plus whatever its program is worth.
  for (const id of player.stageArea.cardIds) {
    const inst = state.cardsById[id];
    if (!inst) continue;
    score += w.stage;
    if (Object.keys(registry).length > 0) {
      score += scoreHandCardPlay({ state, playerId, defs, registry, sourceInstanceId: id, sourceCardDefinitionId: inst.cardDefinitionId }, id) * 0.08;
    }
  }

  for (const id of ownHandIds(state, playerId)) {
    score += w.handCard;
    if (Object.keys(registry).length > 0) {
      score += scoreHandCardPlay({ state, playerId, defs, registry, sourceInstanceId: id, sourceCardDefinitionId: state.cardsById[id]?.cardDefinitionId }, id) * 0.05;
    }
  }
  score += ownLifeCount(state, playerId) * w.lifeCard;
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
  const w = getEvaluatorWeights();
  return (self - opp) * w.boardDifference + lifeDelta * w.lifeDifference;
}

export function threatPower(state: GameState, playerId: string, defs: CardDefinitionLookup): number {
  let max = 0;
  for (const id of opponentPublicCardIds(state, playerId)) {
    max = Math.max(max, computeCurrentPower(defs, state, id));
  }
  return max;
}

/**
 * How close this player is to winning, 0-100.
 *
 * This drives selectStrategicMode(), so getting it wrong mis-sets the CPU's
 * whole game plan. It used to sum board power and return a flat 100 whenever
 * `total >= opponentLife * 1000` — meaning a lone 5000-power Leader against a
 * full 5 Life scored MAXIMUM lethal pressure on turn one. The CPU then sat in
 * 'lethal_search' for the entire game, and that mode's weights are
 * `survival: 0.7, development: 0.5, preserveHand: 0.3`: it was explicitly told
 * to stop developing and stop holding defensive cards while it "closed out" a
 * win that was ten turns away. gamePhaseAnalyzer had already noticed and
 * clamped the 100 locally; the fix belongs here, at the source.
 *
 * Life damage is a count of connecting attacks (7-1-4 / 10-1-3), so measure it
 * with the shared attack-count model instead.
 */
export function lethalPressure(state: GameState, playerId: string, defs: CardDefinitionLookup): number {
  const oppLife = opponentLifeCount(state, playerId);
  if (oppLife <= 0) return state.gameOver ? 100 : 0;

  const now = damagePotential(state, playerId, defs, 'thisTurn');
  if (now.rawLifeDamage >= oppLife) return 100;

  const next = damagePotential(state, playerId, defs, 'nextTurn');
  const nowShare = Math.min(1, now.rawLifeDamage / oppLife);
  const nextShare = Math.min(1, next.rawLifeDamage / oppLife);
  // Weighted toward what can be closed RIGHT NOW; the refreshed board only
  // earns partial credit, so a wide board is never mistaken for a kill.
  return Math.min(95, nowShare * 70 + nextShare * 20);
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
