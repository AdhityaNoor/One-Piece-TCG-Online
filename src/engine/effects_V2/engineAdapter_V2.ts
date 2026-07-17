import type { EffectAbility_V2 } from '../../cards/effectCompiler_V2/effectIr_V2';
import type { ActivationCost_V2, Action_V2, CostAction_V2, Selector_V2, StandardTiming_V2, TimingExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { GameAction } from '../actions';
import type { ActivateCardEffectAction, ActivateCounterEventAction, ActivateEventMainAction, ActivateOnOpponentsAttackAction } from '../actions/action';
import { executeActivateCounterEvent } from '../actions/handlers/activateCounterEvent';
import { executeActivateEventMain } from '../actions/handlers/activateEventMain';
import { executePlayCharacter, validatePlayCharacter } from '../actions/handlers/playCharacter';
import { executePlayStage, validatePlayStage } from '../actions/handlers/playStage';
import { executeDeclareAttack, validateDeclareAttack } from '../rules/battle/declareAttack';
import { executeActivateBlocker, validateActivateBlocker } from '../rules/battle/activateBlocker';
import { executePassStep, validatePassStep } from '../rules/battle/passStep';
import { validateChooseGoingFirst, executeChooseGoingFirst, dealOpeningHandsAndQueueMulligan } from '../setup/applyChooseGoingFirst';
import type { CardDefinitionLookup } from '../rules/shared';
import { computeCurrentCost, computeCurrentPower, hasContinuousKeyword } from '../rules/shared/power';
import { createActionLogger } from '../rules/shared/actionLogger';
import type { GameLogEntry } from '../logs/logEntry';
import type { PendingChoice } from '../events/pendingChoice';
import type { GameState } from '../state/game';
import type { EffectRuntimeBundle_V2 } from './runtime_V2';
import { createEmptyEffectRuntimeSidecars_V2, dispatchCardEffectsForTiming_V2, type EffectRuntimeSidecars_V2, type V2EffectDispatchResult } from './dispatcher_V2';
import { validateCostPayments_V2, type CostPaymentSelection_V2 } from './costs_V2';
import { evaluateGates_V2 } from './gates_V2';
import { executeResolutionNode_V2, type ResolutionExecutionResult_V2 } from './resolution_V2';
import { resolveSelector_V2, type SelectorContext_V2 } from './selectorResolver_V2';
import { pruneExpiredEffectRuntimeSidecars_V2 } from './sidecarLifecycle_V2';
import { v2ActionPreventionReasons, v2PlayPreventionReasons, v2ZoneChangePreventionReasons } from './permissions_V2';
import { applyLifeDamage_V2 } from './damage_V2';
import { applyDamageModifiers_V2 } from './damageModifiers_V2';
import { hasProjectedKeywordWithV2 } from './projectionAdapter_V2';

export interface V2AbilityLookupInput {
  runtime: EffectRuntimeBundle_V2;
  defs: CardDefinitionLookup;
  state: GameState;
  sourceInstanceId: string;
  timing: StandardTiming_V2;
}

export interface V2AbilityValidationInput extends V2AbilityLookupInput {
  controllerId: string;
  activationCostSelections?: readonly CostPaymentSelection_V2[];
}

export interface V2DispatchTimingInput extends V2AbilityValidationInput {
  sidecars?: Partial<EffectRuntimeSidecars_V2>;
}

export interface V2ActionEffectInput {
  previousState?: GameState;
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sidecars: EffectRuntimeSidecars_V2 | null;
  action: GameAction;
  log: GameLogEntry[];
}

export interface V2ActionEffectResult {
  state: GameState;
  log: GameLogEntry[];
  sidecars: EffectRuntimeSidecars_V2;
}

export type V2ActionOverrideResult =
  | { handled: false }
  | { handled: true; ok: false; reasons: string[] }
  | { handled: true; ok: true; state: GameState; log: GameLogEntry[]; sidecars: EffectRuntimeSidecars_V2 };

function timingExpression(timing: StandardTiming_V2): TimingExpression_V2 {
  return { kind: 'STANDARD_TIMING', timing };
}

export function fixedV2CostCount(cost: CostAction_V2): number {
  if (!('count' in cost)) return 0;
  return cost.count.kind === 'NUMBER' ? cost.count.value : 0;
}

function automaticCostPromptCounts_V2(ability: EffectAbility_V2 | undefined): number[] {
  if (!ability?.activationCost?.payments.length) return [];
  const counts = ability.activationCost.payments.map((payment) => (payment.type === 'DON_MINUS_COST' ? fixedV2CostCount(payment) : -1));
  return counts.every((count) => count > 0) ? counts : [];
}

function costAreaDonCandidates(state: GameState, playerId: string): string[] {
  return state.players[playerId]?.costArea.cardIds.filter((id) => state.cardsById[id]?.ownerId === playerId) ?? [];
}

function v2ActivationCostChoiceId(sourceInstanceId: string, abilityId: string, turnNumber: number): string {
  return `${sourceInstanceId}:v2-cost:${abilityId}:${turnNumber}`;
}

function createV2ActivationCostChoice(input: {
  state: GameState;
  sourceInstanceId: string;
  controllerId: string;
  ability: EffectAbility_V2;
  timing: StandardTiming_V2;
  costCounts: number[];
  costSelectionsByCardId?: Record<string, CostPaymentSelection_V2[]>;
}): PendingChoice | null {
  const explicitCandidates = input.costSelectionsByCardId ? Object.keys(input.costSelectionsByCardId) : [];
  const total = explicitCandidates.length > 0 ? 1 : input.costCounts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return null;
  return {
    id: v2ActivationCostChoiceId(input.sourceInstanceId, input.ability.abilityId, input.state.turnNumber),
    playerId: input.controllerId,
    kind: 'SELECT_CARDS',
    prompt: `Select ${total} DON!! card${total === 1 ? '' : 's'} for this V2 effect cost.`,
    constraints: {
      min: total,
      max: total,
      zoneId: explicitCandidates.length > 0 ? undefined : 'costArea',
      filterDescription: explicitCandidates.length > 0 ? 'Cards eligible for this V2 activation cost.' : 'DON!! cards on your field for a V2 activation cost.',
      candidateInstanceIds: explicitCandidates.length > 0 ? explicitCandidates : costAreaDonCandidates(input.state, input.controllerId),
    },
    sourceInstanceId: input.sourceInstanceId,
    sourceEffectId: 'v2:activationCost',
    resumeState: {
      abilityIndex: 0,
      opIndex: 0,
      bindings: {},
      v2ActivationCost: {
        sourceInstanceId: input.sourceInstanceId,
        abilityId: input.ability.abilityId,
        timing: input.timing,
        costCounts: input.costCounts,
        ...(input.costSelectionsByCardId ? { costSelectionsByCardId: input.costSelectionsByCardId } : {}),
      },
    },
  };
}

function appendPendingChoiceIfMissing(state: GameState, choice: PendingChoice | null): GameState {
  if (!choice || state.pendingChoices.some((candidate) => candidate.id === choice.id)) return state;
  return { ...state, pendingChoices: [...state.pendingChoices, choice] };
}

function mergeSidecarsFromResolution_V2(sidecars: EffectRuntimeSidecars_V2 | null, result: ResolutionExecutionResult_V2): EffectRuntimeSidecars_V2 {
  const base = createEmptyEffectRuntimeSidecars_V2(sidecars ?? undefined);
  return {
    delayedEffects: [...base.delayedEffects, ...(result.delayedEffects ?? [])],
    replacementEffects: [...base.replacementEffects, ...(result.replacementEffects ?? [])],
    permissionEffects: [...base.permissionEffects, ...(result.permissionEffects ?? [])],
    statModifiers: [...base.statModifiers, ...(result.statModifiers ?? [])],
    keywordModifiers: [...base.keywordModifiers, ...(result.keywordModifiers ?? [])],
    cardPropertyModifiers: [...base.cardPropertyModifiers, ...(result.cardPropertyModifiers ?? [])],
    counterModifiers: [...base.counterModifiers, ...(result.counterModifiers ?? [])],
    effectInvalidations: [...base.effectInvalidations, ...(result.effectInvalidations ?? [])],
    activatedEvents: [...base.activatedEvents, ...(result.activatedEvents ?? [])],
    gainedEffects: [...base.gainedEffects, ...(result.gainedEffects ?? [])],
    gainedEffectRemovals: [...base.gainedEffectRemovals, ...(result.gainedEffectRemovals ?? [])],
    choicePrompts: [...base.choicePrompts, ...(result.choicePrompts ?? [])],
    lookBuffers: [...base.lookBuffers, ...(result.lookBuffers ?? [])],
  };
}

function startingSetupPlayActionFromModifier_V2(modifier: unknown): Extract<Action_V2, { type: 'PLAY_CARD' }> | null {
  const expression = typeof modifier === 'object' && modifier
    && 'modifier' in modifier
    && typeof (modifier as { modifier?: unknown }).modifier === 'object'
    && (modifier as { modifier?: { expression?: unknown } }).modifier
      ? (modifier as { modifier: { expression?: unknown } }).modifier.expression
      : null;
  if (!expression || typeof expression !== 'object') return null;
  const record = expression as { operation?: unknown; selector?: unknown };
  if (record.operation !== 'PLAY_FROM_DECK_AT_GAME_START' || !record.selector || typeof record.selector !== 'object') return null;
  return {
    type: 'PLAY_CARD',
    selector: record.selector as Selector_V2,
    player: 'PLAYER',
  };
}

export function advanceStartOfGameEffects_V2(input: {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sidecars: EffectRuntimeSidecars_V2 | null;
  actionId: string | null;
}): V2ActionEffectResult {
  const setupState = input.state.setupState;
  if (!setupState || setupState.stage !== 'awaitingStartOfGameLeaderEffect') {
    return {
      state: input.state,
      log: [],
      sidecars: input.sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
    };
  }
  if (input.state.pendingChoices.length > 0) {
    return {
      state: input.state,
      log: [],
      sidecars: input.sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
    };
  }

  let state = input.state;
  let sidecars = input.sidecars ?? createEmptyEffectRuntimeSidecars_V2();
  let log: GameLogEntry[] = [];
  let queue = setupState.startOfGameEffectQueue ?? [];

  while (queue.length > 0) {
    const playerId = queue[0];
    queue = queue.slice(1);
    const player = state.players[playerId];
    const leaderInstance = player ? state.cardsById[player.leaderInstanceId] : undefined;
    if (!leaderInstance) continue;

    const dispatched = dispatchV2AbilityForTiming({
      state,
      defs: input.defs,
      runtime: input.runtime,
      sourceInstanceId: leaderInstance.instanceId,
      controllerId: playerId,
      timing: 'ON_ENTER_PLAY',
      sidecars,
    });
    state = dispatched.state;
    sidecars = dispatched.sidecars;
    log = [...log, ...dispatched.log];

    const setupPlayActions = dispatched.sidecars.permissionEffects
      .filter((effect) => effect.kind === 'MODIFY_STARTING_SETUP' && effect.sourceInstanceId === leaderInstance.instanceId)
      .map((effect) => startingSetupPlayActionFromModifier_V2(effect.modifier))
      .filter((action): action is Extract<Action_V2, { type: 'PLAY_CARD' }> => Boolean(action));

    for (const playAction of setupPlayActions) {
      const ctx: SelectorContext_V2 = {
        state,
        defs: input.defs,
        runtime: input.runtime,
        sidecars,
        sourceInstanceId: leaderInstance.instanceId,
        controllerId: playerId,
        currentTiming: { kind: 'STANDARD_TIMING', timing: 'ON_ENTER_PLAY' },
        bindings: { selectedObjects: {}, actionResults: {} },
      };
      const result = executeResolutionNode_V2(ctx, { kind: 'ACTION', action: playAction }, input.actionId);
      state = result.state;
      log = [...log, ...result.log];
      sidecars = mergeSidecarsFromResolution_V2(sidecars, result);
      if (state.pendingChoices.length > 0) {
        return {
          state: {
            ...state,
            setupState: { ...setupState, startOfGameEffectQueue: queue },
          },
          log,
          sidecars,
        };
      }
    }
  }

  if (!setupState.goingFirstPlayerId || !setupState.goingSecondPlayerId) {
    throw new Error('advanceStartOfGameEffects_V2: goingFirstPlayerId/goingSecondPlayerId must be set before dealing opening hands.');
  }
  const dealt = dealOpeningHandsAndQueueMulligan(state, setupState.goingFirstPlayerId, setupState.goingSecondPlayerId, input.actionId);
  return { state: dealt.state, log: [...log, ...dealt.log], sidecars };
}

function isSelfCardCost_V2(payment: CostAction_V2): payment is Extract<CostAction_V2, { type: 'REST_CARD_COST' }> {
  return payment.type === 'REST_CARD_COST' && payment.selector.relations?.includes('THIS_CARD') === true;
}

function fixedDonSelectionCount_V2(payment: CostAction_V2): number {
  return payment.type === 'DON_MINUS_COST' || payment.type === 'REST_DON_COST' ? fixedV2CostCount(payment) : 0;
}

export function activationCostSelectionsFromDonIds_V2(cost: ActivationCost_V2 | undefined, donInstanceIds: readonly string[], sourceInstanceId?: string): CostPaymentSelection_V2[] {
  if (!cost?.payments.length) return [];
  let offset = 0;
  return cost.payments.map((payment, costIndex) => {
    const count = fixedDonSelectionCount_V2(payment);
    const selectedInstanceIds = count > 0
      ? donInstanceIds.slice(offset, offset + count)
      : isSelfCardCost_V2(payment) && sourceInstanceId
        ? [sourceInstanceId]
        : [];
    offset += count;
    return { costIndex, selectedInstanceIds };
  });
}

function activationCostSelectionsFromCounts_V2(costCounts: readonly number[], selectedInstanceIds: readonly string[]): CostPaymentSelection_V2[] {
  let offset = 0;
  return costCounts.map((count, costIndex) => {
    const selection = { costIndex, selectedInstanceIds: selectedInstanceIds.slice(offset, offset + count) };
    offset += count;
    return selection;
  });
}

function promptableChooseOneCostSelectionsByCardId_V2(input: {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sourceInstanceId: string;
  controllerId: string;
  timing: StandardTiming_V2;
  ability: EffectAbility_V2;
}): Record<string, CostPaymentSelection_V2[]> | null {
  const payments = input.ability.activationCost?.payments;
  if (!payments || payments.length !== 1 || payments[0].type !== 'CHOOSE_ONE_COST') return null;
  const ctx = createV2SelectorContext(input);
  const byCardId: Record<string, CostPaymentSelection_V2[]> = {};
  for (const [optionIndex, option] of payments[0].options.entries()) {
    if (option.length !== 1 || !('selector' in option[0])) continue;
    const cost = option[0];
    const resolved = resolveSelector_V2(ctx, cost.selector);
    if (resolved.minimum !== 1 || resolved.maximum !== 1) continue;
    for (const id of resolved.candidateInstanceIds) {
      if (byCardId[id]) return null;
      byCardId[id] = [{
        costIndex: 0,
        selectedOptionIndex: optionIndex,
        optionSelections: [{ costIndex: 0, selectedInstanceIds: [id] }],
        selectedInstanceIds: [],
      }];
    }
  }
  return Object.keys(byCardId).length > 0 ? byCardId : null;
}

export function findV2AbilityForTiming(input: V2AbilityLookupInput): EffectAbility_V2 | undefined {
  const source = input.state.cardsById[input.sourceInstanceId];
  const def = source ? input.defs[source.cardDefinitionId] : undefined;
  return def
    ? input.runtime.programsByCardNumber[def.cardNumber]?.abilities.find((candidate) => candidate.timing.kind === 'STANDARD_TIMING' && candidate.timing.timing === input.timing)
    : undefined;
}

export function createV2SelectorContext(input: V2AbilityValidationInput): SelectorContext_V2 {
  return {
    state: input.state,
    defs: input.defs,
    sourceInstanceId: input.sourceInstanceId,
    controllerId: input.controllerId,
    runtime: input.runtime,
    currentTiming: timingExpression(input.timing),
    bindings: { selectedObjects: {}, actionResults: {} },
  };
}

export function validateV2AbilityForTiming(input: V2AbilityValidationInput): string[] {
  const ability = findV2AbilityForTiming(input);
  if (!ability) return [`No V2 ${input.timing} ability exists for '${input.sourceInstanceId}'.`];
  const ctx = createV2SelectorContext(input);
  const reasons: string[] = [];
  const gates = evaluateGates_V2(ctx, ability.gates);
  if (!gates.value) reasons.push(...(gates.unsupportedReasons.length ? gates.unsupportedReasons : ['V2 ability gates are not satisfied.']));
  if (ability.oncePerTurn && input.state.cardsById[input.sourceInstanceId]?.oncePerTurnUsed.includes(ability.abilityId)) {
    reasons.push(`This V2 [Once Per Turn] effect of '${input.sourceInstanceId}' was already used this turn.`);
  }
  if (ability.activationCost?.payments.length) {
    const validation = validateCostPayments_V2(ctx, ability.activationCost.payments, input.activationCostSelections ?? []);
    if (!validation.legal) reasons.push(...validation.reasons);
  } else if ((input.activationCostSelections?.length ?? 0) > 0) {
    reasons.push('This V2 effect has no activation cost, so no V2 activation-cost selections should be supplied.');
  }
  return reasons;
}

export function dispatchV2AbilityForTiming(input: V2DispatchTimingInput): V2EffectDispatchResult {
  return dispatchCardEffectsForTiming_V2({
    state: input.state,
    defs: input.defs,
    runtime: input.runtime,
    sourceInstanceId: input.sourceInstanceId,
    controllerId: input.controllerId,
    timing: timingExpression(input.timing),
    sidecars: input.sidecars,
    activationCostSelections: input.activationCostSelections,
  });
}

function validateV2ActivationCost(args: {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sourceInstanceId: string;
  controllerId: string;
  timing: StandardTiming_V2;
  donInstanceIds: readonly string[];
}): string[] {
  const ability = findV2AbilityForTiming(args);
  if (!ability) return validateV2AbilityForTiming(args);
  const reasons = validateV2AbilityForTiming({
    ...args,
    activationCostSelections: activationCostSelectionsFromDonIds_V2(ability.activationCost, args.donInstanceIds, args.sourceInstanceId),
  });
  if (!ability.activationCost?.payments.length && args.donInstanceIds.length > 0) {
    reasons.push('This V2 effect has no activation cost, so no DON!! should be selected.');
  }
  return reasons;
}

export function validateActivateCardEffect_V2(
  state: GameState,
  action: ActivateCardEffectAction,
  defs: CardDefinitionLookup,
  runtime: EffectRuntimeBundle_V2,
): string[] {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') reasons.push('ACTIVATE_CARD_EFFECT is only legal during the Main Phase.');
  if (action.playerId !== state.activePlayerId) reasons.push('Only the turn player may activate a card effect.');
  const source = state.cardsById[action.sourceInstanceId];
  if (!source || source.controllerId !== action.playerId || !['leaderArea', 'characterArea', 'stageArea'].includes(source.currentZone)) {
    reasons.push(`'${action.sourceInstanceId}' is not one of ${action.playerId}'s cards in play.`);
    return reasons;
  }
  const ability = findV2AbilityForTiming({ runtime, defs, state, sourceInstanceId: action.sourceInstanceId, timing: 'ACTIVATE_MAIN' });
  if (!ability) reasons.push(`'${source.cardDefinitionId}' has no V2 [Activate: Main] effect.`);
  reasons.push(...validateV2ActivationCost({ state, defs, runtime, sourceInstanceId: action.sourceInstanceId, controllerId: action.playerId, timing: 'ACTIVATE_MAIN', donInstanceIds: action.donInstanceIds }));
  return reasons;
}

export function validateActivateEventMain_V2(
  state: GameState,
  action: ActivateEventMainAction,
  defs: CardDefinitionLookup,
  runtime: EffectRuntimeBundle_V2,
): string[] {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') reasons.push('ACTIVATE_EVENT_MAIN is only legal during the Main Phase.');
  if (action.playerId !== state.activePlayerId) reasons.push('Only the turn player may activate a [Main] Event.');
  const source = state.cardsById[action.handCardInstanceId];
  if (!source || source.currentZone !== 'hand' || source.ownerId !== action.playerId) {
    reasons.push(`'${action.handCardInstanceId}' is not in ${action.playerId}'s hand.`);
    return reasons;
  }
  const def = defs[source.cardDefinitionId];
  if (!def) {
    reasons.push(`No CardDefinition found for '${source.cardDefinitionId}'.`);
    return reasons;
  }
  if (def.category !== 'event') reasons.push(`'${def.name}' is a ${def.category}, not an Event.`);
  if (!findV2AbilityForTiming({ runtime, defs, state, sourceInstanceId: action.handCardInstanceId, timing: 'EVENT_MAIN' })) {
    reasons.push(`'${def.name}' has no V2 [Main] Event effect.`);
  }
  const cost = computeCurrentCost(defs, state, action.handCardInstanceId);
  if (action.donInstanceIds.length !== cost) {
    reasons.push(`'${def.name}' costs ${cost} DON!!, but ${action.donInstanceIds.length} were supplied.`);
  }
  const uniqueDonIds = new Set(action.donInstanceIds);
  if (uniqueDonIds.size !== action.donInstanceIds.length) reasons.push('donInstanceIds must not contain duplicates.');
  for (const donId of uniqueDonIds) {
    const don = state.cardsById[donId];
    if (!don || don.currentZone !== 'costArea' || don.ownerId !== action.playerId) reasons.push(`'${donId}' is not a DON!! in ${action.playerId}'s cost area.`);
    else if (don.donRested === true) reasons.push(`'${donId}' is already rested and cannot pay a cost.`);
  }
  reasons.push(...validateV2ActivationCost({ state, defs, runtime, sourceInstanceId: action.handCardInstanceId, controllerId: action.playerId, timing: 'EVENT_MAIN', donInstanceIds: action.abilityCostDonInstanceIds ?? [] }));
  return reasons;
}

function opponentOfState(state: GameState, playerId: string): string | null {
  return Object.keys(state.players).find((id) => id !== playerId) ?? null;
}

export function validateActivateCounterEvent_V2(
  state: GameState,
  action: ActivateCounterEventAction,
  defs: CardDefinitionLookup,
  runtime: EffectRuntimeBundle_V2,
): string[] {
  const reasons: string[] = [];
  if (state.currentBattle?.step !== 'counter') reasons.push('ACTIVATE_COUNTER_EVENT is only legal during the Counter Step.');
  const defender = opponentOfState(state, state.activePlayerId);
  if (defender && action.playerId !== defender) reasons.push('Only the defending player may activate a Counter Event.');
  const source = state.cardsById[action.handCardInstanceId];
  if (!source || source.currentZone !== 'hand' || source.ownerId !== action.playerId) {
    reasons.push(`'${action.handCardInstanceId}' is not in ${action.playerId}'s hand.`);
    return reasons;
  }
  const def = defs[source.cardDefinitionId];
  if (!def) {
    reasons.push(`No CardDefinition found for '${source.cardDefinitionId}'.`);
    return reasons;
  }
  if (def.category !== 'event') reasons.push(`'${def.name}' is a ${def.category}, not an Event.`);
  if (!findV2AbilityForTiming({ runtime, defs, state, sourceInstanceId: action.handCardInstanceId, timing: 'EVENT_COUNTER' })) {
    reasons.push(`'${def.name}' has no V2 [Counter] Event effect.`);
  }
  const cost = computeCurrentCost(defs, state, action.handCardInstanceId);
  if (action.donInstanceIds.length !== cost) reasons.push(`'${def.name}' costs ${cost} DON!!, but ${action.donInstanceIds.length} were supplied.`);
  const uniqueDonIds = new Set(action.donInstanceIds);
  if (uniqueDonIds.size !== action.donInstanceIds.length) reasons.push('donInstanceIds must not contain duplicates.');
  for (const donId of uniqueDonIds) {
    const don = state.cardsById[donId];
    if (!don || don.currentZone !== 'costArea' || don.ownerId !== action.playerId) reasons.push(`'${donId}' is not a DON!! in ${action.playerId}'s cost area.`);
    else if (don.donRested === true) reasons.push(`'${donId}' is already rested and cannot pay a cost.`);
  }
  reasons.push(...validateV2ActivationCost({ state, defs, runtime, sourceInstanceId: action.handCardInstanceId, controllerId: action.playerId, timing: 'EVENT_COUNTER', donInstanceIds: action.abilityCostDonInstanceIds ?? [] }));
  return reasons;
}

export function validateActivateOnOpponentsAttack_V2(
  state: GameState,
  action: ActivateOnOpponentsAttackAction,
  defs: CardDefinitionLookup,
  runtime: EffectRuntimeBundle_V2,
): string[] {
  const reasons: string[] = [];
  if (state.currentBattle?.step !== 'block') reasons.push("[On Your Opponent's Attack] is only usable during the Block Step.");
  const defender = opponentOfState(state, state.activePlayerId);
  if (defender && action.playerId !== defender) reasons.push("Only the defending player may activate an [On Your Opponent's Attack] ability.");
  const source = state.cardsById[action.sourceInstanceId];
  if (!source || source.controllerId !== action.playerId || !['leaderArea', 'characterArea', 'stageArea'].includes(source.currentZone)) {
    reasons.push(`'${action.sourceInstanceId}' is not one of ${action.playerId}'s cards in play.`);
    return reasons;
  }
  const ability = findV2AbilityForTiming({ runtime, defs, state, sourceInstanceId: action.sourceInstanceId, timing: 'ON_OPPONENT_ATTACK' });
  if (!ability) reasons.push(`'${source.cardDefinitionId}' has no V2 [On Your Opponent's Attack] ability.`);
  if (state.currentBattle?.onOpponentsAttackUsedInstanceIds?.includes(action.sourceInstanceId)) {
    reasons.push(`'${source.cardDefinitionId}' already activated [On Your Opponent's Attack] during this battle.`);
  }
  reasons.push(...validateV2ActivationCost({ state, defs, runtime, sourceInstanceId: action.sourceInstanceId, controllerId: action.playerId, timing: 'ON_OPPONENT_ATTACK', donInstanceIds: action.donInstanceIds }));
  return reasons;
}

function withOnOpponentsAttackUsage_V2(state: GameState, action: ActivateOnOpponentsAttackAction): GameState {
  const battle = state.currentBattle;
  if (!battle) return state;
  return {
    ...state,
    currentBattle: {
      ...battle,
      onOpponentsAttackUsedInstanceIds: [...(battle.onOpponentsAttackUsedInstanceIds ?? []), action.sourceInstanceId],
    },
  };
}

function validateManualPlayPermission_V2(input: {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sidecars: EffectRuntimeSidecars_V2 | null;
  playerId: string;
  handCardInstanceId: string;
}): string[] {
  const ctx: SelectorContext_V2 = {
    state: input.state,
    defs: input.defs,
    runtime: input.runtime,
    sidecars: input.sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
    sourceInstanceId: input.handCardInstanceId,
    controllerId: input.playerId,
    bindings: { selectedObjects: {}, actionResults: {} },
  };
  return v2PlayPreventionReasons({
    ctx,
    permissionEffects: ctx.sidecars?.permissionEffects ?? [],
    playerId: input.playerId,
    candidateInstanceId: input.handCardInstanceId,
    cause: 'MANUAL',
  });
}

function validateManualActionPermission_V2(input: {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sidecars: EffectRuntimeSidecars_V2 | null;
  sourceInstanceId: string;
  controllerId: string;
  action: string;
  candidateInstanceId: string;
  cause?: string;
}): string[] {
  const ctx: SelectorContext_V2 = {
    state: input.state,
    defs: input.defs,
    runtime: input.runtime,
    sidecars: input.sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
    sourceInstanceId: input.sourceInstanceId,
    controllerId: input.controllerId,
    bindings: { selectedObjects: {}, actionResults: {} },
  };
  return v2ActionPreventionReasons({
    ctx,
    permissionEffects: ctx.sidecars?.permissionEffects ?? [],
    action: input.action,
    candidateInstanceId: input.candidateInstanceId,
    cause: input.cause,
  });
}

function v2BattleKoPreventionReasons(input: {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sidecars: EffectRuntimeSidecars_V2 | null;
  attackerInstanceId: string;
  targetInstanceId: string;
}): string[] {
  const attacker = input.state.cardsById[input.attackerInstanceId];
  if (!attacker) return [];
  const ctx: SelectorContext_V2 = {
    state: input.state,
    defs: input.defs,
    runtime: input.runtime,
    sidecars: input.sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
    sourceInstanceId: input.attackerInstanceId,
    controllerId: attacker.controllerId,
    bindings: { selectedObjects: {}, actionResults: {} },
  };
  return [
    ...v2ActionPreventionReasons({
      ctx,
      permissionEffects: ctx.sidecars?.permissionEffects ?? [],
      action: 'KO_CARD',
      candidateInstanceId: input.targetInstanceId,
      cause: 'BATTLE',
    }),
    ...v2ZoneChangePreventionReasons({
      ctx,
      permissionEffects: ctx.sidecars?.permissionEffects ?? [],
      candidateInstanceId: input.targetInstanceId,
      toZone: 'TRASH',
      cause: 'BATTLE',
    }),
  ];
}

function resolveV2BattleKoPreventedPassStep(input: {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sidecars: EffectRuntimeSidecars_V2 | null;
  action: Extract<GameAction, { type: 'PASS_STEP' }>;
  reasons: readonly string[];
}): V2ActionOverrideResult {
  const battle = input.state.currentBattle;
  if (!battle) return { handled: true, ok: false, reasons: ['PASS_STEP requires an in-progress Battle.'] };
  const attackerId = battle.attackerInstanceId;
  const targetId = battle.targetInstanceId;
  const attackerPower = computeCurrentPower(input.defs, input.state, attackerId);
  const targetPower = computeCurrentPower(input.defs, input.state, targetId);
  const logger = createActionLogger(input.state, input.action.actionId);
  logger.push({
    actorPlayerId: input.action.playerId,
    type: 'PHASE_CHANGED',
    message: `${input.action.playerId} declined to activate any further Counters - Counter Step ends (7-1-3 -> 7-1-4).`,
    data: { step: 'damage' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });
  logger.push({
    actorPlayerId: input.state.activePlayerId,
    type: 'DAMAGE_DEALT',
    message: `Damage Step: ${attackerPower} (attacker) vs ${targetPower} (defender) (7-1-4).`,
    data: { attackerInstanceId: attackerId, targetInstanceId: targetId, attackerPower, targetPower },
    relatedCardInstanceIds: [attackerId, targetId],
    visibility: 'public',
  });
  logger.push({
    actorPlayerId: input.state.activePlayerId,
    type: 'DAMAGE_DEALT',
    message: `'${targetId}' cannot be K.O.'d in battle by a V2 permission effect - it survives.`,
    data: { targetInstanceId: targetId, koPrevented: true, v2Reasons: [...input.reasons] },
    relatedCardInstanceIds: [targetId],
    visibility: 'public',
  });
  logger.push({
    actorPlayerId: input.state.activePlayerId,
    type: 'PHASE_CHANGED',
    message: 'End of Battle (7-1-5) - battle-only power bonuses expire, control returns to the Main Phase.',
    data: { step: 'endOfBattle' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });
  const state = {
    ...input.state,
    currentBattle: null,
    continuousEffects: input.state.continuousEffects.filter((effect) => effect.duration !== 'duringThisBattle'),
    log: [...input.state.log, ...logger.log],
  };
  return {
    handled: true,
    ok: true,
    state,
    log: logger.log,
    sidecars: pruneExpiredEffectRuntimeSidecars_V2(state, input.sidecars ?? createEmptyEffectRuntimeSidecars_V2()),
  };
}

function resolveV2LeaderBattleDamagePassStep(input: {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sidecars: EffectRuntimeSidecars_V2 | null;
  action: Extract<GameAction, { type: 'PASS_STEP' }>;
}): V2ActionOverrideResult | null {
  const battle = input.state.currentBattle;
  if (!battle || battle.step !== 'counter') return null;
  const target = input.state.cardsById[battle.targetInstanceId];
  const attacker = input.state.cardsById[battle.attackerInstanceId];
  if (!target || !attacker || target.currentZone !== 'leaderArea') return null;

  const defendingPlayerId = opponentOfState(input.state, input.state.activePlayerId);
  if (!defendingPlayerId) return null;

  const attackerPower = computeCurrentPower(input.defs, input.state, battle.attackerInstanceId);
  const targetPower = computeCurrentPower(input.defs, input.state, battle.targetInstanceId);
  const logger = createActionLogger(input.state, input.action.actionId);
  logger.push({
    actorPlayerId: input.action.playerId,
    type: 'PHASE_CHANGED',
    message: `${input.action.playerId} declined to activate any further Counters - Counter Step ends (7-1-3 -> 7-1-4).`,
    data: { step: 'damage' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });
  logger.push({
    actorPlayerId: input.state.activePlayerId,
    type: 'DAMAGE_DEALT',
    message: `Damage Step: ${attackerPower} (attacker) vs ${targetPower} (defender) (7-1-4).`,
    data: { attackerInstanceId: battle.attackerInstanceId, targetInstanceId: battle.targetInstanceId, attackerPower, targetPower },
    relatedCardInstanceIds: [battle.attackerInstanceId, battle.targetInstanceId],
    visibility: 'public',
  });

  let state: GameState = {
    ...input.state,
    currentBattle: { ...battle, step: 'damage' },
    log: [...input.state.log, ...logger.log],
  };
  let log: GameLogEntry[] = [...logger.log];

  if (attackerPower >= targetPower) {
    const attackerDef = input.defs[attacker.cardDefinitionId];
    const ctx: SelectorContext_V2 = {
      state,
      defs: input.defs,
      runtime: input.runtime,
      sidecars: input.sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
      sourceInstanceId: battle.attackerInstanceId,
      controllerId: attacker.controllerId,
      bindings: { selectedObjects: {}, actionResults: {} },
    };
    const hasV2DoubleAttack = hasProjectedKeywordWithV2(input.defs, state, battle.attackerInstanceId, 'doubleAttack', { sidecars: ctx.sidecars });
    const baseHitCount = (hasV2DoubleAttack ?? (attackerDef?.hasDoubleAttack || hasContinuousKeyword(input.defs, state, battle.attackerInstanceId, 'doubleAttack'))) ? 2 : 1;
    const hitCount = applyDamageModifiers_V2({
      ctx,
      sidecars: ctx.sidecars,
      sourceIds: [battle.attackerInstanceId],
      baseAmount: baseHitCount,
    });
    if (hitCount > 0) {
      const damaged = applyLifeDamage_V2({
        state,
        actorPlayerId: input.state.activePlayerId,
        targetPlayerId: defendingPlayerId,
        amount: { kind: 'NUMBER', value: hitCount },
        processing: (hasProjectedKeywordWithV2(input.defs, state, battle.attackerInstanceId, 'banish', { sidecars: ctx.sidecars })
          ?? (attackerDef?.hasBanish || hasContinuousKeyword(input.defs, state, battle.attackerInstanceId, 'banish')))
          ? 'BANISH'
          : 'CHECK_TRIGGER',
        actionId: input.action.actionId,
      });
      state = damaged.state;
      log = [...log, ...damaged.log];
    } else {
      const zeroLogger = createActionLogger(state, input.action.actionId);
      zeroLogger.push({
        actorPlayerId: input.state.activePlayerId,
        type: 'DAMAGE_DEALT',
        message: 'The attack dealt 0 damage after V2 damage modifiers.',
        data: { attackerInstanceId: battle.attackerInstanceId, targetInstanceId: battle.targetInstanceId, hitCount },
        relatedCardInstanceIds: [battle.attackerInstanceId, battle.targetInstanceId],
        visibility: 'public',
      });
      state = { ...state, log: [...state.log, ...zeroLogger.log] };
      log = [...log, ...zeroLogger.log];
    }
  } else {
    const failLogger = createActionLogger(state, input.action.actionId);
    failLogger.push({
      actorPlayerId: input.state.activePlayerId,
      type: 'DAMAGE_DEALT',
      message: 'Attack failed - attacker power was less than the defender\'s (7-1-4).',
      data: { succeeded: false },
      relatedCardInstanceIds: [battle.attackerInstanceId, battle.targetInstanceId],
      visibility: 'public',
    });
    state = { ...state, log: [...state.log, ...failLogger.log] };
    log = [...log, ...failLogger.log];
  }

  if (!state.gameOver) {
    const endLogger = createActionLogger(state, input.action.actionId);
    endLogger.push({
      actorPlayerId: input.state.activePlayerId,
      type: 'PHASE_CHANGED',
      message: 'End of Battle (7-1-5) - battle-only power bonuses expire, control returns to the Main Phase.',
      data: { step: 'endOfBattle' },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    state = { ...state, log: [...state.log, ...endLogger.log] };
    log = [...log, ...endLogger.log];
  }

  state = {
    ...state,
    currentBattle: null,
    continuousEffects: state.continuousEffects.filter((effect) => effect.duration !== 'duringThisBattle'),
  };
  return {
    handled: true,
    ok: true,
    state,
    log,
    sidecars: pruneExpiredEffectRuntimeSidecars_V2(state, input.sidecars ?? createEmptyEffectRuntimeSidecars_V2()),
  };
}

export function executeV2ActionOverride(input: {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sidecars: EffectRuntimeSidecars_V2 | null;
  action: GameAction;
}): V2ActionOverrideResult {
  const { state, defs, runtime, sidecars, action } = input;
  switch (action.type) {
    case 'CHOOSE_GOING_FIRST': {
      const validation = validateChooseGoingFirst(state, action);
      if (!validation.legal) return { handled: true, ok: false, reasons: validation.reasons };
      const chosen = executeChooseGoingFirst(state, action);
      const advanced = advanceStartOfGameEffects_V2({
        state: chosen.state,
        defs,
        runtime,
        sidecars,
        actionId: action.actionId,
      });
      return {
        handled: true,
        ok: true,
        state: advanced.state,
        log: [...chosen.log, ...advanced.log],
        sidecars: advanced.sidecars,
      };
    }
    case 'PLAY_CHARACTER': {
      const baseValidation = validatePlayCharacter(state, action, defs);
      const permissionReasons = validateManualPlayPermission_V2({
        state,
        defs,
        runtime,
        sidecars,
        playerId: action.playerId,
        handCardInstanceId: action.handCardInstanceId,
      });
      const reasons = [...baseValidation.reasons, ...permissionReasons];
      if (reasons.length > 0) return { handled: true, ok: false, reasons };
      const base = executePlayCharacter(state, action, defs, {});
      const applied = applyV2EffectsForAction({ previousState: state, state: base.state, defs, runtime, sidecars, action, log: base.log });
      return { handled: true, ok: true, state: applied.state, log: [...base.log, ...applied.log], sidecars: applied.sidecars };
    }
    case 'PLAY_STAGE': {
      const baseValidation = validatePlayStage(state, action, defs);
      const permissionReasons = validateManualPlayPermission_V2({
        state,
        defs,
        runtime,
        sidecars,
        playerId: action.playerId,
        handCardInstanceId: action.handCardInstanceId,
      });
      const reasons = [...baseValidation.reasons, ...permissionReasons];
      if (reasons.length > 0) return { handled: true, ok: false, reasons };
      const base = executePlayStage(state, action, defs, {});
      const applied = applyV2EffectsForAction({ previousState: state, state: base.state, defs, runtime, sidecars, action, log: base.log });
      return { handled: true, ok: true, state: applied.state, log: [...base.log, ...applied.log], sidecars: applied.sidecars };
    }
    case 'DECLARE_ATTACK': {
      const baseValidation = validateDeclareAttack(state, action, defs);
      const permissionReasons = validateManualActionPermission_V2({
        state,
        defs,
        runtime,
        sidecars,
        sourceInstanceId: action.attackerInstanceId,
        controllerId: action.playerId,
        action: 'DECLARE_ATTACK',
        candidateInstanceId: action.attackerInstanceId,
      });
      const reasons = [...baseValidation.reasons, ...permissionReasons];
      if (reasons.length > 0) return { handled: true, ok: false, reasons };
      const base = executeDeclareAttack(state, action, defs, {});
      const applied = applyV2EffectsForAction({ previousState: state, state: base.state, defs, runtime, sidecars, action, log: base.log });
      return { handled: true, ok: true, state: applied.state, log: [...base.log, ...applied.log], sidecars: applied.sidecars };
    }
    case 'PASS_STEP': {
      const baseValidation = validatePassStep(state, action, defs);
      if (!baseValidation.legal) return { handled: true, ok: false, reasons: baseValidation.reasons };
      const battle = state.currentBattle;
      if (battle?.step === 'counter') {
        const target = state.cardsById[battle.targetInstanceId];
        const attackerPower = computeCurrentPower(defs, state, battle.attackerInstanceId);
        const targetPower = computeCurrentPower(defs, state, battle.targetInstanceId);
        if (target?.currentZone === 'characterArea' && attackerPower >= targetPower) {
          const permissionReasons = v2BattleKoPreventionReasons({
            state,
            defs,
            runtime,
            sidecars,
            attackerInstanceId: battle.attackerInstanceId,
            targetInstanceId: battle.targetInstanceId,
          });
          if (permissionReasons.length > 0) {
            return resolveV2BattleKoPreventedPassStep({ state, defs, runtime, sidecars, action, reasons: permissionReasons });
          }
        }
        const v2LeaderDamage = resolveV2LeaderBattleDamagePassStep({ state, defs, runtime, sidecars, action });
        if (v2LeaderDamage) return v2LeaderDamage;
      }
      const base = executePassStep(state, action, defs, {});
      const applied = applyV2EffectsForAction({ previousState: state, state: base.state, defs, runtime, sidecars, action, log: base.log });
      return { handled: true, ok: true, state: applied.state, log: [...base.log, ...applied.log], sidecars: applied.sidecars };
    }
    case 'ACTIVATE_BLOCKER': {
      const baseValidation = validateActivateBlocker(state, action, defs);
      if (!baseValidation.legal) return { handled: true, ok: false, reasons: baseValidation.reasons };
      const base = executeActivateBlocker(state, action, defs, {});
      const applied = applyV2EffectsForAction({ previousState: state, state: base.state, defs, runtime, sidecars, action, log: base.log });
      return { handled: true, ok: true, state: applied.state, log: [...base.log, ...applied.log], sidecars: applied.sidecars };
    }
    case 'RESOLVE_PENDING_CHOICE': {
      const choice = state.pendingChoices.find((candidate) => candidate.id === action.choiceId);
      if (
        choice?.sourceEffectId !== 'v2:activationCost'
        && choice?.sourceEffectId !== 'v2:selectMoveToHand'
        && choice?.sourceEffectId !== 'v2:selectActionTarget'
        && choice?.sourceEffectId !== 'v2:selectGiveDon'
        && choice?.sourceEffectId !== 'v2:chooseOption'
        && choice?.sourceEffectId !== 'v2:optionalResolution'
        && choice?.sourceEffectId !== 'v2:reorderCards'
        && choice?.sourceEffectId !== 'v2:selectPlayCard'
      ) return { handled: false };
      if (choice.playerId !== action.playerId) return { handled: true, ok: false, reasons: [`Choice '${choice.id}' belongs to '${choice.playerId}', not '${action.playerId}'.`] };
      if (choice.sourceEffectId === 'v2:optionalResolution') {
        const resume = choice.resumeState?.v2OptionalResolution;
        if (!resume) return { handled: true, ok: false, reasons: [`Choice '${choice.id}' is missing V2 optional resume data.`] };
        if (typeof action.response !== 'boolean') return { handled: true, ok: false, reasons: ['A V2 optional effect choice expects a yes/no response.'] };
        const stateWithoutChoice = { ...state, pendingChoices: state.pendingChoices.filter((candidate) => candidate.id !== action.choiceId) };
        const ctx: SelectorContext_V2 = {
          state: stateWithoutChoice,
          defs,
          runtime,
          sidecars: sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
          sourceInstanceId: resume.sourceInstanceId,
          controllerId: resume.controllerId,
          currentTiming: resume.timing,
          bindings: resume.bindings,
        };
        const nodes = action.response ? [resume.node, ...resume.remainingNodes] : resume.remainingNodes;
        const result = executeResolutionNode_V2(ctx, { kind: 'SEQUENCE', nodes }, null);
        return {
          handled: true,
          ok: true,
          state: result.state,
          log: result.log,
          sidecars: mergeSidecarsFromResolution_V2(sidecars, result),
        };
      }
      if (choice.sourceEffectId === 'v2:chooseOption') {
        const resume = choice.resumeState?.v2ChooseOption;
        if (!resume) return { handled: true, ok: false, reasons: [`Choice '${choice.id}' is missing V2 option resume data.`] };
        if (typeof action.response !== 'number' || !Number.isInteger(action.response)) {
          return { handled: true, ok: false, reasons: ['A V2 option choice expects a selected option index.'] };
        }
        const selectedNode = resume.options[action.response];
        if (!selectedNode) return { handled: true, ok: false, reasons: [`V2 option index ${action.response} is not valid.`] };
        const stateWithoutChoice = { ...state, pendingChoices: state.pendingChoices.filter((candidate) => candidate.id !== action.choiceId) };
        const ctx: SelectorContext_V2 = {
          state: stateWithoutChoice,
          defs,
          runtime,
          sidecars: sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
          sourceInstanceId: resume.sourceInstanceId,
          controllerId: resume.controllerId,
          currentTiming: resume.timing,
          bindings: resume.bindings,
        };
        const result = executeResolutionNode_V2(ctx, { kind: 'SEQUENCE', nodes: [selectedNode, ...resume.remainingNodes] }, null);
        return {
          handled: true,
          ok: true,
          state: result.state,
          log: result.log,
          sidecars: mergeSidecarsFromResolution_V2(sidecars, result),
        };
      }
      if (choice.sourceEffectId === 'v2:reorderCards') {
        const resume = choice.resumeState?.v2ReorderCards;
        if (!resume) return { handled: true, ok: false, reasons: [`Choice '${choice.id}' is missing V2 reorder resume data.`] };
        if (!Array.isArray(action.response)) return { handled: true, ok: false, reasons: ['A V2 reorder choice expects selected card ids in order.'] };
        const orderedIds = action.response;
        const candidateIds = choice.constraints.candidateInstanceIds ?? [];
        const candidateSet = new Set(candidateIds);
        const reasons: string[] = [];
        if (orderedIds.length !== candidateIds.length) reasons.push(`Select all ${candidateIds.length} card(s) in order for this V2 reorder.`);
        if (new Set(orderedIds).size !== orderedIds.length) reasons.push('V2 reorder selection contains duplicate cards.');
        for (const id of orderedIds) {
          if (!candidateSet.has(id)) reasons.push(`'${id}' is not eligible for this V2 reorder.`);
        }
        if (reasons.length > 0) return { handled: true, ok: false, reasons };
        const stateWithoutChoice = { ...state, pendingChoices: state.pendingChoices.filter((candidate) => candidate.id !== action.choiceId) };
        const ctx: SelectorContext_V2 = {
          state: stateWithoutChoice,
          defs,
          runtime,
          sidecars: sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
          sourceInstanceId: resume.sourceInstanceId,
          controllerId: resume.controllerId,
          currentTiming: resume.timing,
          bindings: {
            selectedObjects: {
              ...resume.bindings.selectedObjects,
              SELECTED_PREVIOUSLY: orderedIds,
              PREVIOUS_ACTION_TARGET: orderedIds,
              REMAINDER_OF_PREVIOUS_SELECTION: orderedIds,
            },
            actionResults: resume.bindings.actionResults,
          },
        };
        const reorderNode = {
          kind: 'ACTION' as const,
          action: {
            ...resume.reorderAction,
            selector: {
              ...resume.reorderAction.selector,
              subject: 'CARD' as const,
              relations: undefined,
              instanceIds: orderedIds,
              quantity: { kind: 'EXACTLY' as const, value: { kind: 'NUMBER' as const, value: orderedIds.length } },
            },
          },
        };
        const result = executeResolutionNode_V2(ctx, { kind: 'SEQUENCE', nodes: [reorderNode, ...resume.remainingNodes] }, null);
        return {
          handled: true,
          ok: true,
          state: result.state,
          log: result.log,
          sidecars: mergeSidecarsFromResolution_V2(sidecars, result),
        };
      }
      if (choice.sourceEffectId === 'v2:selectPlayCard') {
        const resume = choice.resumeState?.v2SelectPlayCard;
        if (!resume) return { handled: true, ok: false, reasons: [`Choice '${choice.id}' is missing V2 play-card resume data.`] };
        if (!Array.isArray(action.response)) return { handled: true, ok: false, reasons: ['A V2 play-card choice expects selected card ids.'] };
        const selectedIds = action.response;
        const candidateSet = new Set(choice.constraints.candidateInstanceIds ?? []);
        const reasons: string[] = [];
        if (selectedIds.length < choice.constraints.min || selectedIds.length > choice.constraints.max) {
          reasons.push(`Select between ${choice.constraints.min} and ${choice.constraints.max} card(s) to play.`);
        }
        if (new Set(selectedIds).size !== selectedIds.length) reasons.push('V2 play-card selection contains duplicate cards.');
        for (const id of selectedIds) {
          if (!candidateSet.has(id)) reasons.push(`'${id}' is not eligible to play with this V2 effect.`);
        }
        if (reasons.length > 0) return { handled: true, ok: false, reasons };
        const stateWithoutChoice = { ...state, pendingChoices: state.pendingChoices.filter((candidate) => candidate.id !== action.choiceId) };
        const playNode = selectedIds.length > 0
          ? {
              kind: 'ACTION' as const,
              action: {
                ...resume.playAction,
                selector: {
                  ...resume.playAction.selector,
                  subject: 'CARD' as const,
                  relations: undefined,
                  instanceIds: selectedIds,
                  quantity: { kind: 'EXACTLY' as const, value: { kind: 'NUMBER' as const, value: selectedIds.length } },
                },
              },
            }
          : null;
        const ctx: SelectorContext_V2 = {
          state: stateWithoutChoice,
          defs,
          runtime,
          sidecars: sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
          sourceInstanceId: resume.sourceInstanceId,
          controllerId: resume.controllerId,
          currentTiming: resume.timing,
          bindings: {
            selectedObjects: {
              ...resume.bindings.selectedObjects,
              SELECTED_PREVIOUSLY: selectedIds,
              PREVIOUS_ACTION_TARGET: selectedIds,
            },
            actionResults: resume.bindings.actionResults,
          },
        };
        const result = executeResolutionNode_V2(ctx, { kind: 'SEQUENCE', nodes: [...(playNode ? [playNode] : []), ...resume.remainingNodes] }, null);
        const mergedSidecars = mergeSidecarsFromResolution_V2(sidecars, result);
        const continued = advanceStartOfGameEffects_V2({
          state: result.state,
          defs,
          runtime,
          sidecars: mergedSidecars,
          actionId: null,
        });
        return {
          handled: true,
          ok: true,
          state: continued.state,
          log: [...result.log, ...continued.log],
          sidecars: continued.sidecars,
        };
      }
      if (choice.sourceEffectId === 'v2:selectGiveDon') {
        const resume = choice.resumeState?.v2SelectGiveDon;
        if (!resume) return { handled: true, ok: false, reasons: [`Choice '${choice.id}' is missing V2 GIVE_DON resume data.`] };
        if (!Array.isArray(action.response)) return { handled: true, ok: false, reasons: ['A V2 GIVE_DON choice expects selected card ids.'] };
        const selectedIds = action.response;
        const candidateSet = new Set(choice.constraints.candidateInstanceIds ?? []);
        const reasons: string[] = [];
        if (selectedIds.length < choice.constraints.min || selectedIds.length > choice.constraints.max) {
          reasons.push(`Select between ${choice.constraints.min} and ${choice.constraints.max} card(s) for this V2 GIVE_DON effect.`);
        }
        if (new Set(selectedIds).size !== selectedIds.length) reasons.push('V2 GIVE_DON selection contains duplicate cards.');
        for (const id of selectedIds) {
          if (!candidateSet.has(id)) reasons.push(`'${id}' is not eligible for this V2 GIVE_DON effect.`);
        }
        if (reasons.length > 0) return { handled: true, ok: false, reasons };
        const stateWithoutChoice = { ...state, pendingChoices: state.pendingChoices.filter((candidate) => candidate.id !== action.choiceId) };
        const selectedSelector = {
          ...(resume.targetField === 'donSelector' ? resume.giveDonAction.donSelector : resume.giveDonAction.target),
          subject: resume.targetField === 'donSelector' ? 'DON' as const : 'CARD' as const,
          relations: undefined,
          instanceIds: selectedIds,
          quantity: { kind: 'EXACTLY' as const, value: { kind: 'NUMBER' as const, value: selectedIds.length } },
        };
        const selectedAction = resume.targetField === 'donSelector'
          ? { ...resume.giveDonAction, donSelector: selectedSelector }
          : { ...resume.giveDonAction, target: selectedSelector };
        const selectedNode = selectedIds.length > 0
          ? { kind: 'ACTION' as const, action: selectedAction }
          : null;
        const ctx: SelectorContext_V2 = {
          state: stateWithoutChoice,
          defs,
          runtime,
          sidecars: sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
          sourceInstanceId: resume.sourceInstanceId,
          controllerId: resume.controllerId,
          currentTiming: resume.timing,
          bindings: {
            selectedObjects: {
              ...resume.bindings.selectedObjects,
              SELECTED_PREVIOUSLY: selectedIds,
              PREVIOUS_ACTION_TARGET: selectedIds,
            },
            actionResults: resume.bindings.actionResults,
          },
        };
        const result = executeResolutionNode_V2(ctx, { kind: 'SEQUENCE', nodes: [...(selectedNode ? [selectedNode] : []), ...resume.remainingNodes] }, null);
        return {
          handled: true,
          ok: true,
          state: result.state,
          log: result.log,
          sidecars: mergeSidecarsFromResolution_V2(sidecars, result),
        };
      }
      if (choice.sourceEffectId === 'v2:selectActionTarget') {
        const resume = choice.resumeState?.v2SelectActionTarget;
        if (!resume) return { handled: true, ok: false, reasons: [`Choice '${choice.id}' is missing V2 action-target resume data.`] };
        if (!Array.isArray(action.response)) return { handled: true, ok: false, reasons: ['A V2 action-target choice expects selected card ids.'] };
        const selectedIds = action.response;
        const candidateSet = new Set(choice.constraints.candidateInstanceIds ?? []);
        const reasons: string[] = [];
        if (selectedIds.length < choice.constraints.min || selectedIds.length > choice.constraints.max) {
          reasons.push(`Select between ${choice.constraints.min} and ${choice.constraints.max} target(s) for this V2 effect.`);
        }
        if (new Set(selectedIds).size !== selectedIds.length) reasons.push('V2 action-target selection contains duplicate cards.');
        for (const id of selectedIds) {
          if (!candidateSet.has(id)) reasons.push(`'${id}' is not an eligible target for this V2 effect.`);
        }
        if (reasons.length > 0) return { handled: true, ok: false, reasons };
        const stateWithoutChoice = { ...state, pendingChoices: state.pendingChoices.filter((candidate) => candidate.id !== action.choiceId) };
        const selectedSelector = {
          ...(resume.targetField === 'newTarget' && resume.action.type === 'CHANGE_ATTACK_TARGET'
            ? resume.action.newTarget
            : resume.targetField === 'mixedTargets'
              ? { subject: 'CARD' as const }
              : 'selector' in resume.action
              ? resume.action.selector
              : { subject: 'CARD' as const }),
          subject: 'CARD' as const,
          relations: undefined,
          instanceIds: selectedIds,
          quantity: { kind: 'EXACTLY' as const, value: { kind: 'NUMBER' as const, value: selectedIds.length } },
        };
        const selectedAction = resume.targetField === 'newTarget' && resume.action.type === 'CHANGE_ATTACK_TARGET'
          ? { ...resume.action, newTarget: selectedSelector }
          : resume.targetField === 'mixedTargets' && resume.action.type === 'REST_MIXED_TARGETS'
            ? { ...resume.action, selectors: [selectedSelector], quantity: selectedSelector.quantity }
          : { ...resume.action, selector: selectedSelector };
        const selectedNode = selectedIds.length > 0
          ? { kind: 'ACTION' as const, action: selectedAction as typeof resume.action }
          : null;
        const ctx: SelectorContext_V2 = {
          state: stateWithoutChoice,
          defs,
          runtime,
          sidecars: sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
          sourceInstanceId: resume.sourceInstanceId,
          controllerId: resume.controllerId,
          currentTiming: resume.timing,
          bindings: {
            selectedObjects: {
              ...resume.bindings.selectedObjects,
              SELECTED_PREVIOUSLY: selectedIds,
              PREVIOUS_ACTION_TARGET: selectedIds,
            },
            actionResults: resume.bindings.actionResults,
          },
        };
        const result = executeResolutionNode_V2(ctx, { kind: 'SEQUENCE', nodes: [...(selectedNode ? [selectedNode] : []), ...resume.remainingNodes] }, null);
        return {
          handled: true,
          ok: true,
          state: result.state,
          log: result.log,
          sidecars: mergeSidecarsFromResolution_V2(sidecars, result),
        };
      }
      if (!Array.isArray(action.response)) return { handled: true, ok: false, reasons: ['A V2 activation-cost choice expects selected DON!! instance ids.'] };
      if (choice.sourceEffectId === 'v2:selectMoveToHand') {
        const resume = choice.resumeState?.v2SelectMoveToHand;
        if (!resume) return { handled: true, ok: false, reasons: [`Choice '${choice.id}' is missing V2 search resume data.`] };
        const selectedIds = action.response;
        const candidateSet = new Set(choice.constraints.candidateInstanceIds ?? []);
        const reasons: string[] = [];
        if (selectedIds.length < choice.constraints.min || selectedIds.length > choice.constraints.max) {
          reasons.push(`Select between ${choice.constraints.min} and ${choice.constraints.max} card(s) for this V2 search.`);
        }
        if (new Set(selectedIds).size !== selectedIds.length) reasons.push('V2 search selection contains duplicate cards.');
        for (const id of selectedIds) {
          if (!candidateSet.has(id)) reasons.push(`'${id}' is not an eligible card for this V2 search.`);
        }
        if (reasons.length > 0) return { handled: true, ok: false, reasons };

        const lookedIds = resume.bindings.selectedObjects.LOOKED_AT_PREVIOUSLY ?? choice.constraints.visibleInstanceIds ?? choice.constraints.candidateInstanceIds ?? [];
        const remainderIds = lookedIds.filter((id) => !selectedIds.includes(id));
        const lookBuffer = resume.bindings.actionResults.LOOK_BUFFER_V2;
        const actionResults = {
          ...resume.bindings.actionResults,
          ...(lookBuffer && typeof lookBuffer === 'object'
            ? {
                LOOK_BUFFER_V2: {
                  ...lookBuffer,
                  selectedInstanceIds: selectedIds,
                  remainingInstanceIds: remainderIds,
                },
              }
            : {}),
        };
        const selectedMoveNode = selectedIds.length > 0
          ? {
              kind: 'ACTION' as const,
              action: {
                ...resume.moveAction,
                selector: {
                  ...resume.moveAction.selector,
                  subject: 'CARD' as const,
                  relations: undefined,
                  instanceIds: selectedIds,
                  quantity: { kind: 'EXACTLY' as const, value: { kind: 'NUMBER' as const, value: selectedIds.length } },
                },
              },
            }
          : null;
        const nodes = [...(selectedMoveNode ? [selectedMoveNode] : []), ...resume.remainingNodes];
        const stateWithoutChoice = { ...state, pendingChoices: state.pendingChoices.filter((candidate) => candidate.id !== action.choiceId) };
        const ctx: SelectorContext_V2 = {
          state: stateWithoutChoice,
          defs,
          runtime,
          sidecars: sidecars ?? createEmptyEffectRuntimeSidecars_V2(),
          sourceInstanceId: resume.sourceInstanceId,
          controllerId: resume.controllerId,
          currentTiming: resume.timing,
          bindings: {
            selectedObjects: {
              ...resume.bindings.selectedObjects,
              SELECTED_PREVIOUSLY: selectedIds,
              PREVIOUS_ACTION_TARGET: selectedIds,
              REMAINDER_OF_PREVIOUS_SELECTION: remainderIds,
            },
            actionResults,
          },
        };
        const result = executeResolutionNode_V2(ctx, { kind: 'SEQUENCE', nodes }, null);
        return {
          handled: true,
          ok: true,
          state: result.state,
          log: result.log,
          sidecars: mergeSidecarsFromResolution_V2(sidecars, result),
        };
      }
      const resume = choice.resumeState?.v2ActivationCost;
      if (!resume) return { handled: true, ok: false, reasons: [`Choice '${choice.id}' is missing V2 activation-cost resume data.`] };
      const candidates = new Set(choice.constraints.candidateInstanceIds ?? []);
      const selectedIds = action.response;
      const reasons: string[] = [];
      if (selectedIds.length < choice.constraints.min || selectedIds.length > choice.constraints.max) {
        reasons.push(`Select exactly ${choice.constraints.min} DON!! card(s) for this V2 cost.`);
      }
      for (const id of selectedIds) {
        if (!candidates.has(id)) reasons.push(`'${id}' is not an eligible DON!! card for this V2 cost.`);
      }
      if (new Set(selectedIds).size !== selectedIds.length) reasons.push('V2 activation-cost selection contains duplicate DON!! cards.');
      if (reasons.length > 0) return { handled: true, ok: false, reasons };
      const stateWithoutChoice = { ...state, pendingChoices: state.pendingChoices.filter((candidate) => candidate.id !== action.choiceId) };
      const mappedSelections = resume.costSelectionsByCardId?.[selectedIds[0]];
      if (resume.costSelectionsByCardId && !mappedSelections) {
        return { handled: true, ok: false, reasons: [`'${selectedIds[0]}' is not mapped to a V2 activation-cost payment.`] };
      }
      const result = dispatchV2AbilityForTiming({
        state: stateWithoutChoice,
        defs,
        runtime,
        sourceInstanceId: resume.sourceInstanceId,
        controllerId: action.playerId,
        timing: resume.timing,
        sidecars: sidecars ?? undefined,
        activationCostSelections: mappedSelections ?? activationCostSelectionsFromCounts_V2(resume.costCounts, selectedIds),
      });
      const costFailures = result.skippedEffects.filter((effect) => effect.reason === 'COST_PAYMENT_INVALID');
      if (costFailures.length > 0) {
        return { handled: true, ok: false, reasons: costFailures.flatMap((failure) => failure.details ?? ['V2 activation cost payment is invalid.']) };
      }
      return { handled: true, ok: true, state: result.state, log: result.log, sidecars: result.sidecars };
    }
    case 'ACTIVATE_CARD_EFFECT': {
      const reasons = validateActivateCardEffect_V2(state, action, defs, runtime);
      if (reasons.length > 0) {
        const source = state.cardsById[action.sourceInstanceId];
        const ability = findV2AbilityForTiming({ runtime, defs, state, sourceInstanceId: action.sourceInstanceId, timing: 'ACTIVATE_MAIN' });
        const costSelectionsByCardId = source && ability && action.donInstanceIds.length === 0
          ? promptableChooseOneCostSelectionsByCardId_V2({
              state,
              defs,
              runtime,
              sourceInstanceId: action.sourceInstanceId,
              controllerId: action.playerId,
              timing: 'ACTIVATE_MAIN',
              ability,
            })
          : null;
        const choice = source && ability && costSelectionsByCardId
          ? createV2ActivationCostChoice({
              state,
              sourceInstanceId: action.sourceInstanceId,
              controllerId: action.playerId,
              ability,
              timing: 'ACTIVATE_MAIN',
              costCounts: [],
              costSelectionsByCardId,
            })
          : null;
        if (choice) return { handled: true, ok: true, state: appendPendingChoiceIfMissing(state, choice), log: [], sidecars: createEmptyEffectRuntimeSidecars_V2(sidecars ?? undefined) };
        return { handled: true, ok: false, reasons };
      }
      const applied = applyV2EffectsForAction({ previousState: state, state, defs, runtime, sidecars, action, log: [] });
      return { handled: true, ok: true, state: applied.state, log: applied.log, sidecars: applied.sidecars };
    }
    case 'ACTIVATE_EVENT_MAIN': {
      const reasons = validateActivateEventMain_V2(state, action, defs, runtime);
      if (reasons.length > 0) return { handled: true, ok: false, reasons };
      const base = executeActivateEventMain(state, action, defs, {});
      const applied = applyV2EffectsForAction({ previousState: state, state: base.state, defs, runtime, sidecars, action, log: base.log });
      return { handled: true, ok: true, state: applied.state, log: [...base.log, ...applied.log], sidecars: applied.sidecars };
    }
    case 'ACTIVATE_COUNTER_EVENT': {
      const reasons = validateActivateCounterEvent_V2(state, action, defs, runtime);
      if (reasons.length > 0) return { handled: true, ok: false, reasons };
      const base = executeActivateCounterEvent(state, action, defs, {});
      const applied = applyV2EffectsForAction({ previousState: state, state: base.state, defs, runtime, sidecars, action, log: base.log });
      return { handled: true, ok: true, state: applied.state, log: [...base.log, ...applied.log], sidecars: applied.sidecars };
    }
    case 'ACTIVATE_ON_OPPONENTS_ATTACK': {
      const reasons = validateActivateOnOpponentsAttack_V2(state, action, defs, runtime);
      if (reasons.length > 0) return { handled: true, ok: false, reasons };
      const applied = applyV2EffectsForAction({ previousState: state, state, defs, runtime, sidecars, action, log: [] });
      return { handled: true, ok: true, state: withOnOpponentsAttackUsage_V2(applied.state, action), log: applied.log, sidecars: applied.sidecars };
    }
    default:
      return { handled: false };
  }
}

function inPlayZone(zone: string | null | undefined): boolean {
  return zone === 'leaderArea' || zone === 'characterArea' || zone === 'stageArea';
}

function v2InPlaySourceIds(state: GameState, playerId?: string): string[] {
  return Object.values(state.cardsById)
    .filter((card) => inPlayZone(card.currentZone) && (!playerId || card.controllerId === playerId))
    .map((card) => card.instanceId);
}

function koedCharacterIdsBeforeAfter(before: GameState, after: GameState): string[] {
  return Object.values(before.cardsById)
    .filter((card) => card.currentZone === 'characterArea')
    .filter((card) => after.cardsById[card.instanceId]?.currentZone === 'trash')
    .map((card) => card.instanceId);
}

export function applyV2EffectsForAction(input: V2ActionEffectInput): V2ActionEffectResult {
  const requests: { sourceInstanceId: string; timing: StandardTiming_V2; activationCostSelections?: CostPaymentSelection_V2[] }[] = [];
  const previousState = input.previousState ?? input.state;
  const action = input.action;
  const playedInstanceIds = input.log
    .filter((entry) => entry.type === 'CARD_PLAYED')
    .flatMap((entry) => entry.relatedCardInstanceIds)
    .filter((id, index, all) => all.indexOf(id) === index);
  requests.push(...playedInstanceIds.flatMap((sourceInstanceId) => [
    { sourceInstanceId, timing: 'ON_ENTER_PLAY' as const },
    { sourceInstanceId, timing: 'ON_PLAY' as const },
  ]));

  switch (action.type) {
    case 'ACTIVATE_CARD_EFFECT': {
      const ability = findV2AbilityForTiming({ runtime: input.runtime, defs: input.defs, state: input.state, sourceInstanceId: action.sourceInstanceId, timing: 'ACTIVATE_MAIN' });
      requests.push({
        sourceInstanceId: action.sourceInstanceId,
        timing: 'ACTIVATE_MAIN',
        activationCostSelections: activationCostSelectionsFromDonIds_V2(ability?.activationCost, action.donInstanceIds, action.sourceInstanceId),
      });
      break;
    }
    case 'ACTIVATE_EVENT_MAIN': {
      const ability = findV2AbilityForTiming({ runtime: input.runtime, defs: input.defs, state: input.state, sourceInstanceId: action.handCardInstanceId, timing: 'EVENT_MAIN' });
      requests.push({
        sourceInstanceId: action.handCardInstanceId,
        timing: 'EVENT_MAIN',
        activationCostSelections: activationCostSelectionsFromDonIds_V2(ability?.activationCost, action.abilityCostDonInstanceIds ?? [], action.handCardInstanceId),
      });
      break;
    }
    case 'ACTIVATE_COUNTER_EVENT': {
      const ability = findV2AbilityForTiming({ runtime: input.runtime, defs: input.defs, state: input.state, sourceInstanceId: action.handCardInstanceId, timing: 'EVENT_COUNTER' });
      requests.push({
        sourceInstanceId: action.handCardInstanceId,
        timing: 'EVENT_COUNTER',
        activationCostSelections: activationCostSelectionsFromDonIds_V2(ability?.activationCost, action.abilityCostDonInstanceIds ?? [], action.handCardInstanceId),
      });
      break;
    }
    case 'ACTIVATE_ON_OPPONENTS_ATTACK': {
      const ability = findV2AbilityForTiming({ runtime: input.runtime, defs: input.defs, state: input.state, sourceInstanceId: action.sourceInstanceId, timing: 'ON_OPPONENT_ATTACK' });
      requests.push({
        sourceInstanceId: action.sourceInstanceId,
        timing: 'ON_OPPONENT_ATTACK',
        activationCostSelections: activationCostSelectionsFromDonIds_V2(ability?.activationCost, action.donInstanceIds, action.sourceInstanceId),
      });
      break;
    }
    case 'DECLARE_ATTACK':
      requests.push({ sourceInstanceId: action.attackerInstanceId, timing: 'WHEN_ATTACKING' });
      break;
    case 'ACTIVATE_BLOCKER':
      requests.push({ sourceInstanceId: action.blockerInstanceId, timing: 'ON_BLOCK' });
      break;
    case 'RESOLVE_PENDING_CHOICE': {
      const choice = previousState.pendingChoices.find((candidate) => candidate.id === action.choiceId);
      const sourceInstanceId = choice?.sourceInstanceId;
      if (sourceInstanceId && Array.isArray(action.response) && action.response.includes(sourceInstanceId)) {
        requests.push({ sourceInstanceId, timing: 'TRIGGER' });
      }
      break;
    }
    case 'END_MAIN_PHASE': {
      const endingPlayerId = previousState.activePlayerId;
      const nextPlayerId = opponentOfState(previousState, endingPlayerId);
      requests.push(...v2InPlaySourceIds(previousState, endingPlayerId).map((sourceInstanceId) => ({ sourceInstanceId, timing: 'END_OF_YOUR_TURN' as const })));
      if (nextPlayerId) {
        requests.push(...v2InPlaySourceIds(previousState, nextPlayerId).map((sourceInstanceId) => ({ sourceInstanceId, timing: 'END_OF_OPPONENT_TURN' as const })));
      }
      break;
    }
  }
  requests.push(...koedCharacterIdsBeforeAfter(previousState, input.state).map((sourceInstanceId) => ({ sourceInstanceId, timing: 'ON_KO' as const })));

  if (requests.length === 0) {
    return {
      state: input.state,
      log: [],
      sidecars: pruneExpiredEffectRuntimeSidecars_V2(input.state, input.sidecars ?? createEmptyEffectRuntimeSidecars_V2()),
    };
  }

  let state = input.state;
  let log: GameLogEntry[] = [];
  let sidecars = input.sidecars ?? createEmptyEffectRuntimeSidecars_V2();
  for (const request of requests) {
    const source = state.cardsById[request.sourceInstanceId];
    if (!source) continue;
    const ability = findV2AbilityForTiming({
      state,
      defs: input.defs,
      runtime: input.runtime,
      sourceInstanceId: request.sourceInstanceId,
      timing: request.timing,
    });
    const result = dispatchV2AbilityForTiming({
      state,
      defs: input.defs,
      runtime: input.runtime,
      sourceInstanceId: request.sourceInstanceId,
      controllerId: source.controllerId,
      timing: request.timing,
      sidecars,
      activationCostSelections: request.activationCostSelections,
    });
    state = result.state;
    if (
      ability
      && result.skippedEffects.some((effect) => effect.abilityId === ability.abilityId && effect.reason === 'COST_PAYMENT_INVALID')
      && !request.activationCostSelections?.length
    ) {
      const costCounts = automaticCostPromptCounts_V2(ability);
      state = appendPendingChoiceIfMissing(state, createV2ActivationCostChoice({
        state,
        sourceInstanceId: request.sourceInstanceId,
        controllerId: source.controllerId,
        ability,
        timing: request.timing,
        costCounts,
      }));
    }
    log = [...log, ...result.log];
    sidecars = result.sidecars;
  }
  return { state, log, sidecars: pruneExpiredEffectRuntimeSidecars_V2(state, sidecars) };
}
