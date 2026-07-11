import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { evaluateGates } from '../../engine/effects/gates';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { CardStrategicProfile, ModeWeights } from '../strategy/types';
import { analyzeAbility, emptyProfile, mergeProfiles } from './abilityAnalyzer';
import type { EffectScoreContext } from '../heuristics/effectValue';

export function buildCardStrategicProfile(
  cardDefinitionId: string,
  registry: EffectTemplateRegistry,
  ctx?: EffectScoreContext,
): CardStrategicProfile {
  const program = registry[cardDefinitionId];
  if (!program) return emptyProfile();

  let profile = emptyProfile();
  for (const ability of program.abilities) {
    const gatesMet = ctx
      ? !ability.gate?.length || evaluateGates(ability.gate, ctx.state, ctx.defs, ctx.playerId, ctx.sourceInstanceId)
      : true;
    profile = mergeProfiles(profile, analyzeAbility(ability, gatesMet));
  }

  if (ctx) {
    const inst = ctx.sourceInstanceId ? ctx.state.cardsById[ctx.sourceInstanceId] : undefined;
    const def = inst ? getDefinition(ctx.defs, inst) : undefined;
    if (def?.category === 'character') {
      profile.boardDevelopment += (def.basePower ?? 0) / 1200 + 4;
      if (def.hasBlocker) profile.defensiveValue += 5;
      if (def.hasRush) profile.offensiveValue += 4;
    }
  }

  return profile;
}

export function scoreProfileForMode(profile: CardStrategicProfile, weights: ModeWeights): number {
  return (
    profile.removalValue * weights.removal +
    profile.boardDevelopment * weights.development +
    profile.cardAdvantage * weights.cardAdvantage +
    profile.engineValue * weights.engine +
    profile.finisherValue * weights.lethal +
    profile.defensiveValue * weights.survival +
    profile.offensiveValue * weights.lethal * 0.5 +
    profile.futureValue * weights.engine * 0.4
  );
}

export function contextualHandValue(
  ctx: EffectScoreContext,
  handInstanceId: string,
  weights: ModeWeights,
  leaderSynergyBonus = 0,
): number {
  const inst = ctx.state.cardsById[handInstanceId];
  if (!inst) return 0;
  const profile = buildCardStrategicProfile(inst.cardDefinitionId, ctx.registry, {
    ...ctx,
    sourceInstanceId: handInstanceId,
    sourceCardDefinitionId: inst.cardDefinitionId,
  });
  return scoreProfileForMode(profile, weights) + leaderSynergyBonus;
}

export function contextualPlayValue(
  ctx: EffectScoreContext,
  handInstanceId: string,
  weights: ModeWeights,
  leaderSynergyBonus = 0,
  gatePenalty = 0,
): number {
  const playProfile = buildCardStrategicProfile(
    ctx.state.cardsById[handInstanceId]?.cardDefinitionId ?? '',
    ctx.registry,
    { ...ctx, sourceInstanceId: handInstanceId },
  );
  const immediate = playProfile.immediateValue + playProfile.removalValue + playProfile.tempoValue;
  const future = playProfile.futureValue * weights.preserveHand;
  return scoreProfileForMode(playProfile, weights) + leaderSynergyBonus + immediate * 0.3 - future * gatePenalty;
}
