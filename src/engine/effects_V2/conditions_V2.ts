import type {
  ConditionExpression_V2,
  NumericPropertyFilter_V2,
  PlayerReference_V2,
  Selector_V2,
  ValueExpression_V2,
} from '../../cards/effectCompiler_V2/types_V2';
import { computeCurrentCost, computeCurrentPower } from '../rules/shared/power';
import { resolveSelector_V2, type SelectorContext_V2 } from './selectorResolver_V2';

export interface EvaluationResult_V2<T> {
  value: T;
  unsupportedReasons: string[];
}

export type ConditionEvaluationResult_V2 = EvaluationResult_V2<boolean>;

type LooseValueExpression_V2 = ValueExpression_V2 | { kind: string; [key: string]: unknown };

function unsupported<T>(value: T, reason: string): EvaluationResult_V2<T> {
  return { value, unsupportedReasons: [reason] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSelector(value: unknown): value is Selector_V2 {
  return isRecord(value) && typeof value.subject === 'string';
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function opponentOf(ctx: SelectorContext_V2, playerId: string): string {
  return Object.keys(ctx.state.players).find((id) => id !== playerId) ?? playerId;
}

function playerForReference(ctx: SelectorContext_V2, ref: PlayerReference_V2): string | null {
  const source = ctx.state.cardsById[ctx.sourceInstanceId];
  switch (ref) {
    case 'PLAYER':
    case 'EFFECT_OWNER':
      return ctx.controllerId;
    case 'OPPONENT':
      return opponentOf(ctx, ctx.controllerId);
    case 'CARD_OWNER':
      return source?.ownerId ?? ctx.controllerId;
    case 'CARD_CONTROLLER':
      return source?.controllerId ?? ctx.controllerId;
    case 'ANY':
      return null;
  }
}

function matchesNumericPropertyFilter(ctx: SelectorContext_V2, value: number, filter: NumericPropertyFilter_V2 | undefined): boolean {
  if (!filter) return true;
  const single = filter.value ? toNumber(evaluateValue_V2(ctx, filter.value).value) : null;
  const values = filter.values?.map((entry) => toNumber(evaluateValue_V2(ctx, entry).value)).filter((entry): entry is number => entry !== null) ?? [];
  const minimum = filter.minimum ? toNumber(evaluateValue_V2(ctx, filter.minimum).value) : null;
  const maximum = filter.maximum ? toNumber(evaluateValue_V2(ctx, filter.maximum).value) : null;

  switch (filter.comparison) {
    case 'EQUAL':
      return single !== null && value === single;
    case 'NOT_EQUAL':
      return single !== null && value !== single;
    case 'AT_LEAST':
    case 'GREATER_THAN':
      return single !== null && (filter.comparison === 'AT_LEAST' ? value >= single : value > single);
    case 'AT_MOST':
    case 'LESS_THAN':
      return single !== null && (filter.comparison === 'AT_MOST' ? value <= single : value < single);
    case 'BETWEEN':
      return minimum !== null && maximum !== null && value >= minimum && value <= maximum;
    case 'IN_SET':
      return values.includes(value);
  }
}

function distinctIds(ctx: SelectorContext_V2, ids: string[], distinctBy: Selector_V2['distinctBy']): string[] {
  if (!distinctBy || distinctBy === 'NONE' || distinctBy === 'CARD_OBJECT') return ids;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    const inst = ctx.state.cardsById[id];
    const def = inst ? ctx.defs[inst.cardDefinitionId] : undefined;
    const key = distinctBy === 'CARD_NUMBER' ? def?.cardNumber : def?.name;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(id);
  }
  return result;
}

function evaluateCount(ctx: SelectorContext_V2, selector: Selector_V2): EvaluationResult_V2<number> {
  const resolved = resolveSelector_V2(ctx, selector);
  return { value: distinctIds(ctx, resolved.candidateInstanceIds, selector.distinctBy).length, unsupportedReasons: [] };
}

function firstSelectedId(ctx: SelectorContext_V2, selector: Selector_V2): string | null {
  return resolveSelector_V2(ctx, selector).candidateInstanceIds[0] ?? null;
}

function evaluatePropertyValue(ctx: SelectorContext_V2, value: Extract<ValueExpression_V2, { kind: 'PROPERTY_VALUE' }>): EvaluationResult_V2<unknown> {
  const id = firstSelectedId(ctx, value.selector);
  if (!id) return { value: undefined, unsupportedReasons: [] };
  const inst = ctx.state.cardsById[id];
  const def = inst ? ctx.defs[inst.cardDefinitionId] : undefined;
  if (!inst || !def) return { value: undefined, unsupportedReasons: [] };

  switch (value.property) {
    case 'POWER':
      return {
        value: value.propertyLayer === 'CURRENT' || value.propertyLayer === undefined
          ? computeCurrentPower(ctx.defs, ctx.state, id)
          : def.basePower,
        unsupportedReasons: [],
      };
    case 'COST':
      return {
        value: value.propertyLayer === 'CURRENT' || value.propertyLayer === undefined
          ? computeCurrentCost(ctx.defs, ctx.state, id)
          : def.baseCost,
        unsupportedReasons: [],
      };
    case 'COUNTER':
      return { value: def.counter, unsupportedReasons: [] };
    case 'LIFE':
      return { value: def.life, unsupportedReasons: [] };
    case 'DAMAGE':
      return unsupported(undefined, 'PROPERTY_VALUE DAMAGE is not supported by the V2 condition evaluator yet.');
  }
}

function evaluateNumericList(
  ctx: SelectorContext_V2,
  values: ValueExpression_V2[],
  reducer: (numbers: number[]) => number,
): EvaluationResult_V2<unknown> {
  const evaluated = values.map((entry) => evaluateValue_V2(ctx, entry));
  const reasons = evaluated.flatMap((entry) => entry.unsupportedReasons);
  const numbers = evaluated.map((entry) => toNumber(entry.value));
  if (numbers.some((entry) => entry === null)) return { value: undefined, unsupportedReasons: [...reasons, 'Numeric expression received a non-number operand.'] };
  return { value: reducer(numbers as number[]), unsupportedReasons: reasons };
}

function phaseValue(ctx: SelectorContext_V2): string {
  return String(ctx.state.currentPhase ?? '').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
}

function evaluateAttachedDonCount(ctx: SelectorContext_V2, rawSelector: unknown): EvaluationResult_V2<number> {
  if (!isSelector(rawSelector)) return unsupported(0, 'ATTACHED_DON_COUNT is missing a selector.');
  const resolved = resolveSelector_V2(ctx, rawSelector);
  const value = resolved.candidateInstanceIds.reduce((sum, id) => sum + (ctx.state.cardsById[id]?.donAttached.length ?? 0), 0);
  return { value, unsupportedReasons: [] };
}

function evaluateEventActivationCount(
  ctx: SelectorContext_V2,
  value: Extract<ValueExpression_V2, { kind: 'EVENT_ACTIVATION_COUNT' }>,
): EvaluationResult_V2<number> {
  if (value.during !== 'THIS_TURN') return unsupported(0, `EVENT_ACTIVATION_COUNT during ${value.during} is not supported yet.`);
  const playerId = playerForReference(ctx, value.player);
  const count = (ctx.state.eventActivationHistory ?? []).filter((record) => {
    if (playerId && record.playerId !== playerId) return false;
    if (record.turnNumber !== ctx.state.turnNumber) return false;
    return matchesNumericPropertyFilter(ctx, record.baseCost, value.eventBaseCost);
  }).length;
  return { value: count, unsupportedReasons: [] };
}

function evaluateSelfTurnCount(ctx: SelectorContext_V2, value: Extract<ValueExpression_V2, { kind: 'SELF_TURN_COUNT' }>): EvaluationResult_V2<number> {
  const playerId = playerForReference(ctx, value.player) ?? ctx.controllerId;
  const player = ctx.state.players[playerId];
  if (!player) return unsupported(0, `SELF_TURN_COUNT could not resolve player ${value.player}.`);
  const currentTurnCount = player.hasGoneFirst ? Math.ceil(ctx.state.turnNumber / 2) : Math.floor(ctx.state.turnNumber / 2);
  return { value: currentTurnCount, unsupportedReasons: [] };
}

export function evaluateValue_V2(ctx: SelectorContext_V2, value: LooseValueExpression_V2): EvaluationResult_V2<unknown> {
  const expr = value as Record<string, any>;
  switch (expr.kind) {
    case 'NUMBER':
      return { value: expr.value, unsupportedReasons: [] };
    case 'BOOLEAN':
      return { value: expr.value, unsupportedReasons: [] };
    case 'STRING':
      return { value: expr.value, unsupportedReasons: [] };
    case 'COUNT':
      return evaluateCount(ctx, expr.selector as Selector_V2);
    case 'EVENT_ACTIVATION_COUNT':
      return evaluateEventActivationCount(ctx, expr as Extract<ValueExpression_V2, { kind: 'EVENT_ACTIVATION_COUNT' }>);
    case 'SELF_TURN_COUNT':
      return evaluateSelfTurnCount(ctx, expr as Extract<ValueExpression_V2, { kind: 'SELF_TURN_COUNT' }>);
    case 'PROPERTY_VALUE':
      return evaluatePropertyValue(ctx, expr as Extract<ValueExpression_V2, { kind: 'PROPERTY_VALUE' }>);
    case 'PREVIOUS_RESULT': {
      const previous = ctx.bindings?.actionResults[expr.resultId];
      if (previous === undefined) return unsupported(undefined, `PREVIOUS_RESULT ${expr.resultId} is not available.`);
      return { value: previous, unsupportedReasons: [] };
    }
    case 'ADD':
      return evaluateNumericList(ctx, expr.values as ValueExpression_V2[], (numbers) => numbers.reduce((sum, entry) => sum + entry, 0));
    case 'MULTIPLY':
      return evaluateNumericList(ctx, expr.values as ValueExpression_V2[], (numbers) => numbers.reduce((product, entry) => product * entry, 1));
    case 'SUBTRACT': {
      const left = evaluateValue_V2(ctx, expr.left);
      const right = evaluateValue_V2(ctx, expr.right);
      const leftNumber = toNumber(left.value);
      const rightNumber = toNumber(right.value);
      if (leftNumber === null || rightNumber === null) return { value: undefined, unsupportedReasons: [...left.unsupportedReasons, ...right.unsupportedReasons, 'SUBTRACT received a non-number operand.'] };
      return { value: leftNumber - rightNumber, unsupportedReasons: [...left.unsupportedReasons, ...right.unsupportedReasons] };
    }
    case 'FLOOR_DIVIDE': {
      const left = evaluateValue_V2(ctx, expr.left);
      const right = evaluateValue_V2(ctx, expr.right);
      const leftNumber = toNumber(left.value);
      const rightNumber = toNumber(right.value);
      if (leftNumber === null || rightNumber === null || rightNumber === 0) return { value: undefined, unsupportedReasons: [...left.unsupportedReasons, ...right.unsupportedReasons, 'FLOOR_DIVIDE received an invalid operand.'] };
      return { value: Math.floor(leftNumber / rightNumber), unsupportedReasons: [...left.unsupportedReasons, ...right.unsupportedReasons] };
    }
    case 'ATTACHED_DON_COUNT':
      return evaluateAttachedDonCount(ctx, expr.selector);
    case 'CURRENT_TURN_PLAYER':
      return { value: ctx.state.activePlayerId === ctx.controllerId ? 'PLAYER' : 'OPPONENT', unsupportedReasons: [] };
    case 'EFFECT_OWNER':
      return { value: 'PLAYER', unsupportedReasons: [] };
    case 'EFFECT_OPPONENT':
      return { value: 'OPPONENT', unsupportedReasons: [] };
    case 'TURN_PLAYER':
      return { value: ctx.state.activePlayerId === ctx.controllerId ? 'PLAYER' : 'OPPONENT', unsupportedReasons: [] };
    case 'PHASE':
      return { value: phaseValue(ctx), unsupportedReasons: [] };
    default:
      return unsupported(undefined, `Value expression ${expr.kind} is not supported by the V2 condition evaluator yet.`);
  }
}

function exists(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return value !== 0;
  return value !== undefined && value !== null && value !== false && value !== '';
}

function compareValues(left: unknown, operator: Extract<ConditionExpression_V2, { kind: 'PREDICATE' }>['operator'], right: unknown): boolean {
  switch (operator) {
    case 'EQUAL':
      return left === right;
    case 'NOT_EQUAL':
      return left !== right;
    case 'GREATER_THAN':
      return toNumber(left) !== null && toNumber(right) !== null && (left as number) > (right as number);
    case 'GREATER_OR_EQUAL':
      return toNumber(left) !== null && toNumber(right) !== null && (left as number) >= (right as number);
    case 'LESS_THAN':
      return toNumber(left) !== null && toNumber(right) !== null && (left as number) < (right as number);
    case 'LESS_OR_EQUAL':
      return toNumber(left) !== null && toNumber(right) !== null && (left as number) <= (right as number);
    case 'EXISTS':
      return exists(left);
    case 'NOT_EXISTS':
      return !exists(left);
    case 'CONTAINS':
      return Array.isArray(left) ? left.includes(right) : String(left ?? '').includes(String(right ?? ''));
    case 'MATCHES':
      return String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase());
  }
}

export function evaluateCondition_V2(ctx: SelectorContext_V2, condition: ConditionExpression_V2): ConditionEvaluationResult_V2 {
  switch (condition.kind) {
    case 'TRUE':
      return { value: true, unsupportedReasons: [] };
    case 'FALSE':
      return { value: false, unsupportedReasons: [] };
    case 'PREDICATE': {
      const left = evaluateValue_V2(ctx, condition.left);
      const right = condition.right ? evaluateValue_V2(ctx, condition.right) : { value: undefined, unsupportedReasons: [] };
      const reasons = [...left.unsupportedReasons, ...right.unsupportedReasons];
      if (reasons.length > 0) return { value: false, unsupportedReasons: reasons };
      return { value: compareValues(left.value, condition.operator, right.value), unsupportedReasons: [] };
    }
    case 'AND': {
      const results = condition.conditions.map((entry) => evaluateCondition_V2(ctx, entry));
      return { value: results.every((entry) => entry.value), unsupportedReasons: results.flatMap((entry) => entry.unsupportedReasons) };
    }
    case 'OR': {
      const results = condition.conditions.map((entry) => evaluateCondition_V2(ctx, entry));
      return { value: results.some((entry) => entry.value), unsupportedReasons: results.flatMap((entry) => entry.unsupportedReasons) };
    }
    case 'NOT': {
      const result = evaluateCondition_V2(ctx, condition.condition);
      return { value: !result.value, unsupportedReasons: result.unsupportedReasons };
    }
    case 'ANY': {
      const ids = resolveSelector_V2(ctx, condition.selector).candidateInstanceIds;
      const results = ids.map((id) => evaluateCondition_V2({ ...ctx, sourceInstanceId: id }, condition.condition));
      return { value: results.some((entry) => entry.value), unsupportedReasons: results.flatMap((entry) => entry.unsupportedReasons) };
    }
    case 'ALL': {
      const ids = resolveSelector_V2(ctx, condition.selector).candidateInstanceIds;
      const results = ids.map((id) => evaluateCondition_V2({ ...ctx, sourceInstanceId: id }, condition.condition));
      return { value: results.every((entry) => entry.value), unsupportedReasons: results.flatMap((entry) => entry.unsupportedReasons) };
    }
  }
}
