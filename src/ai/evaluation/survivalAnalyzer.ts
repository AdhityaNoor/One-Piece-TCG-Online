/**
 * Own-Life survival model (leader guide §8).
 * Estimates whether the opponent can reduce Life to defeat before our next turn,
 * using public board info + our own hand Counters (never opponent hidden hand).
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { GameState } from '../../engine/state/game';
import type { StrategicResource, SurvivalProjection } from '../strategy/types';
import {
  opponentPublicCardIds,
  ownHandIds,
  ownLifeCount,
} from '../visibility/playerView';
import { printedCounterValue } from './counterEfficiency';

export interface IncomingAttacker {
  instanceId: string;
  power: number;
  lifeDamageIfLeaderHit: number;
  isUnblockable: boolean;
  hasRush: boolean;
  isLeader: boolean;
}

export interface SurvivalBreakdown {
  ownLife: number;
  incomingAttackers: IncomingAttacker[];
  projectedLifeDamage: number;
  activeBlockerCount: number;
  handCounterPower: number;
  requiredResourcesToSurvive: StrategicResource[];
}

function canOpponentAttackSoon(
  state: GameState,
  defs: CardDefinitionLookup,
  instanceId: string,
): boolean {
  const inst = state.cardsById[instanceId];
  if (!inst) return false;
  if (inst.currentZone !== 'characterArea' && inst.currentZone !== 'leaderArea') return false;
  if (inst.orientation !== 'active') return false;
  const def = getDefinition(defs, inst);
  // Public knowledge: summoningSick is visible on field; Rush overrides it.
  if (inst.summoningSick && !def.hasRush) return false;
  return true;
}

export function listIncomingAttackers(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): IncomingAttacker[] {
  const attackers: IncomingAttacker[] = [];
  for (const id of opponentPublicCardIds(state, playerId)) {
    if (!canOpponentAttackSoon(state, defs, id)) continue;
    const inst = state.cardsById[id]!;
    const def = getDefinition(defs, inst);
    const power = computeCurrentPower(defs, state, id);
    attackers.push({
      instanceId: id,
      power,
      lifeDamageIfLeaderHit: def.hasDoubleAttack ? 2 : 1,
      isUnblockable: def.isUnblockable,
      hasRush: def.hasRush,
      isLeader: inst.currentZone === 'leaderArea',
    });
  }
  return attackers.sort((a, b) => b.power - a.power);
}

export function countActiveBlockers(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): number {
  const player = state.players[playerId];
  if (!player) return 0;
  let count = 0;
  for (const id of player.characterArea.cardIds) {
    const inst = state.cardsById[id];
    if (!inst || inst.orientation !== 'active') continue;
    if (getDefinition(defs, inst).hasBlocker) count += 1;
  }
  return count;
}

export function ownHandCounterPower(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): number {
  let total = 0;
  for (const id of ownHandIds(state, playerId)) {
    total += printedCounterValue(state, defs, id);
  }
  return total;
}

/**
 * Pessimistic Life-damage projection: unblockable swings always hit Life;
 * other swings consume one blocker each (if any remain), else hit Life.
 * Does not simulate Counter (handled separately as defensive capacity).
 */
export function projectIncomingLifeDamage(
  attackers: IncomingAttacker[],
  blockerCount: number,
): number {
  let blockersLeft = blockerCount;
  let damage = 0;
  for (const atk of attackers) {
    if (atk.isUnblockable || blockersLeft <= 0) {
      damage += atk.lifeDamageIfLeaderHit;
      continue;
    }
    // Assume we block; Character trade may fail but Life is spared this swing.
    blockersLeft -= 1;
  }
  return damage;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function analyzeSurvivalBreakdown(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): SurvivalBreakdown {
  const ownLife = ownLifeCount(state, playerId);
  const incomingAttackers = listIncomingAttackers(state, playerId, defs);
  const activeBlockerCount = countActiveBlockers(state, playerId, defs);
  const handCounterPower = ownHandCounterPower(state, playerId, defs);
  const projectedLifeDamage = projectIncomingLifeDamage(incomingAttackers, activeBlockerCount);

  const required: StrategicResource[] = [];
  if (projectedLifeDamage >= ownLife && ownLife > 0) {
    if (handCounterPower < 2000) required.push('counter_hand');
    if (activeBlockerCount < incomingAttackers.filter((a) => !a.isUnblockable).length) {
      required.push('blocker');
    }
    required.push('life_buffer');
  } else if (projectedLifeDamage >= ownLife - 1 && ownLife <= 3) {
    if (handCounterPower > 0) required.push('counter_hand');
    if (activeBlockerCount > 0) required.push('blocker');
  }

  // Board removal risk: many active opponent bodies while we are low Life.
  if (ownLife <= 2 && incomingAttackers.length >= 2) {
    required.push('removal');
  }

  // Active DON is mainly for our turn plays; still flag when we need defensive activations.
  const opponentId = getOpponentId(state, playerId);
  const oppDon = state.players[opponentId]?.costArea.cardIds.length ?? 0;
  if (ownLife <= 2 && oppDon >= 5 && !required.includes('active_don')) {
    // Soft signal only — opponent may pump; we keep some DON for our answers next turn.
    required.push('active_don');
  }

  return {
    ownLife,
    incomingAttackers,
    projectedLifeDamage,
    activeBlockerCount,
    handCounterPower,
    requiredResourcesToSurvive: [...new Set(required)],
  };
}

export function evaluateSurvivalProjection(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): SurvivalProjection {
  const breakdown = analyzeSurvivalBreakdown(state, playerId, defs);
  const { ownLife, incomingAttackers, projectedLifeDamage, activeBlockerCount, handCounterPower } =
    breakdown;

  // Fixtures sometimes leave lifeArea empty without gameOver — don't invent panic.
  if (ownLife <= 0 && !state.gameOver) {
    return {
      immediateLossRisk: 0.05,
      nextTurnLossRisk: 0.05,
      projectedIncomingAttacks: incomingAttackers.length,
      estimatedDefensiveCapacity: activeBlockerCount * 2500 + handCounterPower,
      requiredResourcesToSurvive: [],
      projectedLifeDamage: 0,
      handCounterPower,
      activeBlockerCount,
    };
  }

  const battle = state.currentBattle;
  const battleIncoming = battle
    ? computeCurrentPower(defs, state, battle.attackerInstanceId)
    : 0;

  // Counter can save a Life swing if deficit is coverable; treat as soft Life buffer.
  const counterSaves = Math.min(2, Math.floor(handCounterPower / 2000));
  const netDamage = Math.max(
    0,
    projectedLifeDamage - (ownLife <= 2 ? counterSaves : Math.floor(counterSaves / 2)),
  );

  let immediateLossRisk = 0.08;
  if (battle && ownLife <= 1 && battleIncoming > 0) {
    const leaderId = state.players[playerId]?.leaderInstanceId;
    const leaderPower = leaderId ? computeCurrentPower(defs, state, leaderId) : 0;
    const deficit = Math.max(0, battleIncoming - leaderPower);
    if (deficit <= 0) immediateLossRisk = 0.15;
    else if (handCounterPower >= deficit) immediateLossRisk = 0.25;
    else immediateLossRisk = 0.9;
  } else if (ownLife <= 1 && netDamage >= 1) {
    immediateLossRisk = 0.85;
  } else if (ownLife <= 2 && netDamage >= ownLife) {
    immediateLossRisk = 0.7;
  } else if (ownLife <= 2 && incomingAttackers.length >= 1) {
    immediateLossRisk = 0.35;
  }

  let nextTurnLossRisk = 0.08;
  if (netDamage >= ownLife) nextTurnLossRisk = 0.92;
  else if (netDamage >= ownLife - 1 && ownLife <= 3) nextTurnLossRisk = 0.65;
  else if (projectedLifeDamage >= 2 && ownLife <= 3) nextTurnLossRisk = 0.45;
  else if (incomingAttackers.length >= 3) nextTurnLossRisk = 0.3;
  else if (ownLife <= 2) nextTurnLossRisk = 0.22;

  // Double Attack / Rush bump.
  const daCount = incomingAttackers.filter((a) => a.lifeDamageIfLeaderHit >= 2).length;
  const rushCount = incomingAttackers.filter((a) => a.hasRush).length;
  nextTurnLossRisk = clamp01(nextTurnLossRisk + daCount * 0.08 + rushCount * 0.04);
  immediateLossRisk = clamp01(immediateLossRisk);

  const estimatedDefensiveCapacity =
    ownLife * 1000 +
    activeBlockerCount * 2500 +
    handCounterPower +
    (state.players[playerId]?.characterArea.cardIds.length ?? 0) * 400;

  return {
    immediateLossRisk,
    nextTurnLossRisk,
    projectedIncomingAttacks: battle ? 1 : incomingAttackers.length,
    estimatedDefensiveCapacity,
    requiredResourcesToSurvive: breakdown.requiredResourcesToSurvive,
    projectedLifeDamage: netDamage,
    handCounterPower,
    activeBlockerCount,
  };
}

/** True when the AI should avoid spending Counter / blocker resources casually. */
export function shouldPreserveDefenses(survival: SurvivalProjection): boolean {
  return (
    survival.nextTurnLossRisk >= 0.4 ||
    survival.immediateLossRisk >= 0.35 ||
    survival.requiredResourcesToSurvive.includes('counter_hand') ||
    survival.requiredResourcesToSurvive.includes('blocker')
  );
}
