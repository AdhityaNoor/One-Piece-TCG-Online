/**
 * Engine-capability test for "return any number of Characters; a SEPARATELY chosen
 * Leader/Character gains +N for every returned Character" (P-059 The World's Continuation).
 *
 * This is the dual-selection scaling case: the return binds var `t`, and the buff's own
 * target choice ALSO uses `t` — so the return count must be snapshotted first. `captureCount`
 * copies `t` into a stable var (`returned`) that the later buff-target `chooseTargets` cannot
 * clobber; the scaled `addPower` reads it via `countVar` / `amountPer`.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { computeCurrentPower } from '../../../engine/rules/shared/power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 4, basePower: 5000 });
const R = (id: string) => makeCharacterDef({ cardDefinitionId: id, cardNumber: id, category: 'character', baseCost: 2, basePower: 3000 });

// Mirrors P-059's mechanic (duration simplified to duringThisTurn so no battle rig is needed).
const assignment: CardEffectAssignment = {
  cardNumber: 'SYN-SRC',
  templateId: 'ability',
  params: {
    timing: 'activateMain',
    functions: [
      { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: -1 },
      { fn: 'captureCount', into: 'returned' },
      { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 0, countVar: 'returned', amountPer: 2000, duration: 'duringThisTurn', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
    ],
  },
};

function setup() {
  const registry = buildRegistryFromAssignments([assignment]);
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
  let srcId: string; let r1: string; let r2: string;
  ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
  ({ rig, instanceId: r1 } = putCharacterInPlay(rig, 'p1', R('SYN-R1')));
  ({ rig, instanceId: r2 } = putCharacterInPlay(rig, 'p1', R('SYN-R2')));
  const leaderId = rig.state.players.p1.leaderInstanceId;
  const leaderBase = computeCurrentPower(rig.defs, rig.state, leaderId);
  return { registry, rig, srcId, r1, r2, leaderId, leaderBase };
}

describe('family: captureCount → scaled buff on a separately chosen target (P-059)', () => {
  it('returns 2 Characters, then the chosen Leader gains +2000 per returned (+4000), count surviving the buff-target choice', () => {
    const { registry, rig, srcId, r1, r2, leaderId, leaderBase } = setup();

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    const returnChoice = fired.state.pendingChoices[0];
    expect(returnChoice.kind).toBe('SELECT_CARDS');
    expect(returnChoice.constraints.max).toBe(3); // any number → all own Characters (src + r1 + r2)

    // Return r1 and r2 to hand.
    const afterReturn = resumeProgram(registry['SYN-SRC'], fired.state, returnChoice, [r1, r2], rig.defs, null, registry);
    expect(afterReturn.state.players.p1.hand.cardIds).toEqual(expect.arrayContaining([r1, r2]));

    // Second choice: pick the buff recipient (this reuses var `t`, but `returned` is untouched).
    const buffChoice = afterReturn.state.pendingChoices[0];
    expect(buffChoice.kind).toBe('SELECT_CARDS');
    const state = resumeProgram(registry['SYN-SRC'], afterReturn.state, buffChoice, [leaderId], rig.defs, null, registry).state;

    // +2000 × 2 returned = +4000.
    expect(computeCurrentPower(rig.defs, state, leaderId)).toBe(leaderBase + 4000);
  });

  it('offers no buff when nothing is returned', () => {
    const { registry, rig, srcId, leaderId, leaderBase } = setup();
    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    const returnChoice = fired.state.pendingChoices[0];
    // Return nothing.
    const after = resumeProgram(registry['SYN-SRC'], fired.state, returnChoice, [], rig.defs, null, registry);
    // ifPrevious previousMovedAny is false → no buff-target choice pending, no power change.
    expect(after.state.pendingChoices).toHaveLength(0);
    expect(computeCurrentPower(rig.defs, after.state, leaderId)).toBe(leaderBase);
  });
});
