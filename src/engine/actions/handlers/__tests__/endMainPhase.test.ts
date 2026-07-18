import { describe, expect, it } from 'vitest';
import { validateEndMainPhase, executeEndMainPhase } from '../endMainPhase';
import type { EndMainPhaseAction } from '../../action';
import { buildBaseRig, makeCharacterDef, nextTestId, putDeckCards } from '../../../rules/shared/__tests__/testRig';

function endMainPhaseAction(playerId: string): EndMainPhaseAction {
  return { type: 'END_MAIN_PHASE', actionId: nextTestId('action'), playerId };
}

/** Main Phase end now runs 9-2-1-2 — seed both decks so handoff tests stay alive. */
function mainPhaseRig(options: Parameters<typeof buildBaseRig>[0] = {}) {
  let rig = buildBaseRig({ phase: 'main', ...options });
  ({ rig } = putDeckCards(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'DECK-P1' }), 3));
  ({ rig } = putDeckCards(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'DECK-P2' }), 3));
  return rig;
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
    const { state } = mainPhaseRig({ activePlayerId: 'p1', turnNumber: 5 });
    const result = executeEndMainPhase(state, endMainPhaseAction('p1'));

    expect(result.state.gameOver).toBeNull();
    expect(result.state.currentPhase).toBe('end');
    expect(result.state.activePlayerId).toBe('p1'); // handoff happens later, in the automatic cascade
    expect(result.state.turnNumber).toBe(5);
    expect(result.log).toHaveLength(1);
    expect(result.log[0].type).toBe('PHASE_CHANGED');
    expect(result.pendingChoices).toHaveLength(0);
  });

  it('ends the game when a player has 0 cards in deck (9-2-1-2)', () => {
    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    ({ rig } = putDeckCards(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'DECK-P2' }), 3));
    // p1 empty
    const result = executeEndMainPhase(rig.state, endMainPhaseAction('p1'));
    expect(result.state.gameOver).toEqual({ winnerId: 'p2', reason: 'deckedOut' });
    expect(result.state.currentPhase).toBe('main');
  });
});
