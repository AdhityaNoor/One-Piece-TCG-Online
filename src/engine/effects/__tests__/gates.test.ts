import { describe, expect, it } from 'vitest';
import { makeCharacterDef, makeStageDef, buildBaseRig, putCharacterInPlay, putStageInPlay, putDon, putLifeCards } from '../../rules/shared/__tests__/testRig';
import { evaluateGates } from '../gates';

describe('evaluateGates', () => {
  it('checks opponent Life count gates from the ability controller perspective', () => {
    let rig = buildBaseRig();
    const lifeCard = makeCharacterDef({ cardDefinitionId: 'TEST-LIFE', cardNumber: 'TEST-LIFE' });
    ({ rig } = putLifeCards(rig, 'p2', [lifeCard]));

    expect(evaluateGates([{ kind: 'opponentLife', atMost: 1 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'opponentLife', atMost: 0 }], rig.state, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'opponentLife', atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(true);
  });

  it('checks whether the controller has a face-up Life card', () => {
    let rig = buildBaseRig();
    const lifeCard = makeCharacterDef({ cardDefinitionId: 'TEST-LIFE', cardNumber: 'TEST-LIFE' });
    ({ rig } = putLifeCards(rig, 'p1', [lifeCard, lifeCard]));
    expect(evaluateGates([{ kind: 'selfHasFaceUpLife' }], rig.state, rig.defs, 'p1')).toBe(false);

    const [lifeId] = rig.state.players.p1.lifeArea.cardIds;
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [lifeId]: { ...rig.state.cardsById[lifeId], faceState: 'faceUp' },
        },
      },
    };
    expect(evaluateGates([{ kind: 'selfHasFaceUpLife' }], rig.state, rig.defs, 'p1')).toBe(true);
  });

  it('checks face-up Life from the ability controller perspective', () => {
    let rig = buildBaseRig();
    const lifeCard = makeCharacterDef({ cardDefinitionId: 'TEST-LIFE', cardNumber: 'TEST-LIFE' });
    ({ rig } = putLifeCards(rig, 'p2', [lifeCard]));
    const [opponentLifeId] = rig.state.players.p2.lifeArea.cardIds;
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [opponentLifeId]: { ...rig.state.cardsById[opponentLifeId], faceState: 'faceUp' },
        },
      },
    };
    expect(evaluateGates([{ kind: 'selfHasFaceUpLife' }], rig.state, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'selfHasFaceUpLife' }], rig.state, rig.defs, 'p2')).toBe(true);
  });

  it('checks DON!! field count including attached DON!!', () => {
    let rig = buildBaseRig();
    const withDon = putDon(rig, 'p1', 2);
    rig = withDon.rig;
    const firstDon = withDon.donIds[0];
    const { rig: withCharacter, instanceId } = putCharacterInPlay(rig, 'p1', makeCharacterDef(), { donAttached: [firstDon] });
    rig = {
      ...withCharacter,
      state: {
        ...withCharacter.state,
        players: {
          ...withCharacter.state.players,
          p1: {
            ...withCharacter.state.players.p1,
            costArea: { ...withCharacter.state.players.p1.costArea, cardIds: withCharacter.state.players.p1.costArea.cardIds.filter((id) => id !== firstDon) },
          },
        },
        cardsById: { ...withCharacter.state.cardsById, [firstDon]: { ...withCharacter.state.cardsById[firstDon], currentZone: 'characterArea' }, [instanceId]: { ...withCharacter.state.cardsById[instanceId], donAttached: [firstDon] } },
      },
    };

    expect(evaluateGates([{ kind: 'selfDonFieldCount', atMost: 2 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfDonFieldCount', atMost: 1 }], rig.state, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'selfDonFieldCount', atLeast: 2 }], rig.state, rig.defs, 'p1')).toBe(true);
  });

  it('checks selfPlayedThisTurn against the source instance, not just any of the owner\'s cards', () => {
    let rig = buildBaseRig({ turnNumber: 5 });
    let playedThisTurnId: string;
    ({ rig, instanceId: playedThisTurnId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'TEST-NEW' }), { enteredPlayTurn: 5 }));
    let playedEarlierId: string;
    ({ rig, instanceId: playedEarlierId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'TEST-OLD' }), { enteredPlayTurn: 3 }));

    expect(evaluateGates([{ kind: 'selfPlayedThisTurn' }], rig.state, rig.defs, 'p1', playedThisTurnId)).toBe(true);
    expect(evaluateGates([{ kind: 'selfPlayedThisTurn' }], rig.state, rig.defs, 'p1', playedEarlierId)).toBe(false);
    // No sourceInstanceId supplied -> cannot resolve "this Character", so the gate fails closed.
    expect(evaluateGates([{ kind: 'selfPlayedThisTurn' }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfBattledOpponentCharacterThisTurn on the source instance', () => {
    let rig = buildBaseRig({ turnNumber: 4 });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [leaderId]: { ...rig.state.cardsById[leaderId], battledOpponentCharacterTurn: 4 },
        },
      },
    };
    expect(evaluateGates([{ kind: 'selfBattledOpponentCharacterThisTurn' }], rig.state, rig.defs, 'p1', leaderId)).toBe(true);
    expect(evaluateGates([{ kind: 'selfBattledOpponentCharacterThisTurn' }], { ...rig.state, turnNumber: 5 }, rig.defs, 'p1', leaderId)).toBe(false);
  });

  it('checks leaderAttribute against the controller Leader definition', () => {
    let rig = buildBaseRig({ leaderOverridesP1: { attributes: ['slash'] } });
    expect(evaluateGates([{ kind: 'leaderAttribute', attribute: 'slash' }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'leaderAttribute', attribute: 'strike' }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks opponentLeaderAttribute against the opponent Leader definition', () => {
    let rig = buildBaseRig({ leaderOverridesP2: { attributes: ['slash'] } });
    expect(evaluateGates([{ kind: 'opponentLeaderAttribute', attribute: 'slash' }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'opponentLeaderAttribute', attribute: 'strike' }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfHasCharacterBasePowerAtLeast against printed base power on your Characters', () => {
    const base = buildBaseRig();
    const mid = putCharacterInPlay(base, 'p1', makeCharacterDef({ basePower: 6000 }));
    const big = putCharacterInPlay(mid.rig, 'p1', makeCharacterDef({ basePower: 7000 }));

    expect(evaluateGates([{ kind: 'selfHasCharacterBasePowerAtLeast', power: 7000 }], big.rig.state, big.rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfHasCharacterBasePowerAtLeast', power: 8000 }], big.rig.state, big.rig.defs, 'p1')).toBe(false);
  });

  it('checks selfAllCharactersTyped — all field Characters must match the type (empty field passes)', () => {
    let rig = buildBaseRig();
    expect(evaluateGates([{ kind: 'selfAllCharactersTyped', typeIncludes: 'East Blue' }], rig.state, rig.defs, 'p1')).toBe(true);

    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['East Blue'] })));
    expect(evaluateGates([{ kind: 'selfAllCharactersTyped', typeIncludes: 'East Blue' }], rig.state, rig.defs, 'p1')).toBe(true);

    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['Navy'] })));
    expect(evaluateGates([{ kind: 'selfAllCharactersTyped', typeIncludes: 'East Blue' }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfLeaderPowerAtMost against current Leader power', () => {
    let rig = buildBaseRig();
    const leaderId = rig.state.players.p1.leaderInstanceId!;
    rig = {
      ...rig,
      defs: {
        ...rig.defs,
        [rig.state.cardsById[leaderId].cardDefinitionId]: makeCharacterDef({
          cardDefinitionId: rig.state.cardsById[leaderId].cardDefinitionId,
          basePower: 5000,
        }),
      },
    };
    expect(evaluateGates([{ kind: 'selfLeaderPowerAtMost', power: 5000 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfLeaderPowerAtMost', power: 4999 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfLeaderPowerAtLeast against current Leader power', () => {
    let rig = buildBaseRig();
    const leaderId = rig.state.players.p1.leaderInstanceId!;
    rig = {
      ...rig,
      defs: {
        ...rig.defs,
        [rig.state.cardsById[leaderId].cardDefinitionId]: makeCharacterDef({
          cardDefinitionId: rig.state.cardsById[leaderId].cardDefinitionId,
          basePower: 5000,
        }),
      },
      state: {
        ...rig.state,
        continuousEffects: [{
          id: 'leader-boost',
          sourceInstanceId: leaderId,
          ownerId: 'p1',
          duration: 'permanent',
          description: '+2000',
          powerModifier: { appliesToInstanceId: leaderId, amount: 2000 },
        }],
      },
    };
    expect(evaluateGates([{ kind: 'selfLeaderPowerAtLeast', power: 7000 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfLeaderPowerAtLeast', power: 7001 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks leaderColor against the Leader definition colors', () => {
    let rig = buildBaseRig();
    const leaderId = rig.state.players.p1.leaderInstanceId!;
    rig = {
      ...rig,
      defs: {
        ...rig.defs,
        [rig.state.cardsById[leaderId].cardDefinitionId]: makeCharacterDef({
          cardDefinitionId: rig.state.cardsById[leaderId].cardDefinitionId,
          colors: ['blue'],
        }),
      },
    };

    expect(evaluateGates([{ kind: 'leaderColor', color: 'blue' }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'leaderColor', color: 'green' }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfTypedCharacterPowerAtLeast against current Character power and type', () => {
    let rig = buildBaseRig();
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['Sky Island'], basePower: 6000 })));
    expect(evaluateGates([{ kind: 'selfTypedCharacterPowerAtLeast', typeIncludes: 'Sky Island', power: 7000 }], rig.state, rig.defs, 'p1')).toBe(false);

    const charId = rig.state.players.p1.characterArea.cardIds[0];
    rig = {
      ...rig,
      state: {
        ...rig.state,
        continuousEffects: [
          {
            id: 'boost',
            sourceInstanceId: charId,
            ownerId: 'p1',
            duration: 'permanent',
            description: '+1000',
            powerModifier: { appliesToInstanceId: charId, amount: 1000 },
          },
        ],
      },
    };
    expect(evaluateGates([{ kind: 'selfTypedCharacterPowerAtLeast', typeIncludes: 'Sky Island', power: 7000 }], rig.state, rig.defs, 'p1')).toBe(true);
  });

  it('checks selfAnyTypedCharacterCount across alternative Character types', () => {
    let rig = buildBaseRig();
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['Amazon Lily'] })));
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['Kuja Pirates'] })));
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['Navy'] })));

    expect(evaluateGates([{ kind: 'selfAnyTypedCharacterCount', anyOfTypes: ['Amazon Lily', 'Kuja Pirates'], atLeast: 2 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfAnyTypedCharacterCount', anyOfTypes: ['Amazon Lily', 'Kuja Pirates'], atLeast: 3 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfAnyTypedCharacterCount rested filtering', () => {
    let rig = buildBaseRig();
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['Amazon Lily'] }), { orientation: 'rested' }));
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['Kuja Pirates'] })));

    expect(evaluateGates([{ kind: 'selfAnyTypedCharacterCount', anyOfTypes: ['Amazon Lily', 'Kuja Pirates'], rested: true, atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfAnyTypedCharacterCount', anyOfTypes: ['Amazon Lily', 'Kuja Pirates'], rested: true, atLeast: 2 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfRestedCardCount across Leader, Characters, Stage, and cost-area DON!!', () => {
    let rig = buildBaseRig();
    const leaderId = rig.state.players.p1.leaderInstanceId;
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef(), { orientation: 'rested' }));
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef(), { orientation: 'active' }));
    ({ rig } = putStageInPlay(rig, 'p1', makeStageDef(), { orientation: 'rested' }));
    ({ rig } = putDon(rig, 'p1', 1, { rested: true }));
    ({ rig } = putDon(rig, 'p1', 1, { rested: false }));
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [leaderId]: { ...rig.state.cardsById[leaderId], orientation: 'rested' },
        },
      },
    };

    expect(evaluateGates([{ kind: 'selfRestedCardCount', atLeast: 4 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfRestedCardCount', atLeast: 5 }], rig.state, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'selfRestedCardCount', atMost: 4 }], rig.state, rig.defs, 'p1')).toBe(true);
  });

  it('checks combinedLifeTotal as the sum of both players Life counts', () => {
    let rig = buildBaseRig();
    const lifeCard = makeCharacterDef({ cardDefinitionId: 'LIFE', cardNumber: 'LIFE' });
    ({ rig } = putLifeCards(rig, 'p1', [lifeCard, lifeCard, lifeCard]));
    ({ rig } = putLifeCards(rig, 'p2', [lifeCard, lifeCard]));
    expect(evaluateGates([{ kind: 'combinedLifeTotal', atMost: 5 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'combinedLifeTotal', atMost: 4 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfInstancePowerAtLeast against the source card current power', () => {
    let rig = buildBaseRig();
    let charId: string;
    ({ rig, instanceId: charId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ basePower: 6000 })));
    expect(evaluateGates([{ kind: 'selfInstancePowerAtLeast', power: 7000 }], rig.state, rig.defs, 'p1', charId)).toBe(false);
    rig = {
      ...rig,
      state: {
        ...rig.state,
        continuousEffects: [{
          id: 'boost',
          sourceInstanceId: charId,
          ownerId: 'p1',
          duration: 'permanent',
          description: '+1000',
          powerModifier: { appliesToInstanceId: charId, amount: 1000 },
        }],
      },
    };
    expect(evaluateGates([{ kind: 'selfInstancePowerAtLeast', power: 7000 }], rig.state, rig.defs, 'p1', charId)).toBe(true);
  });

  it('checks selfOtherCharacterPowerAtLeast against current power while excluding the source', () => {
    let rig = buildBaseRig();
    let sourceId: string;
    let otherId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ basePower: 7000 })));
    ({ rig, instanceId: otherId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ basePower: 6000 })));

    expect(evaluateGates([{ kind: 'selfOtherCharacterPowerAtLeast', power: 7000 }], rig.state, rig.defs, 'p1', sourceId)).toBe(false);

    rig = {
      ...rig,
      state: {
        ...rig.state,
        continuousEffects: [{
          id: 'boost-other',
          sourceInstanceId: sourceId,
          ownerId: 'p1',
          duration: 'permanent',
          description: '+1000',
          powerModifier: { appliesToInstanceId: otherId, amount: 1000 },
        }],
      },
    };
    expect(evaluateGates([{ kind: 'selfOtherCharacterPowerAtLeast', power: 7000 }], rig.state, rig.defs, 'p1', sourceId)).toBe(true);
  });

  it('checks opponentCharacterCurrentPowerCount against live opponent Character power', () => {
    let rig = buildBaseRig();
    let boostedId: string;
    ({ rig, instanceId: boostedId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 4000 })));
    ({ rig } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 3000 })));
    expect(evaluateGates([{ kind: 'opponentCharacterCurrentPowerCount', power: 5000, atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(false);
    rig = {
      ...rig,
      state: {
        ...rig.state,
        continuousEffects: [{
          id: 'opponent-character-boost',
          sourceInstanceId: boostedId,
          ownerId: 'p2',
          duration: 'permanent',
          description: '+1000',
          powerModifier: { appliesToInstanceId: boostedId, amount: 1000 },
        }],
      },
    };
    expect(evaluateGates([{ kind: 'opponentCharacterCurrentPowerCount', power: 5000, atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'opponentCharacterCurrentPowerCount', power: 5000, atLeast: 2 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks leaderActive and leaderRested from Leader orientation', () => {
    const rig = buildBaseRig();
    const leaderId = rig.state.players.p1.leaderInstanceId;
    expect(evaluateGates([{ kind: 'leaderActive' }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'leaderRested' }], rig.state, rig.defs, 'p1')).toBe(false);

    const rested = {
      ...rig.state,
      cardsById: {
        ...rig.state.cardsById,
        [leaderId]: { ...rig.state.cardsById[leaderId], orientation: 'rested' as const },
      },
    };
    expect(evaluateGates([{ kind: 'leaderActive' }], rested, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'leaderRested' }], rested, rig.defs, 'p1')).toBe(true);
  });

  it('checks koByOpponentEffect only for effect K.O.s from the opponent', () => {
    let rig = buildBaseRig();
    const victimDef = makeCharacterDef({ cardDefinitionId: 'VICTIM', cardNumber: 'VICTIM' });
    const oppKoDef = makeCharacterDef({ cardDefinitionId: 'OPP-KO', cardNumber: 'OPP-KO' });
    let victimId: string;
    let oppKoId: string;
    ({ rig, instanceId: victimId } = putCharacterInPlay(rig, 'p1', victimDef));
    ({ rig, instanceId: oppKoId } = putCharacterInPlay(rig, 'p2', oppKoDef));
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [victimId]: { ...rig.state.cardsById[victimId], currentZone: 'trash' },
        },
      },
    };

    const gate = [{ kind: 'koByOpponentEffect' as const }];
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', victimId, { koCause: 'battle', koSourceInstanceId: oppKoId })).toBe(false);
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', victimId, { koCause: 'effect', koSourceInstanceId: oppKoId })).toBe(true);
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', victimId, { koCause: 'effect', koSourceInstanceId: victimId })).toBe(false);
  });

  it('checks koByEffect for any effect K.O. (not battle)', () => {
    const rig = buildBaseRig();
    const gate = [{ kind: 'koByEffect' as const }];
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined, { koCause: 'battle' })).toBe(false);
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined, { koCause: 'effect' })).toBe(true);
  });

  it('checks selfActiveDonCount for unattached active DON!! in cost area', () => {
    let rig = buildBaseRig();
    ({ rig } = putDon(rig, 'p1', 2, { rested: false }));
    ({ rig } = putDon(rig, 'p1', 1, { rested: true }));
    expect(evaluateGates([{ kind: 'selfActiveDonCount', atLeast: 2 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfActiveDonCount', atLeast: 3 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfLifeAtMostOpponent including equality', () => {
    let rig = buildBaseRig();
    const lifeCard = makeCharacterDef({ cardDefinitionId: 'LIFE-COMPARE', cardNumber: 'LIFE-COMPARE' });
    ({ rig } = putLifeCards(rig, 'p1', [lifeCard, lifeCard]));
    ({ rig } = putLifeCards(rig, 'p2', [lifeCard, lifeCard]));

    expect(evaluateGates([{ kind: 'selfLifeAtMostOpponent' }], rig.state, rig.defs, 'p1')).toBe(true);

    ({ rig } = putLifeCards(rig, 'p1', [lifeCard]));
    expect(evaluateGates([{ kind: 'selfLifeAtMostOpponent' }], rig.state, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'selfLifeAtMostOpponent' }], rig.state, rig.defs, 'p2')).toBe(true);
  });

  it('checks selfDonAtLeastLessThanOpponent by exact DON!! field deficit', () => {
    let rig = buildBaseRig();
    ({ rig } = putDon(rig, 'p1', 3));
    ({ rig } = putDon(rig, 'p2', 5));

    expect(evaluateGates([{ kind: 'selfDonAtLeastLessThanOpponent', count: 2 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfDonAtLeastLessThanOpponent', count: 3 }], rig.state, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'selfDonAtLeastLessThanOpponent', count: 1 }], rig.state, rig.defs, 'p2')).toBe(false);
  });

  it('checks anyCharacterCostCount across both players', () => {
    let rig = buildBaseRig();
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'COST8-A', baseCost: 8 })));
    ({ rig } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'COST8-B', baseCost: 8 })));
    ({ rig } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'COST7', baseCost: 7 })));

    expect(evaluateGates([{ kind: 'anyCharacterCostCount', minCost: 8, atLeast: 2 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'anyCharacterCostCount', minCost: 8, atLeast: 3 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfTypedCharacterDistinctNameCount by card name', () => {
    let rig = buildBaseRig();
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'IMPEL-A', name: 'A', types: ['Impel Down'] })));
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'IMPEL-B', name: 'B', types: ['Impel Down'] })));
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'IMPEL-B-ALT', name: 'B', types: ['Impel Down'] })));
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'NON-IMPEL', name: 'C', types: ['Navy'] })));

    const gate = [{ kind: 'selfTypedCharacterDistinctNameCount' as const, typeIncludes: 'Impel Down', atLeast: 2 }];
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfTypedCharacterDistinctNameCount', typeIncludes: 'Impel Down', atLeast: 3 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfTrashMatching by exact card name', () => {
    let rig = buildBaseRig();
    let kuromarimoId: string;
    let chessId: string;
    ({ rig, instanceId: kuromarimoId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'KUROMARIMO', name: 'Kuromarimo' })));
    ({ rig, instanceId: chessId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'CHESS', name: 'Chess' })));
    const player = rig.state.players.p1;
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [kuromarimoId]: { ...rig.state.cardsById[kuromarimoId], currentZone: 'trash' },
          [chessId]: { ...rig.state.cardsById[chessId], currentZone: 'trash' },
        },
        players: {
          ...rig.state.players,
          p1: {
            ...player,
            characterArea: { ...player.characterArea, cardIds: player.characterArea.cardIds.filter((id) => id !== kuromarimoId && id !== chessId) },
            trash: { ...player.trash, cardIds: [kuromarimoId, chessId] },
          },
        },
      },
    };

    expect(evaluateGates([{ kind: 'selfTrashMatching', name: 'Kuromarimo', atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfTrashMatching', name: 'Chess', atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfTrashMatching', name: 'Chess', atLeast: 2 }], rig.state, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'selfTrashMatching', name: 'Chessmarimo', atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks selfNamedCardCount across leader, characters, and stage', () => {
    let rig = buildBaseRig({ leaderOverridesP1: { name: 'Prisoner of Impel Down' } });
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'PRISONER-CHAR', name: 'Prisoner of Impel Down' })));
    ({ rig } = putStageInPlay(rig, 'p1', makeStageDef({ cardDefinitionId: 'PRISONER-STAGE', name: 'Prisoner of Impel Down' })));
    ({ rig } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'OPP-PRISONER', name: 'Prisoner of Impel Down' })));

    expect(evaluateGates([{ kind: 'selfNamedCardCount', name: 'Prisoner of Impel Down', atLeast: 3 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'selfNamedCardCount', name: 'Prisoner of Impel Down', atLeast: 4 }], rig.state, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'selfNamedCardCount', name: 'Prisoner of Impel Down', atMost: 2 }], rig.state, rig.defs, 'p1')).toBe(false);
  });

  it('checks playedCharacterHasTrigger against the reactive played Character', () => {
    let rig = buildBaseRig();
    let triggeredId: string;
    let plainId: string;
    ({ rig, instanceId: triggeredId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'TRIGGERED-CHAR', hasTrigger: true })));
    ({ rig, instanceId: plainId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'PLAIN-CHAR', hasTrigger: false })));

    const gate = [{ kind: 'playedCharacterHasTrigger' as const }];
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined, { playedCharacterInstanceId: triggeredId })).toBe(true);
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined, { playedCharacterInstanceId: plainId })).toBe(false);
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1')).toBe(false);
  });
});
