import { describe, expect, it } from 'vitest';
import { executeAction } from '../../../engine/actions';
import { computeCurrentPower, hasContinuousKeyword } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDeckCards, putDon, putLifeCards, nextTestId } from '../../../engine/rules/shared/__tests__/testRig';
import { buildCuratedEffectRegistry } from '../curatedPrograms';

describe('ST07 yellow Life manipulation families', () => {
  it('wires ST07-004 optional Life payment into Banish and +1000 during battle', () => {
    const snack = makeCharacterDef({
      cardDefinitionId: 'ST07-004',
      cardNumber: 'ST07-004',
      name: 'Charlotte Snack',
      category: 'character',
      baseCost: 5,
      basePower: 6000,
    });
    const life = makeCharacterDef({ cardDefinitionId: 'TEST-LIFE', cardNumber: 'TEST-LIFE', name: 'Life' });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let snackId: string;
    let lifeId: string;
    ({ rig, instanceId: snackId } = putCharacterInPlay(rig, 'p1', snack, { summoningSick: false }));
    ({ rig, lifeIds: [lifeId] } = putLifeCards(rig, 'p1', [life]));
    const withDon = putDon(rig, 'p1', 1);
    rig = {
      ...withDon.rig,
      state: {
        ...withDon.rig.state,
        cardsById: {
          ...withDon.rig.state.cardsById,
          [snackId]: { ...withDon.rig.state.cardsById[snackId], donAttached: withDon.donIds },
        },
      },
    };

    const registry = buildCuratedEffectRegistry(rig.defs);
    const attack = executeAction(
      rig.state,
      { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: snackId, targetInstanceId: rig.state.players.p2.leaderInstanceId },
      rig.defs,
      registry,
    );
    const choice = attack.state.pendingChoices[0];
    expect(choice).toMatchObject({ constraints: { min: 0, max: 1, candidateInstanceIds: [lifeId] } });

    const paid = executeAction(
      attack.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [lifeId] },
      rig.defs,
      registry,
    );

    expect(paid.state.players.p1.hand.cardIds).toContain(lifeId);
    expect(computeCurrentPower(rig.defs, paid.state, snackId)).toBe(8000); // base 6000 + DON 1000 + effect 1000
    expect(hasContinuousKeyword(rig.defs, paid.state, snackId, 'banish')).toBe(true);
  });

  it('wires ST07-005 optional Life payment into optional deck-top-to-Life', () => {
    const daifuku = makeCharacterDef({
      cardDefinitionId: 'ST07-005',
      cardNumber: 'ST07-005',
      name: 'Charlotte Daifuku',
      category: 'character',
      baseCost: 4,
      basePower: 5000,
    });
    const life = makeCharacterDef({ cardDefinitionId: 'TEST-LIFE-2', cardNumber: 'TEST-LIFE-2', name: 'Life' });
    const deckTop = makeCharacterDef({ cardDefinitionId: 'TEST-DECK-TOP', cardNumber: 'TEST-DECK-TOP', name: 'Deck Top' });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let daifukuId: string;
    let lifeId: string;
    let deckTopId: string;
    ({ rig, instanceId: daifukuId } = putCharacterInPlay(rig, 'p1', daifuku, { summoningSick: false }));
    ({ rig, lifeIds: [lifeId] } = putLifeCards(rig, 'p1', [life]));
    ({ rig, deckIds: [deckTopId] } = putDeckCards(rig, 'p1', deckTop, 1));
    const withDon = putDon(rig, 'p1', 1);
    rig = {
      ...withDon.rig,
      state: {
        ...withDon.rig.state,
        cardsById: {
          ...withDon.rig.state.cardsById,
          [daifukuId]: { ...withDon.rig.state.cardsById[daifukuId], donAttached: withDon.donIds },
        },
      },
    };

    const registry = buildCuratedEffectRegistry(rig.defs);
    const attack = executeAction(
      rig.state,
      { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: daifukuId, targetInstanceId: rig.state.players.p2.leaderInstanceId },
      rig.defs,
      registry,
    );
    const lifeChoice = attack.state.pendingChoices[0];
    const paid = executeAction(
      attack.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: lifeChoice.id, response: [lifeId] },
      rig.defs,
      registry,
    );
    const deckChoice = paid.state.pendingChoices[0];
    expect(deckChoice).toMatchObject({ constraints: { min: 0, max: 1, candidateInstanceIds: [deckTopId] } });

    const added = executeAction(
      paid.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: deckChoice.id, response: [deckTopId] },
      rig.defs,
      registry,
    );

    expect(added.state.players.p1.lifeArea.cardIds[0]).toBe(deckTopId);
    expect(added.state.players.p1.deck.cardIds).not.toContain(deckTopId);
    expect(added.state.players.p1.hand.cardIds).toContain(lifeId);
  });

  it('wires ST07-011 and ST07-013 named Charlotte Linlin keyword grants', () => {
    const zeus = makeCharacterDef({ cardDefinitionId: 'ST07-011', cardNumber: 'ST07-011', name: 'Zeus', category: 'character', baseCost: 3, basePower: 3000 });
    const prometheus = makeCharacterDef({ cardDefinitionId: 'ST07-013', cardNumber: 'ST07-013', name: 'Prometheus', category: 'character', baseCost: 3, basePower: 3000 });
    const linlin = makeCharacterDef({ cardDefinitionId: 'TEST-LINLIN', cardNumber: 'TEST-LINLIN', name: 'Charlotte Linlin', category: 'character', baseCost: 7, basePower: 8000 });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let zeusId: string;
    let prometheusId: string;
    let linlinId: string;
    ({ rig, instanceId: zeusId } = putCharacterInPlay(rig, 'p1', zeus));
    ({ rig, instanceId: prometheusId } = putCharacterInPlay(rig, 'p1', prometheus));
    ({ rig, instanceId: linlinId } = putCharacterInPlay(rig, 'p1', linlin));

    const registry = buildCuratedEffectRegistry(rig.defs);
    const zeusActivated = executeAction(
      rig.state,
      { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: zeusId, effectId: 'activateMain', donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const zeusChoice = zeusActivated.state.pendingChoices[0];
    expect(zeusChoice.constraints.candidateInstanceIds).toEqual([linlinId]);
    const banishGranted = executeAction(
      zeusActivated.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: zeusChoice.id, response: [linlinId] },
      rig.defs,
      registry,
    );
    expect(hasContinuousKeyword(rig.defs, banishGranted.state, linlinId, 'banish')).toBe(true);

    const prometheusActivated = executeAction(
      banishGranted.state,
      { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: prometheusId, effectId: 'activateMain', donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const prometheusChoice = prometheusActivated.state.pendingChoices[0];
    const doubleAttackGranted = executeAction(
      prometheusActivated.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: prometheusChoice.id, response: [linlinId] },
      rig.defs,
      registry,
    );
    expect(hasContinuousKeyword(rig.defs, doubleAttackGranted.state, linlinId, 'doubleAttack')).toBe(true);
  });
});
