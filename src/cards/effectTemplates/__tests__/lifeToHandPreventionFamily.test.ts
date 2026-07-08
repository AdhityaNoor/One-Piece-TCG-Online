import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects/interpreter';
import { isControllerLifeToHandPrevented } from '../../../engine/rules/shared/lifeToHandRestriction';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putLifeCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import { ST15_ASSIGNMENTS } from '../assignments/ST15';

const LIFE_CARD = makeCharacterDef({ cardDefinitionId: 'LIFE-DEF', cardNumber: 'LIFE-1', baseCost: 1 });

describe('preventControllerLifeToHand family', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-PREVENT-LIFE',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'preventControllerLifeToHand', duration: 'duringThisTurn' },
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
      ],
    },
  };

  it('blocks effect-sourced Life→hand while active', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    const src = makeCharacterDef({ cardDefinitionId: 'SYN-PREVENT-LIFE', cardNumber: 'SYN-PREVENT-LIFE', baseCost: 2 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', src));
    rig = putLifeCards(rig, 'p1', [LIFE_CARD]).rig;

    const fired = runTimings(registry['SYN-PREVENT-LIFE'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    expect(isControllerLifeToHandPrevented(fired.state, 'p1')).toBe(true);
    expect(fired.state.players.p1.lifeArea.cardIds).toHaveLength(1);
    expect(fired.state.players.p1.hand.cardIds).toHaveLength(0);
  });

  it('ST15-001 compiles whenAttacking + leaderName gate + preventControllerLifeToHand', () => {
    const registry = buildRegistryFromAssignments(ST15_ASSIGNMENTS);
    const ability = registry['ST15-001'].abilities.find((a) => a.timing === 'whenAttacking');
    expect(ability?.gate).toEqual([{ kind: 'leaderName', name: 'Edward.Newgate' }]);
    expect(ability?.ops.some((op) => op.op === 'preventControllerLifeToHand')).toBe(true);
  });
});
