import { describe, expect, it } from 'vitest';
import { applyMovementPresentation } from './presentationHints';
import type { CardMovementSpec } from './types';

function spec(partial: Partial<CardMovementSpec>): CardMovementSpec {
  return {
    id: 's1',
    playerId: 'p1',
    cardDefinitionId: 'OP01-001',
    imageUrl: null,
    faceDown: true,
    isDon: false,
    from: { zone: 'deck' },
    to: { zone: 'hand', instanceId: 'c1' },
    suppressInstanceId: 'c1',
    revealFaceOnLand: false,
    delayMs: 0,
    ...partial,
  };
}

describe('applyMovementPresentation', () => {
  it('reveals face on land in hotseat hand flights', () => {
    const result = applyMovementPresentation([spec({})], null);
    expect(result[0]?.revealFaceOnLand).toBe(true);
  });

  it('only reveals for the local seat in casual mode', () => {
    const result = applyMovementPresentation(
      [spec({ playerId: 'p1' }), spec({ playerId: 'p2', suppressInstanceId: 'c2', to: { zone: 'hand', instanceId: 'c2' } })],
      'p1',
    );
    expect(result[0]?.revealFaceOnLand).toBe(true);
    expect(result[1]?.revealFaceOnLand).toBe(false);
  });
});
