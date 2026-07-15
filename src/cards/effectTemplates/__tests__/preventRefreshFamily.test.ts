/**
 * Engine-capability test for the `preventRefresh` verb + Refresh-Phase interaction added for the
 * DON-denial archetype (OP08-022/023/024/025/026, OP11-028, …):
 *   "Up to 1 of your opponent's rested Characters will not become active in your opponent's next
 *    Refresh Phase."
 *
 * The verb sets a one-shot `skipNextRefresh` flag on chosen targets; runRefreshPhase leaves a flagged
 * card rested for exactly one Refresh, then clears the flag. This test spans both layers: applying
 * the effect, then running the opponent's Refresh Phase twice.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { runRefreshPhase } from '../../../engine/rules/phases/runRefreshPhase';
import { buildBaseRig, makeCharacterDef, makeStageDef, putCharacterInPlay, putStageInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3, basePower: 4000 });
const OPP = makeCharacterDef({ cardDefinitionId: 'SYN-OPP', cardNumber: 'SYN-OPP', category: 'character', baseCost: 2, basePower: 3000 });
const OPP_STAGE = makeStageDef({ cardDefinitionId: 'SYN-OPP-STAGE', cardNumber: 'SYN-OPP-STAGE', category: 'stage', baseCost: 2 });

describe('family: preventRefresh (will not become active in next Refresh Phase)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true }] },
  };

  it('keeps the flagged opponent Character rested for one Refresh, clears the flag, and un-rests it the Refresh after', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let flaggedId: string;
    let freeId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: flaggedId } = putCharacterInPlay(rig, 'p2', OPP, { orientation: 'rested' }));
    ({ rig, instanceId: freeId } = putCharacterInPlay(rig, 'p2', OPP, { orientation: 'rested' }));

    // p1 resolves the effect, choosing the flagged opponent Character.
    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining([flaggedId, freeId]));
    let state = resumeProgram(registry['SYN-SRC'], fired.state, choice, [flaggedId], rig.defs, null, registry).state;
    expect(state.cardsById[flaggedId].skipNextRefresh).toBe(true);

    // The opponent's Refresh Phase: flagged one stays rested (flag consumed), the other becomes active.
    state = { ...state, activePlayerId: 'p2' };
    const afterFirst = runRefreshPhase(state).state;
    expect(afterFirst.cardsById[flaggedId].orientation).toBe('rested');
    expect(afterFirst.cardsById[flaggedId].skipNextRefresh).toBe(false);
    expect(afterFirst.cardsById[freeId].orientation).toBe('active');

    // A second Refresh (flag already cleared) un-rests the previously-flagged Character.
    const stillRested = { ...afterFirst, activePlayerId: 'p2', cardsById: { ...afterFirst.cardsById, [flaggedId]: { ...afterFirst.cardsById[flaggedId], orientation: 'rested' as const } } };
    const afterSecond = runRefreshPhase(stillRested).state;
    expect(afterSecond.cardsById[flaggedId].orientation).toBe('active');
  });

  it('can choose a rested opponent Stage when the target is Characters or Stages', () => {
    const stageAssignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'charactersOrStages', player: 'opponent', filter: { rested: true } }, optional: true }] },
    };
    const registry = buildRegistryFromAssignments([stageAssignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let stageId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: stageId } = putStageInPlay(rig, 'p2', OPP_STAGE, { orientation: 'rested' }));

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toContain(stageId);
    let state = resumeProgram(registry['SYN-SRC'], fired.state, choice, [stageId], rig.defs, null, registry).state;
    expect(state.cardsById[stageId].skipNextRefresh).toBe(true);

    state = { ...state, activePlayerId: 'p2' };
    const afterRefresh = runRefreshPhase(state).state;
    expect(afterRefresh.cardsById[stageId].orientation).toBe('rested');
    expect(afterRefresh.cardsById[stageId].skipNextRefresh).toBe(false);
  });
});
