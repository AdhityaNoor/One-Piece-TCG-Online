/**
 * Engine-capability test for the semantic family introduced by ST02:
 *   "set a card as active" (the inverse of `rest`, 2-4-3).
 *
 * Covers the shared `setActive` primitive through its three template functions:
 *   - setActiveSelf                    (fixed target, no choice)
 *   - setActiveControllerCharacter     (choose a filtered own Character)
 *   - setActiveControllerDon           (choose own rested DON!!)
 *
 * Synthetic cards + generic assignments — the family, not any single card number.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 1, basePower: 1000 });
const TARGET = makeCharacterDef({ cardDefinitionId: 'SYN-TGT', cardNumber: 'SYN-TGT', category: 'character', baseCost: 3, basePower: 4000, types: ['Supernovas'] });

function programFor(fn: CardEffectAssignment) {
  return buildRegistryFromAssignments([fn]);
}

describe('semantic family: setActive (inverse of rest)', () => {
  it('setActiveSelf un-rests the source and is a no-op when already active', () => {
    const assignment: CardEffectAssignment = { cardNumber: 'SYN-SRC', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'setActiveSelf' }] } };
    const registry = programFor(assignment);
    const base = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const { rig, instanceId } = putCharacterInPlay(base, 'p1', SRC, { orientation: 'rested' });

    const after = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, instanceId, rig.defs, null, registry).state;
    expect(after.cardsById[instanceId].orientation).toBe('active');

    // Idempotent: running again on an already-active card changes nothing.
    const again = runTimings(registry['SYN-SRC'], ['activateMain'], after, instanceId, rig.defs, null, registry).state;
    expect(again.cardsById[instanceId].orientation).toBe('active');
  });

  it('setActiveControllerCharacter offers only matching rested Characters, then activates the chosen one', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerCharacter', filter: { rested: true, maxCost: 5, anyOfTypes: ['Supernovas', 'Heart Pirates'] } }] },
    };
    const registry = programFor(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    let restedId: string;
    let activeId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: restedId } = putCharacterInPlay(rig, 'p1', TARGET, { orientation: 'rested' }));
    ({ rig, instanceId: activeId } = putCharacterInPlay(rig, 'p1', TARGET, { orientation: 'active' })); // already active → not a candidate

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toContain(restedId);
    expect(choice.constraints.candidateInstanceIds).not.toContain(activeId); // active excluded by rested:true filter

    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, choice, [restedId], rig.defs, null, registry);
    expect(resolved.state.cardsById[restedId].orientation).toBe('active');
  });

  it('setActiveControllerDon un-rests a chosen own rested DON!!', () => {
    const assignment: CardEffectAssignment = { cardNumber: 'SYN-SRC', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } };
    const registry = programFor(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 2, { rested: true });
    rig = withDon;

    const fired = runTimings(registry['SYN-SRC'], ['lifeTrigger'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining(donIds));

    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, choice, [donIds[0]], rig.defs, null, registry);
    expect(resolved.state.cardsById[donIds[0]].donRested).toBe(false); // set active
    expect(resolved.state.cardsById[donIds[1]].donRested).toBe(true); // untouched
  });
});
