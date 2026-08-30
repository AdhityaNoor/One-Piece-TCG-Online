import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { GameState } from '../../engine/state/game';
import type { MatchObjectiveEvaluation, SurvivalProjection } from '../strategy/types';
import { evaluatePosition } from '../heuristics/boardHeuristics';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { evaluateSurvival } from '../strategy/strategicModeSelector';
import { estimateVictory, lethalHorizonScore } from './lethalEstimator';
import { opponentLifeCount as oppLife, ownLifeCount as selfLife } from '../visibility/playerView';
import { getEvaluatorWeights } from './weights';

export const POSITIVE_TERMINAL_SCORE = 1_000_000;
export const NEGATIVE_TERMINAL_SCORE = -1_000_000;

/**
 * Life-pressure ordering is the load-bearing part, and it survives tuning:
 *
 *   lifeTaken  >  availableDamage  >  boardDamage
 *
 * Taking a Life card must be worth strictly more than the potential spent to
 * take it, otherwise the evaluator prefers holding an unrealized threat
 * forever. The old values were 10 for a Life card already taken against 8 per
 * point of *available* damage, and because a full board reported four points
 * of availability, ending the turn untouched outscored any line that attacked.
 *
 * The numbers themselves now live in ./weights.ts so they can be fitted.
 */
/** Life total both players start from — the baseline pressure is measured against. */
const STARTING_LIFE_REFERENCE = 10;

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

  // REALIZED damage must always be worth more than the potential it consumed,
  // or attacking reads as a loss and the CPU sits on its hands. Life the
  // opponent has actually lost is scored at LIFE_TAKEN_WEIGHT per card; damage
  // that is merely available scores far less. Swinging therefore converts a
  // small number into a large one, which is the correct incentive.
  const w = getEvaluatorWeights();
  const opponentLifePressure =
    (STARTING_LIFE_REFERENCE - opponentLife) * w.lifeTaken +
    victory.expectedSuccessfulLifeDamage * w.availableDamage +
    victory.nextTurnLifeDamagePotential * w.boardDamage;
  const ownLifeSafety =
    ownLife * w.ownLife -
    survival.immediateLossRisk * w.immediateLossRisk -
    survival.nextTurnLossRisk * w.nextTurnLossRisk;
  const strategicPositionValue = evaluatePosition(state, playerId, defs, registry);

  // Win probability takes the BETTER of the two horizons. Using this turn's
  // lethal chance alone made the number collapse the instant an attacker
  // rested — the board was unchanged, but the score fell by ~20 points, so
  // every simulated attack lost to ending the turn.
  const bestLethalHorizon = Math.max(
    victory.currentTurnLethalProbability,
    victory.nextTurnLethalProbability * w.nextTurnDiscount,
  );
  const winProbability = Math.min(0.95, bestLethalHorizon / 100 + opponentLifePressure / 400);
  const lossProbability = Math.min(0.95, survival.immediateLossRisk + survival.nextTurnLossRisk * 0.5);

  const utility =
    winProbability * w.winProbability -
    lossProbability * w.lossProbability +
    opponentLifePressure +
    ownLifeSafety +
    strategicPositionValue * w.positionValue +
    lethalHorizonScore(victory) * w.lethalHorizon;

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
