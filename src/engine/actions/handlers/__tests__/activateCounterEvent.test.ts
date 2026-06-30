/**
 * ACTIVATE_COUNTER_EVENT validation (7-1-3-2-2). The full play→trash→[Counter]
 * firing path is covered end-to-end in
 * cards/effectTemplates/__tests__/compileAndRun.test.ts (fireCounter); here we
 * cover the handler's own structural gates.
 */
import { describe, expect, it } from 'vitest';
import { validateActivateCounterEvent } from '../activateCounterEvent';
import type { ActivateCounterEventAction } from '../../action';
import { buildBaseRig, nextTestId } from '../../../rules/shared/__tests__/testRig';

function counterEvent(playerId: string, handCardInstanceId = 'x', donInstanceIds: string[] = []): ActivateCounterEventAction {
  return { type: 'ACTIVATE_COUNTER_EVENT', actionId: nextTestId('action'), playerId, handCardInstanceId, donInstanceIds };
}

describe('validateActivateCounterEvent', () => {
  it('rejects when no Battle / Counter Step is active', () => {
    const { state, defs } = buildBaseRig({ phase: 'main' });
    const result = validateActivateCounterEvent(state, counterEvent('p1'), defs, {});
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/Counter Step/i);
  });
});
