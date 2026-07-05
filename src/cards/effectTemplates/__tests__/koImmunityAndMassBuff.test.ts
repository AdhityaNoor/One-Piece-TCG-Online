/**
 * Engine-capability tests for reusable K.O. immunity and mass-buff families:
 *   - K.O. immunity ("cannot be K.O.'d", scope 'battle' | 'any') — `addKoImmunity`
 *     op, checked in the Damage Step (battle K.O.) and in effect K.O.s.
 *   - Mass self-buff ("All of your {type} Characters gain +power") — no target choice.
 *
 * Synthetic cards + generic assignments — the capability, not any single card number.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects';
import { computeCurrentPower, isKoImmune } from '../../../engine/rules/shared';
import { resolveDamageAndEndOfBattle } from '../../../engine/rules/battle/damageStep';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import type { BattleState, GameState } from '../../../engine/state/game';

function reg(a: CardEffectAssignment) {
  return buildRegistryFromAssignments([a]);
}

describe('family: battle K.O. immunity gated on a board condition', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-IMMUNE',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }] } }] },
  };
  const DEF = makeCharacterDef({ cardDefinitionId: 'SYN-IMMUNE', cardNumber: 'SYN-IMMUNE', category: 'character', baseCost: 5, basePower: 3000 });

  function inPlayWithImmunity(donCount: number) {
    const registry = reg(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let id: string;
    ({ rig, instanceId: id } = putCharacterInPlay(rig, 'p2', DEF, { orientation: 'rested' }));
    if (donCount > 0) rig = putDon(rig, 'p2', donCount).rig;
    const state = runTimings(registry['SYN-IMMUNE'], ['onEnterPlay'], rig.state, id, rig.defs, null, registry).state;
    return { state, defs: rig.defs, id };
  }

  it('is immune to battle K.O. at/above the DON!! threshold, but not below (condition re-evaluated per read)', () => {
    const hi = inPlayWithImmunity(8);
    expect(isKoImmune(hi.defs, hi.state, hi.id, 'battle')).toBe(true);

    const lo = inPlayWithImmunity(7);
    expect(isKoImmune(lo.defs, lo.state, lo.id, 'battle')).toBe(false);
  });

  it("'battle' scope does NOT protect against effect K.O.s", () => {
    const hi = inPlayWithImmunity(8);
    expect(isKoImmune(hi.defs, hi.state, hi.id, 'effect')).toBe(false);
  });

  it('survives the Damage Step when a stronger attacker connects (K.O. prevented)', () => {
    const attacker = makeCharacterDef({ cardDefinitionId: 'SYN-ATT', cardNumber: 'SYN-ATT', category: 'character', baseCost: 5, basePower: 7000 });
    const { state, defs, id: immuneId } = inPlayWithImmunity(8);
    let rig = { state, defs };
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', attacker, { summoningSick: false, orientation: 'rested' }));
    const battle: BattleState = {
      attackerInstanceId: attackerId,
      targetInstanceId: immuneId,
      originalTargetInstanceId: immuneId,
      step: 'counter',
      blockerUsed: false,
      battlePowerBonuses: {},
    };
    const withBattle: GameState = { ...rig.state, currentBattle: battle };
    const result = resolveDamageAndEndOfBattle(withBattle, rig.defs, null, {});
    // Immune Character is still in play (not moved to trash), even though 7000 >= 3000.
    expect(result.state.players.p2.characterArea.cardIds).toContain(immuneId);
    expect(result.state.cardsById[immuneId].currentZone).toBe('characterArea');
  });
});

describe("family: 'any'-scope K.O. immunity blocks effect K.O.s", () => {
  it('prevents an effect K.O. on the protected card', () => {
    // Program: choose an opponent Character and K.O. it — but first grant it 'any' immunity,
    // proving ctx.ko() honors the immunity.
    const koProgram: CardEffectAssignment = {
      cardNumber: 'SYN-KO',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'koOpponentCharacter', filter: {} }] },
    };
    const registry = buildRegistryFromAssignments([koProgram]);

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const src = makeCharacterDef({ cardDefinitionId: 'SYN-KO', cardNumber: 'SYN-KO', category: 'character', baseCost: 1, basePower: 1000 });
    const victimDef = makeCharacterDef({ cardDefinitionId: 'SYN-VICTIM', cardNumber: 'SYN-VICTIM', category: 'character', baseCost: 2, basePower: 2000 });
    let srcId: string;
    let victimId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', src));
    ({ rig, instanceId: victimId } = putCharacterInPlay(rig, 'p2', victimDef));

    // Manually register an 'any'-scope immunity on the victim.
    const immuneState: GameState = {
      ...rig.state,
      continuousEffects: [
        ...rig.state.continuousEffects,
        { id: 'ce-test-immunity', sourceInstanceId: victimId, ownerId: 'p2', duration: 'duringThisTurn', description: 'cannot be K.O.’d', koImmunityModifier: { appliesToInstanceId: victimId, scope: 'any' } },
      ],
    };

    const fired = runTimings(registry['SYN-KO'], ['onPlay'], immuneState, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    // Resume the K.O. choice targeting the immune victim — the K.O. must be prevented.
    const resolved = resumeProgram(registry['SYN-KO'], fired.state, choice, [victimId], rig.defs, null, registry);
    expect(resolved.state.players.p2.characterArea.cardIds).toContain(victimId);
    expect(resolved.state.cardsById[victimId].currentZone).toBe('characterArea');
  });
});

describe('family: mass self-buff to all matching own Characters', () => {
  it('buffs every {FILM} Character with no target choice; leaves others and the opponent alone', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-LEADER',
      templateId: 'ability',
      params: { timing: 'activateMain', functions: [{ fn: 'addPowerControllerCharactersAll', amount: 2000, duration: 'duringThisTurn', filter: { typeIncludes: 'FILM' } }] },
    };
    const registry = reg(assignment);
    const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-LEADER', cardNumber: 'SYN-LEADER', category: 'character', baseCost: 1, basePower: 1000 });
    const FILM = makeCharacterDef({ cardDefinitionId: 'SYN-FILM', cardNumber: 'SYN-FILM', category: 'character', baseCost: 3, basePower: 4000, types: ['FILM'] });
    const OTHER = makeCharacterDef({ cardDefinitionId: 'SYN-OTHER', cardNumber: 'SYN-OTHER', category: 'character', baseCost: 3, basePower: 4000, types: ['Navy'] });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let filmA: string;
    let filmB: string;
    let otherId: string;
    let oppFilmId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: filmA } = putCharacterInPlay(rig, 'p1', FILM));
    ({ rig, instanceId: filmB } = putCharacterInPlay(rig, 'p1', FILM));
    ({ rig, instanceId: otherId } = putCharacterInPlay(rig, 'p1', OTHER));
    ({ rig, instanceId: oppFilmId } = putCharacterInPlay(rig, 'p2', FILM)); // opponent's FILM — unaffected

    const state = runTimings(registry['SYN-LEADER'], ['activateMain'], rig.state, srcId, rig.defs, null, registry).state;

    expect(computeCurrentPower(rig.defs, state, filmA)).toBe(6000);
    expect(computeCurrentPower(rig.defs, state, filmB)).toBe(6000);
    expect(computeCurrentPower(rig.defs, state, otherId)).toBe(4000); // wrong type
    expect(computeCurrentPower(rig.defs, state, oppFilmId)).toBe(4000); // opponent's, not controller's
  });
});
