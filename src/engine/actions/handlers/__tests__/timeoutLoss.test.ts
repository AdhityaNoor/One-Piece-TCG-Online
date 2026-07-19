import { describe, expect, it } from 'vitest';
import { validateTimeoutLoss, executeTimeoutLoss } from '../timeoutLoss';
import type { TimeoutLossAction } from '../../action';
import { buildBaseRig, nextTestId } from '../../../rules/shared/__tests__/testRig';

function timeoutAction(playerId: string): TimeoutLossAction {
  return { type: 'TIMEOUT_LOSS', actionId: nextTestId('action'), playerId };
}

describe('validateTimeoutLoss', () => {
  it('is legal in any phase', () => {
    for (const phase of ['setup', 'refresh', 'draw', 'don', 'main', 'end'] as const) {
      const { state } = buildBaseRig({ phase });
      expect(validateTimeoutLoss(state, timeoutAction('p1')).legal).toBe(true);
    }
  });

  it('rejects an unknown playerId', () => {
    const { state } = buildBaseRig();
    expect(validateTimeoutLoss(state, timeoutAction('p-ghost')).legal).toBe(false);
  });

  it('rejects once the game has already ended', () => {
    const { state } = buildBaseRig();
    const overState = { ...state, gameOver: { winnerId: 'p2', reason: 'concession' as const } };
    expect(validateTimeoutLoss(overState, timeoutAction('p1')).legal).toBe(false);
  });
});

describe('executeTimeoutLoss', () => {
  it('sets gameOver with the OTHER player as winner and reason "timeout"', () => {
    const { state } = buildBaseRig();
    const result = executeTimeoutLoss(state, timeoutAction('p1'));
    expect(result.state.gameOver).toEqual({ winnerId: 'p2', reason: 'timeout' });
    expect(result.log).toHaveLength(1);
    expect(result.log[0].type).toBe('GAME_OVER');
    expect(result.pendingChoices).toHaveLength(0);
  });

  it('works symmetrically for the other player', () => {
    const { state } = buildBaseRig();
    const result = executeTimeoutLoss(state, timeoutAction('p2'));
    expect(result.state.gameOver).toEqual({ winnerId: 'p1', reason: 'timeout' });
  });

  it('is distinguishable from a concession (different reason string)', () => {
    const { state } = buildBaseRig();
    const result = executeTimeoutLoss(state, timeoutAction('p1'));
    expect(result.state.gameOver?.reason).not.toBe('concession');
  });
});
