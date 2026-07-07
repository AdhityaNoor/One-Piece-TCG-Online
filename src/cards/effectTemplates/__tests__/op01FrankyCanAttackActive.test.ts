/**
 * Engine-capability test for the `canAttackActive` continuous keyword primitive
 * ("This Character can also attack your opponent's active Characters"), using
 * OP01-021 Franky's static "[DON!! x1] ..." grant as the reference card.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects/interpreter';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP01_ASSIGNMENTS } from '../assignments/OP01';
import type { DeclareAttackAction } from '../../../engine/actions/action';

const FRANKY = makeCharacterDef({ cardDefinitionId: 'OP01-021', cardNumber: 'OP01-021', category: 'character', baseCost: 5, basePower: 7000 });
const FOE = makeCharacterDef({ cardDefinitionId: 'SYN-FOE', cardNumber: 'SYN-FOE', category: 'character', baseCost: 4, basePower: 5000 });

const registry = buildRegistryFromAssignments(OP01_ASSIGNMENTS);

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-atk', playerId, attackerInstanceId, targetInstanceId };
}

describe('OP01-021 Franky — [DON!! x1] can also attack active opponent Characters', () => {
  it('grants canAttackActive only while a DON!! is attached', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let frankyId: string;
    ({ rig, instanceId: frankyId } = putCharacterInPlay(rig, 'p1', FRANKY));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE, { orientation: 'active' }));

    const withoutDon = validateDeclareAttack(rig.state, declareAttack('p1', frankyId, foeId), rig.defs);
    expect(withoutDon.legal).toBe(false);

    const withDon = { ...rig.state, cardsById: { ...rig.state.cardsById, [frankyId]: { ...rig.state.cardsById[frankyId], donAttached: ['don-1'] } } };
    const fired = runTimings(registry['OP01-021'], ['onEnterPlay'], withDon, frankyId, rig.defs, null, registry);

    expect(validateDeclareAttack(fired.state, declareAttack('p1', frankyId, foeId), rig.defs).legal).toBe(true);
  });
});
