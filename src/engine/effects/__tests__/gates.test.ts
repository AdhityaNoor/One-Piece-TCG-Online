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
});
