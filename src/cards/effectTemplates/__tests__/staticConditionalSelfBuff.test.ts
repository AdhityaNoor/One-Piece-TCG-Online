/**
 * Engine-capability test for the semantic family:
 *   "static conditional self modifier" — a permanent [On enter play] ability that
 *   registers a continuous self modifier gated on a re-evaluated condition
 *   ([DON!! xN], [Your Turn]/[Opponent's Turn], board-state gate).
 *
 * This is the family behind ST01-004 (static [DON!! x2] [Rush]) and ST01-013
 * (static [DON!! x1] +1000 power), and every future static self-buff card.
 *
 * Invariant under test (the class of bug that hit ST01-013): the gating condition
 * belongs on the continuous MODIFIER (re-evaluated by computeCurrentPower /
 * hasContinuousKeyword on every read), NOT on the ability's firing. Placing a
 * [DON!! xN] gate on the ability makes it a one-shot check at enter-play — when
 * 0 DON!! are attached — so the modifier is never registered.
 *
 * Tests use synthetic cards + generic assignments so the whole family is covered
 * by the engine primitive, not by any single card number.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects/interpreter';
import { executePlayCharacter } from '../../../engine/actions/handlers/playCharacter';
import { computeCurrentPower, hasContinuousKeyword } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import type { ContinuousKeyword } from '../../../engine/state/game';
import type { CardInstance } from '../../../engine/state/card';

const DEF = makeCharacterDef({ cardDefinitionId: 'SYN-STATIC', cardNumber: 'SYN-STATIC', category: 'character', baseCost: 3, basePower: 5000 });

/** Put the card in play with `don` DON!! attached, fire onEnterPlay, and return the resulting state + id. */
function enterPlay(assignment: CardEffectAssignment, donAttached: string[], activePlayerId: 'p1' | 'p2') {
  const registry = buildRegistryFromAssignments([assignment]);
  const program = registry[assignment.cardNumber];
  const base = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
  // Enters with 0 DON!! — this is the moment onEnterPlay fires (the ST01-013 trap).
  const { rig, instanceId } = putCharacterInPlay(base, 'p1', DEF, { summoningSick: false });
  let state = runTimings(program, ['onEnterPlay'], rig.state, instanceId, rig.defs, null, registry).state;
  // Now attach DON!! and (optionally) flip whose turn it is, then read live.
  const inst = state.cardsById[instanceId] as CardInstance;
  state = { ...state, activePlayerId, cardsById: { ...state.cardsById, [instanceId]: { ...inst, donAttached } } };
  return { state, instanceId, defs: rig.defs };
}

describe('semantic family: static conditional self power buff', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-STATIC',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] },
  };

  it('registers the modifier unconditionally at enter-play (gate is on the modifier, not the ability)', () => {
    const program = buildRegistryFromAssignments([assignment])[assignment.cardNumber];
    // The ability itself must NOT carry the DON!! gate — otherwise it never fires with 0 DON!!.
    expect(program.abilities[0].condition).toBeUndefined();
    expect(program.abilities[0].ops[0]).toMatchObject({ op: 'addPower', condition: { donAttachedAtLeast: 1 } });
  });

  it('applies the buff only while the condition holds, even though 0 DON!! were attached at enter-play', () => {
    // 0 DON!!: base only.
    expect(computeCurrentPower(...toArgs(enterPlay(assignment, [], 'p2')))).toBe(5000);
    // 1 DON!! on OPPONENT turn isolates the effect from the 6-5-5-2 auto +1000/DON.
    expect(computeCurrentPower(...toArgs(enterPlay(assignment, ['d1'], 'p2')))).toBe(6000);
  });

  it('stacks additively with the 6-5-5-2 DON!! bonus on the owner turn', () => {
    // 5000 base + 1000 (attached DON!! during owner turn) + 1000 (effect) = 7000.
    expect(computeCurrentPower(...toArgs(enterPlay(assignment, ['d1'], 'p1')))).toBe(7000);
  });

  it('is flat regardless of DON!! count above the threshold (parameter, not a per-DON scale)', () => {
    expect(computeCurrentPower(...toArgs(enterPlay(assignment, ['d1', 'd2', 'd3'], 'p2')))).toBe(6000);
  });
});

describe('semantic family: static conditional self keyword grant (same shape, keyword instead of power)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-STATIC',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeywordSelf', keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] },
  };

  it('grants the keyword only at/above the DON!! threshold, re-evaluated per read', () => {
    const kw: ContinuousKeyword = 'rush';
    expect(hasContinuousKeyword(...toKwArgs(enterPlay(assignment, ['d1'], 'p1'), kw))).toBe(false); // below threshold
    expect(hasContinuousKeyword(...toKwArgs(enterPlay(assignment, ['d1', 'd2'], 'p1'), kw))).toBe(true); // at threshold
  });

  it('does not let conditional Rush bypass summoning sickness when the card is played with 0 DON!! attached', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    const base = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const printedConditionalRushDef = makeCharacterDef({
      cardDefinitionId: 'SYN-STATIC',
      cardNumber: 'SYN-STATIC',
      category: 'character',
      baseCost: 0,
      basePower: 5000,
      hasRush: true,
    });
    const { rig, instanceId: handId } = putInHand(base, 'p1', printedConditionalRushDef);

    const played = executePlayCharacter(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: 'play-conditional-rush', playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );

    const playedId = played.state.players.p1.characterArea.cardIds[0];
    expect(played.state.cardsById[playedId].summoningSick).toBe(true);
    expect(hasContinuousKeyword(rig.defs, played.state, playedId, 'rush')).toBe(false);
  });
});

// Adapters so the assertions read as single expressions.
function toArgs(r: ReturnType<typeof enterPlay>): [typeof r.defs, typeof r.state, string] {
  return [r.defs, r.state, r.instanceId];
}
function toKwArgs(r: ReturnType<typeof enterPlay>, kw: ContinuousKeyword): [typeof r.defs, typeof r.state, string, ContinuousKeyword] {
  return [r.defs, r.state, r.instanceId, kw];
}
