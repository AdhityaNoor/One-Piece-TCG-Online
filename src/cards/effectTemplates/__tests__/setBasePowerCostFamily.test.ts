/**
 * Engine-capability test for the semantic family:
 *   "base power / base cost BECOMES N" — an ability that registers a continuous SET
 *   modifier overwriting the printed base value (2-6 power, 2-7 cost), rather than a
 *   +/− delta. Additive modifiers and the 6-5-5-2 DON!! bonus still stack on top.
 *
 * This is the family behind EB04-003 / EB04-004 (Leader "base power becomes 7000") and
 * every future "becomes N" card. Tests use synthetic cards + generic assignments so the
 * capability is covered end-to-end (templateDefs -> factory -> interpreter -> power.ts),
 * not by any single card number. "Becomes the same as X" (dynamic) is out of scope.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects/interpreter';
import { computeCurrentCost, computeCurrentPower } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import type { CardInstance } from '../../../engine/state/card';

const DEF = makeCharacterDef({ cardDefinitionId: 'SYN-SET', cardNumber: 'SYN-SET', category: 'character', baseCost: 5, basePower: 5000 });

/** Put the card in play, fire onEnterPlay, then attach DON!! / set turn and read live. */
function enterPlay(assignment: CardEffectAssignment, donAttached: string[], activePlayerId: 'p1' | 'p2') {
  const registry = buildRegistryFromAssignments([assignment]);
  const program = registry[assignment.cardNumber];
  const base = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
  const { rig, instanceId } = putCharacterInPlay(base, 'p1', DEF, { summoningSick: false });
  let state = runTimings(program, ['onEnterPlay'], rig.state, instanceId, rig.defs, null, registry).state;
  const inst = state.cardsById[instanceId] as CardInstance;
  state = { ...state, activePlayerId, cardsById: { ...state.cardsById, [instanceId]: { ...inst, donAttached } } };
  return { state, instanceId, defs: rig.defs };
}

describe('semantic family: base power becomes N', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SET',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'setBasePower', target: { ref: 'self' }, value: 7000, duration: 'permanent' }] },
  };

  it('translates to a setBasePower op targeting self', () => {
    const program = buildRegistryFromAssignments([assignment])[assignment.cardNumber];
    expect(program.abilities[0].ops[0]).toMatchObject({ op: 'setBasePower', value: 7000, target: { sel: 'self' } });
  });

  it('overwrites the printed base power (5000 -> 7000)', () => {
    const r = enterPlay(assignment, [], 'p2');
    expect(computeCurrentPower(r.defs, r.state, r.instanceId)).toBe(7000);
  });

  it('stacks the 6-5-5-2 DON!! bonus on top of the set value during the owner turn', () => {
    const r = enterPlay(assignment, ['d1'], 'p1');
    expect(computeCurrentPower(r.defs, r.state, r.instanceId)).toBe(8000); // 7000 set + 1000 DON!!
  });
});

describe('semantic family: base cost becomes N', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SET',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'setBaseCost', target: { ref: 'self' }, value: 2, duration: 'permanent' }] },
  };

  it('translates to a setBaseCost op targeting self', () => {
    const program = buildRegistryFromAssignments([assignment])[assignment.cardNumber];
    expect(program.abilities[0].ops[0]).toMatchObject({ op: 'setBaseCost', value: 2, target: { sel: 'self' } });
  });

  it('overwrites the printed base cost (5 -> 2)', () => {
    const r = enterPlay(assignment, [], 'p2');
    expect(computeCurrentCost(r.defs, r.state, r.instanceId)).toBe(2);
  });
});
