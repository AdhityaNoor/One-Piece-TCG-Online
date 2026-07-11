/**
 * whenAttacking / onBlock sequencing (guide acceptance: rest before attacks).
 * Prefer firing setup whenAttacking (rest / KO / cost-down) before vanilla swings,
 * and value onBlock payoffs when choosing blockers.
 */
import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { Ability, EffectTemplateRegistry } from '../../engine/effects';
import type { EffectOp } from '../../engine/effects/effectIr';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext } from '../strategy/types';
import { analyzeAbility, profileScalar } from '../analysis/abilityAnalyzer';
import { scoreFieldActivation, type EffectScoreContext } from '../heuristics/effectValue';
import { opponentPublicCardIds, ownFieldCardIds } from '../visibility/playerView';

export interface AttackTriggerAnalysis {
  attackerInstanceId: string;
  hasWhenAttacking: boolean;
  /** DON!! / turn conditions currently met. */
  triggerEnabled: boolean;
  /** Rest / KO / cost-down that should fire before other attacks. */
  isSetupTrigger: boolean;
  requiresLeaderTarget: boolean;
  /** Opponent characters matching rest/KO filters (live payoff). */
  hasLiveSetupTarget: boolean;
  triggerValue: number;
  preferAttackFirst: boolean;
}

function scoreOpsRough(ops: EffectOp[]): number {
  let total = 0;
  for (const op of ops) {
    if (op.op === 'ko') total += 14;
    else if (op.op === 'rest') total += 10;
    else if (op.op === 'addCost') total += 8;
    else if (op.op === 'addPower') total += 6;
    else if (op.op === 'preventBlockers' || op.op === 'suppressBlockerActivation') total += 9;
    else if (op.op === 'chooseTargets') total += 3;
    else total += 2;
  }
  return total;
}

function isSetupOp(op: EffectOp): boolean {
  return (
    op.op === 'rest' ||
    op.op === 'ko' ||
    op.op === 'addCost' ||
    op.op === 'preventBlockers' ||
    op.op === 'suppressBlockerActivation' ||
    op.op === 'returnToHand' ||
    op.op === 'moveToBottomDeck'
  );
}

function abilityConditionMet(ability: Ability, state: GameState, sourceInstanceId: string, playerId: string): boolean {
  const source = state.cardsById[sourceInstanceId];
  if (!source) return false;
  const condition = ability.condition;
  if (!condition) return true;
  if (condition.donAttachedAtLeast !== undefined && source.donAttached.length < condition.donAttachedAtLeast) {
    return false;
  }
  if (condition.turn !== undefined) {
    const isOwnersTurn = state.activePlayerId === source.ownerId;
    if (condition.turn === 'your' && !isOwnersTurn) return false;
    if (condition.turn === 'opponent' && isOwnersTurn) return false;
  }
  return true;
}

function chooseFromHasLiveTarget(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  from: Extract<EffectOp, { op: 'chooseTargets' }>['from'],
): boolean {
  if (from.sel !== 'opponentCharacters' && from.sel !== 'allCharacters') return false;
  const maxCost = 'maxCost' in from ? from.maxCost : undefined;
  const maxPower = 'maxPower' in from ? from.maxPower : undefined;

  for (const id of opponentPublicCardIds(state, playerId)) {
    const inst = state.cardsById[id];
    if (!inst || inst.currentZone !== 'characterArea') continue;
    if (from.sel === 'opponentCharacters' && inst.controllerId === playerId) continue;
    const def = getDefinition(defs, inst);
    if (maxCost !== undefined && (def.baseCost ?? 0) > maxCost) continue;
    if (maxPower !== undefined && (inst.currentPower ?? def.basePower ?? 0) > maxPower) continue;
    return true;
  }
  return false;
}

function abilityHasLiveSetupTarget(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  ability: Ability,
): boolean {
  if (!ability.ops.some(isSetupOp)) return false;
  for (const op of ability.ops) {
    if (op.op === 'chooseTargets') {
      if (chooseFromHasLiveTarget(state, playerId, defs, op.from)) return true;
    }
  }
  // Broad rest/ko without choose still counts if any opponent character exists.
  if (ability.ops.some((op) => op.op === 'rest' || op.op === 'ko')) {
    return opponentPublicCardIds(state, playerId).some(
      (id) => state.cardsById[id]?.currentZone === 'characterArea',
    );
  }
  return false;
}

export function analyzeAttackTrigger(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  attackerInstanceId: string,
): AttackTriggerAnalysis {
  const empty: AttackTriggerAnalysis = {
    attackerInstanceId,
    hasWhenAttacking: false,
    triggerEnabled: false,
    isSetupTrigger: false,
    requiresLeaderTarget: false,
    hasLiveSetupTarget: false,
    triggerValue: 0,
    preferAttackFirst: false,
  };

  const inst = state.cardsById[attackerInstanceId];
  if (!inst) return empty;
  const program = registry[inst.cardDefinitionId];
  const ability = program?.abilities.find((a) => a.timing === 'whenAttacking');
  if (!ability) return empty;

  const triggerEnabled = abilityConditionMet(ability, state, attackerInstanceId, playerId);
  const isSetupTrigger = ability.ops.some(isSetupOp);
  const requiresLeaderTarget = !!ability.battleTargetIsOpponentLeader;
  const hasLiveSetupTarget = triggerEnabled && abilityHasLiveSetupTarget(state, playerId, defs, ability);
  const profile = analyzeAbility(ability, triggerEnabled);
  const triggerValue =
    (triggerEnabled ? 1 : 0.25) * (profileScalar(profile) + scoreOpsRough(ability.ops) * 0.6);

  const preferAttackFirst =
    triggerEnabled && isSetupTrigger && (hasLiveSetupTarget || requiresLeaderTarget) && triggerValue >= 8;

  return {
    attackerInstanceId,
    hasWhenAttacking: true,
    triggerEnabled,
    isSetupTrigger,
    requiresLeaderTarget,
    hasLiveSetupTarget,
    triggerValue,
    preferAttackFirst,
  };
}

function activeAttackers(state: GameState, playerId: string): string[] {
  return ownFieldCardIds(state, playerId).filter((id) => {
    const inst = state.cardsById[id];
    return (
      !!inst &&
      (inst.currentZone === 'leaderArea' || inst.currentZone === 'characterArea') &&
      inst.orientation === 'active' &&
      !inst.summoningSick
    );
  });
}

/**
 * Bonus/penalty for DECLARE_ATTACK based on whenAttacking sequencing.
 */
export function scoreAttackTriggerSequencing(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  attackerInstanceId: string,
  targetInstanceId: string,
): number {
  const analysis = analyzeAttackTrigger(state, playerId, defs, registry, attackerInstanceId);
  const target = state.cardsById[targetInstanceId];
  const isLeaderTarget = target?.currentZone === 'leaderArea';

  let score = 0;

  if (analysis.triggerEnabled) {
    score += analysis.triggerValue * 0.35 * strategic.modeWeights.engine;
  }

  if (analysis.preferAttackFirst) {
    score += 22 + analysis.triggerValue * 0.25;
    if (analysis.hasLiveSetupTarget) score += 10 * strategic.modeWeights.removal;
  }

  if (analysis.requiresLeaderTarget) {
    score += isLeaderTarget ? 18 : -30;
  }

  // Penalize swinging a non-setup attacker while a setup whenAttacking piece is still ready.
  if (!analysis.preferAttackFirst) {
    for (const otherId of activeAttackers(state, playerId)) {
      if (otherId === attackerInstanceId) continue;
      const other = analyzeAttackTrigger(state, playerId, defs, registry, otherId);
      if (other.preferAttackFirst) {
        score -= 28 + Math.min(20, other.triggerValue * 0.3);
        break;
      }
    }
  }

  return score;
}

export function isSetupTriggerAttack(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  action: GameAction,
): boolean {
  if (action.type !== 'DECLARE_ATTACK') return false;
  return analyzeAttackTrigger(state, playerId, defs, registry, action.attackerInstanceId).preferAttackFirst;
}

/** Extra value when activating a blocker that has an onBlock payoff. */
export function scoreOnBlockPayoff(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  blockerInstanceId: string,
): number {
  const ctx: EffectScoreContext = {
    state,
    playerId,
    defs,
    registry,
    sourceInstanceId: blockerInstanceId,
    sourceCardDefinitionId: state.cardsById[blockerInstanceId]?.cardDefinitionId,
  };
  const effect = scoreFieldActivation(ctx, blockerInstanceId, 'onBlock');
  const inst = state.cardsById[blockerInstanceId];
  const program = inst ? registry[inst.cardDefinitionId] : undefined;
  const ability = program?.abilities.find((a) => a.timing === 'onBlock');
  if (!ability) return effect * 0.5;
  const enabled = abilityConditionMet(ability, state, blockerInstanceId, playerId);
  if (!enabled) return effect * 0.2;
  return effect * 0.7 + profileScalar(analyzeAbility(ability, true)) * 0.4 + 6;
}
