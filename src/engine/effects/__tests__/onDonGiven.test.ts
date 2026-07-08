import { describe, expect, it } from 'vitest';
import type { EffectProgram } from '../effectIr';
import { fireDonGivenReactions } from '../fireTiming';
import { fireOnPlay } from '../index';
import { computeCurrentCost } from '../../rules/shared';
import { buildBaseRig, makeCharacterDef, makeLeaderDef, putCharacterInPlay, putDon } from '../../rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';

describe('onDonGiven timing', () => {
  const garpLeader = makeLeaderDef({ cardDefinitionId: 'OP02-002', cardNumber: 'OP02-002', baseCost: 5 });
  const giver = makeCharacterDef({ cardDefinitionId: 'GIVER-DEF', cardNumber: 'GIVER-001', baseCost: 1 });
  const oppChar = makeCharacterDef({ cardDefinitionId: 'OPP-DEF', cardNumber: 'OPP-001', baseCost: 5 });

  const garpAssignment: CardEffectAssignment = {
    cardNumber: 'OP02-002',
    templateId: 'ability',
    params: {
      timing: 'onDonGiven',
      condition: { turn: 'your' },
      gate: [{ kind: 'donGivenTargetLeaderOrCharacter' }],
      functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent', filter: { maxCost: 7 } }, amount: -1, duration: 'duringThisTurn', optional: true, maxTargets: 1 }],
    },
  };

  it('fires when effect gives DON to a friendly Character', () => {
    const registry = buildRegistryFromAssignments([garpAssignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', leaderOverridesP1: garpLeader });
    rig = putDon(rig, 'p1', 2, { rested: true }).rig;
    let receiverId: string;
    ({ rig, instanceId: receiverId } = putCharacterInPlay(rig, 'p1', giver, { orientation: 'active' }));
    let oppId: string;
    ({ rig, instanceId: oppId } = putCharacterInPlay(rig, 'p2', oppChar, { orientation: 'active' }));

    const giverProgram: EffectProgram = {
      cardNumber: 'GIVER-001',
      abilities: [{ timing: 'onPlay', ops: [{ op: 'giveDon', target: { sel: 'self' }, count: 1 }] }],
    };
    const fullRegistry = { ...registry, [giver.cardDefinitionId]: giverProgram };

    const beforeCost = computeCurrentCost(rig.defs, rig.state, oppId);
    const played = fireOnPlay(rig.state, receiverId, fullRegistry, rig.defs, 'test');
    const afterCost = computeCurrentCost(rig.defs, played.state, oppId);

    expect(played.state.cardsById[receiverId].donAttached.length).toBe(1);
    expect(played.pendingChoices.length).toBe(1);
    expect(afterCost).toBe(beforeCost);
  });

  it('does not fire on opponent turn', () => {
    const registry = buildRegistryFromAssignments([garpAssignment]);
    let rig = buildBaseRig({ activePlayerId: 'p2', leaderOverridesP1: garpLeader });
    rig = putDon(rig, 'p1', 1).rig;
    let receiverId: string;
    ({ rig, instanceId: receiverId } = putCharacterInPlay(rig, 'p1', giver, { orientation: 'active' }));
    let oppId: string;
    ({ rig, instanceId: oppId } = putCharacterInPlay(rig, 'p2', oppChar, { orientation: 'active' }));

    const beforeCost = computeCurrentCost(rig.defs, rig.state, oppId);
    const fired = fireDonGivenReactions(rig.state, 'p1', receiverId, 1, registry, rig.defs, 'test');
    const afterCost = computeCurrentCost(rig.defs, fired.state, oppId);

    expect(afterCost).toBe(beforeCost);
  });
});
