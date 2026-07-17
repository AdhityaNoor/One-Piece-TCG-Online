import { fixedNumberValue_V2 } from './damage_V2';
import type { EffectRuntimeSidecars_V2 } from './dispatcher_V2';
import { resolveSelector_V2, type SelectorContext_V2 } from './selectorResolver_V2';

export function applyDamageModifiers_V2(input: {
  ctx: SelectorContext_V2;
  sidecars?: Pick<EffectRuntimeSidecars_V2, 'statModifiers'> | null;
  sourceIds: readonly string[];
  baseAmount: number;
}): number {
  let amount = input.baseAmount;
  const sourceSet = new Set(input.sourceIds);
  for (const modifier of input.sidecars?.statModifiers ?? []) {
    if (modifier.status !== 'ACTIVE' || modifier.stat !== 'DAMAGE') continue;
    const resolved = resolveSelector_V2({
      ...input.ctx,
      sourceInstanceId: modifier.sourceInstanceId,
      controllerId: modifier.controllerId,
    }, modifier.selector);
    if (!resolved.candidateInstanceIds.some((id) => sourceSet.has(id))) continue;
    const value = fixedNumberValue_V2(modifier.value, 'MODIFY_DAMAGE');
    switch (modifier.operation) {
      case 'ADD':
        amount += value;
        break;
      case 'SUBTRACT':
        amount -= value;
        break;
      case 'SET':
      case 'COPY':
        amount = value;
        break;
      case 'SET_TO_ZERO':
        amount = 0;
        break;
    }
  }
  return Math.max(0, amount);
}
