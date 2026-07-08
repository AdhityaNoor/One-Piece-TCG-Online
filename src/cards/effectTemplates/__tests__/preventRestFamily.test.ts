import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases/runEndPhaseAndHandoff';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { applyTemplate } from '../catalog/factories';

const SOURCE = makeCharacterDef({ cardDefinitionId: 'SRC-PREVENT-REST', cardNumber: 'SRC-PREVENT-REST', category: 'character', baseCost: 3, basePower: 4000 });
const RESTER = makeCharacterDef({ cardDefinitionId: 'SRC-REST', cardNumber: 'SRC-REST', category: 'character', baseCost: 2, basePower: 3000 });
const FOE = makeCharacterDef({ cardDefinitionId: 'FOE-C5', cardNumber: 'FOE-C5', category: 'character', baseCost: 5, basePower: 5000 });

const preventRestProgram = applyTemplate('SRC-PREVENT-REST', 'ability', {
  timing: 'onPlay',
  functions: [{ fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, duration: 'endOfOpponentsTurn', optional: true }],
});

const restProgram = applyTemplate('SRC-REST', 'ability', {
  timing: 'onPlay',
  functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }],
});

describe('preventRest family', () => {
  it('prevents effect-driven rest until the end of the opponent turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SOURCE));
    let resterId: string;
    ({ rig, instanceId: resterId } = putCharacterInPlay(rig, 'p1', RESTER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE));

    const registered = runTimings(preventRestProgram, ['onPlay'], rig.state, sourceId, rig.defs, null, {});
    const registeredChoice = registered.state.pendingChoices[0];
    const protectedState = resumeProgram(preventRestProgram, registered.state, registeredChoice, [foeId], rig.defs, null, {}).state;
    expect(protectedState.continuousEffects.some((effect) => effect.restRestriction?.appliesToInstanceId === foeId)).toBe(true);

    const rested = runTimings(restProgram, ['onPlay'], protectedState, resterId, rig.defs, null, {});
    const restChoice = rested.state.pendingChoices[0];
    const afterRestAttempt = resumeProgram(restProgram, rested.state, restChoice, [foeId], rig.defs, null, {}).state;
    expect(afterRestAttempt.cardsById[foeId].orientation).toBe('active');

    const p2Turn = { ...afterRestAttempt, activePlayerId: 'p2' as const, currentPhase: 'end' as const, turnNumber: 6 };
    expect(runEndPhaseAndHandoff(p2Turn, rig.defs, {}).state.continuousEffects).toEqual([]);
  });
});
