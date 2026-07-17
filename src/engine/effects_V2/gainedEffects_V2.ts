import type { Duration_V2, EffectDefinition_V2, Selector_V2 } from '../../cards/effectCompiler_V2/types_V2';

export interface GainedEffectRecord_V2 {
  id: string;
  sourceInstanceId: string;
  controllerId: string;
  selector: Selector_V2;
  selectedInstanceIds: string[];
  effect: EffectDefinition_V2;
  duration: Duration_V2;
  createdAtTurn: number;
  status: 'ACTIVE';
}

export interface GainedEffectRemovalRecord_V2 {
  id: string;
  sourceInstanceId: string;
  controllerId: string;
  selector: Selector_V2;
  selectedInstanceIds: string[];
  effectFilter: string;
  duration: Duration_V2;
  createdAtTurn: number;
  status: 'ACTIVE';
}

export function createGainedEffectRecord_V2(args: {
  sourceInstanceId: string;
  controllerId: string;
  selector: Selector_V2;
  selectedInstanceIds: string[];
  effect: EffectDefinition_V2;
  duration: Duration_V2;
  turnNumber: number;
  existingCount: number;
}): GainedEffectRecord_V2 {
  return {
    id: `${args.sourceInstanceId}:gained-effect:${args.effect.id}:${args.turnNumber}:${args.existingCount}`,
    sourceInstanceId: args.sourceInstanceId,
    controllerId: args.controllerId,
    selector: args.selector,
    selectedInstanceIds: args.selectedInstanceIds,
    effect: args.effect,
    duration: args.duration,
    createdAtTurn: args.turnNumber,
    status: 'ACTIVE',
  };
}

export function createGainedEffectRemovalRecord_V2(args: {
  sourceInstanceId: string;
  controllerId: string;
  selector: Selector_V2;
  selectedInstanceIds: string[];
  effectFilter: string;
  duration: Duration_V2;
  turnNumber: number;
  existingCount: number;
}): GainedEffectRemovalRecord_V2 {
  return {
    id: `${args.sourceInstanceId}:remove-gained-effect:${args.turnNumber}:${args.existingCount}`,
    sourceInstanceId: args.sourceInstanceId,
    controllerId: args.controllerId,
    selector: args.selector,
    selectedInstanceIds: args.selectedInstanceIds,
    effectFilter: args.effectFilter,
    duration: args.duration,
    createdAtTurn: args.turnNumber,
    status: 'ACTIVE',
  };
}

export function gainedEffectMatchesRemoval_V2(effect: GainedEffectRecord_V2, removal: GainedEffectRemovalRecord_V2): boolean {
  if (effect.status !== 'ACTIVE' || removal.status !== 'ACTIVE') return false;
  if (!effect.selectedInstanceIds.some((id) => removal.selectedInstanceIds.includes(id))) return false;
  if (!removal.effectFilter || removal.effectFilter === 'ALL_EFFECTS') return true;
  return effect.effect.id === removal.effectFilter || effect.effect.metadata.printedText.includes(removal.effectFilter);
}
