import { describe, expect, it } from 'vitest';
import { runEndPhaseAndHandoff } from '../runEndPhaseAndHandoff';
import { buildBaseRig } from '../../shared/__tests__/testRig';

describe('runEndPhaseAndHandoff', () => {
  it('hands the turn to the other player, increments turnNumber, resets to the Refresh Phase, and clears isFirstTurnOfGame', () => {
    const { state } = buildBaseRig({ phase: 'end', activePlayerId: 'p1', turnNumber: 1, isFirstTurnOfGame: true });

    const result = runEndPhaseAndHandoff(state);

    expect(result.state.activePlayerId).toBe('p2');
    expect(result.state.turnNumber).toBe(2);
    expect(result.state.currentPhase).toBe('refresh');
    expect(result.state.isFirstTurnOfGame).toBe(false);
  });

  it('expires "duringThisTurn"/"endOfTurn" continuous effects but keeps other durations', () => {
    const { state } = buildBaseRig({ phase: 'end', activePlayerId: 'p1', turnNumber: 3 });
    const stateWithEffects = {
      ...state,
      continuousEffects: [
        { id: 'e1', sourceInstanceId: 'x', ownerId: 'p1', duration: 'endOfTurn' as const, description: 'expires' },
        { id: 'e2', sourceInstanceId: 'x', ownerId: 'p1', duration: 'duringThisTurn' as const, description: 'expires' },
        { id: 'e3', sourceInstanceId: 'x', ownerId: 'p1', duration: 'permanent' as const, description: 'stays' },
        { id: 'e4', sourceInstanceId: 'x', ownerId: 'p1', duration: 'untilStartOfNextTurn' as const, description: 'stays' },
      ],
    };

    const result = runEndPhaseAndHandoff(stateWithEffects);

    expect(result.state.continuousEffects.map((e) => e.id)).toEqual(['e3', 'e4']);
  });

  it('logs PHASE_CHANGED then TURN_PASSED', () => {
    const { state } = buildBaseRig({ phase: 'end', activePlayerId: 'p1', turnNumber: 3 });

    const result = runEndPhaseAndHandoff(state);

    expect(result.log.map((e) => e.type)).toEqual(['PHASE_CHANGED', 'TURN_PASSED']);
  });

  it('works symmetrically when p2 is the active player', () => {
    const { state } = buildBaseRig({ phase: 'end', activePlayerId: 'p2', turnNumber: 4 });

    const result = runEndPhaseAndHandoff(state);

    expect(result.state.activePlayerId).toBe('p1');
    expect(result.state.turnNumber).toBe(5);
  });
});
