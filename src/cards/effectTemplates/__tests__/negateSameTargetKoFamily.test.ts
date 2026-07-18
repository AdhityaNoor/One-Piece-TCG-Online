/**
 * Engine-capability test for "negate up to 1 opponent Character; Then, if that
 * Character has 5000 power or less, K.O. it" (OP06-074 Zephyr).
 *
 * Couples negate → same-target KO via `ref: 'previous'` plus
 * `ifPreviousSelectedPowerAtMost` so a second free selection cannot pick a
 * different Character, and high-power targets are not K.O.'d.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 4, basePower: 5000 });
const WEAK = makeCharacterDef({ cardDefinitionId: 'SYN-WEAK', cardNumber: 'SYN-WEAK', category: 'character', baseCost: 3, basePower: 4000 });
const STRONG = makeCharacterDef({ cardDefinitionId: 'SYN-STRONG', cardNumber: 'SYN-STRONG', category: 'character', baseCost: 5, basePower: 7000 });

const assignment: CardEffectAssignment = {
  cardNumber: 'SYN-SRC',
  templateId: 'ability',
  params: {
    timing: 'onPlay',
    functions: [
      { fn: 'negateEffect', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
      { fn: 'ko', target: { ref: 'previous' }, ifPrevious: 'previousSelectedAny', ifPreviousSelectedPowerAtMost: 5000 },
    ],
  },
};

describe('family: negate + same-target power-gated K.O. (OP06-074)', () => {
  it('K.O.s the negated Character when its current power is ≤5000', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string; let weakId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: weakId } = putCharacterInPlay(rig, 'p2', WEAK));

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, [weakId], rig.defs, null, registry).state;

    expect(state.cardsById[weakId]?.currentZone).toBe('trash');
  });

  it('does not K.O. the negated Character when its current power is above 5000', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string; let strongId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: strongId } = putCharacterInPlay(rig, 'p2', STRONG));

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, [strongId], rig.defs, null, registry).state;

    expect(state.cardsById[strongId]?.currentZone).toBe('characterArea');
  });
});
