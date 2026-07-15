import type { EffectAssignment_V2 } from '../types_V2';
import { OP01_ASSIGNMENTS_V2 } from './OP01_V2';

export const ASSIGNMENTS_BY_SET_V2: Record<string, readonly EffectAssignment_V2[]> = {
  OP01: OP01_ASSIGNMENTS_V2,
};

export const EFFECT_ASSIGNMENTS_V2: readonly EffectAssignment_V2[] = Object.values(ASSIGNMENTS_BY_SET_V2).flat();

export function getEffectAssignmentsForSets_V2(setCodes: readonly string[]): readonly EffectAssignment_V2[] {
  return setCodes.flatMap((setCode) => ASSIGNMENTS_BY_SET_V2[setCode] ?? []);
}
