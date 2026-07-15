import { andConditions_V2, numberValue_V2, selfSelector_V2 } from './helpers_V2';
import type { EffectGate_V2, GateAtomKind_V2 } from './effectIr_V2';
import type { ConditionExpression_V2 } from './types_V2';

export interface GateFactoryOptions_V2 {
  player?: 'PLAYER' | 'OPPONENT';
  atLeast?: number;
  atMost?: number;
  exact?: number;
  name?: string;
  typeIncludes?: string;
  attribute?: string;
}

export function gateRef_V2(gate: GateAtomKind_V2, params?: Record<string, unknown>): EffectGate_V2 {
  return params ? { kind: 'CANONICAL_GATE_REF', gate, params } : { kind: 'CANONICAL_GATE_REF', gate };
}

export function compareCountGate_V2(kind: GateAtomKind_V2, countExprKind: string, options: GateFactoryOptions_V2): ConditionExpression_V2 {
  const comparisons: ConditionExpression_V2[] = [];
  const left = { kind: countExprKind, player: options.player ?? 'PLAYER' };
  if (options.atLeast !== undefined) {
    comparisons.push({ kind: 'PREDICATE', left, operator: 'GREATER_OR_EQUAL', right: numberValue_V2(options.atLeast) });
  }
  if (options.atMost !== undefined) {
    comparisons.push({ kind: 'PREDICATE', left, operator: 'LESS_OR_EQUAL', right: numberValue_V2(options.atMost) });
  }
  if (options.exact !== undefined) {
    comparisons.push({ kind: 'PREDICATE', left, operator: 'EQUAL', right: numberValue_V2(options.exact) });
  }

  return andConditions_V2(comparisons) ?? {
    kind: 'PREDICATE',
    left: { kind: 'GATE_EXISTS', gate: kind, player: options.player ?? 'PLAYER' },
    operator: 'EXISTS',
  };
}

export function leaderNameGate_V2(name: string): EffectGate_V2 {
  return {
    kind: 'PREDICATE',
    left: { kind: 'PROPERTY', object: { kind: 'EFFECT_OWNER_LEADER' }, property: 'names' },
    operator: 'CONTAINS',
    right: { kind: 'STRING', value: name },
  };
}

export function leaderTypeGate_V2(typeIncludes: string): EffectGate_V2 {
  return {
    kind: 'PREDICATE',
    left: { kind: 'PROPERTY', object: { kind: 'EFFECT_OWNER_LEADER' }, property: 'types' },
    operator: 'MATCHES',
    right: { kind: 'STRING', value: typeIncludes },
  };
}

export function sourcePlayedThisTurnGate_V2(): EffectGate_V2 {
  return {
    kind: 'PREDICATE',
    left: { kind: 'SOURCE_WAS_PLAYED_THIS_TURN', selector: selfSelector_V2() },
    operator: 'EQUAL',
    right: { kind: 'BOOLEAN', value: true },
  };
}

export function selfLifeGate_V2(options: Pick<GateFactoryOptions_V2, 'atLeast' | 'atMost' | 'exact'>): EffectGate_V2 {
  return compareCountGate_V2('SELF_LIFE', 'LIFE_COUNT', { ...options, player: 'PLAYER' });
}

export function opponentLifeGate_V2(options: Pick<GateFactoryOptions_V2, 'atLeast' | 'atMost' | 'exact'>): EffectGate_V2 {
  return compareCountGate_V2('OPPONENT_LIFE', 'LIFE_COUNT', { ...options, player: 'OPPONENT' });
}

export function selfHandGate_V2(options: Pick<GateFactoryOptions_V2, 'atLeast' | 'atMost' | 'exact'>): EffectGate_V2 {
  return compareCountGate_V2('SELF_HAND', 'HAND_COUNT', { ...options, player: 'PLAYER' });
}

export function selfCharacterCountGate_V2(options: Pick<GateFactoryOptions_V2, 'atLeast' | 'atMost' | 'exact'>): EffectGate_V2 {
  return compareCountGate_V2('SELF_CHARACTER_COUNT', 'CHARACTER_COUNT', { ...options, player: 'PLAYER' });
}

export function selfDonFieldGate_V2(options: Pick<GateFactoryOptions_V2, 'atLeast' | 'atMost' | 'exact'>): EffectGate_V2 {
  return compareCountGate_V2('SELF_DON_FIELD_COUNT', 'DON_ON_FIELD_COUNT', { ...options, player: 'PLAYER' });
}
