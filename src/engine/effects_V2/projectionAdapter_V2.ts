import type { KeywordEffect_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { CardDefinitionLookup } from '../rules/shared';
import type { GameState } from '../state/game';
import { evaluateValue_V2 } from './conditions_V2';
import type { EffectRuntimeSidecars_V2 } from './dispatcher_V2';
import type { KeywordModifierRecord_V2, StatModifierRecord_V2 } from './modifiers_V2';
import { resolveSelector_V2, type SelectorContext_V2 } from './selectorResolver_V2';

export type ProjectionSidecars_V2 = Pick<EffectRuntimeSidecars_V2, 'statModifiers' | 'keywordModifiers'>;

export interface V2ProjectionContext {
  sidecars?: ProjectionSidecars_V2 | null;
}

export type ProjectedKeyword_V2 = 'rush' | 'blocker' | 'doubleAttack' | 'banish' | 'unblockable';

const KEYWORD_TO_PROJECTED: Partial<Record<KeywordEffect_V2, ProjectedKeyword_V2>> = {
  RUSH: 'rush',
  BLOCKER: 'blocker',
  DOUBLE_ATTACK: 'doubleAttack',
  BANISH: 'banish',
  UNBLOCKABLE: 'unblockable',
};

function selectorIncludesInstance(ctx: SelectorContext_V2, record: StatModifierRecord_V2 | KeywordModifierRecord_V2, instanceId: string): boolean {
  if (record.status !== 'ACTIVE') return false;
  const resolved = resolveSelector_V2(ctx, record.selector);
  return resolved.candidateInstanceIds.includes(instanceId);
}

function numericValue(ctx: SelectorContext_V2, value: StatModifierRecord_V2['value']): number | null {
  const evaluated = evaluateValue_V2(ctx, value);
  return typeof evaluated.value === 'number' && Number.isFinite(evaluated.value) ? evaluated.value : null;
}

function applyOperation(current: number, operation: StatModifierRecord_V2['operation'], value: number): number {
  switch (operation) {
    case 'ADD':
      return current + value;
    case 'SUBTRACT':
      return current - value;
    case 'SET':
    case 'COPY':
      return value;
    case 'SET_TO_ZERO':
      return 0;
  }
}

function computeCorePowerWithoutV1ContinuousEffects(state: GameState, instanceId: string, printedBase: number): number {
  const instance = state.cardsById[instanceId];
  if (!instance) return printedBase;
  const donBonus = state.activePlayerId === instance.ownerId ? instance.donAttached.length * 1000 : 0;
  const battleBonus = state.currentBattle?.battlePowerBonuses[instanceId] ?? 0;
  return printedBase + donBonus + battleBonus;
}

export function computeProjectedPowerWithV2(
  defs: CardDefinitionLookup,
  state: GameState,
  instanceId: string,
  projection?: V2ProjectionContext,
): number {
  const instance = state.cardsById[instanceId];
  const def = instance ? defs[instance.cardDefinitionId] : undefined;
  const printedBase = def?.basePower ?? 0;
  let baseValue = printedBase;
  let currentValue = computeCorePowerWithoutV1ContinuousEffects(state, instanceId, printedBase);
  if (!projection?.sidecars) return currentValue;

  for (const record of projection.sidecars.statModifiers) {
    if (record.stat !== 'POWER') continue;
    const ctx: SelectorContext_V2 = { state, defs, sourceInstanceId: record.sourceInstanceId, controllerId: record.controllerId };
    if (!selectorIncludesInstance(ctx, record, instanceId)) continue;
    const value = numericValue(ctx, record.value);
    if (value === null) continue;
    if (record.propertyLayer === 'CURRENT_VALUE') {
      currentValue = applyOperation(currentValue, record.operation, value);
    } else {
      baseValue = applyOperation(baseValue, record.operation, value);
    }
  }

  return currentValue + (baseValue - printedBase);
}

export function computeProjectedCostWithV2(
  defs: CardDefinitionLookup,
  state: GameState,
  instanceId: string,
  projection?: V2ProjectionContext,
): number {
  const instance = state.cardsById[instanceId];
  const def = instance ? defs[instance.cardDefinitionId] : undefined;
  const printedBase = def?.baseCost ?? 0;
  let baseValue = printedBase;
  let currentValue = printedBase;
  if (!projection?.sidecars) return currentValue;

  for (const record of projection.sidecars.statModifiers) {
    if (record.stat !== 'COST') continue;
    const ctx: SelectorContext_V2 = { state, defs, sourceInstanceId: record.sourceInstanceId, controllerId: record.controllerId };
    if (!selectorIncludesInstance(ctx, record, instanceId)) continue;
    const value = numericValue(ctx, record.value);
    if (value === null) continue;
    if (record.propertyLayer === 'CURRENT_VALUE') {
      currentValue = applyOperation(currentValue, record.operation, value);
    } else {
      baseValue = applyOperation(baseValue, record.operation, value);
    }
  }

  return Math.max(0, currentValue + (baseValue - printedBase));
}

export function hasProjectedKeywordWithV2(
  defs: CardDefinitionLookup,
  state: GameState,
  instanceId: string,
  keyword: ProjectedKeyword_V2,
  projection?: V2ProjectionContext,
): boolean | null {
  if (!projection?.sidecars) return null;
  let result: boolean | null = null;
  for (const record of projection.sidecars.keywordModifiers) {
    if (KEYWORD_TO_PROJECTED[record.keyword] !== keyword) continue;
    const ctx: SelectorContext_V2 = { state, defs, sourceInstanceId: record.sourceInstanceId, controllerId: record.controllerId };
    if (!selectorIncludesInstance(ctx, record, instanceId)) continue;
    result = record.operation === 'GRANT_KEYWORD';
  }
  return result;
}
