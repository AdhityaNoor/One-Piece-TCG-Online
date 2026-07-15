import type { EffectGate_V2, GateAtomKind_V2 } from '../../cards/effectCompiler_V2/effectIr_V2';
import type { ConditionExpression_V2, NumericComparison_V2, PlayerReference_V2, Selector_V2, ValueExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import { evaluateCondition_V2 } from './conditions_V2';
import type { SelectorContext_V2 } from './selectorResolver_V2';

export interface GateEvaluationResult_V2 {
  value: boolean;
  unsupportedReasons: string[];
}

function numberValue(value: number): ValueExpression_V2 {
  return { kind: 'NUMBER', value };
}

function stringParam(params: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = params?.[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function numberParam(params: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = params?.[key];
    if (typeof value === 'number') return value;
  }
  return undefined;
}

function comparisonFromParams(params: Record<string, unknown> | undefined): { operator: Extract<ConditionExpression_V2, { kind: 'PREDICATE' }>['operator']; value: number } {
  const atLeast = numberParam(params, ['atLeast', 'min', 'minimum']);
  if (atLeast !== undefined) return { operator: 'GREATER_OR_EQUAL', value: atLeast };
  const atMost = numberParam(params, ['atMost', 'max', 'maximum']);
  if (atMost !== undefined) return { operator: 'LESS_OR_EQUAL', value: atMost };
  const exact = numberParam(params, ['exact', 'equals', 'count']);
  if (exact !== undefined) return { operator: 'EQUAL', value: exact };
  return { operator: 'GREATER_OR_EQUAL', value: 1 };
}

function countGate(selector: Selector_V2, params?: Record<string, unknown>): ConditionExpression_V2 {
  const comparison = comparisonFromParams(params);
  return {
    kind: 'PREDICATE',
    left: { kind: 'COUNT', selector: { ...selector, quantity: { kind: 'ANY_NUMBER' } } },
    operator: comparison.operator,
    right: numberValue(comparison.value),
  };
}

function playerFromGate(gate: GateAtomKind_V2): PlayerReference_V2 {
  return gate.startsWith('OPPONENT') ? 'OPPONENT' : 'PLAYER';
}

function donCountSelector(gate: GateAtomKind_V2): Selector_V2 {
  const owner = playerFromGate(gate);
  if (gate.includes('GIVEN_DON')) return { subject: 'DON', owner, zones: ['ATTACHED_DON'] };
  return {
    subject: 'DON',
    owner,
    zones: ['COST_AREA'],
    ...(gate.includes('ACTIVE_DON') ? { states: ['ACTIVE'] as Selector_V2['states'] } : {}),
    ...(gate.includes('RESTED_DON') ? { states: ['RESTED'] as Selector_V2['states'] } : {}),
  };
}

function characterCountSelector(gate: GateAtomKind_V2, params?: Record<string, unknown>): Selector_V2 {
  const controller = playerFromGate(gate);
  const typeIncludes = stringParam(params, ['typeIncludes', 'type']);
  return {
    subject: 'CARD',
    controller,
    zones: ['CHARACTER_AREA'],
    cardCategories: ['CHARACTER'],
    ...(gate.includes('RESTED_CHARACTER') ? { states: ['RESTED'] as Selector_V2['states'] } : {}),
    ...(typeIncludes ? { types: { kind: 'TYPE_INCLUDES_TEXT', values: [typeIncludes] } as const } : {}),
  };
}

function zoneCountSelector(gate: GateAtomKind_V2): Selector_V2 | null {
  const owner = playerFromGate(gate);
  if (gate.includes('LIFE')) return { subject: 'CARD', owner, zones: ['LIFE'] };
  if (gate.includes('HAND')) return { subject: 'CARD', owner, zones: ['HAND'] };
  if (gate.includes('TRASH')) return { subject: 'CARD', owner, zones: ['TRASH'] };
  if (gate.includes('DECK')) return { subject: 'CARD', owner, zones: ['DECK'] };
  return null;
}

function leaderSelector(params: Record<string, unknown> | undefined, extra?: Partial<Selector_V2>): Selector_V2 {
  const name = stringParam(params, ['name']);
  const nameIncludes = stringParam(params, ['nameIncludes']);
  const typeIncludes = stringParam(params, ['typeIncludes', 'type']);
  const attribute = stringParam(params, ['attribute']);
  return {
    subject: 'CARD',
    controller: 'PLAYER',
    zones: ['LEADER_AREA'],
    cardCategories: ['LEADER'],
    quantity: { kind: 'EXACTLY', value: numberValue(1) },
    ...(name ? { names: [{ kind: 'NAME_EXACT', value: name }] as Selector_V2['names'] } : {}),
    ...(nameIncludes ? { names: [{ kind: 'NAME_CONTAINS', value: nameIncludes }] as Selector_V2['names'] } : {}),
    ...(typeIncludes ? { types: { kind: 'TYPE_INCLUDES_TEXT', values: [typeIncludes] } as const } : {}),
    ...(attribute ? { attributes: { kind: 'HAS_ATTRIBUTE', values: [attribute.toUpperCase() as any] } as Selector_V2['attributes'] } : {}),
    ...extra,
  };
}

function gateRefToCondition(gate: GateAtomKind_V2, params?: Record<string, unknown>): ConditionExpression_V2 | null {
  switch (gate) {
    case 'LEADER_NAME':
    case 'LEADER_NAME_INCLUDES':
    case 'LEADER_TYPE':
    case 'LEADER_ATTRIBUTE':
      return countGate(leaderSelector(params));
    case 'LEADER_ACTIVE':
      return countGate(leaderSelector(params, { states: ['ACTIVE'] }));
    case 'LEADER_RESTED':
      return countGate(leaderSelector(params, { states: ['RESTED'] }));
    case 'SELF_CHARACTER_COUNT':
    case 'SELF_RESTED_CHARACTER_COUNT':
    case 'SELF_TYPED_CHARACTER_COUNT':
    case 'OPPONENT_RESTED_CHARACTER_COUNT':
      return countGate(characterCountSelector(gate, params), params);
    case 'SELF_DON_FIELD_COUNT':
    case 'SELF_ACTIVE_DON_COUNT':
    case 'SELF_RESTED_DON_COUNT':
    case 'SELF_GIVEN_DON_COUNT':
    case 'OPPONENT_GIVEN_DON_COUNT':
      return countGate(donCountSelector(gate), params);
    case 'SELF_LIFE':
    case 'OPPONENT_LIFE':
    case 'SELF_HAND':
    case 'OPPONENT_HAND':
    case 'SELF_TRASH_COUNT':
    case 'SELF_DECK_COUNT': {
      const selector = zoneCountSelector(gate);
      return selector ? countGate(selector, params) : null;
    }
    case 'COMBINED_LIFE_TOTAL': {
      const comparison = comparisonFromParams(params);
      return {
        kind: 'PREDICATE',
        left: {
          kind: 'ADD',
          values: [
            { kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: { kind: 'ANY_NUMBER' } } },
            { kind: 'COUNT', selector: { subject: 'CARD', owner: 'OPPONENT', zones: ['LIFE'], quantity: { kind: 'ANY_NUMBER' } } },
          ],
        },
        operator: comparison.operator,
        right: numberValue(comparison.value),
      };
    }
    case 'SELF_PLAYED_THIS_TURN':
      return countGate({ subject: 'CARD', relations: ['THIS_CARD'], states: ['PLAYED_THIS_TURN'] });
    case 'ACTION_SUCCEEDED':
      return {
        kind: 'PREDICATE',
        left: { kind: 'PREVIOUS_RESULT', resultId: stringParam(params, ['actionResult', 'resultId']) ?? 'PREVIOUS_ACTION' },
        operator: 'EQUAL',
        right: { kind: 'BOOLEAN', value: true },
      };
    default:
      return null;
  }
}

export function evaluateGate_V2(ctx: SelectorContext_V2, gate: EffectGate_V2): GateEvaluationResult_V2 {
  if (gate.kind !== 'CANONICAL_GATE_REF') return evaluateCondition_V2(ctx, gate);
  const condition = gateRefToCondition(gate.gate, gate.params);
  if (!condition) {
    return {
      value: false,
      unsupportedReasons: [`Canonical V2 gate ${gate.gate} is not implemented by evaluateGate_V2 yet.`],
    };
  }
  return evaluateCondition_V2(ctx, condition);
}

export function evaluateGates_V2(ctx: SelectorContext_V2, gates: readonly EffectGate_V2[] | undefined): GateEvaluationResult_V2 {
  if (!gates?.length) return { value: true, unsupportedReasons: [] };
  const results = gates.map((gate) => evaluateGate_V2(ctx, gate));
  return {
    value: results.every((result) => result.value),
    unsupportedReasons: results.flatMap((result) => result.unsupportedReasons),
  };
}
