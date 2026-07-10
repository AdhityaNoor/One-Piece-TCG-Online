import { describe, expect, it } from 'vitest';
import { runRefreshPhase } from '../runRefreshPhase';
import { runTimings, resumeProgram } from '../../../effects/interpreter';
import { runEndPhaseAndHandoff } from '../runEndPhaseAndHandoff';
import { buildBaseRig, putCharacterInPlay, putDon, makeCharacterDef, makeStageDef, putStageInPlay, putInHand, makeLeaderDef } from '../../shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../../cards/effectTemplates/assembler';
import { OP05_ASSIGNMENTS } from '../../../../cards/effectTemplates/assignments/OP05';
import { OP13_ASSIGNMENTS } from '../../../../cards/effectTemplates/assignments/OP13';

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

  it('Birdcage refresh lock keeps cost-5-or-less Characters rested during Refresh', () => {
    const doflamingo = makeLeaderDef({ cardNumber: 'OP05-001', name: 'Donquixote Doflamingo' });
    const cheap = makeCharacterDef({ cardDefinitionId: 'SYN-CHEAP', cardNumber: 'SYN-CHEAP', category: 'character', baseCost: 3, basePower: 3000 });
    const expensive = makeCharacterDef({ cardDefinitionId: 'SYN-EXP', cardNumber: 'SYN-EXP', category: 'character', baseCost: 7, basePower: 7000 });
    const birdcage = makeStageDef({ cardDefinitionId: 'OP05-040', cardNumber: 'OP05-040', name: 'Birdcage', baseCost: 5 });
    let rig = buildBaseRig({ phase: 'refresh', activePlayerId: 'p1', leaderOverridesP1: doflamingo });
    rig = { ...rig, defs: { ...rig.defs, [cheap.cardDefinitionId]: cheap, [expensive.cardDefinitionId]: expensive, [birdcage.cardDefinitionId]: birdcage } };
    const registry = buildRegistryFromAssignments(OP05_ASSIGNMENTS);
    let cheapId: string;
    let expensiveId: string;
    let stageId: string;
    ({ rig, instanceId: cheapId } = putCharacterInPlay(rig, 'p1', cheap, { orientation: 'rested' }));
    ({ rig, instanceId: expensiveId } = putCharacterInPlay(rig, 'p1', expensive, { orientation: 'rested' }));
    ({ rig, instanceId: stageId } = putStageInPlay(rig, 'p1', birdcage));
    const entered = runTimings(registry['OP05-040'], ['onEnterPlay'], rig.state, stageId, rig.defs, null, registry).state;
    expect(entered.continuousEffects.some((ce) => ce.refreshCostRestriction?.maxCost === 5)).toBe(true);

    const refreshed = runRefreshPhase(entered, rig.defs).state;
    expect(refreshed.cardsById[cheapId].orientation).toBe('rested');
    expect(refreshed.cardsById[expensiveId].orientation).toBe('active');
  });
});

describe('deferred coverage: reveal + refresh riders', () => {
  it('OP13-024 optional reveal schedules set-active DON at end of turn', () => {
    const MUSIC = makeCharacterDef({ cardDefinitionId: 'SYN-MUSIC', cardNumber: 'SYN-MUSIC', category: 'character', types: ['Music'], baseCost: 2 });
    const GORDON = makeCharacterDef({ cardDefinitionId: 'OP13-024', cardNumber: 'OP13-024', category: 'character', baseCost: 4 });
    const assignment = OP13_ASSIGNMENTS.find((a) => a.cardNumber === 'OP13-024')!;
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    rig = { ...rig, defs: { ...rig.defs, [MUSIC.cardDefinitionId]: MUSIC, [GORDON.cardDefinitionId]: GORDON } };
    let sourceId: string;
    let musicId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', GORDON));
    ({ rig, instanceId: musicId } = putInHand(rig, 'p1', MUSIC));
    const withDon = putDon(rig, 'p1', 2, { rested: true });

    const fired = runTimings(registry['OP13-024'], ['onPlay'], withDon.rig.state, sourceId, withDon.rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice).toBeDefined();
    const resolved = resumeProgram(registry['OP13-024'], fired.state, choice!, [musicId], withDon.rig.defs, null, registry);
    expect(resolved.state.delayedEffects?.some((e) => e.kind === 'setActiveControllerDonAtEndOfTurn')).toBe(true);

    const ended = runEndPhaseAndHandoff({ ...resolved.state, currentPhase: 'end' }, withDon.rig.defs, registry).state;
    const activeDon = ended.players.p1.costArea.cardIds.filter((id) => ended.cardsById[id]?.donRested === false);
    expect(activeDon.length).toBeGreaterThanOrEqual(1);
  });

  it('preventRefresh applies only when debuffed Character has cost 0', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        functions: [
          { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, duration: 'duringThisTurn', optional: true },
          { fn: 'preventRefresh', target: { ref: 'previous' }, maxCost: 0, ifPrevious: 'previousSelectedAny' },
        ],
      },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    const stillPositive = makeCharacterDef({ cardDefinitionId: 'SYN-CHEAP', cardNumber: 'SYN-CHEAP', category: 'character', baseCost: 4, basePower: 4000 });
    const free = makeCharacterDef({ cardDefinitionId: 'SYN-FREE', cardNumber: 'SYN-FREE', category: 'character', baseCost: 0, basePower: 1000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    rig = { ...rig, defs: { ...rig.defs, [stillPositive.cardDefinitionId]: stillPositive, [free.cardDefinitionId]: free } };
    let stillPositiveId: string;
    let freeId: string;
    ({ rig, instanceId: stillPositiveId } = putCharacterInPlay(rig, 'p2', stillPositive, { orientation: 'rested' }));
    ({ rig, instanceId: freeId } = putCharacterInPlay(rig, 'p2', free, { orientation: 'rested' }));

    const sourceId = rig.state.players.p1.leaderInstanceId;
    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, choice!, [freeId], rig.defs, null, registry);
    expect(resolved.state.cardsById[freeId].skipNextRefresh).toBe(true);
    expect(resolved.state.cardsById[stillPositiveId].skipNextRefresh).toBeUndefined();

    const firedPositive = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const choicePositive = firedPositive.state.pendingChoices[0];
    const resolvedPositive = resumeProgram(registry['SYN-SRC'], firedPositive.state, choicePositive!, [stillPositiveId], rig.defs, null, registry);
    expect(resolvedPositive.state.cardsById[stillPositiveId].skipNextRefresh).toBeUndefined();
  });
});
