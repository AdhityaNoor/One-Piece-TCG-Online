import type { EffectAbility_V2 } from '../../cards/effectCompiler_V2/effectIr_V2';
import type { ActivationCost_V2, CostAction_V2, StandardTiming_V2, TimingExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { GameAction } from '../actions';
import type { ActivateCardEffectAction, ActivateCounterEventAction, ActivateEventMainAction, ActivateOnOpponentsAttackAction } from '../actions/action';
import type { CardDefinitionLookup } from '../rules/shared';
import { computeCurrentCost } from '../rules/shared/power';
import type { GameLogEntry } from '../logs/logEntry';
import type { GameState } from '../state/game';
import type { EffectRuntimeBundle_V2 } from './runtime_V2';
import { createEmptyEffectRuntimeSidecars_V2, dispatchCardEffectsForTiming_V2, type EffectRuntimeSidecars_V2, type V2EffectDispatchResult } from './dispatcher_V2';
import { validateCostPayments_V2, type CostPaymentSelection_V2 } from './costs_V2';
import { evaluateGates_V2 } from './gates_V2';
import type { SelectorContext_V2 } from './selectorResolver_V2';
import { pruneExpiredEffectRuntimeSidecars_V2 } from './sidecarLifecycle_V2';

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

function timingExpression(timing: StandardTiming_V2): TimingExpression_V2 {
  return { kind: 'STANDARD_TIMING', timing };
}

export function fixedV2CostCount(cost: CostAction_V2): number {
  if (!('count' in cost)) return 0;
  return cost.count.kind === 'NUMBER' ? cost.count.value : 0;
}

export function activationCostSelectionsFromDonIds_V2(cost: ActivationCost_V2 | undefined, donInstanceIds: readonly string[]): CostPaymentSelection_V2[] {
  if (!cost?.payments.length) return [];
  let offset = 0;
  return cost.payments.map((payment, costIndex) => {
    const count = payment.type === 'DON_MINUS_COST' ? fixedV2CostCount(payment) : 0;
    const selectedInstanceIds = count > 0 ? donInstanceIds.slice(offset, offset + count) : [];
    offset += count;
    return { costIndex, selectedInstanceIds };
  });
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
    activationCostSelections: activationCostSelectionsFromDonIds_V2(ability.activationCost, args.donInstanceIds),
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
        activationCostSelections: activationCostSelectionsFromDonIds_V2(ability?.activationCost, action.donInstanceIds),
      });
      break;
    }
    case 'ACTIVATE_EVENT_MAIN': {
      const ability = findV2AbilityForTiming({ runtime: input.runtime, defs: input.defs, state: input.state, sourceInstanceId: action.handCardInstanceId, timing: 'EVENT_MAIN' });
      requests.push({
        sourceInstanceId: action.handCardInstanceId,
        timing: 'EVENT_MAIN',
        activationCostSelections: activationCostSelectionsFromDonIds_V2(ability?.activationCost, action.abilityCostDonInstanceIds ?? []),
      });
      break;
    }
    case 'ACTIVATE_COUNTER_EVENT': {
      const ability = findV2AbilityForTiming({ runtime: input.runtime, defs: input.defs, state: input.state, sourceInstanceId: action.handCardInstanceId, timing: 'EVENT_COUNTER' });
      requests.push({
        sourceInstanceId: action.handCardInstanceId,
        timing: 'EVENT_COUNTER',
        activationCostSelections: activationCostSelectionsFromDonIds_V2(ability?.activationCost, action.abilityCostDonInstanceIds ?? []),
      });
      break;
    }
    case 'ACTIVATE_ON_OPPONENTS_ATTACK': {
      const ability = findV2AbilityForTiming({ runtime: input.runtime, defs: input.defs, state: input.state, sourceInstanceId: action.sourceInstanceId, timing: 'ON_OPPONENT_ATTACK' });
      requests.push({
        sourceInstanceId: action.sourceInstanceId,
        timing: 'ON_OPPONENT_ATTACK',
        activationCostSelections: activationCostSelectionsFromDonIds_V2(ability?.activationCost, action.donInstanceIds),
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
    log = [...log, ...result.log];
    sidecars = result.sidecars;
  }
  return { state, log, sidecars: pruneExpiredEffectRuntimeSidecars_V2(state, sidecars) };
}
