import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { GameState } from '../../engine/state/game';
import type { MatchObjectiveEvaluation, SurvivalProjection } from '../strategy/types';
import { evaluatePosition } from '../heuristics/boardHeuristics';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { evaluateSurvival } from '../strategy/strategicModeSelector';
import { estimateVictory, lethalHorizonScore } from './lethalEstimator';
import { opponentLifeCount as oppLife, ownLifeCount as selfLife } from '../visibility/playerView';

export const POSITIVE_TERMINAL_SCORE = 1_000_000;
export const NEGATIVE_TERMINAL_SCORE = -1_000_000;

export function terminalStateScore(state: GameState, playerId: string): number | null {
  if (!state.gameOver) return null;
  if (state.gameOver.winnerId === playerId) return POSITIVE_TERMINAL_SCORE;
  if (state.gameOver.winnerId && state.gameOver.winnerId !== playerId) return NEGATIVE_TERMINAL_SCORE;
  return 0;
}

export function evaluateMatchObjective(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): MatchObjectiveEvaluation {
  const terminal = terminalStateScore(state, playerId);
  if (terminal !== null) {
    return {
      winProbability: terminal > 0 ? 1 : 0,
      lossProbability: terminal < 0 ? 1 : 0,
      opponentLifePressure: terminal > 0 ? 100 : 0,
      ownLifeSafety: terminal > 0 ? 100 : 0,
      currentLethalProbability: terminal > 0 ? 100 : 0,
      opponentLethalProbability: terminal < 0 ? 100 : 0,
      strategicPositionValue: terminal,
      utility: terminal,
    };
  }

  const survival = evaluateSurvival(state, playerId, defs);
  const victory = estimateVictory(state, playerId, defs);
  const ownLife = selfLife(state, playerId);
  const opponentLife = oppLife(state, playerId);

  const opponentLifePressure = (10 - opponentLife) * 10 + victory.expectedSuccessfulLifeDamage * 8;
  const ownLifeSafety = ownLife * 12 - survival.immediateLossRisk * 40 - survival.nextTurnLossRisk * 20;
  const strategicPositionValue = evaluatePosition(state, playerId, defs, registry);

  const winProbability = Math.min(0.95, victory.currentTurnLethalProbability / 100 + opponentLifePressure / 200);
  const lossProbability = Math.min(0.95, survival.immediateLossRisk + survival.nextTurnLossRisk * 0.5);

  const utility =
    winProbability * 100 -
    lossProbability * 100 +
    opponentLifePressure +
    ownLifeSafety +
    strategicPositionValue * 0.15 +
    lethalHorizonScore(victory) * 0.1;

  return {
    winProbability,
    lossProbability,
    opponentLifePressure,
    ownLifeSafety,
    currentLethalProbability: victory.currentTurnLethalProbability,
    opponentLethalProbability: survival.immediateLossRisk * 100,
    strategicPositionValue,
    utility,
  };
}

export function lifeSafetyUrgency(survival: SurvivalProjection): number {
  return (
    survival.immediateLossRisk * 80 +
    survival.nextTurnLossRisk * 40 +
    survival.requiredResourcesToSurvive.length * 4
  );
}
