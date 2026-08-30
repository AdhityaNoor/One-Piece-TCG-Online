/**
 * Life-damage potential, counted in ATTACKS.
 *
 * Comprehensive Rule 7-1-4: a battle deals Life damage only when the attacker's
 * power is greater than or equal to the defender's, and a successful attack on
 * a Leader takes exactly ONE Life card ([Double Attack], 10-1-3, takes two).
 * Damage is therefore a function of how many attacks connect — never of how
 * much power is on the board. Summing power and comparing it to
 * `opponentLife * 1000` (the old estimateVictory) said a single 5000-power
 * Leader was 95% lethal against 4 Life; it is at most 1 Life.
 *
 * Two horizons matter to the planner and they must be measured differently:
 *
 *  - THIS turn: only cards that can still legally declare an attack — active,
 *    not summoning-sick (unless [Rush], 10-1-1), not attack- or rest-locked.
 *    Attacking consumes this, which is correct: the damage is realized.
 *
 *  - NEXT turn: every Leader and Character in play, regardless of orientation
 *    or summoning sickness, because the Refresh Phase (6-1) sets them active
 *    and the sickness is gone. Attached DON!! is excluded — it returns to the
 *    cost area at end of turn (6-5-5), so it will not be pumping next turn.
 *    Keeping this horizon orientation-independent is what stops the evaluator
 *    from treating "I attacked" as "I lost my win condition".
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import {
  cannotAttack,
  cannotRestSelf,
  computeCurrentPower,
  getForcedAttackTargetId,
} from '../../engine/rules/shared/power';
import type { GameState } from '../../engine/state/game';
import { hasEffectiveCombatKeyword } from '../visibility/combatKeywords';
import { opponentLifeCount } from '../visibility/playerView';

export interface PotentialAttacker {
  instanceId: string;
  /** Power used for the 7-1-4 comparison at the horizon being measured. */
  power: number;
  /** Life cards taken when this attack connects with the Leader (10-1-3). */
  lifeDamage: number;
  isLeader: boolean;
}

export interface DamagePotential {
  attackers: PotentialAttacker[];
  /** Life cards removed if every listed attack connects, capped at opponent Life. */
  lifeDamage: number;
  /** Uncapped sum — useful for "how much overkill do we have". */
  rawLifeDamage: number;
  /** Attacks the opponent's active [Blocker] bodies can absorb (10-1-2). */
  blockedAttacks: number;
}

export type DamageHorizon = 'thisTurn' | 'nextTurn';

function ownBattleCardIds(state: GameState, playerId: string): string[] {
  const player = state.players[playerId];
  if (!player) return [];
  // Stages never attack (they are not Characters) — leaderArea + characterArea only.
  return [player.leaderInstanceId, ...player.characterArea.cardIds].filter((id): id is string => !!id);
}

function opponentLeaderId(state: GameState, playerId: string): string | null {
  return state.players[getOpponentId(state, playerId)]?.leaderInstanceId ?? null;
}

function lifeDamageOnLeaderHit(
  defs: CardDefinitionLookup,
  state: GameState,
  instanceId: string,
): number {
  return hasEffectiveCombatKeyword(defs, state, instanceId, 'doubleAttack') ? 2 : 1;
}

/** Opponent's active [Blocker] Characters — each can absorb one attack (10-1-2). */
export function opponentActiveBlockerCount(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): number {
  const opponent = state.players[getOpponentId(state, playerId)];
  if (!opponent) return 0;
  let count = 0;
  for (const id of opponent.characterArea.cardIds) {
    if (state.cardsById[id]?.orientation !== 'active') continue;
    if (hasEffectiveCombatKeyword(defs, state, id, 'blocker')) count += 1;
  }
  return count;
}

function canAttackAtHorizon(
  state: GameState,
  defs: CardDefinitionLookup,
  playerId: string,
  instanceId: string,
  horizon: DamageHorizon,
): boolean {
  const inst = state.cardsById[instanceId];
  if (!inst || inst.ownerId !== playerId) return false;
  if (inst.currentZone !== 'leaderArea' && inst.currentZone !== 'characterArea') return false;
  // Locks are card-effect state and survive the Refresh Phase, so they apply
  // to both horizons.
  if (cannotAttack(state, instanceId, defs)) return false;
  if (cannotRestSelf(state, instanceId, defs)) return false;

  const leaderId = opponentLeaderId(state, playerId);
  if (!leaderId) return false;
  const forced = getForcedAttackTargetId(state, instanceId, defs);
  if (forced && forced !== leaderId) return false;

  if (horizon === 'nextTurn') return true;

  // This turn only: must actually be able to declare right now.
  if (inst.orientation !== 'active') return false;
  if (inst.summoningSick && !hasEffectiveCombatKeyword(defs, state, instanceId, 'rush')) return false;
  return true;
}

function powerAtHorizon(
  state: GameState,
  defs: CardDefinitionLookup,
  instanceId: string,
  horizon: DamageHorizon,
): number {
  const power = computeCurrentPower(defs, state, instanceId);
  if (horizon === 'thisTurn') return power;
  // Attached DON!! returns at end of turn (6-5-5); computeCurrentPower only
  // counts it on the owner's own turn, so subtract it exactly when it is in.
  const inst = state.cardsById[instanceId];
  if (!inst || state.activePlayerId !== inst.ownerId) return power;
  return power - inst.donAttached.length * 1000;
}

/**
 * Life damage this player can force through at `horizon`, in attacks.
 * Only attacks that win the 7-1-4 power comparison against the opponent's
 * Leader are counted; the opponent's active Blockers absorb the weakest ones.
 */
export function damagePotential(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  horizon: DamageHorizon,
): DamagePotential {
  const leaderId = opponentLeaderId(state, playerId);
  const empty: DamagePotential = { attackers: [], lifeDamage: 0, rawLifeDamage: 0, blockedAttacks: 0 };
  if (!leaderId) return empty;

  const leaderPower = powerAtHorizon(state, defs, leaderId, horizon === 'thisTurn' ? 'thisTurn' : 'nextTurn');
  const attackers: PotentialAttacker[] = [];

  for (const instanceId of ownBattleCardIds(state, playerId)) {
    if (!canAttackAtHorizon(state, defs, playerId, instanceId, horizon)) continue;
    const power = powerAtHorizon(state, defs, instanceId, horizon);
    if (power < leaderPower) continue; // 7-1-4: no Life damage without winning the comparison.
    attackers.push({
      instanceId,
      power,
      lifeDamage: lifeDamageOnLeaderHit(defs, state, instanceId),
      isLeader: state.cardsById[instanceId]?.currentZone === 'leaderArea',
    });
  }

  // Blockers absorb whole attacks (10-1-2). Give up the least valuable swings.
  const byValue = [...attackers].sort((a, b) => b.lifeDamage - a.lifeDamage || b.power - a.power);
  const blockers = Math.min(opponentActiveBlockerCount(state, playerId, defs), byValue.length);
  const connecting = blockers > 0 ? byValue.slice(0, Math.max(0, byValue.length - blockers)) : byValue;

  const rawLifeDamage = connecting.reduce((sum, a) => sum + a.lifeDamage, 0);
  const opponentLife = opponentLifeCount(state, playerId);
  return {
    attackers,
    rawLifeDamage,
    lifeDamage: Math.min(rawLifeDamage, Math.max(0, opponentLife)),
    blockedAttacks: blockers,
  };
}
