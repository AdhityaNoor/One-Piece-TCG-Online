import { describe, expect, it } from 'vitest';
import { makeCharacterDef, buildBaseRig, putCharacterInPlay, putDon, putLifeCards } from '../../rules/shared/__tests__/testRig';
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
});
