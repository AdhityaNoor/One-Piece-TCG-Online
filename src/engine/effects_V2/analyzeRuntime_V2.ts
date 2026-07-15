import type { EffectProgram_V2 } from '../../cards/effectCompiler_V2/effectIr_V2';
import type {
  Action_V2,
  CostAction_V2,
  ModifierExpression_V2,
  ResolutionNode_V2,
} from '../../cards/effectCompiler_V2/types_V2';
import {
  ACTION_PRIMITIVES_V2,
  COST_PRIMITIVES_V2,
  MODIFIER_PRIMITIVES_V2,
  NODE_PRIMITIVES_V2,
  type PrimitiveRuntimeStatus_V2,
} from './primitives_V2';

export interface PrimitiveUsageSummary_V2 {
  totalUsages: number;
  implementedUsages: number;
  bridgeOnlyUsages: number;
  plannedUsages: number;
  byStatus: Record<PrimitiveRuntimeStatus_V2, number>;
  byPrimitive: Record<string, { status: PrimitiveRuntimeStatus_V2; count: number; remark: string }>;
}

function emptySummary(): PrimitiveUsageSummary_V2 {
  return {
    totalUsages: 0,
    implementedUsages: 0,
    bridgeOnlyUsages: 0,
    plannedUsages: 0,
    byStatus: { implemented: 0, 'bridge-only': 0, planned: 0 },
    byPrimitive: {},
  };
}

function recordPrimitive(
  summary: PrimitiveUsageSummary_V2,
  namespace: 'action' | 'cost' | 'node' | 'modifier',
  kind: string,
  status: PrimitiveRuntimeStatus_V2,
  remark: string,
): void {
  const key = `${namespace}:${kind}`;
  summary.totalUsages += 1;
  summary.byStatus[status] += 1;
  if (status === 'implemented') summary.implementedUsages += 1;
  if (status === 'bridge-only') summary.bridgeOnlyUsages += 1;
  if (status === 'planned') summary.plannedUsages += 1;
  const current = summary.byPrimitive[key] ?? { status, count: 0, remark };
  current.count += 1;
  summary.byPrimitive[key] = current;
}

function recordAction(summary: PrimitiveUsageSummary_V2, action: Action_V2): void {
  const primitive = ACTION_PRIMITIVES_V2[action.type];
  recordPrimitive(summary, 'action', action.type, primitive.status, primitive.remark);

  if (action.type === 'PLAYER_CHOOSES' || action.type === 'OPPONENT_CHOOSES') {
    for (const option of action.options) visitNode(summary, option);
  }
  if (action.type === 'CREATE_DELAYED_EFFECT' || action.type === 'CREATE_REPLACEMENT_EFFECT') {
    visitNode(summary, action.effect.resolution);
  }
}

function recordCost(summary: PrimitiveUsageSummary_V2, cost: CostAction_V2): void {
  const primitive = COST_PRIMITIVES_V2[cost.type];
  recordPrimitive(summary, 'cost', cost.type, primitive.status, primitive.remark);
}

function recordModifier(summary: PrimitiveUsageSummary_V2, modifier: ModifierExpression_V2): void {
  const primitive = MODIFIER_PRIMITIVES_V2[modifier.type];
  recordPrimitive(summary, 'modifier', modifier.type, primitive.status, primitive.remark);
}

function visitNode(summary: PrimitiveUsageSummary_V2, node: ResolutionNode_V2): void {
  const primitive = NODE_PRIMITIVES_V2[node.kind];
  recordPrimitive(summary, 'node', node.kind, primitive.status, primitive.remark);

  switch (node.kind) {
    case 'ACTION':
      recordAction(summary, node.action);
      return;
    case 'SEQUENCE':
      node.nodes.forEach((child) => visitNode(summary, child));
      return;
    case 'OPTIONAL':
    case 'FOR_EACH':
    case 'REPEAT':
      visitNode(summary, node.node);
      return;
    case 'IF_ACTION_SUCCEEDED':
      visitNode(summary, node.then);
      if (node.else) visitNode(summary, node.else);
      return;
    case 'IF':
      visitNode(summary, node.then);
      if (node.else) visitNode(summary, node.else);
      return;
    case 'CHOOSE':
      node.options.forEach((option) => visitNode(summary, option));
      return;
    case 'REPLACEMENT':
    case 'DELAY':
      visitNode(summary, node.node);
      return;
    case 'CREATE_CONTINUOUS_EFFECT':
      recordModifier(summary, node.modifier);
      return;
    case 'NO_OP':
      return;
  }
}

export function analyzeEffectPrograms_V2(programsByCardNumber: Record<string, EffectProgram_V2>): PrimitiveUsageSummary_V2 {
  const summary = emptySummary();
  for (const program of Object.values(programsByCardNumber)) {
    for (const ability of program.abilities) {
      for (const payment of ability.activationCost?.payments ?? []) {
        recordCost(summary, payment);
      }
      visitNode(summary, ability.resolution);
    }
  }
  return summary;
}
