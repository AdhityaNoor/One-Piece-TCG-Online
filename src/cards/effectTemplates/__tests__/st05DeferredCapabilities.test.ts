/**
 * Engine-capability tests for the two families that were deferred in ST05:
 *   - `opponentDonMoreThanSelf` board gate (ST05-005 Carina).
 *   - onBattle `battlingOpponentAttribute` condition, attacker- AND defender-side (ST05-010 Zephyr).
 *
 * Synthetic cards + generic assignments — the capability, not any single card number.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, fireOnBattle } from '../../../engine/effects';
import { computeCurrentPower } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon, putDonDeckCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import type { BattleState, GameState } from '../../../engine/state/game';

describe('family: opponentDonMoreThanSelf gate (ST05-005 shape)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-GATE',
    templateId: 'ability',
    params: { timing: 'activateMain', gate: [{ kind: 'opponentDonMoreThanSelf' }], functions: [{ fn: 'addDonFromDeck', count: 2, rested: true }] },
  };
  const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-GATE', cardNumber: 'SYN-GATE', category: 'character', baseCost: 1, basePower: 1000 });

  function run(selfDon: number, oppDon: number) {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let id: string;
    ({ rig, instanceId: id } = putCharacterInPlay(rig, 'p1', SRC));
    if (selfDon > 0) rig = putDon(rig, 'p1', selfDon).rig;
    if (oppDon > 0) rig = putDon(rig, 'p2', oppDon).rig;
    rig = putDonDeckCards(rig, 'p1', 5).rig;
    const before = rig.state.players.p1.costArea.cardIds.length;
    const state = runTimings(registry['SYN-GATE'], ['activateMain'], rig.state, id, rig.defs, null, registry).state;
    return state.players.p1.costArea.cardIds.length - before;
  }

  it('ramps when the opponent has more field DON!! than you', () => {
    expect(run(1, 3)).toBe(2); // opponent 3 > self 1 → gate passes → +2 DON
  });

  it('does nothing when you have >= the opponent', () => {
    expect(run(3, 3)).toBe(0); // equal → gate fails
    expect(run(4, 1)).toBe(0); // self more → gate fails
  });
});

describe('family: onBattle battlingOpponentAttribute (ST05-010 shape)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-ZEPHYR',
    templateId: 'ability',
    params: { timing: 'onBattle', battlingOpponentAttribute: 'strike', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'duringThisTurn' }] },
  };
  const ZEPHYR = makeCharacterDef({ cardDefinitionId: 'SYN-ZEPHYR', cardNumber: 'SYN-ZEPHYR', category: 'character', baseCost: 4, basePower: 5000, attributes: ['special'] });
  const STRIKE = makeCharacterDef({ cardDefinitionId: 'SYN-STRIKE', cardNumber: 'SYN-STRIKE', category: 'character', baseCost: 3, basePower: 4000, attributes: ['strike'] });
  const SLASH = makeCharacterDef({ cardDefinitionId: 'SYN-SLASH', cardNumber: 'SYN-SLASH', category: 'character', baseCost: 3, basePower: 4000, attributes: ['slash'] });

  function fire(oppDef: typeof STRIKE, zephyrIsAttacker: boolean) {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let zephyrId: string;
    let oppId: string;
    ({ rig, instanceId: zephyrId } = putCharacterInPlay(rig, 'p1', ZEPHYR, { orientation: 'rested' }));
    ({ rig, instanceId: oppId } = putCharacterInPlay(rig, 'p2', oppDef));
    const battle: BattleState = {
      attackerInstanceId: zephyrIsAttacker ? zephyrId : oppId,
      targetInstanceId: zephyrIsAttacker ? oppId : zephyrId,
      originalTargetInstanceId: zephyrIsAttacker ? oppId : zephyrId,
      step: 'counter',
      blockerUsed: false,
      battlePowerBonuses: {},
    };
    const state: GameState = { ...rig.state, currentBattle: battle };
    const after = fireOnBattle(state, zephyrId, registry, rig.defs, null).state;
    return computeCurrentPower(rig.defs, after, zephyrId);
  }

  it('gains +3000 when battling a ＜Strike＞ Character (as attacker)', () => {
    expect(fire(STRIKE, true)).toBe(8000); // 5000 + 3000
  });

  it('also triggers when it is the defender battling a ＜Strike＞ Character', () => {
    expect(fire(STRIKE, false)).toBe(8000);
  });

  it('does not trigger against a non-＜Strike＞ Character', () => {
    expect(fire(SLASH, true)).toBe(5000);
  });
});
