import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { LeaderStrategicProfile, ModeWeights, StrategicGamePlan, SurvivalProjection } from './types';
import { opponentLifeCount, ownLifeCount } from '../visibility/playerView';
import { lethalPressure } from '../heuristics/boardHeuristics';
import { evaluateSurvivalProjection } from '../evaluation/survivalAnalyzer';

export function modeWeights(mode: StrategicGamePlan): ModeWeights {
  const base: ModeWeights = {
    removal: 1,
    development: 1,
    cardAdvantage: 1,
    engine: 1,
    lethal: 1,
    survival: 1,
    leaderSynergy: 1,
    preserveHand: 0.5,
  };

  switch (mode) {
    case 'develop':
      return { ...base, development: 1.4, engine: 1.3, preserveHand: 0.7 };
    case 'control':
      return { ...base, removal: 1.5, survival: 1.1, cardAdvantage: 1.2 };
    case 'defend':
    case 'recovery':
      return { ...base, survival: 1.6, removal: 1.2, lethal: 0.6, preserveHand: 0.8 };
    case 'pressure':
      return { ...base, lethal: 1.5, development: 0.8, leaderSynergy: 1.2 };
    case 'combo_setup':
      return { ...base, engine: 1.5, preserveHand: 1.2, development: 1.1 };
    case 'lethal_search':
      return { ...base, lethal: 2, survival: 0.7, development: 0.5, preserveHand: 0.3 };
    default:
      return base;
  }
}

export function evaluateSurvival(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): SurvivalProjection {
  return evaluateSurvivalProjection(state, playerId, defs);
}

export function selectStrategicMode(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  leader: LeaderStrategicProfile,
): StrategicGamePlan {
  const ownLife = ownLifeCount(state, playerId);
  const oppLife = opponentLifeCount(state, playerId);
  const lethal = lethalPressure(state, playerId, defs);
  const survival = evaluateSurvival(state, playerId, defs);

  if (state.gameOver) {
    const winner = state.gameOver.winnerId;
    return winner === playerId ? 'lethal_search' : 'recovery';
  }

  // Immediate win races still dominate, but not when we die first on the crack-back.
  if (lethal >= 80 || (oppLife <= 2 && lethal >= 50)) {
    if (survival.nextTurnLossRisk < 0.85 || lethal >= 95) return 'lethal_search';
  }

  if (survival.immediateLossRisk >= 0.7 || (ownLife <= 1 && survival.nextTurnLossRisk >= 0.5)) {
    return 'recovery';
  }
  if (
    survival.nextTurnLossRisk >= 0.55 ||
    (ownLife <= 2 && survival.projectedLifeDamage >= ownLife - 1)
  ) {
    return 'defend';
  }

  if (leader.preferredPlans.includes('lethal_search') && oppLife <= 3) return 'pressure';
  if (leader.preferredPlans.includes('control') && oppLife >= 4) return 'control';
  if (leader.preferredPlans.includes('combo_setup') && leader.resourceEngine >= 12) return 'combo_setup';
  if (leader.preferredPlans.includes('develop')) return 'develop';

  return oppLife <= ownLife ? 'pressure' : 'develop';
}
