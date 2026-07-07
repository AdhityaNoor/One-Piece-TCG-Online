import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { buildBaseRig, makeCharacterDef, makeEventDef, putCharacterInPlay, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases/runEndPhaseAndHandoff';
import type { DeclareAttackAction } from '../../../engine/actions/action';
import { buildRegistryFromAssignments } from '../assembler';
import { EB_ASSIGNMENTS } from '../assignments/EB';

const CARROT = makeCharacterDef({ cardDefinitionId: 'EB03-013', cardNumber: 'EB03-013', category: 'character', baseCost: 4, basePower: 5000 });
const ICE_TIME = makeEventDef({ cardDefinitionId: 'EB04-028', cardNumber: 'EB04-028', category: 'event', baseCost: 3 });
const ZOU = makeCharacterDef({ cardDefinitionId: 'SYN-ZOU', cardNumber: 'SYN-ZOU', category: 'character', name: 'Zou', baseCost: 3, basePower: 4000 });
const HAND_FILLER = makeEventDef({ cardDefinitionId: 'SYN-FILLER', cardNumber: 'SYN-FILLER', category: 'event', baseCost: 1 });
const FOE_RESTED = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-RESTED', cardNumber: 'SYN-FOE-RESTED', category: 'character', baseCost: 5, basePower: 5000 });
const FOE_ATTACKER = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-ATTACKER', cardNumber: 'SYN-FOE-ATTACKER', category: 'character', baseCost: 4, basePower: 4000 });

const registry = buildRegistryFromAssignments(EB_ASSIGNMENTS);

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId, attackerInstanceId, targetInstanceId };
}

describe('EB assignments enabled by selfPlayedThisTurn and preventAttack', () => {
  it('EB03-013 KOs a rested cost-5-or-less foe and then plays [Zou] from hand when played this turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', CARROT, { enteredPlayTurn: 5 }));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_RESTED, { orientation: 'rested' }));
    let zouId: string;
    ({ rig, instanceId: zouId } = putInHand(rig, 'p1', ZOU));

    const fired = runTimings(registry['EB03-013'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const koChoice = fired.state.pendingChoices[0];
    const afterKo = resumeProgram(registry['EB03-013'], fired.state, koChoice, [foeId], rig.defs, null, registry);
    const playChoice = afterKo.state.pendingChoices[0];
    expect(playChoice.constraints.candidateInstanceIds).toEqual([zouId]);

    const resolved = resumeProgram(registry['EB03-013'], afterKo.state, playChoice, [zouId], rig.defs, null, registry).state;
    expect(resolved.cardsById[foeId].currentZone).toBe('trash');
    expect(resolved.players.p1.hand.cardIds).not.toContain(zouId);
    expect(resolved.players.p1.characterArea.cardIds.some((id) => resolved.cardsById[id].cardDefinitionId === ZOU.cardDefinitionId)).toBe(true);
  });

  it('EB03-013 does nothing on later turns', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', CARROT, { enteredPlayTurn: 5 }));
    ({ rig } = putCharacterInPlay(rig, 'p2', FOE_RESTED, { orientation: 'rested' }));

    const fired = runTimings(registry['EB03-013'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    expect(fired.state.pendingChoices).toHaveLength(0);
  });

  it('EB04-028 turns an optional trash into an attack lock on up to 2 opponent Characters', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5, leaderOverridesP1: { types: ['Navy'] } });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putInHand(rig, 'p1', ICE_TIME));
    let fillerId: string;
    ({ rig, instanceId: fillerId } = putInHand(rig, 'p1', HAND_FILLER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_ATTACKER));

    const fired = runTimings(registry['EB04-028'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const trashChoice = fired.state.pendingChoices[0];
    const afterTrash = resumeProgram(registry['EB04-028'], fired.state, trashChoice, [fillerId], rig.defs, null, registry);
    const restrictChoice = afterTrash.state.pendingChoices[0];
    const resolved = resumeProgram(registry['EB04-028'], afterTrash.state, restrictChoice, [foeId], rig.defs, null, registry);

    const p2Turn = { ...resolved.state, activePlayerId: 'p2' as const, currentPhase: 'main' as const, turnNumber: 6 };
    const p1LeaderId = p2Turn.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(p2Turn, declareAttack('p2', foeId, p1LeaderId), rig.defs).legal).toBe(false);
    expect(runEndPhaseAndHandoff({ ...p2Turn, currentPhase: 'end' }, rig.defs, registry).state.continuousEffects).toEqual([]);
  });

  it('EB04-028 [Trigger] returns any cost-5-or-less Character to its owner hand', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putInHand(rig, 'p1', ICE_TIME));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_ATTACKER));

    const fired = runTimings(registry['EB04-028'], ['lifeTrigger'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['EB04-028'], fired.state, choice, [foeId], rig.defs, null, registry).state;
    expect(resolved.cardsById[foeId].currentZone).toBe('hand');
    expect(resolved.players.p2.hand.cardIds).toContain(foeId);
  });
});
