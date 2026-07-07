import { describe, expect, it } from 'vitest';
import type { DeclareAttackAction } from '../../../engine/actions/action';
import { runTimings } from '../../../engine/effects/interpreter';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP03_ASSIGNMENTS } from '../assignments/OP03';
import { OP04_ASSIGNMENTS } from '../assignments/OP04';
import { OP06_ASSIGNMENTS } from '../assignments/OP06';
import { OP07_ASSIGNMENTS } from '../assignments/OP07';
import { OP11_ASSIGNMENTS } from '../assignments/OP11';
import { OP14_ASSIGNMENTS } from '../assignments/OP14';
import { OP15_ASSIGNMENTS } from '../assignments/OP15';
import { P_ASSIGNMENTS } from '../assignments/P';

const registry = buildRegistryFromAssignments([
  ...OP03_ASSIGNMENTS,
  ...OP04_ASSIGNMENTS,
  ...OP06_ASSIGNMENTS,
  ...OP07_ASSIGNMENTS,
  ...OP11_ASSIGNMENTS,
  ...OP14_ASSIGNMENTS,
  ...OP15_ASSIGNMENTS,
  ...P_ASSIGNMENTS,
]);

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId, attackerInstanceId, targetInstanceId };
}

describe('static cannot-attack curated assignments', () => {
  it.each([
    { cardNumber: 'OP03-058', name: 'Iceburg' },
    { cardNumber: 'OP04-001', name: 'Nefeltari Vivi' },
    { cardNumber: 'OP04-039', name: 'Rebecca' },
    { cardNumber: 'OP07-097', name: 'Vegapunk' },
    { cardNumber: 'OP11-022', name: 'Shirahoshi' },
    { cardNumber: 'OP15-039', name: 'Rebecca' },
  ])('$cardNumber prevents the Leader from declaring attacks', ({ cardNumber, name }) => {
    const rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      leaderOverridesP1: { cardDefinitionId: cardNumber, cardNumber, name },
    });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const applied = runTimings(registry[cardNumber], ['onEnterPlay'], rig.state, leaderId, rig.defs, null, registry);
    const foeLeaderId = applied.state.players.p2.leaderInstanceId;

    expect(validateDeclareAttack(applied.state, declareAttack('p1', leaderId, foeLeaderId), rig.defs).legal).toBe(false);
  });

  it.each([
    { cardNumber: 'OP06-083', def: makeCharacterDef({ cardDefinitionId: 'OP06-083', cardNumber: 'OP06-083', name: 'Oars', baseCost: 4, basePower: 5000 }) },
    { cardNumber: 'OP14-056', def: makeCharacterDef({ cardDefinitionId: 'OP14-056', cardNumber: 'OP14-056', name: 'Wadatsumi', baseCost: 6, basePower: 7000 }) },
    { cardNumber: 'P-084', def: makeCharacterDef({ cardDefinitionId: 'P-084', cardNumber: 'P-084', name: 'Buggy', baseCost: 5, basePower: 6000 }) },
  ])('$cardNumber prevents the Character itself from declaring attacks', ({ cardNumber, def }) => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', def));
    const applied = runTimings(registry[cardNumber], ['onEnterPlay'], rig.state, attackerId, rig.defs, null, registry);
    const foeLeaderId = applied.state.players.p2.leaderInstanceId;

    expect(validateDeclareAttack(applied.state, declareAttack('p1', attackerId, foeLeaderId), rig.defs).legal).toBe(false);
  });
});
