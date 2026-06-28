import { describe, expect, it } from 'vitest';
import { validateEndMainPhase, executeEndMainPhase } from '../endMainPhase';
import type { EndMainPhaseAction } from '../../action';
import { buildBaseRig, nextTestId } from '../../../rules/shared/__tests__/testRig';

function endMainPhaseAction(playerId: string): EndMainPhaseAction {
  return { type: 'END_MAIN_PHASE', actionId: nextTestId('action'), playerId };
}

describe('validateEndMainPhase', () => {
  it('rejects outside the Main Phase', () => {
    const { state } = buildBaseRig({ phase: 'don', activePlayerId: 'p1' });
    expect(validateEndMainPhase(state, endMainPhaseAction('p1')).legal).toBe(false);
  });

  it('rejects a non-turn-player', () => {
    const { state } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    expect(validateEndMainPhase(state, endMainPhaseAction('p2')).legal).toBe(false);
  });

  it('accepts the turn player ending their own Main Phase', () => {
    const { state } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    expect(validateEndMainPhase(state, endMainPhaseAction('p1')).legal).toBe(true);
  });
});

describe('executeEndMainPhase', () => {
  it('sets currentPhase to "end" and logs PHASE_CHANGED, without touching activePlayerId', () => {
    const { state } = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 5 });
    const result = executeEndMainPhase(state, endMainPhaseAction('p1'));

    expect(result.state.currentPhase).toBe('end');
    expect(result.state.activePlayerId).toBe('p1'); // handoff happens later, in the automatic cascade
    expect(result.state.turnNumber).toBe(5);
    expect(result.log).toHaveLength(1);
    expect(result.log[0].type).toBe('PHASE_CHANGED');
    expect(result.pendingChoices).toHaveLength(0);
  });
});
