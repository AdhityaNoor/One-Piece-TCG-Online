import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { ThreatProfile } from '../strategy/types';
import { opponentPublicCardIds } from '../visibility/playerView';
import { buildCardStrategicProfile } from './cardStrategicProfile';
import { profileScalar } from './abilityAnalyzer';
import type { EffectScoreContext } from '../heuristics/effectValue';

export function buildThreatProfile(
  state: GameState,
  viewerId: string,
  instanceId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): ThreatProfile {
  const inst = state.cardsById[instanceId];
  if (!inst) {
    return {
      instanceId,
      cardDefinitionId: '',
      immediateThreat: 0,
      recurringValue: 0,
      synergyCentrality: 0,
      lethalContribution: 0,
      removalUrgency: 0,
    };
  }

  const def = getDefinition(defs, inst);
  const power = computeCurrentPower(defs, state, instanceId);
  const isLeader = inst.currentZone === 'leaderArea';
  const canAttack = inst.orientation === 'active' && !inst.summoningSick;

  const ctx: EffectScoreContext = {
    state,
    playerId: viewerId,
    defs,
    registry,
    sourceInstanceId: instanceId,
    sourceCardDefinitionId: inst.cardDefinitionId,
  };
  const profile = buildCardStrategicProfile(inst.cardDefinitionId, registry, ctx);
  const scalar = profileScalar(profile);

  const immediateThreat = (canAttack ? power / 800 : power / 2000) + (isLeader ? 6 : 0);
  const recurringValue = scalar * 0.12 + profile.engineValue * 0.08;
  const lethalContribution = canAttack ? power / 1000 + profile.finisherValue * 0.1 : profile.finisherValue * 0.05;
  const removalUrgency = immediateThreat + recurringValue + (def.hasBlocker ? 4 : 0) + profile.removalValue * -0.1;

  return {
    instanceId,
    cardDefinitionId: inst.cardDefinitionId,
    immediateThreat,
    recurringValue,
    synergyCentrality: profile.engineValue + profile.comboPotential,
    lethalContribution,
    removalUrgency: Math.max(0, removalUrgency),
  };
}

export function analyzeOpponentThreats(
  state: GameState,
  viewerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): ThreatProfile[] {
  return opponentPublicCardIds(state, viewerId)
    .map((id) => buildThreatProfile(state, viewerId, id, defs, registry))
    .sort((a, b) => b.removalUrgency - a.removalUrgency);
}

export function topThreatUrgency(threats: ThreatProfile[]): number {
  if (threats.length === 0) return 0;
  return threats[0].removalUrgency;
}
