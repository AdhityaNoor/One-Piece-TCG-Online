/**
 * Engine-capability test for the family ST08 added: "K.O. all Characters with a cost of N or less"
 * (the `koAllCharacters` template — mass board wipe over both players, no target choice).
 * Synthetic cards + generic assignment.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

describe('family: K.O. all Characters up to a cost (ST08-005 shape)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-WIPE',
    templateId: 'ability',
    params: { timing: 'activateMain', functions: [{ fn: 'koAllCharacters', filter: { maxCost: 1 } }] },
  };
  const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-WIPE', cardNumber: 'SYN-WIPE', category: 'character', baseCost: 5, basePower: 6000 });
  const C0 = makeCharacterDef({ cardDefinitionId: 'SYN-C0', cardNumber: 'SYN-C0', category: 'character', baseCost: 0, basePower: 1000 });
  const C1 = makeCharacterDef({ cardDefinitionId: 'SYN-C1', cardNumber: 'SYN-C1', category: 'character', baseCost: 1, basePower: 2000 });
  const C2 = makeCharacterDef({ cardDefinitionId: 'SYN-C2', cardNumber: 'SYN-C2', category: 'character', baseCost: 2, basePower: 3000 });

  it("K.O.s every Character (both players) at/under the cost, and leaves higher-cost ones and the source", () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let p1c0: string;
    let p1c2: string;
    let p2c1: string;
    let p2c2: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: p1c0 } = putCharacterInPlay(rig, 'p1', C0));
    ({ rig, instanceId: p1c2 } = putCharacterInPlay(rig, 'p1', C2));
    ({ rig, instanceId: p2c1 } = putCharacterInPlay(rig, 'p2', C1));
    ({ rig, instanceId: p2c2 } = putCharacterInPlay(rig, 'p2', C2));

    const state = runTimings(registry['SYN-WIPE'], ['activateMain'], rig.state, srcId, rig.defs, null, registry).state;

    // Cost <= 1 on BOTH sides are trashed.
    expect(state.cardsById[p1c0].currentZone).toBe('trash');
    expect(state.cardsById[p2c1].currentZone).toBe('trash');
    // Cost > 1 survive, and so does the source (cost 5).
    expect(state.cardsById[p1c2].currentZone).toBe('characterArea');
    expect(state.cardsById[p2c2].currentZone).toBe('characterArea');
    expect(state.cardsById[srcId].currentZone).toBe('characterArea');
    expect(state.players.p1.characterArea.cardIds).not.toContain(p1c0);
    expect(state.players.p2.characterArea.cardIds).not.toContain(p2c1);
  });

  it('can exclude the source from an all-Characters wipe', () => {
    const registry = buildRegistryFromAssignments([{
      cardNumber: 'SYN-WIPE',
      templateId: 'ability',
      params: { timing: 'activateMain', functions: [{ fn: 'koAllCharacters', excludeSource: true }] },
    }]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let allyId: string;
    let oppId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', C1));
    ({ rig, instanceId: oppId } = putCharacterInPlay(rig, 'p2', C1));

    const state = runTimings(registry['SYN-WIPE'], ['activateMain'], rig.state, srcId, rig.defs, null, registry).state;

    expect(state.cardsById[srcId].currentZone).toBe('characterArea');
    expect(state.cardsById[allyId].currentZone).toBe('trash');
    expect(state.cardsById[oppId].currentZone).toBe('trash');
  });

  it('can restrict a mass K.O. to opponent Characters', () => {
    const registry = buildRegistryFromAssignments([{
      cardNumber: 'SYN-WIPE',
      templateId: 'ability',
      params: { timing: 'activateMain', functions: [{ fn: 'koAllCharacters', player: 'opponent', filter: { maxCost: 1 } }] },
    }]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let allyId: string;
    let oppLowId: string;
    let oppHighId: string;
    ({ rig } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', C1));
    ({ rig, instanceId: oppLowId } = putCharacterInPlay(rig, 'p2', C1));
    ({ rig, instanceId: oppHighId } = putCharacterInPlay(rig, 'p2', C2));

    const sourceId = rig.state.players.p1.characterArea.cardIds[0];
    const state = runTimings(registry['SYN-WIPE'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry).state;

    expect(state.cardsById[allyId].currentZone).toBe('characterArea');
    expect(state.cardsById[oppLowId].currentZone).toBe('trash');
    expect(state.cardsById[oppHighId].currentZone).toBe('characterArea');
  });
});
