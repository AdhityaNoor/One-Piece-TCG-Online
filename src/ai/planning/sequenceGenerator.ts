/**
 * Full turn-plan candidates (guide §19).
 * Generates short action skeletons, fills each step with the best matching
 * legal action, simulates the line, and scores the resulting state.
 */
import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext, StrategicGamePlan } from '../strategy/types';
import { evaluateState } from '../evaluation/stateEvaluator';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { generateLegalActions } from '../utilities/legalActions';
import { analyzeAttackTrade } from '../evaluation/attackTradeEvaluator';
import { canContinueLookahead, cloneGameState, simulateAction } from './stateSimulator';
import { projectOpponentTurn, resolveBattleToCompletion } from './opponentTurnSimulator';
import { analyzeLethalLine } from './lethalLineAnalyzer';
import { analyzeSequencedLethalInsight } from './lethalSequencePlanner';
import {
  analyzeLeaderActivation,
  isLeaderActivateAction,
  type LeaderActivationAnalysis,
} from './leaderActivationPlanner';
import { isSetupTriggerAttack } from './attackTriggerPlanner';

export type PlanStepKind =
  | 'play'
  | 'activate'
  | 'leader_activate'
  | 'give_don'
  | 'attack_character'
  | 'attack_leader'
  | 'attack_trigger'
  | 'attack'
  | 'end';

export interface TurnPlanTemplate {
  id: string;
  steps: PlanStepKind[];
  /** Soft steps are skipped when no matching action exists. */
  required?: PlanStepKind[];
}

export interface TurnPlanResult {
  id: string;
  steps: PlanStepKind[];
  actions: GameAction[];
  firstAction: GameAction | null;
  endUtility: number;
  failed: boolean;
  reason?: string;
}

export const MAX_TURN_PLAN_STEPS = 6;
export const MAX_TURN_PLANS = 8;
const PLAN_HEURISTIC_BLEND = 0.25;
const PLAN_SIM_BLEND = 0.75;

function leaderActivationTemplates(analysis: LeaderActivationAnalysis): TurnPlanTemplate[] {
  if (!analysis.available && !analysis.gatesMet) {
    // Still try play-then-activate when gates need a body first.
    if (analysis.preferPlayBeforeActivate) {
      return [
        { id: 'play-leader_activate-end', steps: ['play', 'leader_activate', 'end'] },
        { id: 'play-leader_activate-attack-end', steps: ['play', 'leader_activate', 'attack', 'end'] },
      ];
    }
    return [];
  }
  if (analysis.preferPreserveDon) return [];
  const templates: TurnPlanTemplate[] = [
    { id: 'leader_activate-attack-end', steps: ['leader_activate', 'attack', 'end'] },
    { id: 'leader_activate-end', steps: ['leader_activate', 'end'] },
  ];
  if (analysis.preferPlayBeforeActivate) {
    templates.unshift(
      { id: 'play-leader_activate-attack-end', steps: ['play', 'leader_activate', 'attack', 'end'] },
      { id: 'play-leader_activate-end', steps: ['play', 'leader_activate', 'end'] },
    );
  } else if (analysis.preferActivateBeforeAttack) {
    templates.unshift({
      id: 'leader_activate-clear-end',
      steps: ['leader_activate', 'attack_character', 'attack', 'end'],
    });
  }
  return templates;
}

function templatesForMode(
  mode: StrategicGamePlan,
  leaderActivation: LeaderActivationAnalysis,
): TurnPlanTemplate[] {
  const leaderPlans = leaderActivationTemplates(leaderActivation);

  const develop: TurnPlanTemplate[] = [
    ...leaderPlans,
    { id: 'trigger-then-swing', steps: ['attack_trigger', 'attack', 'end'] },
    { id: 'don-trigger-swing', steps: ['give_don', 'attack_trigger', 'attack', 'end'] },
    { id: 'play-don-attack-end', steps: ['play', 'give_don', 'attack', 'end'] },
    { id: 'play-activate-end', steps: ['play', 'activate', 'end'] },
    { id: 'don-attack-end', steps: ['give_don', 'attack', 'end'] },
    { id: 'attack-play-end', steps: ['attack', 'play', 'end'] },
    { id: 'end-now', steps: ['end'] },
  ];

  const pressure: TurnPlanTemplate[] = [
    ...leaderPlans,
    { id: 'trigger-then-swing', steps: ['attack_trigger', 'attack', 'end'] },
    { id: 'don-trigger-swing', steps: ['give_don', 'attack_trigger', 'attack', 'end'] },
    { id: 'clear-leader-end', steps: ['attack_character', 'attack_leader', 'end'], required: ['attack_leader'] },
    { id: 'don-leader-end', steps: ['give_don', 'attack_leader', 'end'], required: ['attack_leader'] },
    { id: 'play-attack-end', steps: ['play', 'attack', 'end'] },
    { id: 'multi-attack-end', steps: ['attack', 'attack', 'end'] },
    { id: 'leader-end', steps: ['attack_leader', 'end'], required: ['attack_leader'] },
    { id: 'end-now', steps: ['end'] },
  ];

  const lethal: TurnPlanTemplate[] = [
    // Prefer preserving DON for lethal pumps unless activation is free/cheap.
    ...(leaderActivation.preferPreserveDon ? [] : leaderPlans.slice(0, 1)),
    { id: 'lethal-trigger-then-leader', steps: ['attack_trigger', 'attack_leader', 'end'], required: ['attack_leader'] },
    { id: 'lethal-clear-then-leader', steps: ['attack_character', 'attack_leader', 'end'], required: ['attack_leader'] },
    { id: 'lethal-don-leader', steps: ['give_don', 'attack_leader', 'attack_leader', 'end'], required: ['attack_leader'] },
    { id: 'lethal-multi-leader', steps: ['attack_leader', 'attack_leader', 'end'], required: ['attack_leader'] },
    { id: 'lethal-play-then-swing', steps: ['play', 'give_don', 'attack_leader', 'end'] },
    { id: 'end-now', steps: ['end'] },
  ];

  const defend: TurnPlanTemplate[] = [
    { id: 'play-blocker-end', steps: ['play', 'end'] },
    ...leaderPlans.slice(0, 2),
    { id: 'activate-end', steps: ['activate', 'end'] },
    { id: 'play-don-end', steps: ['play', 'give_don', 'end'] },
    { id: 'end-now', steps: ['end'] },
  ];

  const control: TurnPlanTemplate[] = [
    ...leaderPlans,
    { id: 'trigger-clear-end', steps: ['attack_trigger', 'attack_character', 'end'] },
    { id: 'removal-attack-end', steps: ['play', 'attack_character', 'end'] },
    { id: 'play-activate-end', steps: ['play', 'activate', 'end'] },
    { id: 'attack-end', steps: ['attack', 'end'] },
    { id: 'end-now', steps: ['end'] },
  ];

  switch (mode) {
    case 'lethal_search':
      return lethal;
    case 'pressure':
      return pressure;
    case 'defend':
    case 'recovery':
      return defend;
    case 'control':
      return control;
    case 'combo_setup':
      return [
        ...(leaderActivation.preferPlayBeforeActivate
          ? [{ id: 'setup-play-leader_activate-end', steps: ['play', 'leader_activate', 'end'] as PlanStepKind[] }]
          : leaderPlans.slice(0, 2)),
        { id: 'setup-activate-end', steps: ['play', 'activate', 'end'] },
        { id: 'setup-don-end', steps: ['play', 'give_don', 'end'] },
        ...develop.slice(0, 3),
      ];
    default:
      return develop;
  }
}

function isLeaderAttack(state: GameState, action: GameAction): boolean {
  if (action.type !== 'DECLARE_ATTACK') return false;
  return state.cardsById[action.targetInstanceId]?.currentZone === 'leaderArea';
}

function isCharacterAttack(state: GameState, action: GameAction): boolean {
  if (action.type !== 'DECLARE_ATTACK') return false;
  return state.cardsById[action.targetInstanceId]?.currentZone === 'characterArea';
}

function matchesStep(
  state: GameState,
  action: GameAction,
  step: PlanStepKind,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): boolean {
  switch (step) {
    case 'play':
      return (
        action.type === 'PLAY_CHARACTER' ||
        action.type === 'PLAY_STAGE' ||
        action.type === 'ACTIVATE_EVENT_MAIN'
      );
    case 'activate':
      return action.type === 'ACTIVATE_CARD_EFFECT';
    case 'leader_activate':
      return isLeaderActivateAction(state, action.playerId, action);
    case 'give_don':
      return action.type === 'GIVE_DON';
    case 'attack_leader':
      return isLeaderAttack(state, action);
    case 'attack_character':
      return isCharacterAttack(state, action);
    case 'attack_trigger':
      return isSetupTriggerAttack(state, action.playerId, defs, registry, action);
    case 'attack':
      if (action.type !== 'DECLARE_ATTACK') return false;
      // Prefer winning trades inside generic attack steps.
      return analyzeAttackTrade(state, defs, action.attackerInstanceId, action.targetInstanceId).winsTrade;
    case 'end':
      return action.type === 'END_MAIN_PHASE';
    default:
      return false;
  }
}

function pickBestMatchingAction(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
  step: PlanStepKind,
): GameAction | null {
  const legal = generateLegalActions({
    state,
    playerId,
    defs,
    registry,
    createActionId,
  });
  let best: GameAction | null = null;
  let bestScore = -Infinity;
  for (const action of legal) {
    if (!matchesStep(state, action, step, defs, registry)) continue;
    let score = scoreActionStrategic(state, action, playerId, defs, registry, strategic, createActionId);
    // Prefer resting blockers when the step is character clear.
    if (step === 'attack_character' && action.type === 'DECLARE_ATTACK') {
      const target = state.cardsById[action.targetInstanceId];
      if (target && getDefinition(defs, target).hasBlocker) score += 40;
    }
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  return best;
}

function advanceAfterAction(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
  strategic: StrategicContext,
): GameState {
  let current = state;
  if (current.currentBattle) {
    current = resolveBattleToCompletion(current, playerId, defs, registry, createActionId, strategic);
  }
  return current;
}

/**
 * Simulate one template: fill each step with the best matching legal action.
 */
export function simulateTurnPlan(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
  template: TurnPlanTemplate,
): TurnPlanResult {
  let current = cloneGameState(state);
  const actions: GameAction[] = [];
  const required = new Set(template.required ?? []);

  for (const step of template.steps.slice(0, MAX_TURN_PLAN_STEPS)) {
    if (current.gameOver) break;
    if (current.activePlayerId !== playerId) break;
    if (current.currentPhase !== 'main' && step !== 'end') break;

    const action = pickBestMatchingAction(
      current,
      playerId,
      defs,
      registry,
      strategic,
      createActionId,
      step,
    );

    if (!action) {
      if (required.has(step)) {
        return {
          id: template.id,
          steps: template.steps,
          actions,
          firstAction: actions[0] ?? null,
          endUtility: -Infinity,
          failed: true,
          reason: `missing required step ${step}`,
        };
      }
      continue;
    }

    const sim = simulateAction({
      state: current,
      action,
      playerId,
      defs,
      registry,
      createActionId,
      strategic,
    });
    if (sim.failed) {
      if (required.has(step)) {
        return {
          id: template.id,
          steps: template.steps,
          actions,
          firstAction: actions[0] ?? null,
          endUtility: -Infinity,
          failed: true,
          reason: sim.reason,
        };
      }
      continue;
    }

    actions.push(action);
    current = advanceAfterAction(sim.state, playerId, defs, registry, createActionId, strategic);

    if (action.type === 'END_MAIN_PHASE') break;
    if (!canContinueLookahead(current, playerId) && !current.currentBattle) {
      // Still our main with no further actions — stop filling.
      if (current.activePlayerId !== playerId || current.currentPhase !== 'main') break;
    }
  }

  // Ensure we evaluate from a post-turn-ish state when still in our main.
  if (
    !current.gameOver &&
    current.activePlayerId === playerId &&
    current.currentPhase === 'main' &&
    !current.currentBattle &&
    actions[actions.length - 1]?.type !== 'END_MAIN_PHASE'
  ) {
    const end = pickBestMatchingAction(
      current,
      playerId,
      defs,
      registry,
      strategic,
      createActionId,
      'end',
    );
    if (end) {
      const sim = simulateAction({
        state: current,
        action: end,
        playerId,
        defs,
        registry,
        createActionId,
        strategic,
      });
      if (!sim.failed) {
        actions.push(end);
        current = sim.state;
      }
    }
  }

  let utility = evaluateState(current, playerId, defs, registry);
  if (!current.gameOver) {
    const projected = projectOpponentTurn(current, playerId, defs, registry, createActionId, strategic);
    if (!projected.failed) {
      utility = evaluateState(projected.state, playerId, defs, registry);
    }
  }

  return {
    id: template.id,
    steps: template.steps,
    actions,
    firstAction: actions[0] ?? null,
    endUtility: utility,
    failed: false,
  };
}

/**
 * Greedy baseline: repeatedly take the best heuristic action (capped).
 */
export function simulateGreedyTurnPlan(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
): TurnPlanResult {
  let current = cloneGameState(state);
  const actions: GameAction[] = [];

  for (let i = 0; i < MAX_TURN_PLAN_STEPS; i += 1) {
    if (current.gameOver || current.activePlayerId !== playerId || current.currentPhase !== 'main') break;
    if (current.currentBattle) {
      current = resolveBattleToCompletion(current, playerId, defs, registry, createActionId, strategic);
      continue;
    }

    const legal = generateLegalActions({
      state: current,
      playerId,
      defs,
      registry,
      createActionId,
    }).filter((a) => a.type !== 'DECLARE_ATTACK' || analyzeAttackTrade(current, defs, a.attackerInstanceId, a.targetInstanceId).winsTrade);

    if (legal.length === 0) break;

    let best = legal[0];
    let bestScore = -Infinity;
    for (const action of legal) {
      const score = scoreActionStrategic(current, action, playerId, defs, registry, strategic, createActionId);
      if (score > bestScore) {
        bestScore = score;
        best = action;
      }
    }

    const sim = simulateAction({
      state: current,
      action: best,
      playerId,
      defs,
      registry,
      createActionId,
      strategic,
    });
    if (sim.failed) break;
    actions.push(best);
    current = advanceAfterAction(sim.state, playerId, defs, registry, createActionId, strategic);
    if (best.type === 'END_MAIN_PHASE') break;
  }

  let utility = evaluateState(current, playerId, defs, registry);
  if (!current.gameOver) {
    const projected = projectOpponentTurn(current, playerId, defs, registry, createActionId, strategic);
    if (!projected.failed) utility = evaluateState(projected.state, playerId, defs, registry);
  }

  return {
    id: 'greedy',
    steps: [],
    actions,
    firstAction: actions[0] ?? null,
    endUtility: utility,
    failed: false,
  };
}

export function generateAndRankTurnPlans(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
): TurnPlanResult[] {
  if (state.currentPhase !== 'main' || state.activePlayerId !== playerId || state.currentBattle) {
    return [];
  }

  const leaderActivation = analyzeLeaderActivation(state, playerId, defs, registry, strategic);
  const templates = templatesForMode(strategic.mode, leaderActivation).slice(0, MAX_TURN_PLANS - 1);
  const results: TurnPlanResult[] = [];

  for (const template of templates) {
    results.push(
      simulateTurnPlan(state, playerId, defs, registry, strategic, createActionId, template),
    );
  }
  results.push(simulateGreedyTurnPlan(state, playerId, defs, registry, strategic, createActionId));

  return results
    .filter((r) => !r.failed && r.firstAction)
    .map((r) => {
      // Penalize plans that open with a leader swing when sequencing says clear/bait first.
      const line = analyzeLethalLine(state, playerId, defs);
      const insight = analyzeSequencedLethalInsight(state, playerId, defs, line);
      let utility = r.endUtility;
      if (
        r.firstAction &&
        isLeaderAttack(state, r.firstAction) &&
        insight.penalizeLeaderBeforeClear
      ) {
        utility -= 80_000;
      }
      // Prefer activate-before-attack when Leader removal should clear first.
      if (
        leaderActivation.preferActivateBeforeAttack &&
        r.firstAction &&
        r.firstAction.type === 'DECLARE_ATTACK' &&
        leaderActivation.available
      ) {
        utility -= 40_000;
      }
      // Prefer play-before-activate when gates need setup.
      if (
        leaderActivation.preferPlayBeforeActivate &&
        r.firstAction &&
        isLeaderActivateAction(state, playerId, r.firstAction)
      ) {
        utility -= 35_000;
      }
      // Prefer preserving DON over burning once-per-turn Leader cost.
      if (
        leaderActivation.preferPreserveDon &&
        r.firstAction &&
        isLeaderActivateAction(state, playerId, r.firstAction)
      ) {
        utility -= 50_000;
      }
      return { ...r, endUtility: utility };
    })
    .sort((a, b) => b.endUtility - a.endUtility);
}

/**
 * Boost first-action scores using full-turn plan end utilities.
 * Matches plan openings onto the caller's legal actions (actionId-stable keys).
 */
export function semanticActionKey(action: GameAction): string {
  const { actionId: _id, ...rest } = action as GameAction & { actionId?: string };
  return JSON.stringify(rest);
}

export function turnPlanFirstActionScores(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
  legalActions: GameAction[],
  heuristicScores: Map<string, number>,
): Map<string, number> {
  const plans = generateAndRankTurnPlans(state, playerId, defs, registry, strategic, createActionId);
  const boosts = new Map<string, number>();
  const legalBySemantic = new Map<string, GameAction>();
  for (const action of legalActions) {
    legalBySemantic.set(semanticActionKey(action), action);
  }

  const line = analyzeLethalLine(state, playerId, defs);
  const insight = analyzeSequencedLethalInsight(state, playerId, defs, line);

  for (const [index, plan] of plans.slice(0, 4).entries()) {
    if (!plan.firstAction) continue;
    // Do not boost openings that violate clear/bait-before-lethal sequencing.
    if (isLeaderAttack(state, plan.firstAction) && insight.penalizeLeaderBeforeClear) continue;

    const legal = legalBySemantic.get(semanticActionKey(plan.firstAction));
    if (!legal) continue;
    const key = JSON.stringify(legal);
    const heuristic = heuristicScores.get(key) ?? 0;
    const rankBonus = (4 - index) * 12;
    const blended = heuristic * PLAN_HEURISTIC_BLEND + plan.endUtility * PLAN_SIM_BLEND + rankBonus;
    const prev = boosts.get(key);
    if (prev === undefined || blended > prev) boosts.set(key, blended);
  }

  return boosts;
}
