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
import { runDonPhase, runEndPhaseAndHandoff } from '../../../engine/rules/phases';
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

  // "Set up to N DON!! as active at the end of this turn": N > 1 asks the player HOW MANY
  // (0..N) when the ability resolves, and schedules exactly that many. Only maxTargets: 1
  // schedules straight through.
  const donEotAssignment = (maxTargets: number): CardEffectAssignment => ({
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDonAtEndOfTurn', maxTargets }] },
  });

  const donEotRig = () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const withDon = putDon(rig, 'p1', 3, { rested: true });
    return { rig: withDon.rig, sourceId, donIds: withDon.donIds };
  };

  it('setActiveControllerDonAtEndOfTurn asks how many, then schedules that many', () => {
    const registry = programFor(donEotAssignment(2));
    const { rig, sourceId, donIds } = donEotRig();

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.kind).toBe('SELECT_OPTION');
    expect((choice.constraints.options ?? []).map((o) => o.label)).toEqual(['None', '1', '2']);
    expect(fired.state.delayedEffects ?? []).toHaveLength(0); // nothing scheduled until answered

    // Pick "2".
    const scheduled = resumeProgram(registry['SYN-SRC'], fired.state, choice, 2, rig.defs, null, registry);
    expect(scheduled.state.delayedEffects).toHaveLength(1);

    const ended = runEndPhaseAndHandoff({ ...scheduled.state, currentPhase: 'end' }, rig.defs, registry).state;
    expect(ended.cardsById[donIds[0]].donRested).toBe(false);
    expect(ended.cardsById[donIds[1]].donRested).toBe(false);
    expect(ended.cardsById[donIds[2]].donRested).toBe(true);
    expect(ended.delayedEffects ?? []).toHaveLength(0);
  });

  it('honours a SMALLER chosen count', () => {
    const registry = programFor(donEotAssignment(2));
    const { rig, sourceId, donIds } = donEotRig();

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const scheduled = resumeProgram(registry['SYN-SRC'], fired.state, fired.state.pendingChoices[0], 1, rig.defs, null, registry);

    const ended = runEndPhaseAndHandoff({ ...scheduled.state, currentPhase: 'end' }, rig.defs, registry).state;
    expect(ended.cardsById[donIds[0]].donRested).toBe(false);
    expect(ended.cardsById[donIds[1]].donRested).toBe(true);
    expect(ended.cardsById[donIds[2]].donRested).toBe(true);
  });

  it('"None" schedules nothing at all', () => {
    const registry = programFor(donEotAssignment(2));
    const { rig, sourceId, donIds } = donEotRig();

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const declined = resumeProgram(registry['SYN-SRC'], fired.state, fired.state.pendingChoices[0], 0, rig.defs, null, registry);

    expect(declined.state.delayedEffects ?? []).toHaveLength(0);
    const ended = runEndPhaseAndHandoff({ ...declined.state, currentPhase: 'end' }, rig.defs, registry).state;
    for (const id of donIds) expect(ended.cardsById[id].donRested).toBe(true);
  });

  it('maxTargets: 1 schedules straight through with no prompt', () => {
    const registry = programFor(donEotAssignment(1));
    const { rig, sourceId, donIds } = donEotRig();

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    expect(fired.state.pendingChoices).toHaveLength(0);
    expect(fired.state.delayedEffects).toHaveLength(1);

    const ended = runEndPhaseAndHandoff({ ...fired.state, currentPhase: 'end' }, rig.defs, registry).state;
    expect(ended.cardsById[donIds[0]].donRested).toBe(false);
    expect(ended.cardsById[donIds[1]].donRested).toBe(true);
  });

  it('restOpponentDonAtStartOfNextMain schedules automatic opponent DON!! rest', () => {
    const assignment: CardEffectAssignment = { cardNumber: 'SYN-SRC', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'restOpponentDonAtStartOfNextMain' }] } };
    const registry = programFor(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const withDon = putDon(rig, 'p2', 2, { rested: false });
    rig = withDon.rig;

    const scheduled = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry).state;
    const main = runDonPhase({ ...scheduled, activePlayerId: 'p2', currentPhase: 'don', turnNumber: 4 }).state;

    expect(main.cardsById[withDon.donIds[0]].donRested).toBe(true);
    expect(main.cardsById[withDon.donIds[1]].donRested).toBe(false);
    expect(main.delayedEffects ?? []).toHaveLength(0);
  });
});
