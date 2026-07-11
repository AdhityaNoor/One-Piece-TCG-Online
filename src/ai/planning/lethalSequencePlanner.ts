import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext } from '../strategy/types';
import { opponentPublicCardIds } from '../visibility/playerView';
import { generateLegalActions } from '../utilities/legalActions';
import { analyzeLethalLine, type LethalLineAnalysis } from './lethalLineAnalyzer';
import { simulateAction } from './stateSimulator';
import { resolveBattleToCompletion } from './opponentTurnSimulator';
import {
  analyzeCounterAwareLeaderAttack,
  findCounterBaitTargets,
} from '../evaluation/counterAwareLethal';
import { estimateOpponentCounterCapacity } from '../evaluation/opponentCounterEstimate';

export interface SequencedLethalInsight {
  shouldClearFirst: boolean;
  clearTargetIds: string[];
  directLeaderClose: boolean;
  opensAfterClear: boolean;
  penalizeLeaderBeforeClear: boolean;
  /** True when estimated hand Counters threaten a thin lethal swing. */
  counterThreatensLethal: boolean;
  shouldBaitCountersFirst: boolean;
}

function opponentRestedCharacters(
  state: GameState,
  playerId: string,
): string[] {
  return opponentPublicCardIds(state, playerId).filter((id) => {
    const inst = state.cardsById[id];
    return inst?.currentZone === 'characterArea' && inst.orientation === 'rested';
  });
}

function opponentRestedBlockers(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): string[] {
  return opponentRestedCharacters(state, playerId).filter((id) => {
    const inst = state.cardsById[id];
    if (!inst) return false;
    return getDefinition(defs, inst).hasBlocker;
  });
}

function stateAfterAttack(
  state: GameState,
  action: GameAction,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  createActionId: () => string,
  strategic?: StrategicContext,
): GameState | null {
  if (action.type !== 'DECLARE_ATTACK') return null;
  const sim = simulateAction({
    state,
    action,
    playerId,
    defs,
    registry,
    createActionId,
    strategic,
  });
  if (sim.failed || sim.state.gameOver) return sim.failed ? null : sim.state;
  let next = sim.state;
  if (next.currentBattle) {
    next = resolveBattleToCompletion(next, playerId, defs, registry, createActionId, strategic);
  }
  return next;
}

export function analyzeSequencedLethalInsight(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  line: LethalLineAnalysis,
): SequencedLethalInsight {
  const blockers = opponentRestedBlockers(state, playerId, defs);
  const rested = opponentRestedCharacters(state, playerId);
  const directLeaderClose = line.canCloseThisTurn || line.oneAttackFromLethal;

  const counterEstimate = estimateOpponentCounterCapacity(state, playerId, defs);
  const attackerIds = line.remainingActiveAttackers.map((a) => a.instanceId);
  const baitTargets = findCounterBaitTargets(state, playerId, defs, attackerIds);

  // Probe the strongest remaining attacker vs leader for Counter survivability.
  let counterThreatensLethal = false;
  let shouldBaitCountersFirst = false;
  const oppLeaderId = state.players[getOpponentId(state, playerId)]?.leaderInstanceId;
  if (oppLeaderId && attackerIds.length > 0 && directLeaderClose) {
    const bestAttacker = [...line.remainingActiveAttackers].sort((a, b) => b.power - a.power)[0];
    const aware = analyzeCounterAwareLeaderAttack(
      state,
      playerId,
      defs,
      bestAttacker.instanceId,
      oppLeaderId,
      counterEstimate,
      line,
    );
    counterThreatensLethal = !aware.survivesEstimatedCounters && counterEstimate.handCount > 0;
    shouldBaitCountersFirst = aware.shouldBaitCountersFirst;
  }

  const shouldClearBlockers =
    blockers.length > 0 &&
    line.remainingActiveAttackers.length >= 2 &&
    line.hasOpenLethalLine &&
    line.opponentLife <= 3;

  const shouldClearFirst = shouldClearBlockers || shouldBaitCountersFirst;

  const clearTargetIds = shouldClearBlockers
    ? blockers
    : shouldBaitCountersFirst
      ? baitTargets
      : rested;

  return {
    shouldClearFirst,
    clearTargetIds,
    directLeaderClose,
    opensAfterClear: false,
    penalizeLeaderBeforeClear:
      (shouldClearBlockers && blockers.length > 0) || shouldBaitCountersFirst,
    counterThreatensLethal,
    shouldBaitCountersFirst,
  };
}

export function evaluateSequencedLethalBonus(
  state: GameState,
  action: GameAction,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
  line: LethalLineAnalysis,
): number {
  if (strategic.mode !== 'lethal_search' && strategic.mode !== 'pressure') return 0;
  if (action.type !== 'DECLARE_ATTACK') return 0;

  const insight = analyzeSequencedLethalInsight(state, playerId, defs, line);
  const target = state.cardsById[action.targetInstanceId];
  if (!target) return 0;

  const isLeader = target.currentZone === 'leaderArea';
  const isRestedCharacter =
    target.currentZone === 'characterArea' && target.orientation === 'rested';

  if (insight.penalizeLeaderBeforeClear && isLeader && insight.clearTargetIds.length > 0) {
    return insight.shouldBaitCountersFirst ? -110 : -95;
  }

  if (isLeader && insight.counterThreatensLethal && !insight.shouldBaitCountersFirst) {
    // No bait available — still discourage thin lethal; overkill DON is preferred instead.
    return -40;
  }

  if (!isRestedCharacter) return 0;

  const before = line;
  const afterState = stateAfterAttack(state, action, playerId, defs, registry, createActionId, strategic);
  if (!afterState) return 0;

  const after = analyzeLethalLine(afterState, playerId, defs);
  const openedLethal =
    (!before.canCloseThisTurn && after.canCloseThisTurn) ||
    (!before.oneAttackFromLethal && after.oneAttackFromLethal) ||
    (after.remainingLifeDamagePotential > before.remainingLifeDamagePotential &&
      after.remainingActiveAttackers.length > 0 &&
      after.opponentLife <= after.remainingLifeDamagePotential);

  if (openedLethal) return 70;

  if (insight.shouldClearFirst && insight.clearTargetIds.includes(action.targetInstanceId)) {
    const def = getDefinition(defs, target);
    let bonus = 55;
    if (def.hasBlocker) bonus += 35;
    if (insight.shouldBaitCountersFirst) bonus += 25;
    if (line.opponentLife <= 2) bonus += 15;
    return bonus;
  }

  if (line.hasOpenLethalLine && line.opponentLife <= 2 && isRestedCharacter) {
    const targetPower = computeCurrentPower(defs, state, action.targetInstanceId);
    const attackerPower = computeCurrentPower(defs, state, action.attackerInstanceId);
    if (attackerPower >= targetPower) return 25;
  }

  return 0;
}

export function rankFollowUpForSequencedLethal(
  firstAction: GameAction,
  followAction: GameAction,
  postFirstState: GameState,
  strategic: StrategicContext,
  lineAfterFirst: LethalLineAnalysis,
): number {
  if (strategic.mode !== 'lethal_search' && strategic.mode !== 'pressure') return 0;
  if (firstAction.type !== 'DECLARE_ATTACK' || followAction.type !== 'DECLARE_ATTACK') return 0;

  const firstTarget = postFirstState.cardsById[firstAction.targetInstanceId];
  const wasCharacterClear =
    firstTarget?.currentZone === 'characterArea' &&
    firstAction.targetInstanceId !== followAction.targetInstanceId;

  const followTarget = postFirstState.cardsById[followAction.targetInstanceId];
  const isLeaderFollow = followTarget?.currentZone === 'leaderArea';

  if (!wasCharacterClear || !isLeaderFollow) return 0;

  let bonus = 30;
  if (lineAfterFirst.canCloseThisTurn) bonus += 25;
  if (lineAfterFirst.oneAttackFromLethal) bonus += 20;
  return bonus;
}

export function findSequencedLethalFirstSteps(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId: () => string,
  line: LethalLineAnalysis,
): GameAction[] {
  if (strategic.mode !== 'lethal_search' && strategic.mode !== 'pressure') return [];
  if (!line.hasOpenLethalLine) return [];

  const insight = analyzeSequencedLethalInsight(state, playerId, defs, line);
  if (!insight.shouldClearFirst && insight.clearTargetIds.length === 0) return [];

  const legal = generateLegalActions({
    state,
    playerId,
    defs,
    registry,
    createActionId,
  });

  const candidates: Array<{ action: GameAction; bonus: number }> = [];
  for (const action of legal) {
    if (action.type !== 'DECLARE_ATTACK') continue;
    if (!insight.clearTargetIds.includes(action.targetInstanceId)) continue;
    const bonus = evaluateSequencedLethalBonus(
      state,
      action,
      playerId,
      defs,
      registry,
      strategic,
      createActionId,
      line,
    );
    if (bonus > 0) candidates.push({ action, bonus });
  }

  return candidates.sort((a, b) => b.bonus - a.bonus).slice(0, 3).map((c) => c.action);
}
