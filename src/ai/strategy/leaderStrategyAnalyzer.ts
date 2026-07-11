import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { LeaderStrategicProfile, StrategicGamePlan } from './types';
import { analyzeAbility, mergeProfiles, profileScalar } from '../analysis/abilityAnalyzer';
import { evaluateGates } from '../../engine/effects/gates';
import type { EffectScoreContext } from '../heuristics/effectValue';

export function analyzeLeaderStrategy(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): LeaderStrategicProfile {
  const player = state.players[playerId];
  const leaderId = player?.leaderInstanceId;
  const leaderInst = leaderId ? state.cardsById[leaderId] : undefined;
  const leaderDef = leaderInst ? getDefinition(defs, leaderInst) : undefined;
  const cardDefinitionId = leaderInst?.cardDefinitionId ?? '';

  const ctx: EffectScoreContext = {
    state,
    playerId,
    defs,
    registry,
    sourceInstanceId: leaderId,
    sourceCardDefinitionId: cardDefinitionId,
  };

  const program = registry[cardDefinitionId];
  let aggregate = analyzeAbility({ timing: 'activateMain', ops: [] }, true);
  const payoffGates: LeaderStrategicProfile['payoffGates'] = [];
  const requiredTypes: string[] = [];

  if (leaderDef?.types) requiredTypes.push(...leaderDef.types);

  if (program) {
    for (const ability of program.abilities) {
      const gatesMet = !ability.gate?.length ||
        evaluateGates(ability.gate, state, defs, playerId, leaderId);
      aggregate = mergeProfiles(aggregate, analyzeAbility(ability, gatesMet));
      if (ability.gate?.length) payoffGates.push(...ability.gate);
      for (const gate of ability.gate ?? []) {
        if (gate.kind === 'leaderType') requiredTypes.push(gate.type);
      }
    }
  }

  const scalar = profileScalar(aggregate);
  const offensivePlan = aggregate.offensiveValue + aggregate.finisherValue + (leaderDef?.basePower ?? 0) / 1500;
  const defensivePlan = aggregate.defensiveValue + (leaderDef?.hasBlocker ? 6 : 0);
  const boardPlan = aggregate.boardDevelopment + aggregate.engineValue + aggregate.resourceAcceleration;
  const resourceEngine = aggregate.resourceAcceleration + aggregate.engineValue + aggregate.searchValue;

  const preferredPlans: StrategicGamePlan[] = [];
  if (offensivePlan >= defensivePlan && offensivePlan >= boardPlan) preferredPlans.push('pressure', 'lethal_search');
  if (boardPlan >= offensivePlan) preferredPlans.push('develop', 'combo_setup');
  if (defensivePlan >= offensivePlan * 0.9) preferredPlans.push('defend', 'recovery');
  if (aggregate.removalValue >= 10) preferredPlans.push('control');
  if (preferredPlans.length === 0) preferredPlans.push('develop');

  const activationValue = scalar + (program?.abilities.filter((a) => a.timing === 'activateMain').length ?? 0) * 4;

  return {
    leaderCardDefinitionId: cardDefinitionId,
    preferredPlans: [...new Set(preferredPlans)],
    resourceEngine,
    offensivePlan,
    defensivePlan,
    boardPlan,
    requiredTypes: [...new Set(requiredTypes)],
    payoffGates,
    activationValue,
    description: leaderDef?.name ?? leaderDef?.cardNumber ?? cardDefinitionId,
  };
}
