import { describe, expect, it } from 'vitest';
import { createSampleGameState } from '../__fixtures__/sampleGameState';

describe('GameState schema (blueprint Section 20)', () => {
  it('round-trips through JSON.stringify/parse without loss', () => {
    const state = createSampleGameState();
    const roundTripped = JSON.parse(JSON.stringify(state));
    expect(roundTripped).toEqual(state);
  });

  it('contains no functions or undefined-valued keys anywhere in the tree', () => {
    const state = createSampleGameState();

    const walk = (value: unknown): void => {
      if (typeof value === 'function') {
        throw new Error('GameState must not contain functions');
      }
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (value !== null && typeof value === 'object') {
        for (const [key, v] of Object.entries(value)) {
          if (v === undefined) {
            throw new Error(`GameState must not contain undefined values (key: ${key})`);
          }
          walk(v);
        }
      }
    };

    walk(state);
  });

  it('every zone referenced by a player is a flat id list (no nested CardInstance objects)', () => {
    const state = createSampleGameState();
    for (const player of Object.values(state.players)) {
      for (const zone of [
        player.deck,
        player.donDeck,
        player.hand,
        player.characterArea,
        player.stageArea,
        player.costArea,
        player.trash,
        player.lifeArea,
      ]) {
        for (const cardId of zone.cardIds) {
          expect(typeof cardId).toBe('string');
        }
      }
    }
  });
});
