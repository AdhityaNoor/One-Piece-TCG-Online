import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { computeCurrentCost } from '../../../engine/rules/shared';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { buildBaseRig, makeCharacterDef, makeEventDef, putCharacterInPlay, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases/runEndPhaseAndHandoff';
import { buildRegistryFromAssignments } from '../assembler';
import { OP10_ASSIGNMENTS } from '../assignments/OP10';
import { OP12_ASSIGNMENTS } from '../assignments/OP12';
import type { DeclareAttackAction } from '../../../engine/actions/action';

const BURGESS = makeCharacterDef({ cardDefinitionId: 'OP10-086', cardNumber: 'OP10-086', category: 'character', baseCost: 4, basePower: 5000 });
const KUZAN = makeCharacterDef({ cardDefinitionId: 'OP12-043', cardNumber: 'OP12-043', category: 'character', baseCost: 8, basePower: 9000 });
const HAND_FILLER = makeEventDef({ cardDefinitionId: 'SYN-HAND', cardNumber: 'SYN-HAND', category: 'event', baseCost: 1 });
const FOE_BASE3 = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-BASE3', cardNumber: 'SYN-FOE-BASE3', category: 'character', baseCost: 3, basePower: 3000 });
const FOE_BASE4 = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-BASE4', cardNumber: 'SYN-FOE-BASE4', category: 'character', baseCost: 4, basePower: 4000 });

const registry = buildRegistryFromAssignments([...OP10_ASSIGNMENTS, ...OP12_ASSIGNMENTS]);

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId, attackerInstanceId, targetInstanceId };
}

describe('OP10/OP12 assignments enabled by selfPlayedThisTurn and preventAttack', () => {
  it('OP10-086 keeps its [Opponent\'s Turn] +2000 buff and KOs only base-cost-3-or-less foes when played this turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5, leaderOverridesP1: { types: ['Blackbeard Pirates'] } });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', BURGESS, { enteredPlayTurn: 5 }));
    let cheapId: string;
    ({ rig, instanceId: cheapId } = putCharacterInPlay(rig, 'p2', FOE_BASE3));
    let expensiveId: string;
    ({ rig, instanceId: expensiveId } = putCharacterInPlay(rig, 'p2', FOE_BASE4));

    const staticState = runTimings(registry['OP10-086'], ['onEnterPlay'], rig.state, sourceId, rig.defs, null, registry).state;
    const activate = runTimings(registry['OP10-086'], ['activateMain'], staticState, sourceId, rig.defs, null, registry);
    const choice = activate.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toEqual([cheapId]);

    const resolved = resumeProgram(registry['OP10-086'], activate.state, choice, [cheapId], rig.defs, null, registry);
    expect(resolved.state.cardsById[cheapId].currentZone).toBe('trash');
    expect(resolved.state.cardsById[expensiveId].currentZone).toBe('characterArea');
  });

  it('OP10-086 [Activate: Main] is unavailable if the source was not played this turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5, leaderOverridesP1: { types: ['Blackbeard Pirates'] } });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', BURGESS, { enteredPlayTurn: 4 }));
    ({ rig } = putCharacterInPlay(rig, 'p2', FOE_BASE3));

    const fired = runTimings(registry['OP10-086'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    expect(fired.state.pendingChoices).toHaveLength(0);
  });

  it('OP12-043 gains +1 cost while the controller has 5 or more cards in hand', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', KUZAN));
    for (let i = 0; i < 5; i += 1) ({ rig } = putInHand(rig, 'p1', HAND_FILLER));

    const state = runTimings(registry['OP12-043'], ['onEnterPlay'], rig.state, sourceId, rig.defs, null, registry).state;
    expect(computeCurrentCost(rig.defs, state, sourceId)).toBe(9);
  });

  it('OP12-043 turns a trashed hand card into an attack lock until the end of the opponent turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', KUZAN));
    let fillerId: string;
    ({ rig, instanceId: fillerId } = putInHand(rig, 'p1', HAND_FILLER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_BASE3));

    const fired = runTimings(registry['OP12-043'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const trashChoice = fired.state.pendingChoices[0];
    const afterTrash = resumeProgram(registry['OP12-043'], fired.state, trashChoice, [fillerId], rig.defs, null, registry);
    const attackChoice = afterTrash.state.pendingChoices[0];
    const resolved = resumeProgram(registry['OP12-043'], afterTrash.state, attackChoice, [foeId], rig.defs, null, registry);

    const p2Turn = { ...resolved.state, activePlayerId: 'p2' as const, currentPhase: 'main' as const, turnNumber: 6 };
    const p1LeaderId = p2Turn.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(p2Turn, declareAttack('p2', foeId, p1LeaderId), rig.defs).legal).toBe(false);

    const afterEnd = runEndPhaseAndHandoff({ ...p2Turn, currentPhase: 'end' }, rig.defs, registry).state;
    expect(afterEnd.continuousEffects).toEqual([]);
  });
});
