import { describe, expect, it } from 'vitest';
import { validateActivateCounterEvent, executeActivateCounterEvent } from '../stubbedRejections';
import type { ActivateCounterEventAction } from '../../action';
import { buildBaseRig, nextTestId } from '../../../rules/shared/__tests__/testRig';

function activateCounterEventAction(playerId: string): ActivateCounterEventAction {
  return { type: 'ACTIVATE_COUNTER_EVENT', actionId: nextTestId('action'), playerId, handCardInstanceId: 'whatever', donInstanceIds: [] };
}

describe('validateActivateCounterEvent', () => {
  it('always rejects, with a reason explaining it is not implemented yet', () => {
    const { state } = buildBaseRig({ phase: 'main' });
    const result = validateActivateCounterEvent(state, activateCounterEventAction('p1'));
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/not implemented/i);
  });
});

describe('executeActivateCounterEvent', () => {
  it('always throws — must never be reached by the dispatcher', () => {
    expect(() => executeActivateCounterEvent()).toThrow();
  });
});
