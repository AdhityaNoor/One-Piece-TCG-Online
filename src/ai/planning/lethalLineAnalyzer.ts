import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import {
  cannotAttack,
  getForcedAttackTargetId,
  hasContinuousKeyword,
} from '../../engine/rules/shared/power';
import type { GameState } from '../../engine/state/game';
import type { StrategicGamePlan } from '../strategy/types';
import { opponentLifeCount, ownFieldCardIds } from '../visibility/playerView';
import { getOpponentId } from '../../engine/rules/shared';

export interface RemainingAttacker {
  instanceId: string;
  power: number;
  lifeDamageOnLeader: number;
  isLeader: boolean;
}

export interface LethalLineAnalysis {
  opponentLife: number;
  remainingActiveAttackers: RemainingAttacker[];
  remainingLifeDamagePotential: number;
  remainingTotalPower: number;
  canCloseThisTurn: boolean;
  oneAttackFromLethal: boolean;
  hasOpenLethalLine: boolean;
}

function canAttackLeader(
  state: GameState,
  defs: CardDefinitionLookup,
  playerId: string,
  attackerInstanceId: string,
): boolean {
  if (state.currentPhase !== 'main' || state.activePlayerId !== playerId || state.currentBattle) return false;
  if (state.turnNumber <= 2) return false;

  const attacker = state.cardsById[attackerInstanceId];
  if (!attacker || attacker.ownerId !== playerId) return false;
  if (attacker.currentZone !== 'leaderArea' && attacker.currentZone !== 'characterArea') return false;
  if (attacker.orientation !== 'active') return false;
  if (attacker.summoningSick && !hasContinuousKeyword(defs, state, attackerInstanceId, 'rush')) return false;
  if (cannotAttack(state, attackerInstanceId, defs)) return false;

  const opponentId = getOpponentId(state, playerId);
  const leaderId = state.players[opponentId]?.leaderInstanceId;
  if (!leaderId) return false;

  const forcedTarget = getForcedAttackTargetId(state, attackerInstanceId, defs);
  if (forcedTarget && forcedTarget !== leaderId) return false;

  // Life damage requires winning the power comparison (7-1-4).
  const attackerPower = computeCurrentPower(defs, state, attackerInstanceId);
  const leaderPower = computeCurrentPower(defs, state, leaderId);
  if (attackerPower < leaderPower) return false;

  return true;
}

function lifeDamageOnLeaderHit(defs: CardDefinitionLookup, state: GameState, attackerInstanceId: string): number {
  const inst = state.cardsById[attackerInstanceId];
  if (!inst) return 0;
  const def = getDefinition(defs, inst);
  return def.hasDoubleAttack ? 2 : 1;
}

export function analyzeLethalLine(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): LethalLineAnalysis {
  const opponentLife = opponentLifeCount(state, playerId);
  const remainingActiveAttackers: RemainingAttacker[] = [];

  for (const instanceId of ownFieldCardIds(state, playerId)) {
    const inst = state.cardsById[instanceId];
    if (!inst || inst.currentZone === 'stageArea') continue;
    if (!canAttackLeader(state, defs, playerId, instanceId)) continue;

    remainingActiveAttackers.push({
      instanceId,
      power: computeCurrentPower(defs, state, instanceId),
      lifeDamageOnLeader: lifeDamageOnLeaderHit(defs, state, instanceId),
      isLeader: inst.currentZone === 'leaderArea',
    });
  }

  const remainingLifeDamagePotential = remainingActiveAttackers.reduce(
    (sum, attacker) => sum + attacker.lifeDamageOnLeader,
    0,
  );
  const remainingTotalPower = remainingActiveAttackers.reduce((sum, attacker) => sum + attacker.power, 0);
  const canCloseThisTurn = remainingLifeDamagePotential >= opponentLife && opponentLife > 0;
  const oneAttackFromLethal = remainingActiveAttackers.some((a) => a.lifeDamageOnLeader >= opponentLife);
  const hasOpenLethalLine =
    remainingActiveAttackers.length > 0 &&
    (canCloseThisTurn || oneAttackFromLethal || opponentLife <= remainingLifeDamagePotential + 1);

  return {
    opponentLife,
    remainingActiveAttackers,
    remainingLifeDamagePotential,
    remainingTotalPower,
    canCloseThisTurn,
    oneAttackFromLethal,
    hasOpenLethalLine,
  };
}

export function prematureEndMainPenalty(
  line: LethalLineAnalysis,
  mode: StrategicGamePlan,
  lethalPriority: boolean,
): number {
  if (line.remainingActiveAttackers.length === 0) return 0;

  if (line.canCloseThisTurn) return 140;
  if (line.oneAttackFromLethal) return 110;

  if (lethalPriority || mode === 'lethal_search' || mode === 'pressure') {
    if (line.opponentLife <= 2 && line.remainingLifeDamagePotential >= 1) return 90;
    if (line.opponentLife <= 3 && line.remainingLifeDamagePotential >= line.opponentLife - 1) return 70;
    if (line.hasOpenLethalLine) return 45 + line.remainingActiveAttackers.length * 8;
  }

  return 0;
}

export function attackLeaderLethalBonus(line: LethalLineAnalysis, isLeaderTarget: boolean): number {
  if (!isLeaderTarget) return 0;
  if (line.oneAttackFromLethal) return 65;
  if (line.canCloseThisTurn) return 45;
  if (line.hasOpenLethalLine) return 20 + (3 - Math.min(3, line.opponentLife)) * 8;
  return 0;
}

export function developDuringLethalPenalty(line: LethalLineAnalysis, mode: StrategicGamePlan): number {
  if (!line.hasOpenLethalLine) return 0;
  if (mode === 'lethal_search' && line.canCloseThisTurn) return 35;
  if (mode === 'lethal_search' && line.opponentLife <= 2) return 20;
  return 0;
}
