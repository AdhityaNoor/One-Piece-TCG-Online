import { describe, expect, it } from 'vitest';
import { runDonPhase } from '../runDonPhase';
import { buildBaseRig, putDonDeckCards } from '../../shared/__tests__/testRig';

describe('runDonPhase', () => {
  it('adds 2 DON!! from the DON!! deck to the cost area on a normal turn', () => {
    const base = buildBaseRig({ phase: 'don', activePlayerId: 'p1', turnNumber: 3, isFirstTurnOfGame: false });
    const { rig, donDeckIds } = putDonDeckCards(base, 'p1', 10);

    const result = runDonPhase(rig.state);

    expect(result.state.players.p1.costArea.cardIds).toHaveLength(2);
    expect(result.state.players.p1.donDeck.cardIds).toHaveLength(8);
    const movedIds = result.state.players.p1.costArea.cardIds;
    for (const id of movedIds) {
      expect(donDeckIds).toContain(id);
      expect(result.state.cardsById[id].currentZone).toBe('costArea');
      expect(result.state.cardsById[id].faceState).toBe('faceUp');
      expect(result.state.cardsById[id].donRested).toBe(false);
    }
    expect(result.state.currentPhase).toBe('main');
    expect(result.log[0].type).toBe('CARD_MOVED');
    expect(result.log[0].data).toMatchObject({ count: 2 });
  });

  it('only adds 1 DON!! for the player going first on turn 1 (isFirstTurnOfGame)', () => {
    const base = buildBaseRig({ phase: 'don', activePlayerId: 'p1', turnNumber: 1, isFirstTurnOfGame: true });
    const { rig } = putDonDeckCards(base, 'p1', 10);

    const result = runDonPhase(rig.state);

    expect(result.state.players.p1.costArea.cardIds).toHaveLength(1);
    expect(result.state.players.p1.donDeck.cardIds).toHaveLength(9);
    expect(result.log[0].data).toMatchObject({ count: 1 });
  });

  it('caps at however many DON!! remain in the DON!! deck', () => {
    const base = buildBaseRig({ phase: 'don', activePlayerId: 'p1', turnNumber: 3, isFirstTurnOfGame: false });
    const { rig } = putDonDeckCards(base, 'p1', 1);

    const result = runDonPhase(rig.state);

    expect(result.state.players.p1.costArea.cardIds).toHaveLength(1);
    expect(result.state.players.p1.donDeck.cardIds).toHaveLength(0);
    expect(result.log[0].data).toMatchObject({ count: 1 });
  });

  it('does not touch the opponent', () => {
    const base = buildBaseRig({ phase: 'don', activePlayerId: 'p1', turnNumber: 3 });
    const { rig } = putDonDeckCards(base, 'p2', 10);
    const before = rig.state.players.p2.donDeck.cardIds.length;

    const result = runDonPhase(rig.state);

    expect(result.state.players.p2.donDeck.cardIds).toHaveLength(before);
    expect(result.state.players.p2.costArea.cardIds).toHaveLength(0);
  });
});
