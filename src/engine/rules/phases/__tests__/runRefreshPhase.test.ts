import { describe, expect, it } from 'vitest';
import { runRefreshPhase } from '../runRefreshPhase';
import { buildBaseRig, putCharacterInPlay, putDon, makeCharacterDef, makeStageDef, putStageInPlay } from '../../shared/__tests__/testRig';

describe('runRefreshPhase', () => {
  it("returns given DON!!, activates rested field cards, clears summoning sickness, and un-rests cost-area DON!! for the active player only", () => {
    const base = buildBaseRig({ phase: 'refresh', activePlayerId: 'p1' });
    const leaderId = base.state.players.p1.leaderInstanceId;
    const { rig: r1, instanceId: charId } = putCharacterInPlay(base, 'p1', makeCharacterDef(), {
      orientation: 'rested',
      summoningSick: true,
      donAttached: ['fake-don'],
      oncePerTurnUsed: ['some-effect'],
    });
    const { rig: r2, instanceId: oppCharId } = putCharacterInPlay(r1, 'p2', makeCharacterDef(), {
      orientation: 'rested',
      summoningSick: true,
    });
    const { rig: r3, instanceId: stageId } = putStageInPlay(r2, 'p1', makeStageDef(), {
      orientation: 'rested',
      oncePerTurnUsed: ['stage-effect'],
    });
    const { rig, donIds } = putDon(r3, 'p1', 2, { rested: true });

    const stateWithUsage = {
      ...rig.state,
      cardsById: {
        ...rig.state.cardsById,
        [leaderId]: { ...rig.state.cardsById[leaderId], orientation: 'rested' as const, donAttached: ['fake-don-2'] },
      },
      oncePerTurnUsage: { [`${charId}:eff1`]: true as const, [`${oppCharId}:eff2`]: true as const },
    };

    const result = runRefreshPhase(stateWithUsage);

    // Active player's Leader: active again, DON!! detached.
    expect(result.state.cardsById[leaderId].orientation).toBe('active');
    expect(result.state.cardsById[leaderId].donAttached).toEqual([]);

    // Active player's Character: active, no longer summoning sick, DON!! detached, oncePerTurnUsed cleared.
    expect(result.state.cardsById[charId].orientation).toBe('active');
    expect(result.state.cardsById[charId].summoningSick).toBe(false);
    expect(result.state.cardsById[charId].donAttached).toEqual([]);
    expect(result.state.cardsById[charId].oncePerTurnUsed).toEqual([]);

    // Active player's Stage: active again and oncePerTurnUsed cleared.
    expect(result.state.cardsById[stageId].orientation).toBe('active');
    expect(result.state.cardsById[stageId].oncePerTurnUsed).toEqual([]);

    // Active player's cost-area DON!! un-rested.
    for (const donId of donIds) {
      expect(result.state.cardsById[donId].donRested).toBe(false);
    }

    // Opponent's rested/summoning-sick Character is untouched.
    expect(result.state.cardsById[oppCharId].orientation).toBe('rested');
    expect(result.state.cardsById[oppCharId].summoningSick).toBe(true);

    // Global oncePerTurnUsage: only the active player's controlled-card entry is cleared.
    expect(result.state.oncePerTurnUsage[`${charId}:eff1`]).toBeUndefined();
    expect(result.state.oncePerTurnUsage[`${oppCharId}:eff2`]).toBe(true);

    expect(result.state.currentPhase).toBe('draw');
    expect(result.log).toHaveLength(1);
    expect(result.log[0].type).toBe('PHASE_CHANGED');
  });
});
