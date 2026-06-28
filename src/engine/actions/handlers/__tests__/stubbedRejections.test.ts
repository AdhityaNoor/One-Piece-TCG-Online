import { describe, expect, it } from 'vitest';
import {
  validateActivateCardEffect,
  executeActivateCardEffect,
  validateActivateCounterEvent,
  executeActivateCounterEvent,
} from '../stubbedRejections';
import type { ActivateCardEffectAction, ActivateCounterEventAction } from '../../action';
import { buildBaseRig, nextTestId } from '../../../rules/shared/__tests__/testRig';

function activateCardEffectAction(playerId: string): ActivateCardEffectAction {
  return { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId, sourceInstanceId: 'whatever', effectId: 'whatever', donInstanceIds: [] };
}

function activateCounterEventAction(playerId: string): ActivateCounterEventAction {
  return { type: 'ACTIVATE_COUNTER_EVENT', actionId: nextTestId('action'), playerId, handCardInstanceId: 'whatever', donInstanceIds: [] };
}

describe('validateActivateCardEffect', () => {
  it('always rejects, with a reason explaining card effects are stubbed this milestone', () => {
    const { state } = buildBaseRig({ phase: 'main' });
    const result = validateActivateCardEffect(state, activateCardEffectAction('p1'));
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/not implemented/i);
  });
});

describe('executeActivateCardEffect', () => {
  it('always throws — must never be reached by the dispatcher', () => {
    expect(() => executeActivateCardEffect()).toThrow();
  });
});

describe('validateActivateCounterEvent', () => {
  it('always rejects, with a reason explaining card effects are stubbed this milestone', () => {
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
