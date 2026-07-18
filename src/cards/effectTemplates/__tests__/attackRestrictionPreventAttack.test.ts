import { describe, expect, it } from 'vitest';
import type { DeclareAttackAction } from '../../../engine/actions/action';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases/runEndPhaseAndHandoff';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { buildBaseRig, makeCharacterDef, makeEventDef, putCharacterInPlay, putDeckCards, putInHand, putLifeCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP04_ASSIGNMENTS } from '../assignments/OP04';
import { OP05_ASSIGNMENTS } from '../assignments/OP05';
import { OP14_ASSIGNMENTS } from '../assignments/OP14';

const registry = buildRegistryFromAssignments([...OP04_ASSIGNMENTS, ...OP05_ASSIGNMENTS, ...OP14_ASSIGNMENTS]);

const GOLDENWEEK = makeCharacterDef({ cardDefinitionId: 'OP04-065', cardNumber: 'OP04-065', baseCost: 2, basePower: 3000 });
const ISSHO = makeCharacterDef({ cardDefinitionId: 'OP05-042', cardNumber: 'OP05-042', baseCost: 8, basePower: 9000 });
const CROCODILE = makeCharacterDef({ cardDefinitionId: 'OP14-120', cardNumber: 'OP14-120', baseCost: 9, basePower: 9000 });
const FRIGHTEN_EVENT = makeEventDef({ cardDefinitionId: 'OP14-118', cardNumber: 'OP14-118' });
const FOE_FIVE = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-5', cardNumber: 'SYN-FOE-5', baseCost: 5, basePower: 5000 });
const FOE_SEVEN = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-7', cardNumber: 'SYN-FOE-7', baseCost: 7, basePower: 7000 });
const FOE_NINE = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-9', cardNumber: 'SYN-FOE-9', baseCost: 9, basePower: 9000 });
const FOE_TEN = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-10', cardNumber: 'SYN-FOE-10', baseCost: 10, basePower: 10000 });

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId, attackerInstanceId, targetInstanceId };
}

function expectBlockedUntilTurnEnds(state: ReturnType<typeof buildBaseRig>['state'], defs: ReturnType<typeof buildBaseRig>['defs'], attackerId: string, targetId: string): void {
  expect(validateDeclareAttack(state, declareAttack('p2', attackerId, targetId), defs).legal).toBe(false);
}

describe('preventAttack curated assignments', () => {
  it.each([
    { cardNumber: 'OP04-065', sourceDef: GOLDENWEEK, foeDef: FOE_FIVE },
    { cardNumber: 'OP05-042', sourceDef: ISSHO, foeDef: FOE_SEVEN },
  ])('%s blocks an opponent Character until your next turn starts', ({ cardNumber, sourceDef, foeDef }) => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', leaderOverridesP1: { types: ['Baroque Works'] } });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', sourceDef));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', foeDef));

    const fired = runTimings(registry[cardNumber], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const resolved = resumeProgram(registry[cardNumber], fired.state, fired.state.pendingChoices[0], [foeId], rig.defs, null, registry);
    const p2Turn = { ...resolved.state, activePlayerId: 'p2' as const, currentPhase: 'main' as const, turnNumber: 4 };
    const p1LeaderId = p2Turn.players.p1.leaderInstanceId;
    expectBlockedUntilTurnEnds(p2Turn, rig.defs, foeId, p1LeaderId);

    const afterP2End = runEndPhaseAndHandoff({ ...p2Turn, currentPhase: 'end' });
    expect(validateDeclareAttack({ ...afterP2End.state, activePlayerId: 'p2', currentPhase: 'main' }, declareAttack('p2', foeId, p1LeaderId), rig.defs).legal).toBe(true);
  });

  it('OP14-118 only offers active opposing Characters and blocks them during this turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    let eventId: string;
    ({ rig, instanceId: eventId } = putInHand(rig, 'p1', FRIGHTEN_EVENT));
    ({ rig } = putLifeCards(rig, 'p1', [makeCharacterDef(), makeCharacterDef()]));
    let activeFoeId: string;
    ({ rig, instanceId: activeFoeId } = putCharacterInPlay(rig, 'p2', FOE_FIVE, { orientation: 'active' }));
    ({ rig } = putCharacterInPlay(rig, 'p2', FOE_SEVEN, { orientation: 'rested' }));

    const fired = runTimings(registry['OP14-118'], ['counter'], rig.state, eventId, rig.defs, null, registry);
    expect(fired.state.pendingChoices[0].constraints.candidateInstanceIds).toEqual([activeFoeId]);

    const resolved = resumeProgram(registry['OP14-118'], fired.state, fired.state.pendingChoices[0], [activeFoeId], rig.defs, null, registry);
    const p1LeaderId = resolved.state.players.p1.leaderInstanceId;
    expectBlockedUntilTurnEnds(resolved.state, rig.defs, activeFoeId, p1LeaderId);
  });

  it('OP14-120 only targets cost-9-or-less Characters and the lock expires after the opponent end phase', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', CROCODILE));
    let legalFoeId: string;
    ({ rig, instanceId: legalFoeId } = putCharacterInPlay(rig, 'p2', FOE_NINE));
    ({ rig } = putCharacterInPlay(rig, 'p2', FOE_TEN));
    // Then-draw fires (Crocodile is cost 9 / FOE_TEN is cost 10) — keep a deck so
    // resolution does not deck-out and short-circuit End Phase expiry cleanup.
    ({ rig } = putDeckCards(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'syn-deck-filler', cardNumber: 'SYN-DECK' }), 2));

    const fired = runTimings(registry['OP14-120'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    expect(fired.state.pendingChoices[0].constraints.candidateInstanceIds).toEqual([legalFoeId]);

    const resolved = resumeProgram(registry['OP14-120'], fired.state, fired.state.pendingChoices[0], [legalFoeId], rig.defs, null, registry);
    expect(resolved.state.gameOver).toBeNull();
    const p2Turn = { ...resolved.state, activePlayerId: 'p2' as const, currentPhase: 'main' as const, turnNumber: 4 };
    const p1LeaderId = p2Turn.players.p1.leaderInstanceId;
    expectBlockedUntilTurnEnds(p2Turn, rig.defs, legalFoeId, p1LeaderId);

    const afterP2End = runEndPhaseAndHandoff({ ...p2Turn, currentPhase: 'end' });
    expect(validateDeclareAttack({ ...afterP2End.state, activePlayerId: 'p2', currentPhase: 'main' }, declareAttack('p2', legalFoeId, p1LeaderId), rig.defs).legal).toBe(true);
  });
});
