import { describe, expect, it } from 'vitest';
import { validateConcede, executeConcede } from '../concede';
import type { ConcedeAction } from '../../action';
import { buildBaseRig, nextTestId } from '../../../rules/shared/__tests__/testRig';

function concedeAction(playerId: string): ConcedeAction {
  return { type: 'CONCEDE', actionId: nextTestId('action'), playerId };
}

describe('validateConcede', () => {
  it('is legal in any phase', () => {
    for (const phase of ['setup', 'refresh', 'draw', 'don', 'main', 'end'] as const) {
      const { state } = buildBaseRig({ phase });
      expect(validateConcede(state, concedeAction('p1')).legal).toBe(true);
    }
  });

  it('rejects an unknown playerId', () => {
    const { state } = buildBaseRig();
    expect(validateConcede(state, concedeAction('p-ghost')).legal).toBe(false);
  });

  it('rejects once the game has already ended', () => {
    const { state } = buildBaseRig();
    const overState = { ...state, gameOver: { winnerId: 'p2', reason: 'concession' as const } };
    expect(validateConcede(overState, concedeAction('p1')).legal).toBe(false);
  });
});

describe('executeConcede', () => {
  it('sets gameOver with the OTHER player as winner and reason "concession"', () => {
    const { state } = buildBaseRig();
    const result = executeConcede(state, concedeAction('p1'));
    expect(result.state.gameOver).toEqual({ winnerId: 'p2', reason: 'concession' });
    expect(result.log).toHaveLength(1);
    expect(result.log[0].type).toBe('GAME_OVER');
    expect(result.pendingChoices).toHaveLength(0);
  });

  it('works symmetrically for the other player', () => {
    const { state } = buildBaseRig();
    const result = executeConcede(state, concedeAction('p2'));
    expect(result.state.gameOver).toEqual({ winnerId: 'p1', reason: 'concession' });
  });
});
