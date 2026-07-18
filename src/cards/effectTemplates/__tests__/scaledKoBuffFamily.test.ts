/**
 * Engine-capability test for "K.O. any number of your {Type} Characters, then a target
 * gains +N power for every Character K.O.'d" (OP06-095 Shadows Asgard).
 *
 * Exercises the composition that expresses per-count dynamic scaling with existing verbs:
 *   - `ko` with `maxTargets: -1` → chooseTargets clamps a negative max to ALL candidates
 *     ("any number"); the selection is bound to var `t`.
 *   - a following `addPower` with `countVar: 't'` + `amountPer` → scales by count(t).
 * No new op — this pins the wiring so it can't silently regress.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { computeCurrentPower } from '../../../engine/rules/shared/power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 4, basePower: 5000 });
const TB = (id: string) => makeCharacterDef({ cardDefinitionId: id, cardNumber: id, category: 'character', baseCost: 2, basePower: 3000, types: ['Thriller Bark Pirates'] });
const OFF = makeCharacterDef({ cardDefinitionId: 'SYN-OFF', cardNumber: 'SYN-OFF', category: 'character', baseCost: 5, basePower: 6000, types: ['Thriller Bark Pirates'] });

// Mirrors OP06-095: base leader +1000, then K.O. any number of own {Thriller Bark} cost <=2, then +1000 per K.O.
const assignment: CardEffectAssignment = {
  cardNumber: 'SYN-SRC',
  templateId: 'ability',
  params: {
    timing: 'activateMain',
    functions: [
      { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'duringThisTurn' },
      { fn: 'ko', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates', maxCost: 2 } }, optional: true, maxTargets: -1 },
      { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 0, countVar: 't', amountPer: 1000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
    ],
  },
};

function setup() {
  const registry = buildRegistryFromAssignments([assignment]);
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
  let srcId: string;
  ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
  let m1: string; let m2: string; let off: string;
  ({ rig, instanceId: m1 } = putCharacterInPlay(rig, 'p1', TB('SYN-M1')));
  ({ rig, instanceId: m2 } = putCharacterInPlay(rig, 'p1', TB('SYN-M2')));
  ({ rig, instanceId: off } = putCharacterInPlay(rig, 'p1', OFF));
  const leaderId = rig.state.players.p1.leaderInstanceId;
  const leaderBase = computeCurrentPower(rig.defs, rig.state, leaderId);
  return { registry, rig, srcId, m1, m2, off, leaderId, leaderBase };
}

describe('family: scaled leader buff per Character K.O.\'d (OP06-095)', () => {
  it('offers any-number K.O. over only matching own Characters, then +1000 base +1000 per K.O.', () => {
    const { registry, rig, srcId, m1, m2, off, leaderId, leaderBase } = setup();

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    // Base +1000 already applied before the K.O. choice.
    expect(computeCurrentPower(fired.state.defs ?? rig.defs, fired.state, leaderId)).toBe(leaderBase + 1000);
    const choice = fired.state.pendingChoices[0];
    expect(choice.kind).toBe('SELECT_CARDS');
    // "any number" → max equals the matching-candidate count (2), off-filter card excluded.
    expect(choice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining([m1, m2]));
    expect(choice.constraints.candidateInstanceIds).not.toContain(off);
    expect(choice.constraints.max).toBe(2);

    // K.O. both matching Characters.
    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, [m1, m2], rig.defs, null, registry).state;
    expect(state.players.p1.trash.cardIds).toEqual(expect.arrayContaining([m1, m2]));
    expect(state.players.p1.characterArea.cardIds).toContain(off); // off-filter Character survives
    // +1000 base + 2 × 1000 = +3000 total.
    expect(computeCurrentPower(state.defs ?? rig.defs, state, leaderId)).toBe(leaderBase + 3000);
  });

  it('applies only the base +1000 when no Characters are K.O.\'d', () => {
    const { registry, rig, srcId, leaderId, leaderBase } = setup();
    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    // Decline the K.O. (select none).
    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, [], rig.defs, null, registry).state;
    expect(computeCurrentPower(state.defs ?? rig.defs, state, leaderId)).toBe(leaderBase + 1000);
  });
});
