/**
 * Unit test for the `restLeader` ability cost ("You may rest your Leader:" /
 * "rest this Leader:", e.g. OP04-081, OP04-094, OP15-039).
 */
import { describe, expect, it } from 'vitest';
import { canPayAbilityCost, payAbilityCost } from '../abilityCost';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../rules/shared/__tests__/testRig';

describe('restLeader ability cost', () => {
  it('is payable when the Leader is active and rests it on payment', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1' });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', makeCharacterDef()));
    const leaderId = rig.state.players.p1.leaderInstanceId;
    expect(rig.state.cardsById[leaderId].orientation).toBe('active');

    expect(canPayAbilityCost(rig.state, srcId, 'p1', [{ kind: 'restLeader' }])).toEqual([]);
    const paid = payAbilityCost(rig.state, srcId, 'p1', [{ kind: 'restLeader' }], null);
    expect(paid.state.cardsById[leaderId].orientation).toBe('rested');
    expect(paid.restedInstanceIds).toContain(leaderId);
  });

  it('is not payable when the Leader is already rested', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1' });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', makeCharacterDef()));
    const leaderId = rig.state.players.p1.leaderInstanceId;
    rig = { ...rig, state: { ...rig.state, cardsById: { ...rig.state.cardsById, [leaderId]: { ...rig.state.cardsById[leaderId], orientation: 'rested' } } } };
    expect(canPayAbilityCost(rig.state, srcId, 'p1', [{ kind: 'restLeader' }]).length).toBeGreaterThan(0);
  });
});
