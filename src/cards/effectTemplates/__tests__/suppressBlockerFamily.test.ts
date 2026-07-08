import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects';
import { validateActivateBlocker } from '../../../engine/rules/battle/activateBlocker';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import type { BattleState } from '../../../engine/state/game';

describe('family: suppressBlockerOnTarget via template', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SUPPRESS',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'suppressBlockerOnTarget', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, duration: 'duringThisTurn', optional: true }],
    },
  };

  it('registers per-target blocker suppression on a chosen opponent Character', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    const srcDef = makeCharacterDef({ cardDefinitionId: 'SYN-SUPPRESS', cardNumber: 'SYN-SUPPRESS', baseCost: 1 });
    const blockerDef = makeCharacterDef({ cardDefinitionId: 'SYN-BLOCKER', cardNumber: 'SYN-BLOCKER', baseCost: 3, basePower: 2000, hasBlocker: true });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let blockerId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', srcDef));
    ({ rig, instanceId: blockerId } = putCharacterInPlay(rig, 'p2', blockerDef, { orientation: 'active' }));

    const fired = runTimings(registry['SYN-SUPPRESS'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['SYN-SUPPRESS'], fired.state, fired.state.pendingChoices[0], [blockerId], rig.defs, null, registry);

    const battle: BattleState = {
      attackerInstanceId: srcId,
      targetInstanceId: rig.state.players.p2.leaderInstanceId,
      originalTargetInstanceId: rig.state.players.p2.leaderInstanceId,
      step: 'block',
      blockerUsed: false,
      battlePowerBonuses: {},
    };
    const withBattle = { ...resolved.state, currentBattle: battle };
    const validation = validateActivateBlocker(withBattle, { type: 'ACTIVATE_BLOCKER', playerId: 'p2', blockerInstanceId: blockerId, actionId: 'test-block' }, rig.defs);
    expect(validation.legal).toBe(false);
  });
});

describe('family: preventBlockers with powerBonus on chosen ally', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-BUFF',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'preventBlockers', duration: 'duringThisTurn', target: 'chosenControllerLeaderOrCharacter', filter: { name: 'Test Ally' }, powerBonus: 2000 }],
    },
  };

  it('buffs the chosen ally and registers attacker-scoped blocker suppression', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    const srcDef = makeCharacterDef({ cardDefinitionId: 'SYN-BUFF', cardNumber: 'SYN-BUFF', baseCost: 1 });
    const allyDef = makeCharacterDef({ cardDefinitionId: 'SYN-ALLY', cardNumber: 'SYN-ALLY', name: 'Test Ally', baseCost: 4, basePower: 4000 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let allyId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', srcDef));
    ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', allyDef));

    const fired = runTimings(registry['SYN-BUFF'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['SYN-BUFF'], fired.state, fired.state.pendingChoices[0], [allyId], rig.defs, null, registry);

    expect(resolved.state.continuousEffects.some((ce) => ce.blockerRestriction?.appliesToAttackerInstanceId === allyId)).toBe(true);
    expect(resolved.state.continuousEffects.some((ce) => ce.powerModifier?.appliesToInstanceId === allyId && ce.powerModifier.amount === 2000)).toBe(true);
  });
});
