import type { CardDefinitionLookup } from '../engine/rules/shared';
import type { EffectTemplateRegistry } from '../engine/effects';
import type { GameState } from '../engine/state/game';
import type { CpuConfig, CpuDecision, ScoredAction } from './types';
import { applyDifficulty, labelAction, scoreAction } from './evaluators/heuristicEvaluator';
import { generateLegalActions, type LegalActionContext } from './utilities/legalActions';
import { buildStrategicContext } from './evaluation/stateEvaluator';
import { buildDecisionTrace, logDecisionTrace } from './debug/decisionTrace';
import { rankActionsWithLookahead } from './planning/lookaheadPlanner';

export interface DecisionEngineInput {
  state: GameState;
  playerId: string;
  defs: CardDefinitionLookup;
  registry: EffectTemplateRegistry;
  config: CpuConfig;
  createActionId: () => string;
}

export function decideBestAction(input: DecisionEngineInput): CpuDecision | null {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ctx: LegalActionContext = {
    state: input.state,
    playerId: input.playerId,
    defs: input.defs,
    registry: input.registry,
    createActionId: input.createActionId,
  };

  const legal = generateLegalActions(ctx);
  if (legal.length === 0) return null;

  const strategic = buildStrategicContext(input.state, input.playerId, input.defs, input.registry);

  const heuristicScores = new Map<string, number>();
  for (const action of legal) {
    heuristicScores.set(
      JSON.stringify(action),
      scoreAction(
        input.state,
        action,
        input.playerId,
        input.defs,
        input.registry,
        input.config.difficulty,
        strategic,
        input.createActionId,
      ),
    );
  }

  const finalScores =
    input.config.difficulty === 'hard'
      ? rankActionsWithLookahead(
          input.state,
          legal,
          heuristicScores,
          input.playerId,
          input.defs,
          input.registry,
          strategic,
          input.createActionId,
        )
      : heuristicScores;

  const scored: ScoredAction[] = legal.map((action) => ({
    action,
    score: finalScores.get(JSON.stringify(action)) ?? 0,
    label: labelAction(input.state, input.defs, action),
  }));

  const tieSeed = `${input.config.seed ?? input.state.rng.seed}:${input.state.turnNumber}:${input.state.log.length}:${input.playerId}`;
  const chosen = applyDifficulty(scored, input.config.difficulty, tieSeed);
  const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;

  const trace = buildDecisionTrace(strategic, scored, chosen, elapsedMs);

  const debug = input.config.debug
    ? {
        generated: legal.length,
        top: [...scored].sort((a, b) => b.score - a.score).slice(0, 5),
        chosen,
        elapsedMs,
      }
    : undefined;

    if (input.config.debug) {
      logDecisionTrace(trace);
      if (input.config.difficulty === 'hard') {
        console.log(`Lookahead: top-8 simulated (depth 2) + turn plans + opponent-turn pessimism`);
      }
    }

  return { action: chosen.action, debug };
}
