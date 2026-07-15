import type { Duration_V2, EffectDefinition_V2, TimingExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';

export interface ReplacementEffectRecord_V2 {
  id: string;
  sourceInstanceId: string;
  controllerId: string;
  effect: EffectDefinition_V2;
  timing?: TimingExpression_V2;
  duration: Duration_V2;
  createdAtTurn: number;
  status: 'ACTIVE';
}

export function createReplacementEffectRecord_V2(args: {
  effect: EffectDefinition_V2;
  duration: Duration_V2;
  sourceInstanceId: string;
  controllerId: string;
  turnNumber: number;
  existingCount: number;
}): ReplacementEffectRecord_V2 {
  return {
    id: `${args.sourceInstanceId}:replacement:${args.effect.id}:${args.turnNumber}:${args.existingCount}`,
    sourceInstanceId: args.sourceInstanceId,
    controllerId: args.controllerId,
    effect: args.effect,
    timing: args.effect.timing,
    duration: args.duration,
    createdAtTurn: args.turnNumber,
    status: 'ACTIVE',
  };
}
