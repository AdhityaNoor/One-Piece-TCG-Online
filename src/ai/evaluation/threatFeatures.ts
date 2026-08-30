/**
 * Cheap features describing "how badly can the opponent hurt me before my next
 * turn" — the question `projectOpponentTurn` currently answers by simulating
 * the opponent's entire turn at every lookahead leaf.
 *
 * Stage 2 measured that simulation at ~5.5ms per leaf and ~2.2x the cost of a
 * whole decision, and then measured what happens without it: aggro matchups
 * improve, control matchups collapse (held-out 40% vs tuned 83%). So the
 * projection is load-bearing and cannot simply be deleted — it has to be
 * replaced by something that answers the same question far more cheaply.
 *
 * Everything here is already computed elsewhere in the evaluator for other
 * reasons (survivalAnalyzer walks the opponent's public board once), so the
 * feature vector is close to free next to a full turn simulation.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import type { GameState } from '../../engine/state/game';
import { evaluateSurvivalProjection } from './survivalAnalyzer';
import { opponentLifeCount, ownLifeCount } from '../visibility/playerView';

/**
 * Feature order is the contract between extraction and any fitted vector.
 * Renaming or reordering invalidates every saved model.
 */
export const THREAT_FEATURE_KEYS = [
  /** Life we hold — caps how much damage can matter at all. */
  'ownLife',
  /** Net Life the opponent's public board projects through blockers/Counters. */
  'projectedLifeDamage',
  /** How many bodies can swing at us. */
  'incomingAttacks',
  /** Our active [Blocker] count. */
  'activeBlockers',
  /** Counter power sitting in our hand. */
  'handCounterPower',
  'immediateLossRisk',
  'nextTurnLossRisk',
  /** Strongest single opponent attacker, in thousands of power. */
  'maxThreatPower',
  /** Total opponent board power, in thousands. */
  'totalThreatPower',
  /** Our Leader's power, in thousands — what an attack has to beat. */
  'ownLeaderPower',
  /** Opponent's remaining Life; low means they may race rather than defend. */
  'opponentLife',
  /** Opponent DON!! available to pump with. */
  'opponentActiveDon',
  /** Our own board — bodies that can trade or block next turn. */
  'ownCharacters',
  /** Whether it is currently our turn (the projection means something different otherwise). */
  'isOwnTurn',
] as const;

export type ThreatFeatureKey = (typeof THREAT_FEATURE_KEYS)[number];
export type ThreatFeatures = Record<ThreatFeatureKey, number>;

export function extractThreatFeatures(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): ThreatFeatures {
  const survival = evaluateSurvivalProjection(state, playerId, defs);
  const opponentId = getOpponentId(state, playerId);
  const opponent = state.players[opponentId];
  const player = state.players[playerId];

  let maxThreat = 0;
  let totalThreat = 0;
  for (const id of opponent?.characterArea.cardIds ?? []) {
    const power = computeCurrentPower(defs, state, id);
    totalThreat += power;
    if (power > maxThreat) maxThreat = power;
  }
  const oppLeaderId = opponent?.leaderInstanceId;
  if (oppLeaderId) {
    const power = computeCurrentPower(defs, state, oppLeaderId);
    totalThreat += power;
    if (power > maxThreat) maxThreat = power;
  }

  const ownLeaderId = player?.leaderInstanceId;

  return {
    ownLife: ownLifeCount(state, playerId),
    projectedLifeDamage: survival.projectedLifeDamage,
    incomingAttacks: survival.projectedIncomingAttacks,
    activeBlockers: survival.activeBlockerCount,
    handCounterPower: survival.handCounterPower / 1000,
    immediateLossRisk: survival.immediateLossRisk,
    nextTurnLossRisk: survival.nextTurnLossRisk,
    maxThreatPower: maxThreat / 1000,
    totalThreatPower: totalThreat / 1000,
    ownLeaderPower: ownLeaderId ? computeCurrentPower(defs, state, ownLeaderId) / 1000 : 0,
    opponentLife: opponentLifeCount(state, playerId),
    opponentActiveDon:
      opponent?.costArea.cardIds.filter((id) => state.cardsById[id]?.donRested === false).length ?? 0,
    ownCharacters: player?.characterArea.cardIds.length ?? 0,
    isOwnTurn: state.activePlayerId === playerId ? 1 : 0,
  };
}

export function threatFeaturesToVector(features: ThreatFeatures): number[] {
  return THREAT_FEATURE_KEYS.map((key) => features[key]);
}
