import { describe, expect, it } from 'vitest';
import { validateGiveDon, executeGiveDon } from '../giveDon';
import type { GiveDonAction } from '../../action';
import { buildBaseRig, putDon, putCharacterInPlay, makeCharacterDef, nextTestId } from '../../../rules/shared/__tests__/testRig';

function giveDonAction(playerId: string, donInstanceId: string, targetInstanceId: string): GiveDonAction {
  return { type: 'GIVE_DON', actionId: nextTestId('action'), playerId, donInstanceId, targetInstanceId };
}

describe('validateGiveDon', () => {
  it('rejects outside the Main Phase', () => {
    const base = buildBaseRig({ phase: 'refresh', activePlayerId: 'p1' });
    const { rig, donIds } = putDon(base, 'p1', 1);
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const result = validateGiveDon(rig.state, giveDonAction('p1', donIds[0], leaderId));
    expect(result.legal).toBe(false);
  });

  it('rejects a non-turn-player', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, donIds } = putDon(base, 'p2', 1);
    const leaderId = rig.state.players.p2.leaderInstanceId;
    const result = validateGiveDon(rig.state, giveDonAction('p2', donIds[0], leaderId));
    expect(result.legal).toBe(false);
  });

  it('rejects a rested DON!! as the giver', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, donIds } = putDon(base, 'p1', 1, { rested: true });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const result = validateGiveDon(rig.state, giveDonAction('p1', donIds[0], leaderId));
    expect(result.legal).toBe(false);
  });

  it('rejects a target that does not belong to the giving player', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, donIds } = putDon(base, 'p1', 1);
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;
    const result = validateGiveDon(rig.state, giveDonAction('p1', donIds[0], opponentLeaderId));
    expect(result.legal).toBe(false);
  });

  it('rejects a target in a zone other than leaderArea/characterArea', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig: withDon, donIds } = putDon(base, 'p1', 2);
    // Use a second DON!! instance (sitting in costArea) as an invalid target.
    const result = validateGiveDon(withDon.state, giveDonAction('p1', donIds[0], donIds[1]));
    expect(result.legal).toBe(false);
  });

  it('accepts giving to own Leader', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, donIds } = putDon(base, 'p1', 1);
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const result = validateGiveDon(rig.state, giveDonAction('p1', donIds[0], leaderId));
    expect(result.legal).toBe(true);
  });

  it('accepts giving to own Character', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: charId } = putCharacterInPlay(base, 'p1', makeCharacterDef());
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    const result = validateGiveDon(withDon.state, giveDonAction('p1', donIds[0], charId));
    expect(result.legal).toBe(true);
  });
});

describe('executeGiveDon', () => {
  it('rests the DON!! and attaches it to the target without moving its zone', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: charId } = putCharacterInPlay(base, 'p1', makeCharacterDef());
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);

    const result = executeGiveDon(withDon.state, giveDonAction('p1', donIds[0], charId), withDon.defs);

    const donInstance = result.state.cardsById[donIds[0]];
    expect(donInstance.donRested).toBe(true);
    expect(donInstance.currentZone).toBe('costArea'); // never moves zones
    expect(result.state.cardsById[charId].donAttached).toContain(donIds[0]);
    expect(result.log.some((e) => e.type === 'DON_GIVEN')).toBe(true);
    expect(result.pendingChoices).toHaveLength(0);
  });
});
