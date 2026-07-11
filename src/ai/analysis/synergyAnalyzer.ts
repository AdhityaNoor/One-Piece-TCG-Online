import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { LeaderStrategicProfile, StrategicInteraction } from '../strategy/types';
import { ownHandIds } from '../visibility/playerView';
import { buildCardStrategicProfile } from './cardStrategicProfile';
import { profileScalar } from './abilityAnalyzer';
import type { EffectScoreContext } from '../heuristics/effectValue';

function cardTypes(def: ReturnType<typeof getDefinition>): string[] {
  return def.types ?? [];
}

export function computeLeaderSynergy(
  leader: LeaderStrategicProfile,
  cardDefinitionId: string,
  defs: CardDefinitionLookup,
  state: GameState,
  instanceId: string,
): number {
  const inst = state.cardsById[instanceId];
  if (!inst) return 0;
  const def = getDefinition(defs, inst);
  let bonus = 0;

  const types = cardTypes(def);
  for (const req of leader.requiredTypes) {
    if (types.some((t) => t.toLowerCase().includes(req.toLowerCase()))) {
      bonus += 8;
    }
  }

  if (leader.leaderCardDefinitionId === cardDefinitionId) bonus += 12;

  if (def.name && leader.description.toLowerCase().includes(def.name.toLowerCase().slice(0, 4))) {
    bonus += 4;
  }

  return bonus;
}

export function findHandInteractions(
  ctx: EffectScoreContext,
  leader: LeaderStrategicProfile,
): StrategicInteraction[] {
  const interactions: StrategicInteraction[] = [];
  const hand = ownHandIds(ctx.state, ctx.playerId);

  for (const id of hand) {
    const inst = ctx.state.cardsById[id];
    if (!inst) continue;
    const profile = buildCardStrategicProfile(inst.cardDefinitionId, ctx.registry, {
      ...ctx,
      sourceInstanceId: id,
    });
    const scalar = profileScalar(profile);

    if (profile.setupTags.includes('setup') || profile.setupTags.includes('engine')) {
      for (const otherId of hand) {
        if (otherId === id) continue;
        const other = ctx.state.cardsById[otherId];
        if (!other) continue;
        const otherProfile = buildCardStrategicProfile(other.cardDefinitionId, ctx.registry, {
          ...ctx,
          sourceInstanceId: otherId,
        });
        if (otherProfile.payoffTags.includes('payoff') || otherProfile.comboPotential >= 8) {
          interactions.push({
            sourceCardDefinitionId: inst.cardDefinitionId,
            targetCardDefinitionId: other.cardDefinitionId,
            relationship: 'setsUp',
            strength: Math.min(scalar, profileScalar(otherProfile)) * 0.15,
            reason: 'Setup piece enables payoff card in hand',
          });
        }
      }
    }

    const leaderBonus = computeLeaderSynergy(leader, inst.cardDefinitionId, ctx.defs, ctx.state, id);
    if (leaderBonus > 0) {
      interactions.push({
        sourceCardDefinitionId: inst.cardDefinitionId,
        relationship: 'amplifies',
        strength: leaderBonus,
        reason: 'Leader type/name synergy',
      });
    }
  }

  return interactions;
}

export function handSynergyBonus(
  interactions: StrategicInteraction[],
  cardDefinitionId: string,
  asSource: boolean,
): number {
  let bonus = 0;
  for (const ix of interactions) {
    if (asSource && ix.sourceCardDefinitionId === cardDefinitionId) bonus += ix.strength;
    if (!asSource && ix.targetCardDefinitionId === cardDefinitionId) bonus += ix.strength * 1.2;
  }
  return bonus;
}

export function amplifiesHandAfterPlay(
  ctx: EffectScoreContext,
  playedCardDefinitionId: string,
  interactions: StrategicInteraction[],
): number {
  let bonus = 0;
  for (const id of ownHandIds(ctx.state, ctx.playerId)) {
    const inst = ctx.state.cardsById[id];
    if (!inst || inst.cardDefinitionId === playedCardDefinitionId) continue;
    for (const ix of interactions) {
      if (ix.sourceCardDefinitionId === playedCardDefinitionId && ix.targetCardDefinitionId === inst.cardDefinitionId) {
        bonus += ix.strength * 1.5;
      }
    }
    const profile = buildCardStrategicProfile(inst.cardDefinitionId, ctx.registry, {
      ...ctx,
      sourceInstanceId: id,
    });
    if (profile.payoffTags.length > 0) bonus += profile.comboPotential * 0.05;
  }
  return bonus;
}
