import { describe, expect, it } from 'vitest';
import { applyTemplate } from '../../../cards/effectTemplates/catalog/factories';
import { runTimings } from '../interpreter';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDeckCards,
  putInHand,
} from '../../rules/shared/__tests__/testRig';

describe('returnHandShuffleDraw', () => {
  it('OP04-048 returns hand, shuffles, and draws equal count on play', () => {
    const sasakiDef = makeCharacterDef({ cardNumber: 'OP04-048' });
    const handDef = makeCharacterDef({ cardNumber: 'HAND-1', baseCost: 1 });
    const deckDef = makeCharacterDef({ cardNumber: 'DECK-1', baseCost: 2 });
    const program = applyTemplate('OP04-048', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'returnHandShuffleDraw' }],
    });

    let rig = buildBaseRig();
    rig = putDeckCards(rig, 'p1', deckDef, 10).rig;
    const withHand1 = putInHand(rig, 'p1', handDef);
    const withHand2 = putInHand(withHand1.rig, 'p1', makeCharacterDef({ cardNumber: 'HAND-2', baseCost: 1 }));
    const withChar = putCharacterInPlay(withHand2.rig, 'p1', sasakiDef);
    rig = { ...withChar.rig, defs: { ...withChar.rig.defs, [sasakiDef.cardDefinitionId]: sasakiDef, [handDef.cardDefinitionId]: handDef } };

    const handBefore = 2;
    const deckBefore = 10;
    expect(rig.state.players.p1.hand.cardIds).toHaveLength(handBefore);
    expect(rig.state.players.p1.deck.cardIds).toHaveLength(deckBefore);

    const fired = runTimings(program, ['onPlay'], rig.state, withChar.instanceId, rig.defs, 'test', {
      [sasakiDef.cardDefinitionId]: program,
    });

    expect(fired.state.players.p1.hand.cardIds).toHaveLength(handBefore);
    expect(fired.state.players.p1.deck.cardIds).toHaveLength(deckBefore);
    for (const id of fired.state.players.p1.hand.cardIds) {
      expect(fired.state.cardsById[id].currentZone).toBe('hand');
    }
    for (const id of fired.state.players.p1.deck.cardIds) {
      expect(fired.state.cardsById[id].currentZone).toBe('deck');
    }
    const allIds = [...fired.state.players.p1.hand.cardIds, ...fired.state.players.p1.deck.cardIds].sort();
    const beforeIds = [...rig.state.players.p1.hand.cardIds, ...rig.state.players.p1.deck.cardIds].sort();
    expect(allIds).toEqual(beforeIds);
  });

  it('OP06-047 returns opponent hand and draws fixed 5', () => {
    const puddingDef = makeCharacterDef({ cardNumber: 'OP06-047' });
    const oppHandDef = makeCharacterDef({ cardNumber: 'OPP-HAND-1' });
    const oppDeckDef = makeCharacterDef({ cardNumber: 'OPP-DECK-1' });
    const program = applyTemplate('OP06-047', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'returnHandShuffleDraw', player: 'opponent', drawAmount: 5 }],
    });

    let rig = buildBaseRig();
    rig = putDeckCards(rig, 'p2', oppDeckDef, 12).rig;
    const withOppHand = putInHand(rig, 'p2', oppHandDef);
    const withChar = putCharacterInPlay(withOppHand.rig, 'p1', puddingDef);
    rig = { ...withChar.rig, defs: { ...withChar.rig.defs, [puddingDef.cardDefinitionId]: puddingDef, [oppHandDef.cardDefinitionId]: oppHandDef } };

    const fired = runTimings(program, ['onPlay'], rig.state, withChar.instanceId, rig.defs, 'test', {
      [puddingDef.cardDefinitionId]: program,
    });

    expect(fired.state.players.p2.hand.cardIds).toHaveLength(5);
    expect(fired.state.players.p2.deck.cardIds).toHaveLength(8);
  });
});
