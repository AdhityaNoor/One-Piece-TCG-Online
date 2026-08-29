/**
 * Regression tests for the "for every X, <recipient> gains +N power" clause family.
 *
 * The bug these lock down: `addPower { amountPer }` defaults its counting variable to `t`,
 * but a targeted `addPower` emits its OWN `chooseTargets var: 't'` for the recipient, which
 * rebinds `t` to the single chosen card. Without a `captureCount` snapshot in between, the
 * buff always scaled by 1 (a flat +N) no matter how many cards the cost step consumed —
 * e.g. OP13-001 resting 2 DON!! granted +2000 instead of +4000.
 *
 * Covers every curated card that pairs a variable-count cost step with a scaled battle buff.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import { OP13_ASSIGNMENTS } from '../assignments/OP13';
import { OP06_ASSIGNMENTS } from '../assignments/OP06';
import { ST16_ASSIGNMENTS } from '../assignments/ST16';

function registryFor(all: readonly CardEffectAssignment[], cardNumber: string) {
  const a = all.find((x) => x.cardNumber === cardNumber);
  if (!a) throw new Error(`missing assignment ${cardNumber}`);
  return buildRegistryFromAssignments([a]);
}

/** The power granted by the last power-modifier this resolution added. */
function lastPowerBonus(state: { continuousEffects: readonly { powerModifier?: { amount: number; appliesToInstanceId?: string } }[] }) {
  const records = state.continuousEffects.filter((r) => r.powerModifier !== undefined);
  return records.length === 0 ? 0 : records[records.length - 1].powerModifier!.amount;
}

describe('OP13-001 Monkey.D.Luffy — +2000 for every DON!! rested this way', () => {
  // "[DON!! x1][On Your Opponent's Attack] If you have 5 or less active DON!! cards, you may rest
  //  any number of your DON!! cards. For every DON!! card rested this way, this Leader or up to 1
  //  of your {Straw Hat Crew} type Characters gains +2000 power during this battle."
  const setup = (activeDon: number) => {
    let rig = buildBaseRig({
      activePlayerId: 'p2', // the opponent is attacking
      phase: 'main',
      leaderOverridesP1: { cardNumber: 'OP13-001', name: 'Monkey.D.Luffy', basePower: 5000, types: ['Supernovas', 'Straw Hat Crew'] },
    });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const { rig: withDon, donIds } = putDon(rig, 'p1', activeDon + 1, { rested: false });
    rig = withDon;
    // 1 DON!! attached to the Leader satisfies the [DON!! x1] condition.
    const attached = donIds[donIds.length - 1];
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: { ...rig.state.cardsById, [leaderId]: { ...rig.state.cardsById[leaderId], donAttached: [attached] } },
        players: {
          ...rig.state.players,
          p1: { ...rig.state.players.p1, costArea: { ...rig.state.players.p1.costArea, cardIds: donIds.slice(0, activeDon) } },
        },
      },
    };
    return { rig, leaderId, activeDonIds: donIds.slice(0, activeDon) };
  };

  it('scales the buff by the number of DON!! rested, not by the number of recipients', () => {
    const registry = registryFor(OP13_ASSIGNMENTS, 'OP13-001');
    const { rig, leaderId, activeDonIds } = setup(3);

    const fired = runTimings(registry['OP13-001'], ['onOpponentsAttack'], rig.state, leaderId, rig.defs, null, registry);
    const restChoice = fired.state.pendingChoices[0];
    expect(restChoice).toBeDefined();

    // Rest 2 of the 3 active DON!!.
    const rested = activeDonIds.slice(0, 2);
    const afterRest = resumeProgram(registry['OP13-001'], fired.state, restChoice, rested, rig.defs, null, registry);
    expect(rested.every((id) => afterRest.state.cardsById[id].donRested === true)).toBe(true);

    const buffChoice = afterRest.state.pendingChoices[0];
    expect(buffChoice).toBeDefined();
    const buffed = resumeProgram(registry['OP13-001'], afterRest.state, buffChoice, [leaderId], rig.defs, null, registry);

    expect(lastPowerBonus(buffed.state)).toBe(4000); // 2 DON!! × +2000 — was +2000 before the fix
  });

  it('grants +2000 for a single rested DON!!', () => {
    const registry = registryFor(OP13_ASSIGNMENTS, 'OP13-001');
    const { rig, leaderId, activeDonIds } = setup(2);

    const fired = runTimings(registry['OP13-001'], ['onOpponentsAttack'], rig.state, leaderId, rig.defs, null, registry);
    const afterRest = resumeProgram(registry['OP13-001'], fired.state, fired.state.pendingChoices[0], [activeDonIds[0]], rig.defs, null, registry);
    const buffed = resumeProgram(registry['OP13-001'], afterRest.state, afterRest.state.pendingChoices[0], [leaderId], rig.defs, null, registry);

    expect(lastPowerBonus(buffed.state)).toBe(2000);
  });

  it('grants nothing when the optional rest is declined', () => {
    const registry = registryFor(OP13_ASSIGNMENTS, 'OP13-001');
    const { rig, leaderId } = setup(2);

    const fired = runTimings(registry['OP13-001'], ['onOpponentsAttack'], rig.state, leaderId, rig.defs, null, registry);
    const declined = resumeProgram(registry['OP13-001'], fired.state, fired.state.pendingChoices[0], [], rig.defs, null, registry);

    expect(declined.state.continuousEffects.filter((r) => r.powerModifier !== undefined)).toEqual([]);
  });
});

describe('OP06-014 / ST16-002 — +1000 during this battle for every card trashed', () => {
  const FILM = makeCharacterDef({ cardNumber: 'SYN-FILM', types: ['FILM'] });
  const MUSIC = makeCharacterDef({ cardNumber: 'SYN-MUSIC', types: ['Music'] });

  const cases: { cardNumber: string; assignments: readonly CardEffectAssignment[]; def: typeof FILM }[] = [
    { cardNumber: 'OP06-014', assignments: OP06_ASSIGNMENTS, def: FILM },
    { cardNumber: 'ST16-002', assignments: ST16_ASSIGNMENTS, def: MUSIC },
  ];

  it.each(cases)('$cardNumber scales by the number of cards trashed', ({ cardNumber, assignments, def }) => {
    const registry = registryFor(assignments, cardNumber);
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    const sourceDef = makeCharacterDef({ cardNumber, basePower: 3000 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', sourceDef));
    const handIds: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const put = putInHand(rig, 'p1', def);
      rig = put.rig;
      handIds.push(put.instanceId);
    }

    const fired = runTimings(registry[cardNumber], ['onOpponentsAttack'], rig.state, sourceId, rig.defs, null, registry);
    const trashed = handIds.slice(0, 3);
    const afterTrash = resumeProgram(registry[cardNumber], fired.state, fired.state.pendingChoices[0], trashed, rig.defs, null, registry);
    const buffed = resumeProgram(registry[cardNumber], afterTrash.state, afterTrash.state.pendingChoices[0], [sourceId], rig.defs, null, registry);

    expect(lastPowerBonus(buffed.state)).toBe(3000); // 3 cards × +1000
  });
});
