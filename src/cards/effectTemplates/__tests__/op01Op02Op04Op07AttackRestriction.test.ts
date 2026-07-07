import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { cannotAttack } from '../../../engine/rules/shared/power';
import { buildBaseRig, makeCharacterDef, makeEventDef, putCharacterInPlay, putDon, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases/runEndPhaseAndHandoff';
import { buildRegistryFromAssignments } from '../assembler';
import { OP01_ASSIGNMENTS } from '../assignments/OP01';
import { OP02_ASSIGNMENTS } from '../assignments/OP02';
import { OP04_ASSIGNMENTS } from '../assignments/OP04';
import { OP07_ASSIGNMENTS } from '../assignments/OP07';
import type { DeclareAttackAction } from '../../../engine/actions/action';

const MR3 = makeCharacterDef({ cardDefinitionId: 'OP01-085', cardNumber: 'OP01-085', category: 'character', baseCost: 4, basePower: 5000 });
const HINA = makeCharacterDef({ cardDefinitionId: 'OP02-110', cardNumber: 'OP02-110', category: 'character', baseCost: 4, basePower: 4000 });
const BEGE = makeCharacterDef({ cardDefinitionId: 'OP04-100', cardNumber: 'OP04-100', category: 'character', baseCost: 2, basePower: 2000 });
const CAPOTE = makeCharacterDef({ cardDefinitionId: 'OP07-063', cardNumber: 'OP07-063', category: 'character', baseCost: 2, basePower: 3000 });
const FILLER = makeEventDef({ cardDefinitionId: 'SYN-FILLER', cardNumber: 'SYN-FILLER', category: 'event', baseCost: 1 });
const FOE_CHEAP = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-CHEAP', cardNumber: 'SYN-FOE-CHEAP', category: 'character', baseCost: 4, basePower: 4000 });

const registry = buildRegistryFromAssignments([...OP01_ASSIGNMENTS, ...OP02_ASSIGNMENTS, ...OP04_ASSIGNMENTS, ...OP07_ASSIGNMENTS]);

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId, attackerInstanceId, targetInstanceId };
}

describe('attack-restriction assignments across OP01/OP02/OP04/OP07', () => {
  it('OP01-085 restricts a cost-4-or-less opponent Character until the end of the opponent turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: { types: ['Baroque Works'] } });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', MR3));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_CHEAP));

    const fired = runTimings(registry['OP01-085'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['OP01-085'], fired.state, choice, [foeId], rig.defs, null, registry);

    const p2Turn = { ...resolved.state, activePlayerId: 'p2' as const, currentPhase: 'main' as const, turnNumber: 4 };
    const p1LeaderId = p2Turn.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(p2Turn, declareAttack('p2', foeId, p1LeaderId), rig.defs).legal).toBe(false);

    const afterEnd = runEndPhaseAndHandoff({ ...p2Turn, currentPhase: 'end' }, rig.defs, registry).state;
    expect(cannotAttack(afterEnd, foeId)).toBe(false);
  });

  it('OP02-110 applies a same-turn attack lock from [On Block]', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 4 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', HINA));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_CHEAP));

    const fired = runTimings(registry['OP02-110'], ['onBlock'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['OP02-110'], fired.state, choice, [foeId], rig.defs, null, registry);

    const p1LeaderId = resolved.state.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(resolved.state, declareAttack('p2', foeId, p1LeaderId), rig.defs).legal).toBe(false);
  });

  it('OP04-100 can target the opponent Leader and the restriction falls off at end of turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 4 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putInHand(rig, 'p1', BEGE));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_CHEAP));

    const fired = runTimings(registry['OP04-100'], ['lifeTrigger'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const p2LeaderId = fired.state.players.p2.leaderInstanceId;
    expect(choice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining([p2LeaderId, foeId]));

    const resolved = resumeProgram(registry['OP04-100'], fired.state, choice, [p2LeaderId], rig.defs, null, registry);
    const p1LeaderId = resolved.state.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(resolved.state, declareAttack('p2', p2LeaderId, p1LeaderId), rig.defs).legal).toBe(false);

    const afterEnd = runEndPhaseAndHandoff({ ...resolved.state, currentPhase: 'end' }, rig.defs, registry).state;
    expect(cannotAttack(afterEnd, p2LeaderId)).toBe(false);
  });

  it('OP07-063 pays DON!! −1, requires a {Foxy Pirates} Leader, and locks the chosen Character', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: { types: ['Foxy Pirates'] } });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', CAPOTE));
    let donIds: string[];
    ({ rig, donIds } = putDon(rig, 'p1', 1));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_CHEAP));

    const fired = runTimings(registry['OP07-063'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    expect(fired.state.pendingChoices).toHaveLength(1);
    const donChoice = fired.state.pendingChoices[0];
    expect(donChoice.constraints.candidateInstanceIds).toEqual(donIds);
    const afterCost = resumeProgram(registry['OP07-063'], fired.state, donChoice, donIds, rig.defs, null, registry);
    const choice = afterCost.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toEqual([foeId]);
    const resolved = resumeProgram(registry['OP07-063'], afterCost.state, choice, [foeId], rig.defs, null, registry);
    expect(resolved.state.continuousEffects.some((effect) => effect.attackRestriction?.appliesToInstanceId === foeId)).toBe(true);
  });
});
