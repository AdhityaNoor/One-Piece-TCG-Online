import { describe, expect, it } from 'vitest';
import { canPayAbilityCost, givenDonIds, payAbilityCost } from '../abilityCost';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from '../../rules/shared/__tests__/testRig';

describe('returnGivenDon ability cost', () => {
  it('returns attached DON!! to the cost area rested (ST28-004)', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    const don = putDon(rig, 'p1', 2);
    const char = putCharacterInPlay(don.rig, 'p1', makeCharacterDef({ cardNumber: 'ST28-004' }), {
      donAttached: don.donIds,
    });
    rig = char.rig;

    expect(givenDonIds(rig.state, 'p1')).toHaveLength(2);
    const costs = [{ kind: 'returnGivenDon' as const, count: 2, rested: true }];
    expect(canPayAbilityCost(rig.state, char.instanceId, 'p1', costs, don.donIds)).toEqual([]);

    const paid = payAbilityCost(rig.state, char.instanceId, 'p1', costs, null, don.donIds);
    expect(paid.state.cardsById[char.instanceId].donAttached).toEqual([]);
    for (const id of don.donIds) {
      expect(paid.state.cardsById[id].currentZone).toBe('costArea');
      expect(paid.state.cardsById[id].donRested).toBe(true);
      expect(paid.state.players.p1.costArea.cardIds).toContain(id);
      expect(paid.state.players.p1.donDeck.cardIds).not.toContain(id);
    }
  });

  it('rejects unattached cost-area DON!! as returnGivenDon payment', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    const don = putDon(rig, 'p1', 2);
    const char = putCharacterInPlay(don.rig, 'p1', makeCharacterDef());
    rig = char.rig;
    const costs = [{ kind: 'returnGivenDon' as const, count: 2, rested: true }];
    const reasons = canPayAbilityCost(rig.state, char.instanceId, 'p1', costs, don.donIds);
    expect(reasons.some((r) => /given/i.test(r))).toBe(true);
  });
});
