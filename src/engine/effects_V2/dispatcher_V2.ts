import type { EffectAbility_V2 } from '../../cards/effectCompiler_V2/effectIr_V2';
import type { TimingExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { CardDefinitionLookup } from '../rules/shared';
import type { GameState } from '../state/game';
import type { EffectRuntimeBundle_V2 } from './runtime_V2';
import { executeResolutionNode_V2, type ResolutionExecutionResult_V2 } from './resolution_V2';
import { evaluateGates_V2 } from './gates_V2';
import { payCosts_V2, validateCostPayments_V2, type CostPaymentSelection_V2 } from './costs_V2';
import type { SelectorContext_V2 } from './selectorResolver_V2';
import {
  effectCandidateFromDefinition_V2,
  isEffectInvalidated_V2,
  type CardPropertyModifierRecord_V2,
  type EffectCandidate_V2,
  type EffectInvalidationRecord_V2,
  type KeywordModifierRecord_V2,
  type StatModifierRecord_V2,
} from './modifiers_V2';
import type { ChoicePromptRecord_V2 } from './choices_V2';
import type { DelayedEffectRecord_V2 } from './delayedEffects_V2';
import type { ActivatedEventRecord_V2 } from './eventActivation_V2';
import { gainedEffectMatchesRemoval_V2, type GainedEffectRecord_V2, type GainedEffectRemovalRecord_V2 } from './gainedEffects_V2';
import type { LookBuffer_V2 } from './lookBuffer_V2';
import type { PermissionEffectRecord_V2 } from './permissions_V2';
import type { ReplacementEffectRecord_V2 } from './replacements_V2';

export interface EffectRuntimeSidecars_V2 {
  delayedEffects: DelayedEffectRecord_V2[];
  replacementEffects: ReplacementEffectRecord_V2[];
  permissionEffects: PermissionEffectRecord_V2[];
  statModifiers: StatModifierRecord_V2[];
  keywordModifiers: KeywordModifierRecord_V2[];
  cardPropertyModifiers: CardPropertyModifierRecord_V2[];
  counterModifiers: StatModifierRecord_V2[];
  effectInvalidations: EffectInvalidationRecord_V2[];
  activatedEvents: ActivatedEventRecord_V2[];
  gainedEffects: GainedEffectRecord_V2[];
  gainedEffectRemovals: GainedEffectRemovalRecord_V2[];
  choicePrompts: ChoicePromptRecord_V2[];
  lookBuffers: LookBuffer_V2[];
}

export interface V2EffectDispatchSkippedEffect {
  abilityId: string;
  cardNumber: string;
  sourceInstanceId: string;
  reason: 'INVALIDATED' | 'UNSUPPORTED_TIMING' | 'GATE_FAILED' | 'ONCE_PER_TURN_USED' | 'COST_PAYMENT_INVALID';
  details?: string[];
  candidate?: EffectCandidate_V2;
}

export interface V2EffectDispatchExecutedEffect {
  abilityId: string;
  cardNumber: string;
  sourceInstanceId: string;
}

export interface V2EffectDispatchResult extends ResolutionExecutionResult_V2 {
  sidecars: EffectRuntimeSidecars_V2;
  executedEffects: V2EffectDispatchExecutedEffect[];
  skippedEffects: V2EffectDispatchSkippedEffect[];
}

export interface V2EffectDispatchInput {
  state: GameState;
  defs: CardDefinitionLookup;
  runtime: EffectRuntimeBundle_V2;
  sourceInstanceId: string;
  controllerId: string;
  timing: TimingExpression_V2;
  sidecars?: Partial<EffectRuntimeSidecars_V2>;
  activationCostSelections?: readonly CostPaymentSelection_V2[];
}

export function createEmptyEffectRuntimeSidecars_V2(input?: Partial<EffectRuntimeSidecars_V2>): EffectRuntimeSidecars_V2 {
  return {
    delayedEffects: [...(input?.delayedEffects ?? [])],
    replacementEffects: [...(input?.replacementEffects ?? [])],
    permissionEffects: [...(input?.permissionEffects ?? [])],
    statModifiers: [...(input?.statModifiers ?? [])],
    keywordModifiers: [...(input?.keywordModifiers ?? [])],
    cardPropertyModifiers: [...(input?.cardPropertyModifiers ?? [])],
    counterModifiers: [...(input?.counterModifiers ?? [])],
    effectInvalidations: [...(input?.effectInvalidations ?? [])],
    activatedEvents: [...(input?.activatedEvents ?? [])],
    gainedEffects: [...(input?.gainedEffects ?? [])],
    gainedEffectRemovals: [...(input?.gainedEffectRemovals ?? [])],
    choicePrompts: [...(input?.choicePrompts ?? [])],
    lookBuffers: [...(input?.lookBuffers ?? [])],
  };
}

function mergeSidecars(sidecars: EffectRuntimeSidecars_V2, result: ResolutionExecutionResult_V2): EffectRuntimeSidecars_V2 {
  return {
    delayedEffects: [...sidecars.delayedEffects, ...(result.delayedEffects ?? [])],
    replacementEffects: [...sidecars.replacementEffects, ...(result.replacementEffects ?? [])],
    permissionEffects: [...sidecars.permissionEffects, ...(result.permissionEffects ?? [])],
    statModifiers: [...sidecars.statModifiers, ...(result.statModifiers ?? [])],
    keywordModifiers: [...sidecars.keywordModifiers, ...(result.keywordModifiers ?? [])],
    cardPropertyModifiers: [...sidecars.cardPropertyModifiers, ...(result.cardPropertyModifiers ?? [])],
    counterModifiers: [...sidecars.counterModifiers, ...(result.counterModifiers ?? [])],
    effectInvalidations: [...sidecars.effectInvalidations, ...(result.effectInvalidations ?? [])],
    activatedEvents: [...sidecars.activatedEvents, ...(result.activatedEvents ?? [])],
    gainedEffects: [...sidecars.gainedEffects, ...(result.gainedEffects ?? [])],
    gainedEffectRemovals: [...sidecars.gainedEffectRemovals, ...(result.gainedEffectRemovals ?? [])],
    choicePrompts: [...sidecars.choicePrompts, ...(result.choicePrompts ?? [])],
    lookBuffers: [...sidecars.lookBuffers, ...(result.lookBuffers ?? [])],
  };
}

function timingMatches_V2(ability: EffectAbility_V2, timing: TimingExpression_V2): boolean {
  if (ability.timing.kind === 'STANDARD_TIMING' && timing.kind === 'STANDARD_TIMING') {
    return ability.timing.timing === timing.timing;
  }
  return JSON.stringify(ability.timing) === JSON.stringify(timing);
}

function candidateForAbility_V2(input: V2EffectDispatchInput, ability: EffectAbility_V2): EffectCandidate_V2 | null {
  const source = input.state.cardsById[input.sourceInstanceId];
  if (!source) return null;
  const def = input.defs[source.cardDefinitionId];
  const program = input.runtime.programsByCardNumber[def?.cardNumber ?? source.cardDefinitionId];
  const effect = program?.canonicalEffects.find((candidate) => candidate.id === ability.abilityId);
  if (effect) {
    return effectCandidateFromDefinition_V2({
      effect,
      sourceInstanceId: input.sourceInstanceId,
      controllerId: input.controllerId,
      sourceOwnerId: source.ownerId,
    });
  }
  return {
    effectId: ability.abilityId,
    sourceInstanceId: input.sourceInstanceId,
    sourceOwnerId: source.ownerId,
    controllerId: input.controllerId,
    timing: ability.timing.kind === 'STANDARD_TIMING' ? ability.timing.timing : undefined,
  };
}

function abilityFromEffectDefinition_V2(effect: import('../../cards/effectCompiler_V2/types_V2').EffectDefinition_V2): EffectAbility_V2 {
  return {
    abilityId: effect.id,
    timing: effect.timing ?? { kind: 'STANDARD_TIMING', timing: 'ON_ENTER_PLAY' },
    ...(effect.conditions ? { gates: [effect.conditions] } : {}),
    ...(effect.activationCost ? { activationCost: effect.activationCost } : {}),
    ...(effect.usageLimit?.maximumUses === 1 && effect.usageLimit.period === 'PER_TURN' ? { oncePerTurn: true } : {}),
    optionalActivate: effect.optionality === 'OPTIONAL',
    resolution: effect.resolution,
  };
}

function gainedAbilitiesForSource_V2(sidecars: EffectRuntimeSidecars_V2, sourceInstanceId: string): { ability: EffectAbility_V2; effect: import('../../cards/effectCompiler_V2/types_V2').EffectDefinition_V2 }[] {
  return sidecars.gainedEffects
    .filter((record) => record.status === 'ACTIVE' && record.selectedInstanceIds.includes(sourceInstanceId))
    .filter((record) => !sidecars.gainedEffectRemovals.some((removal) => gainedEffectMatchesRemoval_V2(record, removal)))
    .map((record) => ({ ability: abilityFromEffectDefinition_V2(record.effect), effect: record.effect }));
}

export function dispatchCardEffectsForTiming_V2(input: V2EffectDispatchInput): V2EffectDispatchResult {
  const source = input.state.cardsById[input.sourceInstanceId];
  const def = source ? input.defs[source.cardDefinitionId] : undefined;
  const cardNumber = def?.cardNumber ?? source?.cardDefinitionId;
  const program = cardNumber ? input.runtime.programsByCardNumber[cardNumber] : undefined;
  let state = input.state;
  let log: GameState['log'] = [];
  let sidecars = createEmptyEffectRuntimeSidecars_V2(input.sidecars);
  let bindings: SelectorContext_V2['bindings'] = { selectedObjects: {}, actionResults: {} };
  const executedEffects: V2EffectDispatchExecutedEffect[] = [];
  const skippedEffects: V2EffectDispatchSkippedEffect[] = [];
  const unsupportedReasons: string[] = [];

  if (!source || !def) {
    return { state, log, sidecars, executedEffects, skippedEffects };
  }

  for (const entry of [
    ...(program?.abilities ?? []).map((ability) => ({ ability, effect: program?.canonicalEffects.find((candidate) => candidate.id === ability.abilityId) })),
    ...gainedAbilitiesForSource_V2(sidecars, input.sourceInstanceId),
  ]) {
    const { ability } = entry;
    if (!timingMatches_V2(ability, input.timing)) continue;
    const candidate = entry.effect
      ? effectCandidateFromDefinition_V2({
        effect: entry.effect,
        sourceInstanceId: input.sourceInstanceId,
        controllerId: input.controllerId,
        sourceOwnerId: source.ownerId,
      })
      : candidateForAbility_V2({ ...input, state }, ability);
    if (!candidate) {
      skippedEffects.push({ abilityId: ability.abilityId, cardNumber, sourceInstanceId: input.sourceInstanceId, reason: 'UNSUPPORTED_TIMING' });
      continue;
    }
    if (isEffectInvalidated_V2(candidate, sidecars.effectInvalidations)) {
      skippedEffects.push({ abilityId: ability.abilityId, cardNumber, sourceInstanceId: input.sourceInstanceId, reason: 'INVALIDATED', candidate });
      continue;
    }

    const ctx: SelectorContext_V2 = {
      state,
      defs: input.defs,
      sourceInstanceId: input.sourceInstanceId,
      controllerId: input.controllerId,
      runtime: input.runtime,
      sidecars,
      currentTiming: input.timing,
      bindings,
    };
    const gateResult = evaluateGates_V2(ctx, ability.gates);
    if (!gateResult.value) {
      const details = gateResult.unsupportedReasons;
      skippedEffects.push({ abilityId: ability.abilityId, cardNumber, sourceInstanceId: input.sourceInstanceId, reason: 'GATE_FAILED', details, candidate });
      unsupportedReasons.push(...details);
      continue;
    }
    const sourceForUsage = state.cardsById[input.sourceInstanceId];
    if (ability.oncePerTurn && sourceForUsage?.oncePerTurnUsed.includes(ability.abilityId)) {
      skippedEffects.push({ abilityId: ability.abilityId, cardNumber, sourceInstanceId: input.sourceInstanceId, reason: 'ONCE_PER_TURN_USED', candidate });
      continue;
    }
    let currentCtx = ctx;
    if (ability.activationCost?.payments.length) {
      const validation = validateCostPayments_V2(ctx, ability.activationCost.payments, input.activationCostSelections ?? []);
      if (!validation.legal) {
        skippedEffects.push({ abilityId: ability.abilityId, cardNumber, sourceInstanceId: input.sourceInstanceId, reason: 'COST_PAYMENT_INVALID', details: validation.reasons, candidate });
        unsupportedReasons.push(...validation.reasons);
        continue;
      }
      const paid = payCosts_V2(ctx, ability.activationCost.payments, input.activationCostSelections ?? [], ability.abilityId);
      state = paid.state;
      log = [...log, ...paid.log];
      bindings = {
        selectedObjects: {
          ...(bindings?.selectedObjects ?? {}),
          ...(paid.bindings?.selectedObjects ?? {}),
        },
        actionResults: {
          ...(bindings?.actionResults ?? {}),
          ...(paid.bindings?.actionResults ?? {}),
        },
      };
      sidecars = mergeSidecars(sidecars, paid);
      currentCtx = { ...ctx, state, sidecars, bindings };
    }
    const result = executeResolutionNode_V2(currentCtx, ability.resolution, ability.abilityId);
    state = result.state;
    if (ability.oncePerTurn) {
      const usedSource = state.cardsById[input.sourceInstanceId];
      if (usedSource && !usedSource.oncePerTurnUsed.includes(ability.abilityId)) {
        state = {
          ...state,
          cardsById: {
            ...state.cardsById,
            [input.sourceInstanceId]: { ...usedSource, oncePerTurnUsed: [...usedSource.oncePerTurnUsed, ability.abilityId] },
          },
        };
      }
    }
    log = [...log, ...result.log];
    sidecars = mergeSidecars(sidecars, result);
    bindings = {
      selectedObjects: {
        ...(bindings?.selectedObjects ?? {}),
        ...(result.bindings?.selectedObjects ?? {}),
      },
      actionResults: {
        ...(bindings?.actionResults ?? {}),
        ...(result.bindings?.actionResults ?? {}),
      },
    };
    unsupportedReasons.push(...(result.unsupportedReasons ?? []));
    executedEffects.push({ abilityId: ability.abilityId, cardNumber, sourceInstanceId: input.sourceInstanceId });
  }

  return {
    state,
    log,
    sidecars,
    delayedEffects: sidecars.delayedEffects,
    replacementEffects: sidecars.replacementEffects,
    permissionEffects: sidecars.permissionEffects,
    statModifiers: sidecars.statModifiers,
    keywordModifiers: sidecars.keywordModifiers,
    cardPropertyModifiers: sidecars.cardPropertyModifiers,
    counterModifiers: sidecars.counterModifiers,
    effectInvalidations: sidecars.effectInvalidations,
    activatedEvents: sidecars.activatedEvents,
    gainedEffects: sidecars.gainedEffects,
    gainedEffectRemovals: sidecars.gainedEffectRemovals,
    choicePrompts: sidecars.choicePrompts,
    lookBuffers: sidecars.lookBuffers,
    bindings,
    executedEffects,
    skippedEffects,
    unsupportedReasons,
  };
}
