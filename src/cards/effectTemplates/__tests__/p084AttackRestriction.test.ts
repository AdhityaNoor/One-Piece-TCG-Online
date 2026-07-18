import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments } from '../assembler';
import { P_ASSIGNMENTS } from '../assignments/P';
import { runTimings } from '../../../engine/effects/interpreter';
import { cannotAttack } from '../../../engine/rules/shared/power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';

describe('P-084 Buggy attack restrictions', () => {
  it('blocks cost 3–4 Characters on either side when Leader is [Buggy], but not Leaders or other costs', () => {
    const p084 = makeCharacterDef({ cardDefinitionId: 'P-084', cardNumber: 'P-084', name: 'Buggy', baseCost: 5 });
    const cost3 = makeCharacterDef({ cardDefinitionId: 'C3', cardNumber: 'C3', baseCost: 3 });
    const cost5 = makeCharacterDef({ cardDefinitionId: 'C5', cardNumber: 'C5', baseCost: 5 });
    const oppCost4 = makeCharacterDef({ cardDefinitionId: 'OC4', cardNumber: 'OC4', baseCost: 4 });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 2,
      leaderOverridesP1: { name: 'Buggy' },
    });
    const leaderId = rig.state.players.p1.leaderInstanceId;

    const self = putCharacterInPlay(rig, 'p1', p084);
    const ally3 = putCharacterInPlay(self.rig, 'p1', cost3);
    const ally5 = putCharacterInPlay(ally3.rig, 'p1', cost5);
    const foe4 = putCharacterInPlay(ally5.rig, 'p2', oppCost4);
    rig = foe4.rig;

    const entry = P_ASSIGNMENTS.find((a) => a.cardNumber === 'P-084')!;
    const registry = buildRegistryFromAssignments([entry]);
    const fired = runTimings(registry['P-084'], ['onEnterPlay'], rig.state, self.instanceId, rig.defs, null, registry);

    expect(cannotAttack(fired.state, self.instanceId, rig.defs)).toBe(true);
    expect(cannotAttack(fired.state, ally3.instanceId, rig.defs)).toBe(true);
    expect(cannotAttack(fired.state, foe4.instanceId, rig.defs)).toBe(true);
    expect(cannotAttack(fired.state, ally5.instanceId, rig.defs)).toBe(false);
    expect(cannotAttack(fired.state, leaderId, rig.defs)).toBe(false);
  });
});
