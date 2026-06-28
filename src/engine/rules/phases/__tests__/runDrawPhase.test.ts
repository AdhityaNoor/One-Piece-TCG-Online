import { describe, expect, it } from 'vitest';
import { runDrawPhase } from '../runDrawPhase';
import { buildBaseRig, putDeckCards, makeCharacterDef } from '../../shared/__tests__/testRig';

describe('runDrawPhase', () => {
  it('skips the draw for the player going first on turn 1 (isFirstTurnOfGame)', () => {
    const base = buildBaseRig({ phase: 'draw', activePlayerId: 'p1', turnNumber: 1, isFirstTurnOfGame: true });
    const { rig } = putDeckCards(base, 'p1', makeCharacterDef(), 5);
    const handSizeBefore = rig.state.players.p1.hand.cardIds.length;

    const result = runDrawPhase(rig.state);

    expect(result.state.players.p1.hand.cardIds).toHaveLength(handSizeBefore);
    expect(result.state.players.p1.deck.cardIds).toHaveLength(5);
    expect(result.state.currentPhase).toBe('don');
    expect(result.state.gameOver).toBeNull();
    expect(result.log).toHaveLength(1);
    expect(result.log[0].data).toMatchObject({ skipped: true });
  });

  it('draws exactly 1 card from the top of the deck into hand on a normal turn', () => {
    const base = buildBaseRig({ phase: 'draw', activePlayerId: 'p1', turnNumber: 3 });
    const { rig, deckIds } = putDeckCards(base, 'p1', makeCharacterDef(), 5);
    const topId = deckIds[0];

    const result = runDrawPhase(rig.state);

    expect(result.state.players.p1.deck.cardIds).toHaveLength(4);
    expect(result.state.players.p1.deck.cardIds).not.toContain(topId);
    expect(result.state.players.p1.hand.cardIds).toContain(topId);
    expect(result.state.cardsById[topId].currentZone).toBe('hand');
    expect(result.state.currentPhase).toBe('don');
    expect(result.log[0].type).toBe('CARD_DRAWN');
  });

  it('an empty deck on a normal turn ends the game by decking out', () => {
    const { state } = buildBaseRig({ phase: 'draw', activePlayerId: 'p1', turnNumber: 3 });
    // p1's deck is empty by default in buildBaseRig.

    const result = runDrawPhase(state);

    expect(result.state.gameOver).toEqual({ winnerId: 'p2', reason: 'deckedOut' });
    expect(result.log[0].type).toBe('GAME_OVER');
  });
});
