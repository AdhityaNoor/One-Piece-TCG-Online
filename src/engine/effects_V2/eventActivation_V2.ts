import type { TimingExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';

export interface ActivatedEventRecord_V2 {
  id: string;
  sourceInstanceId: string;
  controllerId: string;
  eventInstanceId: string;
  eventCardNumber: string;
  timing: TimingExpression_V2;
  createdAtTurn: number;
  status: 'PENDING' | 'RESOLVED';
}

export function createActivatedEventRecord_V2(args: {
  sourceInstanceId: string;
  controllerId: string;
  eventInstanceId: string;
  eventCardNumber: string;
  timing: TimingExpression_V2;
  turnNumber: number;
  existingCount: number;
  status?: ActivatedEventRecord_V2['status'];
}): ActivatedEventRecord_V2 {
  return {
    id: `${args.sourceInstanceId}:activate-event:${args.eventInstanceId}:${args.turnNumber}:${args.existingCount}`,
    sourceInstanceId: args.sourceInstanceId,
    controllerId: args.controllerId,
    eventInstanceId: args.eventInstanceId,
    eventCardNumber: args.eventCardNumber,
    timing: args.timing,
    createdAtTurn: args.turnNumber,
    status: args.status ?? 'PENDING',
  };
}
