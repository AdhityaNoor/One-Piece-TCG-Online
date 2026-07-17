import type {
  Action_V2,
  Duration_V2,
  RuleModifier_V2,
  Selector_V2,
} from '../../cards/effectCompiler_V2/types_V2';
import { resolveSelector_V2, type SelectorContext_V2 } from './selectorResolver_V2';

export type PermissionEffectKind_V2 =
  | 'ALLOW_ACTION'
  | 'PREVENT_ACTION'
  | 'PREVENT_SELECTION'
  | 'PREVENT_ZONE_CHANGE'
  | 'MODIFY_VALID_TARGETS'
  | 'MODIFY_PLAY_PERMISSION'
  | 'MODIFY_AREA_CAPACITY'
  | 'MODIFY_RULE_PERMISSION'
  | 'MODIFY_DECK_CONSTRUCTION'
  | 'MODIFY_DEFEAT_CONDITION'
  | 'MODIFY_VICTORY_CONDITION'
  | 'MODIFY_STARTING_SETUP';

export interface PermissionEffectRecord_V2 {
  id: string;
  kind: PermissionEffectKind_V2;
  sourceInstanceId: string;
  controllerId: string;
  selector?: Selector_V2;
  sourceSelector?: Selector_V2;
  action?: string;
  causeFilter?: string;
  modifier?: RuleModifier_V2;
  duration: Duration_V2;
  createdAtTurn: number;
  status: 'ACTIVE';
}

export function createPermissionEffectRecord_V2(args: {
  action: Action_V2 & {
    type: PermissionEffectKind_V2;
    selector?: Selector_V2;
    sourceSelector?: Selector_V2;
    action?: string;
    causeFilter?: string;
    modifier?: RuleModifier_V2;
    duration?: Duration_V2;
  };
  sourceInstanceId: string;
  controllerId: string;
  turnNumber: number;
  existingCount: number;
}): PermissionEffectRecord_V2 {
  const base = {
    id: `${args.sourceInstanceId}:permission:${args.action.type}:${args.turnNumber}:${args.existingCount}`,
    kind: args.action.type,
    sourceInstanceId: args.sourceInstanceId,
    controllerId: args.controllerId,
    createdAtTurn: args.turnNumber,
    status: 'ACTIVE' as const,
  };
  if (
    args.action.type === 'MODIFY_RULE_PERMISSION'
    || args.action.type === 'MODIFY_DECK_CONSTRUCTION'
    || args.action.type === 'MODIFY_DEFEAT_CONDITION'
    || args.action.type === 'MODIFY_VICTORY_CONDITION'
    || args.action.type === 'MODIFY_AREA_CAPACITY'
    || args.action.type === 'MODIFY_STARTING_SETUP'
  ) {
    return {
      ...base,
      modifier: args.action.modifier,
      duration: { kind: 'PERMANENT' },
    };
  }
  return {
    ...base,
    selector: args.action.selector,
    sourceSelector: args.action.sourceSelector,
    action: args.action.action,
    causeFilter: 'causeFilter' in args.action ? args.action.causeFilter : undefined,
    duration: args.action.duration ?? { kind: 'INSTANT' },
  };
}

function sourceSelectorAllowsCause_V2(ctx: SelectorContext_V2, record: PermissionEffectRecord_V2, cause: 'MANUAL' | 'EFFECT'): boolean {
  const sourceSelector = record.sourceSelector;
  if (!sourceSelector || sourceSelector.subject !== 'EFFECT') return true;
  if (cause !== 'EFFECT') return false;
  const effectSource = ctx.state.cardsById[ctx.sourceInstanceId];
  const effectControllerId = effectSource?.controllerId ?? ctx.controllerId;
  switch (sourceSelector.controller) {
    case undefined:
    case 'ANY':
      return true;
    case 'PLAYER':
    case 'EFFECT_OWNER':
    case 'CARD_CONTROLLER':
      return effectControllerId === record.controllerId;
    case 'OPPONENT':
      return effectControllerId !== record.controllerId;
    case 'CARD_OWNER':
      return effectSource?.ownerId === record.controllerId;
  }
}

export function v2PlayPreventionReasons(args: {
  ctx: SelectorContext_V2;
  permissionEffects: readonly PermissionEffectRecord_V2[];
  playerId: string;
  candidateInstanceId: string;
  cause: 'MANUAL' | 'EFFECT';
}): string[] {
  const reasons: string[] = [];
  for (const record of args.permissionEffects) {
    if (record.kind !== 'PREVENT_ACTION' || record.action !== 'PLAY_CARD') continue;
    if (record.controllerId !== args.playerId) continue;
    if (!sourceSelectorAllowsCause_V2(args.ctx, record, args.cause)) continue;
    const selector: Selector_V2 = {
      ...(record.selector ?? { subject: 'CARD' as const }),
      zones: undefined,
      quantity: { kind: 'ANY_NUMBER' },
    };
    const resolved = resolveSelector_V2(
      {
        ...args.ctx,
        sourceInstanceId: record.sourceInstanceId,
        controllerId: record.controllerId,
      },
      selector,
    );
    if (resolved.candidateInstanceIds.includes(args.candidateInstanceId)) {
      reasons.push('A V2 permission effect prevents playing this card.');
    }
  }
  return reasons;
}

function causeFilterAllowsCause(record: PermissionEffectRecord_V2, cause: string | undefined): boolean {
  if (!record.causeFilter || record.causeFilter === 'ANY') return true;
  return record.causeFilter === cause;
}

export function v2ActionPreventionReasons(args: {
  ctx: SelectorContext_V2;
  permissionEffects: readonly PermissionEffectRecord_V2[];
  action: string;
  candidateInstanceId: string;
  cause?: string;
}): string[] {
  const reasons: string[] = [];
  for (const record of args.permissionEffects) {
    if (record.kind !== 'PREVENT_ACTION' || record.action !== args.action) continue;
    if (!causeFilterAllowsCause(record, args.cause)) continue;
    if (!sourceSelectorAllowsCause_V2(args.ctx, record, args.cause === 'EFFECT' ? 'EFFECT' : 'MANUAL')) continue;
    const selector: Selector_V2 = record.selector ?? { subject: 'CARD' };
    const resolved = resolveSelector_V2(
      {
        ...args.ctx,
        sourceInstanceId: record.sourceInstanceId,
        controllerId: record.controllerId,
      },
      selector,
    );
    if (resolved.candidateInstanceIds.includes(args.candidateInstanceId)) {
      reasons.push(`A V2 permission effect prevents ${args.action} on this card.`);
    }
  }
  return reasons;
}

export function v2SelectionPreventionReasons(args: {
  ctx: SelectorContext_V2;
  permissionEffects: readonly PermissionEffectRecord_V2[];
  candidateInstanceId: string;
  cause?: string;
}): string[] {
  const reasons: string[] = [];
  for (const record of args.permissionEffects) {
    if (record.kind !== 'PREVENT_SELECTION') continue;
    if (!causeFilterAllowsCause(record, args.cause)) continue;
    if (!sourceSelectorAllowsCause_V2(args.ctx, record, args.cause === 'EFFECT' ? 'EFFECT' : 'MANUAL')) continue;
    const selector: Selector_V2 = record.selector ?? { subject: 'CARD' };
    const resolved = resolveSelector_V2(
      {
        ...args.ctx,
        sourceInstanceId: record.sourceInstanceId,
        controllerId: record.controllerId,
      },
      selector,
    );
    if (resolved.candidateInstanceIds.includes(args.candidateInstanceId)) {
      reasons.push('A V2 permission effect prevents selecting this card.');
    }
  }
  return reasons;
}

export function v2ValidTargetModifierReasons(args: {
  ctx: SelectorContext_V2;
  permissionEffects: readonly PermissionEffectRecord_V2[];
  action: string;
  candidateInstanceId: string;
  cause?: string;
}): string[] {
  const reasons: string[] = [];
  for (const record of args.permissionEffects) {
    if (record.kind !== 'MODIFY_VALID_TARGETS') continue;
    if (record.action && record.action !== args.action) continue;
    if (!causeFilterAllowsCause(record, args.cause)) continue;
    if (!sourceSelectorAllowsCause_V2(args.ctx, record, args.cause === 'EFFECT' ? 'EFFECT' : 'MANUAL')) continue;
    const selector: Selector_V2 = record.selector ?? { subject: 'CARD' };
    const resolved = resolveSelector_V2(
      {
        ...args.ctx,
        sourceInstanceId: record.sourceInstanceId,
        controllerId: record.controllerId,
      },
      selector,
    );
    if (!resolved.candidateInstanceIds.includes(args.candidateInstanceId)) {
      reasons.push(`A V2 valid-target modifier excludes this card from ${args.action}.`);
    }
  }
  return reasons;
}

export function v2ZoneChangePreventionReasons(args: {
  ctx: SelectorContext_V2;
  permissionEffects: readonly PermissionEffectRecord_V2[];
  candidateInstanceId: string;
  toZone?: string;
  cause?: string;
}): string[] {
  const reasons: string[] = [];
  for (const record of args.permissionEffects) {
    if (record.kind !== 'PREVENT_ZONE_CHANGE') continue;
    if (record.action && record.action !== 'REMOVE_FROM_FIELD' && args.toZone && record.action !== args.toZone) continue;
    if (!sourceSelectorAllowsCause_V2(args.ctx, record, args.cause === 'EFFECT' ? 'EFFECT' : 'MANUAL')) continue;
    const selector: Selector_V2 = record.selector ?? { subject: 'CARD' };
    const resolved = resolveSelector_V2(
      {
        ...args.ctx,
        sourceInstanceId: record.sourceInstanceId,
        controllerId: record.controllerId,
      },
      selector,
    );
    if (resolved.candidateInstanceIds.includes(args.candidateInstanceId)) {
      reasons.push('A V2 permission effect prevents this zone change.');
    }
  }
  return reasons;
}
