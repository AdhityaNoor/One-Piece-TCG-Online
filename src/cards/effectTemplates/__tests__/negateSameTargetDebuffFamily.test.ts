/**
 * Engine-capability test for "negate the effect of up to 1 opponent Leader/Character
 * AND give THAT card -N power" (OP09-097 Marshall.D.Teach).
 *
 * The point under test is same-target coupling: the debuff must hit the exact card
 * chosen for the negate, not a second free selection. Expressed by targeting the
 * follow-on `addPower` at `ref: 'previous'` (var `t` bound by the negate).
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { computeCurrentPower } from '../../../engine/rules/shared/power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 4, basePower: 5000 });
const A = makeCharacterDef({ cardDefinitionId: 'SYN-A', cardNumber: 'SYN-A', category: 'character', baseCost: 3, basePower: 5000 });
const B = makeCharacterDef({ cardDefinitionId: 'SYN-B', cardNumber: 'SYN-B', category: 'character', baseCost: 3, basePower: 5000 });

const assignment: CardEffectAssignment = {
  cardNumber: 'SYN-SRC',
  templateId: 'ability',
  params: {
    timing: 'activateMain',
    functions: [
      { fn: 'negateEffect', target: { group: 'leaderOrCharacters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
      { fn: 'addPower', target: { ref: 'previous' }, amount: -4000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
    ],
  },
};

describe('family: negate + same-target debuff (OP09-097, ref: previous)', () => {
  it('applies -4000 only to the Character chosen for the negate, leaving the other untouched', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string; let aId: string; let bId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: aId } = putCharacterInPlay(rig, 'p2', A));
    ({ rig, instanceId: bId } = putCharacterInPlay(rig, 'p2', B));

    const aBefore = computeCurrentPower(rig.defs, rig.state, aId);
    const bBefore = computeCurrentPower(rig.defs, rig.state, bId);

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.kind).toBe('SELECT_CARDS');
    // Choose opponent Character A for the negate.
    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, [aId], rig.defs, null, registry).state;

    // Only A takes -4000; B (not chosen) is unchanged.
    expect(computeCurrentPower(state.defs ?? rig.defs, state, aId)).toBe(aBefore - 4000);
    expect(computeCurrentPower(state.defs ?? rig.defs, state, bId)).toBe(bBefore);
  });

  it('applies no debuff when nothing is negated', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string; let aId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: aId } = putCharacterInPlay(rig, 'p2', A));
    const aBefore = computeCurrentPower(rig.defs, rig.state, aId);

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, [], rig.defs, null, registry).state;
    expect(computeCurrentPower(state.defs ?? rig.defs, state, aId)).toBe(aBefore); // no negate → no debuff
  });
});
