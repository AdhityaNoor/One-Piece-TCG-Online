/**
 * Engine-capability tests for ST19-001 (Smoker) and ST19-003 (Tashigi), the two cards that
 * motivated the `preventAttack` op and `selfPlayedThisTurn` gate primitives:
 *
 * - ST19-001: [On Play] optional trashTypeFromHand -> preventAttack up to 2 opponent Characters
 *   (cost 4 or less) until the end of the opponent's next turn.
 * - ST19-003: [On Play] leaderName-gated -4 cost to an opponent Character; [Activate: Main]
 *   [Once Per Turn] gated on "this Character was played on this turn" -> KO an opponent
 *   Character with a cost of 0.
 *
 * Uses the actual ST19 assignments, not synthetic ones, since the family is fully reviewed.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { computeCurrentCost } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases/runEndPhaseAndHandoff';
import { buildRegistryFromAssignments } from '../assembler';
import { ST19_ASSIGNMENTS } from '../assignments/ST19';
import type { DeclareAttackAction } from '../../../engine/actions/action';

const SMOKER = makeCharacterDef({ cardDefinitionId: 'ST19-001', cardNumber: 'ST19-001', category: 'character', baseCost: 5, basePower: 6000 });
const TASHIGI = makeCharacterDef({ cardDefinitionId: 'ST19-003', cardNumber: 'ST19-003', category: 'character', baseCost: 2, basePower: 3000 });
const NAVY_FILLER = makeCharacterDef({ cardDefinitionId: 'SYN-NAVY-FILLER', cardNumber: 'SYN-NAVY-FILLER', category: 'character', colors: ['black'], types: ['Navy'], baseCost: 1, basePower: 1000 });
const FOE_CHEAP = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-CHEAP', cardNumber: 'SYN-FOE-CHEAP', category: 'character', baseCost: 3, basePower: 2000 });
const FOE_EXPENSIVE = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-EXPENSIVE', cardNumber: 'SYN-FOE-EXPENSIVE', category: 'character', baseCost: 8, basePower: 8000 });
const FOE_FREE = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-FREE', cardNumber: 'SYN-FOE-FREE', category: 'character', baseCost: 0, basePower: 1000 });

const registry = buildRegistryFromAssignments(ST19_ASSIGNMENTS);

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-atk', playerId, attackerInstanceId, targetInstanceId };
}

describe('ST19-001 Smoker — [On Play] optional trash -> preventAttack up to 2 cheap opponent Characters', () => {
  it('restricts up to 2 chosen opponent Characters (cost 4 or less) from attacking until the end of their controller\'s next turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let smokerId: string;
    ({ rig, instanceId: smokerId } = putCharacterInPlay(rig, 'p1', SMOKER));
    let navyCardId: string;
    ({ rig, instanceId: navyCardId } = putInHand(rig, 'p1', NAVY_FILLER));
    let cheapFoeId: string;
    ({ rig, instanceId: cheapFoeId } = putCharacterInPlay(rig, 'p2', FOE_CHEAP));
    let expensiveFoeId: string;
    ({ rig, instanceId: expensiveFoeId } = putCharacterInPlay(rig, 'p2', FOE_EXPENSIVE));

    const fired = runTimings(registry['ST19-001'], ['onPlay'], rig.state, smokerId, rig.defs, null, registry);
    const trashChoice = fired.state.pendingChoices[0];
    expect(trashChoice.constraints.candidateInstanceIds).toEqual([navyCardId]);

    const afterTrash = resumeProgram(registry['ST19-001'], fired.state, trashChoice, [navyCardId], rig.defs, null, registry);
    const restrictChoice = afterTrash.state.pendingChoices[0];
    // Only the cost-4-or-less foe is a legal candidate; the cost-8 foe is filtered out.
    expect(restrictChoice.constraints.candidateInstanceIds).toEqual([cheapFoeId]);

    const resolved = resumeProgram(registry['ST19-001'], afterTrash.state, restrictChoice, [cheapFoeId], rig.defs, null, registry);
    const opponentLeaderId = resolved.state.players.p1.leaderInstanceId;

    // It is now p2's turn (the restricted Character's controller) — the restriction should block the attack.
    const p2Turn = { ...resolved.state, currentPhase: 'main' as const, activePlayerId: 'p2' as const, turnNumber: 4 };
    const rejected = validateDeclareAttack(p2Turn, declareAttack('p2', cheapFoeId, opponentLeaderId), rig.defs);
    expect(rejected.legal).toBe(false);
    expect(rejected.reasons.join(' ')).toMatch(/attack/i);

    // Expires only once p2's own End Phase passes (the restricted Character's controller's next turn).
    const afterP2EndPhase = runEndPhaseAndHandoff({ ...p2Turn, currentPhase: 'end' });
    expect(afterP2EndPhase.state.continuousEffects).toEqual([]);
    const stillBlockedCheck = validateDeclareAttack({ ...afterP2EndPhase.state, currentPhase: 'main', activePlayerId: 'p2' }, declareAttack('p2', cheapFoeId, opponentLeaderId), rig.defs);
    expect(stillBlockedCheck.reasons.some((r) => /card effect is preventing it from attacking/.test(r))).toBe(false);
  });

  it('does not offer the attack-restriction payoff when the player declines to trash a Navy card', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let smokerId: string;
    ({ rig, instanceId: smokerId } = putCharacterInPlay(rig, 'p1', SMOKER));
    ({ rig } = putInHand(rig, 'p1', NAVY_FILLER));
    let cheapFoeId: string;
    ({ rig, instanceId: cheapFoeId } = putCharacterInPlay(rig, 'p2', FOE_CHEAP));

    const fired = runTimings(registry['ST19-001'], ['onPlay'], rig.state, smokerId, rig.defs, null, registry);
    const trashChoice = fired.state.pendingChoices[0];
    const declined = resumeProgram(registry['ST19-001'], fired.state, trashChoice, [], rig.defs, null, registry);
    expect(declined.state.pendingChoices).toHaveLength(0);
    expect(declined.state.continuousEffects).toEqual([]);

    const opponentLeaderId = declined.state.players.p1.leaderInstanceId;
    const p2Turn = { ...declined.state, currentPhase: 'main' as const, activePlayerId: 'p2' as const, turnNumber: 4 };
    expect(validateDeclareAttack(p2Turn, declareAttack('p2', cheapFoeId, opponentLeaderId), rig.defs).legal).toBe(true);
  });
});

describe('ST19-003 Tashigi', () => {
  it('[On Play] gives an opponent Character -4 cost during this turn only when the Leader is Smoker', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: { name: 'Smoker' } });
    let tashigiId: string;
    ({ rig, instanceId: tashigiId } = putCharacterInPlay(rig, 'p1', TASHIGI));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_CHEAP));

    const fired = runTimings(registry['ST19-003'], ['onPlay'], rig.state, tashigiId, rig.defs, null, registry);
    const costChoice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['ST19-003'], fired.state, costChoice, [foeId], rig.defs, null, registry);
    // FOE_CHEAP has baseCost 3; -4 would go negative, but cost floors at 0.
    expect(computeCurrentCost(rig.defs, resolved.state, foeId)).toBe(0);
  });

  it('[On Play] does nothing when the Leader is not Smoker', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let tashigiId: string;
    ({ rig, instanceId: tashigiId } = putCharacterInPlay(rig, 'p1', TASHIGI));

    const fired = runTimings(registry['ST19-003'], ['onPlay'], rig.state, tashigiId, rig.defs, null, registry);
    expect(fired.state.pendingChoices).toHaveLength(0);
  });

  it('[Activate: Main] KOs a 0-cost opponent Character only if this Character was played this turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let tashigiId: string;
    ({ rig, instanceId: tashigiId } = putCharacterInPlay(rig, 'p1', TASHIGI, { enteredPlayTurn: 3 }));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_FREE));

    const fired = runTimings(registry['ST19-003'], ['activateMain'], rig.state, tashigiId, rig.defs, null, registry);
    const koChoice = fired.state.pendingChoices[0];
    expect(koChoice.constraints.candidateInstanceIds).toEqual([foeId]);
    const resolved = resumeProgram(registry['ST19-003'], fired.state, koChoice, [foeId], rig.defs, null, registry);
    expect(resolved.state.cardsById[foeId].currentZone).toBe('trash');
  });

  it('[Activate: Main] is unavailable when this Character was played on an earlier turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let tashigiId: string;
    ({ rig, instanceId: tashigiId } = putCharacterInPlay(rig, 'p1', TASHIGI, { enteredPlayTurn: 3 }));
    ({ rig } = putCharacterInPlay(rig, 'p2', FOE_FREE));

    const fired = runTimings(registry['ST19-003'], ['activateMain'], rig.state, tashigiId, rig.defs, null, registry);
    expect(fired.state.pendingChoices).toHaveLength(0);
  });
});
