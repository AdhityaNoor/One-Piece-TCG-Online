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

  it('expires "endOfOpponentsTurn" effects only in the modifier owner\'s OPPONENT\'s End Phase', () => {
    const { state } = buildBaseRig({ phase: 'end', activePlayerId: 'p1', turnNumber: 3 });
    const stateWithEffects = {
      ...state,
      continuousEffects: [
        // Cast by p1 (ownerId 'p1'), restricting one of p2's Characters — expires at the end of p2's turn.
        { id: 'e-restrict', sourceInstanceId: 'x', ownerId: 'p1', duration: 'endOfOpponentsTurn' as const, description: 'cannot attack' },
      ],
    };

    // p1's own End Phase: the modifier owner's opponent (p2) has not had their turn yet — stays.
    const afterOwnEndPhase = runEndPhaseAndHandoff(stateWithEffects);
    expect(afterOwnEndPhase.state.continuousEffects.map((e) => e.id)).toEqual(['e-restrict']);

    // p2's End Phase (the owner's opponent) — now it expires.
    const p2Ending = { ...afterOwnEndPhase.state, currentPhase: 'end' as const };
    const afterOpponentEndPhase = runEndPhaseAndHandoff(p2Ending);
    expect(afterOpponentEndPhase.state.continuousEffects).toEqual([]);
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
