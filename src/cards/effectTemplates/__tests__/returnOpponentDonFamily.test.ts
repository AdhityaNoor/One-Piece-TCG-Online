import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from '../../../engine/rules/shared/__tests__/testRig';
import { applyTemplate } from '../catalog/factories';

const SOURCE = makeCharacterDef({ cardDefinitionId: 'SRC-RETURN-DON', cardNumber: 'SRC-RETURN-DON', category: 'character', baseCost: 3, basePower: 4000 });
const HOST = makeCharacterDef({ cardDefinitionId: 'DON-HOST', cardNumber: 'DON-HOST', category: 'character', baseCost: 3, basePower: 4000 });

const program = applyTemplate('SRC-RETURN-DON', 'ability', {
  timing: 'onKO',
  functions: [{ fn: 'returnOpponentDon', count: 1 }],
});

describe('returnOpponentDon family', () => {
  it('lets the opponent return one of their field DON!! to the DON!! deck', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SOURCE));
    ({ rig } = putCharacterInPlay(rig, 'p2', HOST));
    let donIds: string[];
    ({ rig, donIds } = putDon(rig, 'p2', 2));

    const fired = runTimings(program, ['onKO'], rig.state, sourceId, rig.defs, null, {});
    const choice = fired.state.pendingChoices[0];
    expect(choice.playerId).toBe('p2');
    expect(choice.constraints.candidateInstanceIds).toEqual(donIds);

    const resolved = resumeProgram(program, fired.state, choice, [donIds[0]], rig.defs, null, {}).state;
    expect(resolved.players.p2.costArea.cardIds).not.toContain(donIds[0]);
    expect(resolved.players.p2.donDeck.cardIds).toContain(donIds[0]);
    expect(resolved.cardsById[donIds[0]].currentZone).toBe('donDeck');
  });
});
