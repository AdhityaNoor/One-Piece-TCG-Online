import { describe, expect, it } from 'vitest';
import { applyTemplate } from '../../../cards/effectTemplates/catalog/factories';
import { resumeProgram, runTimings } from '../interpreter';
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

  it('P-046 optional bottom path places hand under deck in order then draws equal', () => {
    const yamatoDef = makeCharacterDef({ cardNumber: 'P-046' });
    const handA = makeCharacterDef({ cardNumber: 'HAND-A', baseCost: 1 });
    const handB = makeCharacterDef({ cardNumber: 'HAND-B', baseCost: 1 });
    const deckDef = makeCharacterDef({ cardNumber: 'DECK-1', baseCost: 2 });
    const program = applyTemplate('P-046', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'returnHandShuffleDraw', destination: 'bottom', optional: true }],
    });

    let rig = buildBaseRig();
    const decked = putDeckCards(rig, 'p1', deckDef, 3);
    rig = decked.rig;
    const deckTopIds = [...rig.state.players.p1.deck.cardIds];
    const withHand1 = putInHand(rig, 'p1', handA);
    const withHand2 = putInHand(withHand1.rig, 'p1', handB);
    const handIds = [...withHand2.rig.state.players.p1.hand.cardIds];
    const withChar = putCharacterInPlay(withHand2.rig, 'p1', yamatoDef);
    rig = { ...withChar.rig, defs: { ...withChar.rig.defs, [yamatoDef.cardDefinitionId]: yamatoDef } };

    const fired = runTimings(program, ['onPlay'], rig.state, withChar.instanceId, rig.defs, 'test', {
      [yamatoDef.cardDefinitionId]: program,
    });
    const choice = fired.state.pendingChoices[0];
    expect(choice?.kind).toBe('SELECT_OPTION');
    expect(choice?.constraints.options?.map((o) => o.label)).toEqual(['skip', 'return']);

    const resolved = resumeProgram(program, fired.state, choice, 1, rig.defs, 'test', {
      [yamatoDef.cardDefinitionId]: program,
    }).state;

    expect(resolved.players.p1.hand.cardIds).toHaveLength(2);
    expect(resolved.players.p1.deck.cardIds).toHaveLength(3);
    // Draw is from the top: former deck top becomes the new hand.
    expect(resolved.players.p1.hand.cardIds).toEqual(deckTopIds.slice(0, 2));
    // Remaining deck: leftover original top, then former hand in hand order at the bottom.
    expect(resolved.players.p1.deck.cardIds).toEqual([deckTopIds[2], ...handIds]);
  });

  it('P-046 optional skip leaves hand and deck unchanged', () => {
    const yamatoDef = makeCharacterDef({ cardNumber: 'P-046' });
    const handDef = makeCharacterDef({ cardNumber: 'HAND-1', baseCost: 1 });
    const deckDef = makeCharacterDef({ cardNumber: 'DECK-1', baseCost: 2 });
    const program = applyTemplate('P-046', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'returnHandShuffleDraw', destination: 'bottom', optional: true }],
    });

    let rig = buildBaseRig();
    rig = putDeckCards(rig, 'p1', deckDef, 4).rig;
    const withHand = putInHand(rig, 'p1', handDef);
    const withChar = putCharacterInPlay(withHand.rig, 'p1', yamatoDef);
    rig = { ...withChar.rig, defs: { ...withChar.rig.defs, [yamatoDef.cardDefinitionId]: yamatoDef } };
    const handBefore = [...rig.state.players.p1.hand.cardIds];
    const deckBefore = [...rig.state.players.p1.deck.cardIds];

    const fired = runTimings(program, ['onPlay'], rig.state, withChar.instanceId, rig.defs, 'test', {
      [yamatoDef.cardDefinitionId]: program,
    });
    const resolved = resumeProgram(program, fired.state, fired.state.pendingChoices[0], 0, rig.defs, 'test', {
      [yamatoDef.cardDefinitionId]: program,
    }).state;

    expect(resolved.players.p1.hand.cardIds).toEqual(handBefore);
    expect(resolved.players.p1.deck.cardIds).toEqual(deckBefore);
  });
});
