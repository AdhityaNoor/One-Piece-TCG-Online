import type { AbilityGate } from '../../engine/effects/effectIr';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { evaluateGates } from '../../engine/effects/gates';
import type { GameState } from '../../engine/state/game';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GateProjection } from '../strategy/types';
import { buildCardStrategicProfile } from './cardStrategicProfile';
import { profileScalar } from './abilityAnalyzer';
import type { EffectScoreContext } from '../heuristics/effectValue';

function estimateActionsToSatisfy(gate: AbilityGate, state: GameState, playerId: string): number {
  const player = state.players[playerId];
  if (!player) return 3;

  switch (gate.kind) {
    case 'selfCharacterCount':
      if (gate.atLeast !== undefined) {
        const have = player.characterArea.cardIds.length;
        return Math.max(0, gate.atLeast - have);
      }
      return 0;
    case 'selfRestedCharacterCount':
      if (gate.atLeast !== undefined) {
        const rested = player.characterArea.cardIds.filter(
          (id) => state.cardsById[id]?.orientation === 'rested',
        ).length;
        return Math.max(0, gate.atLeast - rested);
      }
      return 1;
    case 'selfActiveDonCount':
    case 'selfDonFieldCount':
      if (gate.atLeast !== undefined) {
        const donCount = player.costArea.cardIds.length +
          player.characterArea.cardIds.reduce((n, id) => n + (state.cardsById[id]?.donAttached.length ?? 0), 0);
        return Math.max(0, gate.atLeast - donCount);
      }
      return 0;
    case 'selfLife':
      return 0;
    case 'opponentCharacterCount':
      return 0;
    default:
      return typeof gate.kind === 'string' && gate.kind.startsWith('leader') ? 0 : 1;
  }
}

export function projectGate(
  gate: AbilityGate,
  ctx: EffectScoreContext,
  expectedPayoff: number,
): GateProjection {
  const satisfied = evaluateGates([gate], ctx.state, ctx.defs, ctx.playerId, ctx.sourceInstanceId);
  const actionsToSatisfy = satisfied ? 0 : estimateActionsToSatisfy(gate, ctx.state, ctx.playerId);
  const probabilityOfSurvival = satisfied ? 1 : Math.max(0.15, 1 - actionsToSatisfy * 0.22);

  return {
    gate,
    currentlySatisfied: satisfied,
    actionsToSatisfy,
    expectedPayoff,
    probabilityOfSurvival,
  };
}

export function projectCardGates(
  cardDefinitionId: string,
  registry: EffectTemplateRegistry,
  ctx: EffectScoreContext,
): GateProjection[] {
  const program = registry[cardDefinitionId];
  if (!program) return [];

  const profile = buildCardStrategicProfile(cardDefinitionId, registry, ctx);
  const payoff = profileScalar(profile);
  const projections: GateProjection[] = [];

  for (const ability of program.abilities) {
    if (!ability.gate?.length) continue;
    for (const gate of ability.gate) {
      projections.push(projectGate(gate, ctx, payoff * (ability.optionalActivate ? 0.65 : 1)));
    }
  }
  return projections;
}

export function gatePreservePenalty(projections: GateProjection[]): number {
  let penalty = 0;
  for (const p of projections) {
    if (p.currentlySatisfied) continue;
    if (p.actionsToSatisfy <= 1 && p.expectedPayoff >= 12) {
      penalty += p.expectedPayoff * 0.35 * p.probabilityOfSurvival;
    }
  }
  return penalty;
}

export function gateReadinessBonus(projections: GateProjection[]): number {
  let bonus = 0;
  for (const p of projections) {
    if (p.currentlySatisfied && p.expectedPayoff >= 8) {
      bonus += p.expectedPayoff * 0.25;
    }
  }
  return bonus;
}
