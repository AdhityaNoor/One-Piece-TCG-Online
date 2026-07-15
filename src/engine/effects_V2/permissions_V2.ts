import type {
  Action_V2,
  Duration_V2,
  RuleModifier_V2,
  Selector_V2,
} from '../../cards/effectCompiler_V2/types_V2';

export type PermissionEffectKind_V2 =
  | 'ALLOW_ACTION'
  | 'PREVENT_ACTION'
  | 'PREVENT_ZONE_CHANGE'
  | 'MODIFY_PLAY_PERMISSION'
  | 'MODIFY_RULE_PERMISSION'
  | 'MODIFY_DECK_CONSTRUCTION'
  | 'MODIFY_DEFEAT_CONDITION'
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
