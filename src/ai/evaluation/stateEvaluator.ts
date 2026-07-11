import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import { evaluateMatchObjective, terminalStateScore } from './matchObjective';
import { analyzeLeaderStrategy } from '../strategy/leaderStrategyAnalyzer';
import { evaluateSurvival, modeWeights, selectStrategicMode } from '../strategy/strategicModeSelector';
import { analyzeGamePhase, applyPhaseToModeWeights } from '../strategy/gamePhaseAnalyzer';
import { analyzeOpponentThreats } from '../analysis/threatAnalyzer';
import { findHandInteractions } from '../analysis/synergyAnalyzer';
import type { StrategicContext } from '../strategy/types';
import type { EffectScoreContext } from '../heuristics/effectValue';
import { estimateVictory } from './lethalEstimator';

export function evaluateState(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): number {
  const terminal = terminalStateScore(state, playerId);
  if (terminal !== null) return terminal;
  return evaluateMatchObjective(state, playerId, defs, registry).utility;
}

export function buildStrategicContext(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): StrategicContext {
  const leader = analyzeLeaderStrategy(state, playerId, defs, registry);
  const mode = selectStrategicMode(state, playerId, defs, registry, leader);
  const phaseInfo = analyzeGamePhase(state, playerId, defs);
  const modeWeightValues = applyPhaseToModeWeights(modeWeights(mode), phaseInfo.phase);
  const objective = evaluateMatchObjective(state, playerId, defs, registry);
  const victory = estimateVictory(state, playerId, defs);
  const survival = evaluateSurvival(state, playerId, defs);

  const ctx: EffectScoreContext = { state, playerId, defs, registry };
  const opponentThreats = analyzeOpponentThreats(state, playerId, defs, registry);
  const handInteractions = findHandInteractions(ctx, leader);

  return {
    mode,
    gamePhase: phaseInfo.phase,
    leader,
    objective,
    survival,
    victory,
    opponentThreats,
    handInteractions,
    gateProjections: [],
    modeWeights: modeWeightValues,
  };
}
