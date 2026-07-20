/**
 * Regression: OP14-079 mill prompt after ally K.O., OP14-091 [On K.O.] vs trash,
 * and [On K.O.] when K.O.'d by own Leader / ally-K.O. effect.
 * Field Trash ≠ ko: OP09-009 / OP07-091 / OP08-079 must not fire [On K.O.].
 */
import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments } from '../../../cards/effectTemplates/assembler';
import { OP07_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP07';
import { OP08_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP08';
import { OP09_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP09';
import { OP14_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP14';
import { settleOnKoTriggers } from '../../rules/shared/settleOnKoTriggers';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putDon,
  putCharacterInPlay,
  putDeckCards,
  putInHand,
  putStageInPlay,
} from '../../rules/shared/__tests__/testRig';
import { executeAction } from '../../actions/dispatch';
import { fireActivate, fireOnPlay, fireWhenAttacking, resumeProgram, runTimings } from '../index';

function pick(cardNumber: string) {
  const from14 = OP14_ASSIGNMENTS.find((a) => a.cardNumber === cardNumber);
  if (from14) return from14;
  const from09 = OP09_ASSIGNMENTS.find((a) => a.cardNumber === cardNumber);
  if (from09) return from09;
  const from08 = OP08_ASSIGNMENTS.find((a) => a.cardNumber === cardNumber);
  if (from08) return from08;
  const from07 = OP07_ASSIGNMENTS.find((a) => a.cardNumber === cardNumber);
  if (from07) return from07;
  throw new Error(`missing assignment ${cardNumber}`);
}

function expectTrashWithoutOnKo(
  result: { state: { pendingOnKoTriggers?: unknown[]; cardsById: Record<string, { currentZone: string }> }; pendingChoices: unknown[]; log: { type: string }[] },
  trashedId: string,
) {
  expect(result.state.cardsById[trashedId]?.currentZone).toBe('trash');
  expect(result.state.pendingOnKoTriggers ?? []).toEqual([]);
  expect(result.log.some((e) => e.type === 'CHARACTER_KO')).toBe(false);
}

describe('OP14-079 / OP14-091 / OP09-009 On K.O. vs trash regressions', () => {
  it('OP14-120 played from hand prompts and applies its opponent attack lock', () => {
    const registry = buildRegistryFromAssignments([pick('OP14-120')]);
    const crocodileDef = makeCharacterDef({
      cardDefinitionId: 'OP14-120',
      cardNumber: 'OP14-120',
      name: 'Crocodile',
      types: ['Baroque Works'],
      baseCost: 9,
      basePower: 9000,
    });
    const foeDef = makeCharacterDef({ cardDefinitionId: 'FOE-NINE', cardNumber: 'FOE-NINE', baseCost: 9, basePower: 9000 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let handId: string;
    let foeId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', crocodileDef));
    ({ rig } = putDon(rig, 'p1', 9));
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', foeDef));

    const donIds = rig.state.players.p1.costArea.cardIds.slice(0, 9);
    let result = executeAction(rig.state, {
      type: 'PLAY_CHARACTER',
      actionId: 'play-op14-120',
      playerId: 'p1',
      handCardInstanceId: handId,
      donInstanceIds: donIds,
    }, rig.defs, registry);

    expect(result.pendingChoices[0]?.sourceInstanceId).not.toBeNull();
    expect(result.pendingChoices[0]?.constraints.candidateInstanceIds).toEqual([foeId]);

    result = executeAction(result.state, {
      type: 'RESOLVE_PENDING_CHOICE',
      actionId: 'resolve-op14-120-lock',
      playerId: 'p1',
      choiceId: result.pendingChoices[0].id,
      response: [foeId],
    }, rig.defs, registry);

    expect(result.state.continuousEffects.some((effect) =>
      effect.attackRestriction?.appliesToInstanceId === foeId &&
      effect.duration === 'endOfOpponentsTurn'
    )).toBe(true);
  });

  it('OP14-079 prompts optional trash-2 from deck after K.O.ing own Baroque Works', () => {
    const registry = buildRegistryFromAssignments([pick('OP14-079')]);
    const stageDef = makeCharacterDef({
      cardDefinitionId: 'OP14-079',
      cardNumber: 'OP14-079',
      name: 'Baroque Works HQ',
      category: 'stage',
      types: ['Baroque Works'],
    });
    const allyDef = makeCharacterDef({
      cardDefinitionId: 'ALLY-BW',
      cardNumber: 'ALLY-BW',
      name: 'Ally',
      types: ['Baroque Works'],
      basePower: 4000,
      baseCost: 3,
    });
    const oppDef = makeCharacterDef({ cardDefinitionId: 'OPP-C', cardNumber: 'OPP-C', baseCost: 5 });
    const deckDef = makeCharacterDef({ cardDefinitionId: 'DECK', cardNumber: 'DECK' });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let stageId: string;
    let allyId: string;
    ({ rig, instanceId: stageId } = putStageInPlay(rig, 'p1', stageDef));
    ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', allyDef));
    ({ rig } = putCharacterInPlay(rig, 'p2', oppDef));
    ({ rig } = putDeckCards(rig, 'p1', deckDef, 4));

    // Activate → chooseOne pay
    let result = fireActivate(rig.state, stageId, registry, rig.defs, 'test');
    expect(result.pendingChoices[0]?.kind).toBe('SELECT_OPTION');
    result = resumeProgram(registry['OP14-079'], result.state, result.pendingChoices[0], 1, rig.defs, 'test', registry);

    // K.O. target
    expect(result.pendingChoices[0]?.kind).toBe('SELECT_CARDS');
    result = resumeProgram(registry['OP14-079'], result.state, result.pendingChoices[0], [allyId], rig.defs, 'test', registry);
    expect(result.state.cardsById[allyId]?.currentZone).toBe('trash');

    // Optional −10 cost (decline)
    expect(result.pendingChoices[0]?.kind).toBe('SELECT_CARDS');
    result = resumeProgram(registry['OP14-079'], result.state, result.pendingChoices[0], [], rig.defs, 'test', registry);

    // Then: you may trash 2 from top of deck
    expect(result.pendingChoices).toHaveLength(1);
    expect(result.pendingChoices[0]?.kind).toBe('SELECT_OPTION');
    expect(result.pendingChoices[0]?.prompt).toMatch(/trash 2 cards from the top of your deck/i);
    expect(result.pendingChoices[0]?.constraints.options?.map((o) => o.label)).toEqual(['skip', 'trash']);

    const beforeTrash = result.state.players.p1.trash.cardIds.length;
    result = resumeProgram(registry['OP14-079'], result.state, result.pendingChoices[0], 1, rig.defs, 'test', registry);
    expect(result.state.players.p1.trash.cardIds.length).toBe(beforeTrash + 2);
  });

  it('OP14-091 [On K.O.] does NOT fire when trashed by OP09-009', () => {
    const registry = buildRegistryFromAssignments([pick('OP09-009'), pick('OP14-091')]);
    const trasherDef = makeCharacterDef({
      cardDefinitionId: 'OP09-009',
      cardNumber: 'OP09-009',
      name: 'Trasher',
      basePower: 5000,
      baseCost: 4,
    });
    const benthamDef = makeCharacterDef({
      cardDefinitionId: 'OP14-091',
      cardNumber: 'OP14-091',
      name: 'Mr.2.Bon.Kurei(Bentham)',
      types: ['Baroque Works'],
      basePower: 5000,
      baseCost: 5,
    });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let trasherId: string;
    let benthamId: string;
    ({ rig, instanceId: trasherId } = putCharacterInPlay(rig, 'p1', trasherDef));
    ({ rig, instanceId: benthamId } = putCharacterInPlay(rig, 'p2', benthamDef));

    let result = fireOnPlay(rig.state, trasherId, registry, rig.defs, 'test');
    expect(result.pendingChoices[0]?.kind).toBe('SELECT_CARDS');
    result = resumeProgram(registry['OP09-009'], result.state, result.pendingChoices[0], [benthamId], rig.defs, 'test', registry);

    expectTrashWithoutOnKo(result, benthamId);
    expect(result.pendingChoices).toHaveLength(0);
  });

  it('OP14-091 [On K.O.] does NOT fire when trashed by OP07-091', () => {
    const registry = buildRegistryFromAssignments([pick('OP07-091'), pick('OP14-091')]);
    const attackerDef = makeCharacterDef({
      cardDefinitionId: 'OP07-091',
      cardNumber: 'OP07-091',
      name: 'Attacker',
      basePower: 5000,
      baseCost: 4,
    });
    const benthamDef = makeCharacterDef({
      cardDefinitionId: 'OP14-091',
      cardNumber: 'OP14-091',
      name: 'Mr.2.Bon.Kurei(Bentham)',
      types: ['Baroque Works'],
      basePower: 5000,
      baseCost: 2,
    });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let attackerId: string;
    let benthamId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', attackerDef));
    ({ rig, instanceId: benthamId } = putCharacterInPlay(rig, 'p2', benthamDef));

    let result = fireWhenAttacking(rig.state, attackerId, registry, rig.defs, 'test');
    expect(result.pendingChoices[0]?.kind).toBe('SELECT_CARDS');
    result = resumeProgram(registry['OP07-091'], result.state, result.pendingChoices[0], [benthamId], rig.defs, 'test', registry);

    expectTrashWithoutOnKo(result, benthamId);
    // Decline bottom-deck from trash follow-up if prompted
    if (result.pendingChoices[0]?.kind === 'SELECT_CARDS') {
      result = resumeProgram(registry['OP07-091'], result.state, result.pendingChoices[0], [], rig.defs, 'test', registry);
    }
    expect(result.state.pendingOnKoTriggers ?? []).toEqual([]);
    expect(result.log.some((e) => e.type === 'CHARACTER_KO')).toBe(false);
  });

  it('OP14-091 [On K.O.] does NOT fire when trashed by OP08-079', () => {
    const registry = buildRegistryFromAssignments([pick('OP08-079'), pick('OP14-091')]);
    const kaidoDef = makeCharacterDef({
      cardDefinitionId: 'OP08-079',
      cardNumber: 'OP08-079',
      name: 'Kaido',
      basePower: 10000,
      baseCost: 10,
    });
    const benthamDef = makeCharacterDef({
      cardDefinitionId: 'OP14-091',
      cardNumber: 'OP14-091',
      name: 'Mr.2.Bon.Kurei(Bentham)',
      types: ['Baroque Works'],
      basePower: 5000,
      baseCost: 5,
    });
    const handDef = makeCharacterDef({ cardDefinitionId: 'HAND', cardNumber: 'HAND', baseCost: 1 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let kaidoId: string;
    let benthamId: string;
    let handId: string;
    ({ rig, instanceId: kaidoId } = putCharacterInPlay(rig, 'p1', kaidoDef, { enteredPlayTurn: 3 }));
    ({ rig, instanceId: benthamId } = putCharacterInPlay(rig, 'p2', benthamDef));
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', handDef));

    let result = fireActivate(rig.state, kaidoId, registry, rig.defs, 'test');
    // Optional trash from hand
    expect(result.pendingChoices[0]?.kind).toBe('SELECT_CARDS');
    result = resumeProgram(registry['OP08-079'], result.state, result.pendingChoices[0], [handId], rig.defs, 'test', registry);
    // Field Trash target
    expect(result.pendingChoices[0]?.kind).toBe('SELECT_CARDS');
    result = resumeProgram(registry['OP08-079'], result.state, result.pendingChoices[0], [benthamId], rig.defs, 'test', registry);

    expectTrashWithoutOnKo(result, benthamId);
    // Opp hand trash may still be pending; [On K.O.] must not be.
    expect(result.state.pendingOnKoTriggers ?? []).toEqual([]);
  });

  it('OP14-091 [On K.O.] fires when K.O.\'d by own Leader K.O. ability (after follow-up choices)', () => {
    const leaderAssignment = {
      cardNumber: 'SYN-LEADER-KO',
      templateId: 'ability' as const,
      params: {
        timing: 'activateMain' as const,
        oncePerTurn: true,
        functions: [
          {
            fn: 'chooseOne' as const,
            chooser: 'controller' as const,
            prompt: 'K.O. 1 of your Characters?',
            options: [
              { label: 'skip', functions: [] },
              {
                label: 'pay',
                functions: [
                  { fn: 'ko' as const, target: { group: 'characters' as const, player: 'controller' as const }, maxTargets: 1 },
                  {
                    fn: 'addCost' as const,
                    target: { group: 'characters' as const, player: 'opponent' as const },
                    amount: -1,
                    duration: 'duringThisTurn' as const,
                    optional: true,
                    ifPrevious: 'previousMovedAny' as const,
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const registry = buildRegistryFromAssignments([leaderAssignment, pick('OP14-091')]);
    const leaderDef = makeLeaderDef({
      cardDefinitionId: 'SYN-LEADER-KO',
      cardNumber: 'SYN-LEADER-KO',
      name: 'Own Leader',
      types: ['Baroque Works'],
    });
    const benthamDef = makeCharacterDef({
      cardDefinitionId: 'OP14-091',
      cardNumber: 'OP14-091',
      name: 'Mr.2.Bon.Kurei(Bentham)',
      types: ['Baroque Works'],
      basePower: 5000,
      baseCost: 5,
    });
    const oppDef = makeCharacterDef({ cardDefinitionId: 'OPP-C', cardNumber: 'OPP-C', baseCost: 3 });
    const playableDef = makeCharacterDef({
      cardDefinitionId: 'BW-PLAY',
      cardNumber: 'BW-PLAY',
      name: 'Mr.3',
      types: ['Baroque Works'],
      category: 'character',
      baseCost: 3,
      basePower: 4000,
    });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: leaderDef,
    });
    // Replace leader program id on the existing leader instance
    const leaderId = rig.state.players.p1.leaderInstanceId;
    rig = {
      ...rig,
      defs: { ...rig.defs, [leaderDef.cardDefinitionId]: leaderDef, [benthamDef.cardDefinitionId]: benthamDef, [oppDef.cardDefinitionId]: oppDef, [playableDef.cardDefinitionId]: playableDef },
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [leaderId]: { ...rig.state.cardsById[leaderId], cardDefinitionId: leaderDef.cardDefinitionId },
        },
      },
    };

    let benthamId: string;
    ({ rig, instanceId: benthamId } = putCharacterInPlay(rig, 'p1', benthamDef));
    ({ rig } = putCharacterInPlay(rig, 'p2', oppDef));
    // Put a playable BW in trash so On K.O. has something to offer from trash
    const trashId = 'trash-bw-1';
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [trashId]: {
            instanceId: trashId,
            cardDefinitionId: playableDef.cardDefinitionId,
            ownerId: 'p1',
            controllerId: 'p1',
            currentZone: 'trash',
            orientation: null,
            faceState: 'faceUp',
            donAttached: [],
            appliedContinuousEffectIds: [],
            oncePerTurnUsed: [],
            summoningSick: false,
            revealedTo: 'all',
          },
        },
        players: {
          ...rig.state.players,
          p1: {
            ...rig.state.players.p1,
            trash: { ...rig.state.players.p1.trash, cardIds: [trashId] },
          },
        },
      },
    };

    let result = runTimings(registry['SYN-LEADER-KO'], ['activateMain'], rig.state, leaderId, rig.defs, 'test', registry);
    result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], 1, rig.defs, 'test', registry);
    result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], [benthamId], rig.defs, 'test', registry);
    expect(result.state.cardsById[benthamId]?.currentZone).toBe('trash');
    // Follow-up optional −cost suspended; On K.O. must be deferred, not dropped.
    expect(result.state.pendingOnKoTriggers?.some((e) => e.targetInstanceId === benthamId)).toBe(true);

    // Decline −cost → parent effect ends → [On K.O.] should fire (finishWithCascade or settle).
    result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], [], rig.defs, 'test', registry);
    if (result.pendingChoices.length === 0 && (result.state.pendingOnKoTriggers?.length ?? 0) > 0) {
      result = settleOnKoTriggers(result.state, registry, rig.defs, 'test');
    }

    expect(result.pendingChoices.length).toBeGreaterThan(0);
    const onKoChoice = result.pendingChoices[0];
    expect(onKoChoice.sourceInstanceId).toBe(benthamId);
    expect(onKoChoice.prompt).toMatch(/Baroque Works|from:/i);
  });

  it('OP14-120 [On K.O.] revives after a leader K.O. effect resumes through a follow-up choice', () => {
    const leaderAssignment = {
      cardNumber: 'SYN-LEADER-KO',
      templateId: 'ability' as const,
      params: {
        timing: 'activateMain' as const,
        oncePerTurn: true,
        functions: [
          {
            fn: 'chooseOne' as const,
            chooser: 'controller' as const,
            prompt: 'K.O. 1 of your Characters?',
            options: [
              { label: 'skip', functions: [] },
              {
                label: 'pay',
                functions: [
                  { fn: 'ko' as const, target: { group: 'characters' as const, player: 'controller' as const, filter: { typeIncludes: 'Baroque Works' } }, maxTargets: 1 },
                  {
                    fn: 'addCost' as const,
                    target: { group: 'characters' as const, player: 'opponent' as const },
                    amount: -1,
                    duration: 'duringThisTurn' as const,
                    optional: true,
                    ifPrevious: 'previousMovedAny' as const,
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const registry = buildRegistryFromAssignments([leaderAssignment, pick('OP14-120')]);
    const leaderDef = makeLeaderDef({
      cardDefinitionId: 'SYN-LEADER-KO',
      cardNumber: 'SYN-LEADER-KO',
      name: 'Own Leader',
      types: ['Baroque Works'],
    });
    const crocodileDef = makeCharacterDef({
      cardDefinitionId: 'OP14-120',
      cardNumber: 'OP14-120',
      name: 'Crocodile',
      types: ['Baroque Works'],
      basePower: 9000,
      baseCost: 9,
    });
    const oppDef = makeCharacterDef({ cardDefinitionId: 'OPP-C', cardNumber: 'OPP-C', baseCost: 3 });
    const handCostDef = makeCharacterDef({ cardDefinitionId: 'HAND-COST', cardNumber: 'HAND-COST' });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: leaderDef,
    });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    rig = {
      ...rig,
      defs: { ...rig.defs, [leaderDef.cardDefinitionId]: leaderDef, [crocodileDef.cardDefinitionId]: crocodileDef, [oppDef.cardDefinitionId]: oppDef, [handCostDef.cardDefinitionId]: handCostDef },
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [leaderId]: { ...rig.state.cardsById[leaderId], cardDefinitionId: leaderDef.cardDefinitionId },
        },
      },
    };

    let crocodileId: string;
    let handCostId: string;
    ({ rig, instanceId: crocodileId } = putCharacterInPlay(rig, 'p1', crocodileDef));
    ({ rig, instanceId: handCostId } = putInHand(rig, 'p1', handCostDef));
    ({ rig } = putCharacterInPlay(rig, 'p2', oppDef));

    let result = runTimings(registry['SYN-LEADER-KO'], ['activateMain'], rig.state, leaderId, rig.defs, 'test', registry);
    result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], 1, rig.defs, 'test', registry);
    result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], [crocodileId], rig.defs, 'test', registry);
    expect(result.state.pendingOnKoTriggers?.some((event) => event.targetInstanceId === crocodileId)).toBe(true);

    result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], [], rig.defs, 'test', registry);
    if (result.pendingChoices.length === 0 && (result.state.pendingOnKoTriggers?.length ?? 0) > 0) {
      result = settleOnKoTriggers(result.state, registry, rig.defs, 'test');
    }

    expect(result.pendingChoices[0]?.sourceInstanceId).toBe(crocodileId);
    result = resumeProgram(registry['OP14-120'], result.state, result.pendingChoices[0], [handCostId], rig.defs, 'test', registry);

    const revivedIds = result.state.players.p1.characterArea.cardIds.filter((id) =>
      result.state.cardsById[id]?.cardDefinitionId === crocodileDef.cardDefinitionId
    );
    expect(revivedIds.length).toBe(1);
    expect(revivedIds[0]).not.toBe(crocodileId);
  });
});
