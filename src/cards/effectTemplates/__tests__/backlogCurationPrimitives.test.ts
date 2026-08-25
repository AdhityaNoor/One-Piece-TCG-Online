/**
 * The four primitives added to clear the partial-curation backlog, and the cards
 * each one unblocks. Every one of these was previously deferred with a named
 * missing primitive rather than approximated — these tests pin the primitive's
 * behaviour so the next approximation attempt fails loudly.
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../../engine/state/game';
import { runTimings } from '../../../engine/effects/interpreter';
import { resumeChoice } from '../../../engine/effects/fireTiming';
import { evaluateGates } from '../../../engine/effects/gates';
import { computeCurrentPower } from '../../../engine/rules/shared';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putStageInPlay,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP17_ASSIGNMENTS } from '../assignments/OP17';
import { ST31_ASSIGNMENTS } from '../assignments/ST31';

const registry = buildRegistryFromAssignments([...OP17_ASSIGNMENTS, ...ST31_ASSIGNMENTS]);

const TRIGGER_4000 = makeCharacterDef({ cardDefinitionId: 'TRIG-4000', cardNumber: 'T-4000', name: 'Trigger Four', basePower: 4000, hasTrigger: true });
const TRIGGER_5000 = makeCharacterDef({ cardDefinitionId: 'TRIG-5000', cardNumber: 'T-5000', name: 'Trigger Five', basePower: 5000, hasTrigger: true });
const PLAIN_4000 = makeCharacterDef({ cardDefinitionId: 'PLAIN-4000', cardNumber: 'P-4000', name: 'Plain Four', basePower: 4000, hasTrigger: false });

describe('OP17-112 — [Trigger] + exact-base-power aura (hasTrigger / exactBasePower)', () => {
  function linlinRig(activePlayerId: 'p1' | 'p2' = 'p1') {
    let rig = buildBaseRig({ activePlayerId, phase: 'main', turnNumber: 3 });
    const ids: Record<string, string> = {};
    for (const [key, def] of [['trig4', TRIGGER_4000], ['trig5', TRIGGER_5000], ['plain4', PLAIN_4000]] as const) {
      let id: string;
      ({ rig, instanceId: id } = putCharacterInPlay(rig, 'p1', def));
      ids[key] = id;
    }
    let linlinId: string;
    ({ rig, instanceId: linlinId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'OP17-112', cardNumber: 'OP17-112', name: 'Charlotte Linlin', basePower: 10000 })));
    const fired = runTimings(registry['OP17-112'], ['onEnterPlay'], rig.state, linlinId, rig.defs, null, registry);
    return { rig, ids, state: fired.state };
  }

  it('sets ONLY the Characters that have both a [Trigger] and 4000 printed base power', () => {
    const { rig, ids, state } = linlinRig();
    expect(computeCurrentPower(rig.defs, state, ids.trig4)).toBe(8000);   // [Trigger] + 4000 ✓
    expect(computeCurrentPower(rig.defs, state, ids.trig5)).toBe(5000);   // [Trigger] but 5000 ✗
    expect(computeCurrentPower(rig.defs, state, ids.plain4)).toBe(4000);  // 4000 but no [Trigger] ✗
  });

  it('filters on PRINTED base power, so a boosted Character does not drop out of its own aura', () => {
    // The aura sets the target to 8000. Filtering on the CURRENT value would make each
    // Character stop matching the moment it was set, and oscillate on every power read.
    const { rig, ids, state } = linlinRig();
    expect(computeCurrentPower(rig.defs, state, ids.trig4)).toBe(8000);
    expect(computeCurrentPower(rig.defs, state, ids.trig4)).toBe(8000); // stable on re-read
  });

  it('is [Your Turn] only — the aura goes quiet on the opponent\'s turn', () => {
    const { rig, ids, state } = linlinRig('p2');
    expect(computeCurrentPower(rig.defs, state, ids.trig4)).toBe(4000);
  });

  it('leaves the Leader alone ("all of your CHARACTERS")', () => {
    const { rig, state } = linlinRig();
    const leaderId = state.players.p1.leaderInstanceId!;
    expect(computeCurrentPower(rig.defs, state, leaderId)).toBe(rig.defs['LEADER-DEF']?.basePower ?? computeCurrentPower(rig.defs, state, leaderId));
    expect(state.continuousEffects.some((ce) => ce.powerModifier?.appliesToGroup?.charactersOnly === true)).toBe(true);
  });
});

describe('OP17-116 — selfCharacterTriggerCount gate', () => {
  function rigWith(triggerChars: number, plainChars: number) {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    for (let i = 0; i < triggerChars; i += 1) rig = putCharacterInPlay(rig, 'p1', TRIGGER_4000).rig;
    for (let i = 0; i < plainChars; i += 1) rig = putCharacterInPlay(rig, 'p1', PLAIN_4000).rig;
    return rig;
  }

  const gate = [{ kind: 'selfCharacterTriggerCount' as const, atLeast: 2 }];

  it('passes at 2 or more Characters with a printed [Trigger]', () => {
    const rig = rigWith(2, 0);
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined)).toBe(true);
  });

  it('fails at 1, and does not count Characters without a [Trigger]', () => {
    const rig = rigWith(1, 3);
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined)).toBe(false);
  });

  it('counts the Character Area only — a [Trigger] Stage does not help', () => {
    let rig = rigWith(1, 0);
    rig = putStageInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'STG-T', cardNumber: 'S-T', category: 'stage', hasTrigger: true })).rig;
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined)).toBe(false);
  });

  it('is wired onto OP17-116\'s [Counter] half, alongside the existing [Main] half', () => {
    const timings = registry['OP17-116'].abilities.map((a) => a.timing);
    expect(timings).toEqual(['activateMain', 'counter']);
    expect(registry['OP17-116'].abilities.find((a) => a.timing === 'counter')?.gate)
      .toEqual([{ kind: 'selfCharacterTriggerCount', atLeast: 2 }]);
  });
});

describe('ST31-004 — "for every {Type} card on your field" is snapshotted at resolution', () => {
  const SHC = makeCharacterDef({ cardDefinitionId: 'SHC-C', cardNumber: 'SHC-C', name: 'Straw Hat Ally', types: ['Straw Hat Crew'], basePower: 3000 });
  const OTHER = makeCharacterDef({ cardDefinitionId: 'OTH-C', cardNumber: 'OTH-C', name: 'Other', types: ['Navy'], basePower: 3000 });

  function luffyRig(shcChars: number, opts: { shcLeader?: boolean; shcStage?: boolean } = {}) {
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'L-P1', cardNumber: 'L-P1', types: opts.shcLeader ? ['Straw Hat Crew'] : ['Navy'] }),
    });
    for (let i = 0; i < shcChars; i += 1) rig = putCharacterInPlay(rig, 'p1', SHC).rig;
    rig = putCharacterInPlay(rig, 'p1', OTHER).rig; // never counted
    if (opts.shcStage) rig = putStageInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'SHC-S', cardNumber: 'SHC-S', category: 'stage', types: ['Straw Hat Crew'] })).rig;
    let luffyId: string;
    ({ rig, instanceId: luffyId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'ST31-004', cardNumber: 'ST31-004', name: 'Monkey.D.Luffy', types: ['Straw Hat Crew'] })));
    let victimId: string;
    ({ rig, instanceId: victimId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'VIC', cardNumber: 'VIC', basePower: 9000 })));
    return { rig, luffyId, victimId };
  }

  function play(rig: ReturnType<typeof luffyRig>) {
    const fired = runTimings(registry['ST31-004'], ['onPlay'], rig.rig.state, rig.luffyId, rig.rig.defs, null, registry);
    expect(fired.pendingChoices).toHaveLength(1);
    return resumeChoice(fired.state, fired.pendingChoices[0].id, [rig.victimId], registry, rig.rig.defs, null);
  }

  it('applies -1000 per matching card to ONE target (the OP13-001 reading)', () => {
    // 2 SHC Characters + Luffy himself (also {Straw Hat Crew}) = 3 -> -3000.
    const rig = luffyRig(2);
    const done = play(rig);
    expect(computeCurrentPower(rig.rig.defs, done.state, rig.victimId)).toBe(9000 - 3000);
  });

  it('counts the Leader and the Stage too — "card on your field", not "Character"', () => {
    // 1 SHC Character + Luffy + SHC Leader + SHC Stage = 4 -> -4000.
    const rig = luffyRig(1, { shcLeader: true, shcStage: true });
    const done = play(rig);
    expect(computeCurrentPower(rig.rig.defs, done.state, rig.victimId)).toBe(9000 - 4000);
  });

  it('locks the count in at resolution — later board changes do not retroactively resize it', () => {
    const rig = luffyRig(2);
    const done = play(rig);
    const before = computeCurrentPower(rig.rig.defs, done.state, rig.victimId);
    // K.O. one of the Straw Hats afterwards. A continuous `scale` would shrink the
    // debuff that has already been applied; a resolution-time snapshot must not.
    const shcId = done.state.players.p1.characterArea.cardIds.find((id) => done.state.cardsById[id].cardDefinitionId === 'SHC-C')!;
    const after: GameState = {
      ...done.state,
      players: {
        ...done.state.players,
        p1: { ...done.state.players.p1, characterArea: { ...done.state.players.p1.characterArea, cardIds: done.state.players.p1.characterArea.cardIds.filter((id) => id !== shcId) } },
      },
    };
    expect(computeCurrentPower(rig.rig.defs, after, rig.victimId)).toBe(before);
  });
});

describe('OP17-015 Marco — koSource fires the source\'s [On K.O.] (trashSource would not)', () => {
  it('compiles the replacement onto koSource, never trashSource', () => {
    const enter = registry['OP17-015'].abilities.find((a) => a.timing === 'onEnterPlay')!;
    const reg = enter.ops.find((o) => o.op === 'registerKoReplacement') as { action: { kind: string }; scope: string; effectSourceController?: string } | undefined;
    expect(reg).toBeDefined();
    // trashSource moves the card to the trash WITHOUT firing [On K.O.], which is the one
    // thing this card cannot afford — its [On K.O.] is what replays it.
    expect(reg!.action.kind).toBe('koSource');
    expect(reg!.scope).toBe('effect');
    expect(reg!.effectSourceController).toBe('opponent');
  });

  it('still carries its [On K.O.] replay half', () => {
    expect(registry['OP17-015'].abilities.map((a) => a.timing)).toEqual(['onEnterPlay', 'onKO']);
    const onKo = registry['OP17-015'].abilities.find((a) => a.timing === 'onKO')!;
    // `playSelfFromTrash` compiles to playFromTrash over the `self` selector.
    expect(onKo.ops.some((o) => o.op === 'playFromTrash')).toBe(true);
  });
});
