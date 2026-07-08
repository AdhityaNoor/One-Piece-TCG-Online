/**
 * Engine-capability tests for reusable DON!! denial, set-active, and aura families:
 *   - restOpponentDon            (DON!! denial: rest an opponent's active DON!!)
 *   - onBattle timing            (+ [Once Per Turn] enforcement in fireOnBattle)
 *   - endOfTurn timing           (fired for the ending player's cards)
 *   - addPowerAura               (dynamic anthem over a filtered group, gated on source state)
 *
 * Synthetic cards + generic assignments — the capability, not any single card number.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram, fireOnBattle, fireEndOfTurn } from '../../../engine/effects';
import { computeCurrentPower } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 2, basePower: 3000, types: ['Supernovas'] });

function reg(a: CardEffectAssignment) {
  return buildRegistryFromAssignments([a]);
}

describe('family: restOpponentDon (DON!! denial)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'restOpponentDon', maxTargets: 1 }] },
  };

  it('offers the opponent\'s ACTIVE DON!! and rests the chosen one', () => {
    const registry = reg(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', SRC, { donAttached: ['d-att'] }));
    const { rig: withActive, donIds: activeDon } = putDon(rig, 'p2', 1, { rested: false });
    rig = withActive;
    const { rig: withRested } = putDon(rig, 'p2', 1, { rested: true }); // already rested → not a candidate
    rig = withRested;

    const fired = runTimings(registry['SYN-SRC'], ['whenAttacking'], rig.state, attackerId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toEqual(activeDon);

    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, choice, activeDon, rig.defs, null, registry);
    expect(resolved.state.cardsById[activeDon[0]].donRested).toBe(true);
  });

  it('does not fire without the [DON!! x1] condition', () => {
    const registry = reg(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', SRC, { donAttached: [] })); // 0 DON attached
    rig = putDon(rig, 'p2', 1, { rested: false }).rig;
    const fired = runTimings(registry['SYN-SRC'], ['whenAttacking'], rig.state, attackerId, rig.defs, null, registry);
    expect(fired.state.pendingChoices).toEqual([]);
  });
});

describe('family: giveDonSelf', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'activateMain', functions: [{ fn: 'giveDonSelf', count: 2 }] },
  };

  it('attaches up to the requested number of rested DON!! to the source', () => {
    const registry = reg(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const withRested = putDon(rig, 'p1', 3, { rested: true });
    rig = withRested.rig;

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    expect(fired.state.cardsById[sourceId].donAttached).toEqual(withRested.donIds.slice(0, 2));
  });
});

describe('family: onBattle timing with [Once Per Turn]', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'onBattle', oncePerTurn: true, condition: { donAttachedAtLeast: 1, turn: 'your' }, functions: [{ fn: 'setActiveSelf' }] },
  };

  it('sets the attacker active once, then is blocked by once-per-turn', () => {
    const registry = reg(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', SRC, { orientation: 'rested', donAttached: ['d1'] }));

    const first = fireOnBattle(rig.state, attackerId, registry, rig.defs, null);
    expect(first.state.cardsById[attackerId].orientation).toBe('active');
    expect(first.state.cardsById[attackerId].oncePerTurnUsed).toContain('onBattle');

    // Re-rest and fire again the same turn — once-per-turn blocks it.
    const reRested = { ...first.state, cardsById: { ...first.state.cardsById, [attackerId]: { ...first.state.cardsById[attackerId], orientation: 'rested' as const } } };
    const second = fireOnBattle(reRested, attackerId, registry, rig.defs, null);
    expect(second.state.cardsById[attackerId].orientation).toBe('rested');
  });

  it('does not fire (or consume once-per-turn) when the source has no DON!!', () => {
    const registry = reg(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', SRC, { orientation: 'rested', donAttached: [] }));
    const res = fireOnBattle(rig.state, attackerId, registry, rig.defs, null);
    expect(res.state.cardsById[attackerId].orientation).toBe('rested');
    expect(res.state.cardsById[attackerId].oncePerTurnUsed).not.toContain('onBattle');
  });
});

describe('family: endOfTurn timing', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'endOfTurn', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'setActiveSelf' }] },
  };

  it('fires for the ending player\'s cards and sets the source active', () => {
    const registry = reg(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let id: string;
    ({ rig, instanceId: id } = putCharacterInPlay(rig, 'p1', SRC, { orientation: 'rested', donAttached: ['d1'] }));
    const res = fireEndOfTurn(rig.state, 'p1', registry, rig.defs, null);
    expect(res.state.cardsById[id].orientation).toBe('active');
  });
});

describe('family: addPowerAura (dynamic anthem gated on source state)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{ fn: 'addPowerAuraControllerTypes', amount: 1000, duration: 'permanent', anyOfTypes: ['Supernovas', 'Navy'], sourceCondition: { rested: true, donAttachedAtLeast: 1, turn: 'your' } }],
    },
  };
  const NAVY = makeCharacterDef({ cardDefinitionId: 'SYN-NAVY', cardNumber: 'SYN-NAVY', category: 'character', baseCost: 3, basePower: 4000, types: ['Navy'] });
  const OTHER = makeCharacterDef({ cardDefinitionId: 'SYN-OTHER', cardNumber: 'SYN-OTHER', category: 'character', baseCost: 3, basePower: 4000, types: ['Straw Hat Crew'] });

  function setup() {
    const registry = reg(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let navyId: string;
    let otherId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC, { orientation: 'rested', donAttached: ['d1'] }));
    ({ rig, instanceId: navyId } = putCharacterInPlay(rig, 'p1', NAVY));
    ({ rig, instanceId: otherId } = putCharacterInPlay(rig, 'p1', OTHER));
    const state = runTimings(registry['SYN-SRC'], ['onEnterPlay'], rig.state, srcId, rig.defs, null, registry).state;
    return { state, defs: rig.defs, srcId, navyId, otherId };
  }

  it('buffs matching types while the source is rested; leaves non-matching untouched', () => {
    const { state, defs, navyId, otherId } = setup();
    expect(computeCurrentPower(defs, state, navyId)).toBe(5000); // Navy matches → +1000
    expect(computeCurrentPower(defs, state, otherId)).toBe(4000); // Straw Hat Crew → unaffected
  });

  it('turns off when the source becomes active (source-state condition re-evaluated per read)', () => {
    const { state, defs, srcId, navyId } = setup();
    const active = { ...state, cardsById: { ...state.cardsById, [srcId]: { ...state.cardsById[srcId], orientation: 'active' as const } } };
    expect(computeCurrentPower(defs, active, navyId)).toBe(4000);
  });

  it('turns off on the opponent\'s turn ([Your Turn] gate)', () => {
    const { state, defs, navyId } = setup();
    const oppTurn = { ...state, activePlayerId: 'p2' };
    expect(computeCurrentPower(defs, oppTurn, navyId)).toBe(4000);
  });
});
