import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentCost, computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import { getOpponentId } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { canPayAbilityCost, evaluateGates, fieldDonIds, requiredDonMinusCount, resolveEffectProgram } from '../../engine/effects';
import type { Ability } from '../../engine/effects/effectIr';
import type { GameState } from '../../engine/state/game';
import type { PendingChoice } from '../../engine/events/pendingChoice';
import { ownActiveDonIds, ownFieldCardIds, ownHandIds, opponentPublicCardIds } from '../visibility/playerView';
import { isLegalAction, uniqueActions } from './actionProbe';

export interface LegalActionContext {
  state: GameState;
  playerId: string;
  defs: CardDefinitionLookup;
  registry: EffectTemplateRegistry;
  createActionId: () => string;
}

function baseAction(ctx: LegalActionContext): Pick<GameAction, 'actionId' | 'playerId'> {
  return { actionId: ctx.createActionId(), playerId: ctx.playerId };
}

function activeDonIds(ctx: LegalActionContext): string[] {
  return ownActiveDonIds(ctx.state, ctx.playerId);
}

function pickDonForCost(ctx: LegalActionContext, cost: number): string[] {
  return activeDonIds(ctx).slice(0, cost);
}

function pickAbilityDon(ctx: LegalActionContext, sourceInstanceId: string, ability: Ability): string[] {
  if (!ability.cost?.length) return [];
  const required = requiredDonMinusCount(ability.cost);
  if (required <= 0) return [];
  const candidates = fieldDonIds(ctx.state, ctx.playerId);
  return candidates.slice(0, required);
}

function abilityConditionMet(
  ability: Ability,
  sourceInstanceId: string,
  ctx: LegalActionContext,
): boolean {
  const source = ctx.state.cardsById[sourceInstanceId];
  if (!source) return false;
  const condition = ability.condition;
  if (!condition) return true;
  if (condition.donAttachedAtLeast !== undefined && source.donAttached.length < condition.donAttachedAtLeast) return false;
  if (condition.turn !== undefined) {
    const isOwnersTurn = ctx.state.activePlayerId === source.ownerId;
    if (condition.turn === 'your' && !isOwnersTurn) return false;
    if (condition.turn === 'opponent' && isOwnersTurn) return false;
  }
  if (condition.gate && !evaluateGates(condition.gate, ctx.state, ctx.defs, source.controllerId, sourceInstanceId)) return false;
  return true;
}

function combinations<T>(items: T[], k: number, limit: number): T[][] {
  if (k <= 0) return [[]];
  if (items.length < k) return [];
  const out: T[][] = [];
  function walk(start: number, picked: T[]): void {
    if (out.length >= limit) return;
    if (picked.length === k) {
      out.push([...picked]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      picked.push(items[i]);
      walk(i + 1, picked);
      picked.pop();
      if (out.length >= limit) return;
    }
  }
  walk(0, []);
  return out;
}

function resolveSelectCardCandidates(state: GameState, playerId: string, choice: PendingChoice): string[] {
  if (choice.constraints.candidateInstanceIds?.length) {
    return choice.constraints.candidateInstanceIds;
  }

  const player = state.players[playerId];
  if (!player) return [];

  const zoneId = choice.constraints.zoneId;
  if (zoneId === 'characterArea') return [...player.characterArea.cardIds];
  if (zoneId === 'hand') return [...player.hand.cardIds];
  if (zoneId === 'trash') return [...player.trash.cardIds];
  if (zoneId === 'stageArea') return [...player.stageArea.cardIds];
  if (zoneId === 'leaderArea' && player.leaderInstanceId) return [player.leaderInstanceId];

  if (choice.sourceEffectId === 'rule:characterAreaOverflow') {
    return [...player.characterArea.cardIds];
  }

  return [];
}

function enumerateChoiceResponses(ctx: LegalActionContext, choice: PendingChoice): GameAction[] {
  const base = baseAction(ctx);
  const actions: GameAction[] = [];

  if (choice.kind === 'YES_NO') {
    for (const response of [true, false]) {
      actions.push({ type: 'RESOLVE_PENDING_CHOICE', ...base, choiceId: choice.id, response });
    }
    return actions;
  }

  if (choice.kind === 'SELECT_OPTION') {
    const options = choice.constraints.options ?? [];
    for (let i = 0; i < options.length; i++) {
      actions.push({ type: 'RESOLVE_PENDING_CHOICE', ...base, choiceId: choice.id, response: i });
    }
    return actions;
  }

  if (choice.kind === 'SELECT_NUMBER') {
    const min = choice.constraints.numberMin ?? choice.constraints.min;
    const max = choice.constraints.numberMax ?? choice.constraints.max;
    const candidates = [min, max, Math.floor((min + max) / 2)].filter((n, i, arr) => arr.indexOf(n) === i);
    for (const response of candidates) {
      actions.push({ type: 'RESOLVE_PENDING_CHOICE', ...base, choiceId: choice.id, response });
    }
    return actions;
  }

  if (choice.kind === 'SELECT_CARDS') {
    const candidates = resolveSelectCardCandidates(ctx.state, ctx.playerId, choice);
    const { min, max } = choice.constraints;
    if (max <= 0) {
      actions.push({ type: 'RESOLVE_PENDING_CHOICE', ...base, choiceId: choice.id, response: [] });
      return actions;
    }
    // Softlock escape: required picks with no eligible cards → try empty response.
    // Engine validation may reject this; the turn controller also has a fallback.
    if (candidates.length === 0) {
      actions.push({ type: 'RESOLVE_PENDING_CHOICE', ...base, choiceId: choice.id, response: [] });
      return actions;
    }
    if (min === 0) {
      actions.push({ type: 'RESOLVE_PENDING_CHOICE', ...base, choiceId: choice.id, response: [] });
    }
    if (min === 0 && candidates.length > 0 && candidates.length <= 10) {
      actions.push({ type: 'RESOLVE_PENDING_CHOICE', ...base, choiceId: choice.id, response: [...candidates] });
    }
    // When fewer candidates than min, select all available (partial fill).
    const effectiveMin = Math.min(min, candidates.length);
    const effectiveMax = Math.min(max, candidates.length);
    const pickCounts: number[] = [];
    for (let n = Math.max(effectiveMin, 1); n <= effectiveMax; n++) pickCounts.push(n);
    for (const count of pickCounts) {
      const combos = combinations(candidates, count, 24);
      for (const combo of combos) {
        actions.push({ type: 'RESOLVE_PENDING_CHOICE', ...base, choiceId: choice.id, response: combo });
      }
    }
    return actions;
  }

  return actions;
}

function enumerateSetupActions(ctx: LegalActionContext): GameAction[] {
  const { state, playerId } = ctx;
  const base = baseAction(ctx);
  const actions: GameAction[] = [];
  const setup = state.setupState;
  if (!setup) return actions;

  if (setup.stage === 'awaitingGoingFirstChoice') {
    if (setup.decidingPlayerId !== playerId) return actions;
    if (!state.pendingChoices.some((c) => c.playerId === playerId)) return actions;
    actions.push({ type: 'CHOOSE_GOING_FIRST', ...base, goingFirst: true });
    actions.push({ type: 'CHOOSE_GOING_FIRST', ...base, goingFirst: false });
    return actions;
  }

  if (setup.stage === 'awaitingMulliganDecision') {
    // Setup mulligan is answered with MULLIGAN_DECISION, never RESOLVE_PENDING_CHOICE.
    if (!state.pendingChoices.some((c) => c.playerId === playerId)) return actions;
    actions.push({ type: 'MULLIGAN_DECISION', ...base, redraw: true });
    actions.push({ type: 'MULLIGAN_DECISION', ...base, redraw: false });
    return actions;
  }

  return actions;
}

function enumerateMainPhaseActions(ctx: LegalActionContext): GameAction[] {
  const { state, playerId, defs, registry } = ctx;
  if (state.currentPhase !== 'main' || state.activePlayerId !== playerId || state.currentBattle) return [];
  const base = baseAction(ctx);
  const actions: GameAction[] = [];

  for (const handId of ownHandIds(state, playerId)) {
    const inst = state.cardsById[handId];
    if (!inst) continue;
    const def = getDefinition(defs, inst);
    const cost = computeCurrentCost(defs, state, handId, registry);
    const donInstanceIds = pickDonForCost(ctx, cost);
    if (donInstanceIds.length < cost) continue;

    if (def.category === 'character') {
      actions.push({ type: 'PLAY_CHARACTER', ...base, handCardInstanceId: handId, donInstanceIds });
    } else if (def.category === 'stage') {
      actions.push({ type: 'PLAY_STAGE', ...base, handCardInstanceId: handId, donInstanceIds });
    } else if (def.category === 'event') {
      actions.push({ type: 'ACTIVATE_EVENT_MAIN', ...base, handCardInstanceId: handId, donInstanceIds });
    }
  }

  for (const sourceId of ownFieldCardIds(state, playerId)) {
    const inst = state.cardsById[sourceId];
    if (!inst) continue;
    const program = resolveEffectProgram(registry, defs, inst.cardDefinitionId);
    const ability = program?.abilities.find((a) => a.timing === 'activateMain');
    if (!ability) continue;
    if (ability.oncePerTurn && inst.oncePerTurnUsed.includes('activateMain')) continue;
    if (ability.gate?.length && !evaluateGates(ability.gate, state, defs, playerId, sourceId)) continue;
    if (!abilityConditionMet(ability, sourceId, ctx)) continue;
    const donInstanceIds = pickAbilityDon(ctx, sourceId, ability);
    if (ability.cost?.length) {
      const missing = canPayAbilityCost(state, sourceId, playerId, ability.cost, donInstanceIds);
      if (missing.length > 0) continue;
    }
    actions.push({
      type: 'ACTIVATE_CARD_EFFECT',
      ...base,
      sourceInstanceId: sourceId,
      effectId: 'activateMain',
      donInstanceIds,
    });
  }

  const donIds = activeDonIds(ctx);
  for (const donId of donIds) {
    for (const targetId of ownFieldCardIds(state, playerId)) {
      actions.push({ type: 'GIVE_DON', ...base, donInstanceId: donId, targetInstanceId: targetId });
    }
  }

  const opponentId = getOpponentId(state, playerId);
  const attackers = ownFieldCardIds(state, playerId).filter((id) => {
    const inst = state.cardsById[id];
    return inst && inst.orientation === 'active' && !inst.summoningSick;
  });
  const targets = [
    state.players[opponentId]?.leaderInstanceId,
    ...opponentPublicCardIds(state, playerId).filter((id) => state.cardsById[id]?.orientation === 'rested'),
  ].filter((id): id is string => !!id);

  for (const attackerId of attackers) {
    for (const targetId of targets) {
      actions.push({
        type: 'DECLARE_ATTACK',
        ...base,
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
      });
    }
  }

  actions.push({ type: 'END_MAIN_PHASE', ...base });
  return actions;
}

function enumerateBlockStepActions(ctx: LegalActionContext): GameAction[] {
  const { state, playerId } = ctx;
  const battle = state.currentBattle;
  if (!battle || battle.step !== 'block') return [];
  if (playerId === state.activePlayerId) return [];
  const base = baseAction(ctx);
  const actions: GameAction[] = [];
  const usedOnOppAttack = new Set(battle.onOpponentsAttackUsedInstanceIds ?? []);

  for (const sourceId of ownFieldCardIds(state, playerId)) {
    if (usedOnOppAttack.has(sourceId)) continue;
    const inst = state.cardsById[sourceId];
    if (!inst) continue;
    const program = resolveEffectProgram(ctx.registry, ctx.defs, inst.cardDefinitionId);
    const ability = program?.abilities.find((a) => a.timing === 'onOpponentsAttack');
    if (!ability) continue;
    if (ability.oncePerTurn && inst.oncePerTurnUsed.includes('onOpponentsAttack')) continue;
    if (ability.gate?.length && !evaluateGates(ability.gate, state, ctx.defs, playerId, sourceId)) continue;
    if (!abilityConditionMet(ability, sourceId, ctx)) continue;
    const donInstanceIds = pickAbilityDon(ctx, sourceId, ability);
    if (ability.cost?.length) {
      const missing = canPayAbilityCost(state, sourceId, playerId, ability.cost, donInstanceIds);
      if (missing.length > 0) continue;
    }
    actions.push({
      type: 'ACTIVATE_ON_OPPONENTS_ATTACK',
      ...base,
      sourceInstanceId: sourceId,
      effectId: 'onOpponentsAttack',
      donInstanceIds,
    });
  }

  for (const charId of state.players[playerId]?.characterArea.cardIds ?? []) {
    const inst = state.cardsById[charId];
    if (!inst || inst.orientation !== 'active') continue;
    const def = getDefinition(ctx.defs, inst);
    if (!def.hasBlocker) continue;
    actions.push({ type: 'ACTIVATE_BLOCKER', ...base, blockerInstanceId: charId });
  }

  actions.push({ type: 'PASS_STEP', ...base });
  return actions;
}

function enumerateCounterStepActions(ctx: LegalActionContext): GameAction[] {
  const { state, playerId, defs } = ctx;
  const battle = state.currentBattle;
  if (!battle || battle.step !== 'counter') return [];
  if (playerId === state.activePlayerId) return [];
  const base = baseAction(ctx);
  const actions: GameAction[] = [];

  for (const handId of ownHandIds(state, playerId)) {
    const inst = state.cardsById[handId];
    if (!inst) continue;
    const def = getDefinition(defs, inst);
    if (def.category === 'character' && (def.counter ?? 0) > 0) {
      const boostTargets = ownFieldCardIds(state, playerId);
      for (const targetId of boostTargets) {
        actions.push({
          type: 'ACTIVATE_COUNTER_CHARACTER',
          ...base,
          handCardInstanceId: handId,
          boostTargetInstanceId: targetId,
        });
      }
    }
    if (def.category === 'event') {
      const program = resolveEffectProgram(ctx.registry, defs, inst.cardDefinitionId);
      if (!program?.abilities.some((a) => a.timing === 'counter')) continue;
      const cost = computeCurrentCost(defs, state, handId, ctx.registry);
      const donInstanceIds = pickDonForCost(ctx, cost);
      if (donInstanceIds.length < cost) continue;
      actions.push({ type: 'ACTIVATE_COUNTER_EVENT', ...base, handCardInstanceId: handId, donInstanceIds });
    }
  }

  actions.push({ type: 'PASS_STEP', ...base });
  return actions;
}

function enumeratePendingChoiceActions(ctx: LegalActionContext): GameAction[] {
  const { state, playerId } = ctx;
  const choice = state.pendingChoices[0];
  if (!choice || choice.playerId !== playerId) return [];
  if (state.currentPhase === 'setup') return enumerateSetupActions(ctx);
  return enumerateChoiceResponses(ctx, choice);
}

function enumeratePassDuringBattle(ctx: LegalActionContext): GameAction[] {
  const { state, playerId } = ctx;
  const battle = state.currentBattle;
  if (!battle) return [];
  if (battle.step === 'block') return enumerateBlockStepActions(ctx);
  if (battle.step === 'counter') return enumerateCounterStepActions(ctx);
  return [];
}

export function generateLegalActions(ctx: LegalActionContext): GameAction[] {
  const { state, playerId, defs, registry } = ctx;
  if (state.gameOver) return [];

  let candidates: GameAction[] = [];

  // Setup going-first / mulligan must use dedicated actions (dispatch.ts), not RESOLVE_PENDING_CHOICE.
  if (state.currentPhase === 'setup' && state.setupState) {
    candidates = enumerateSetupActions(ctx);
  } else if (state.pendingChoices.length > 0) {
    candidates = enumeratePendingChoiceActions(ctx);
  } else if (state.currentBattle) {
    candidates = enumeratePassDuringBattle(ctx);
  } else if (state.currentPhase === 'main' && state.activePlayerId === playerId) {
    candidates = enumerateMainPhaseActions(ctx);
  }

  const legal = uniqueActions(candidates).filter((action) => isLegalAction(state, action, defs, registry));
  return legal;
}

export function cardLabel(state: GameState, defs: CardDefinitionLookup, instanceId: string): string {
  const inst = state.cardsById[instanceId];
  if (!inst) return instanceId;
  const def = defs[inst.cardDefinitionId];
  return def?.cardNumber ?? def?.name ?? instanceId;
}

export function actionLabel(state: GameState, defs: CardDefinitionLookup, action: GameAction): string {
  switch (action.type) {
    case 'PLAY_CHARACTER':
    case 'PLAY_STAGE':
    case 'ACTIVATE_EVENT_MAIN':
      return `Play ${cardLabel(state, defs, action.handCardInstanceId)}`;
    case 'ACTIVATE_CARD_EFFECT':
      return `Activate ${cardLabel(state, defs, action.sourceInstanceId)}`;
    case 'ACTIVATE_ON_OPPONENTS_ATTACK':
      return `On Opp Attack ${cardLabel(state, defs, action.sourceInstanceId)}`;
    case 'GIVE_DON':
      return `Give DON to ${cardLabel(state, defs, action.targetInstanceId)}`;
    case 'DECLARE_ATTACK':
      return `Attack ${cardLabel(state, defs, action.targetInstanceId)}`;
    case 'ACTIVATE_BLOCKER':
      return `Block with ${cardLabel(state, defs, action.blockerInstanceId)}`;
    case 'ACTIVATE_COUNTER_CHARACTER':
      return `Counter ${cardLabel(state, defs, action.handCardInstanceId)}`;
    case 'ACTIVATE_COUNTER_EVENT':
      return `Counter Event ${cardLabel(state, defs, action.handCardInstanceId)}`;
    case 'END_MAIN_PHASE':
      return 'End Turn';
    case 'PASS_STEP':
      return 'Pass';
    case 'MULLIGAN_DECISION':
      return action.redraw ? 'Mulligan' : 'Keep Hand';
    case 'CHOOSE_GOING_FIRST':
      return action.goingFirst ? 'Go First' : 'Go Second';
    case 'RESOLVE_PENDING_CHOICE':
      return `Resolve ${action.choiceId}`;
    default:
      return action.type;
  }
}

export function attackerPower(state: GameState, defs: CardDefinitionLookup, attackerId: string): number {
  return computeCurrentPower(defs, state, attackerId);
}
