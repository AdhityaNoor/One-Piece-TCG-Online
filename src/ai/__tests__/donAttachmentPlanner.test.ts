import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putDeckCards,
  putDon,
} from '../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../../cards/effectTemplates/assembler';
import { OP02_ASSIGNMENTS } from '../../cards/effectTemplates/assignments/OP02';
import type { EffectProgram } from '../../engine/effects';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { chooseAction } from '../cpuPlayer';
import {
  analyzeDonAttachment,
  scoreDonConditionUnlock,
} from '../planning/donAttachmentPlanner';

const op02 = buildRegistryFromAssignments(OP02_ASSIGNMENTS);

describe('DON attachment recipient selection', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK-D', baseCost: 0, basePower: 1000 });

  function withDecks(rig: ReturnType<typeof buildBaseRig>) {
    let next = putDeckCards(rig, 'p1', filler, 8).rig;
    next = putDeckCards(next, 'p2', filler, 8).rig;
    return next;
  }

  it('scores unlocking DON!! x1 whenAttacking higher than a vanilla peer', () => {
    const unlockDef = makeCharacterDef({
      cardDefinitionId: 'UNLOCK-1',
      cardNumber: 'UNLOCK-1',
      baseCost: 3,
      basePower: 5000,
    });
    const vanillaDef = makeCharacterDef({
      cardDefinitionId: 'VAN-1',
      cardNumber: 'VAN-1',
      baseCost: 3,
      basePower: 5000,
    });
    const registry: Record<string, EffectProgram> = {
      'UNLOCK-1': {
        cardNumber: 'UNLOCK-1',
        abilities: [
          {
            timing: 'whenAttacking',
            condition: { donAttachedAtLeast: 1 },
            ops: [{ op: 'rest', target: { sel: 'opponentCharacters', maxCost: 3 } }],
          },
        ],
      },
    };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    rig = withDecks(rig);
    const unlock = putCharacterInPlay(rig, 'p1', unlockDef);
    rig = unlock.rig;
    const vanilla = putCharacterInPlay(rig, 'p1', vanillaDef);
    rig = putDon(vanilla.rig, 'p1', 2).rig;
    const donId = rig.state.players.p1.costArea.cardIds.find((id) => rig.state.cardsById[id]?.donRested === false)!;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, registry);

    const unlockScore = analyzeDonAttachment(
      state,
      'p1',
      rig.defs,
      registry,
      strategic,
      unlock.instanceId,
    );
    const vanillaScore = analyzeDonAttachment(
      state,
      'p1',
      rig.defs,
      registry,
      strategic,
      vanilla.instanceId,
    );

    expect(unlockScore.unlocksDonCondition).toBe(true);
    expect(unlockScore.scoreBonus).toBeGreaterThan(vanillaScore.scoreBonus);

    const giveUnlock = scoreActionStrategic(
      state,
      {
        type: 'GIVE_DON',
        actionId: 'g1',
        playerId: 'p1',
        donInstanceId: donId,
        targetInstanceId: unlock.instanceId,
      },
      'p1',
      rig.defs,
      registry,
      strategic,
    );
    const giveVanilla = scoreActionStrategic(
      state,
      {
        type: 'GIVE_DON',
        actionId: 'g2',
        playerId: 'p1',
        donInstanceId: donId,
        targetInstanceId: vanilla.instanceId,
      },
      'p1',
      rig.defs,
      registry,
      strategic,
    );
    expect(giveUnlock).toBeGreaterThan(giveVanilla);
  });

  it('rewards the second DON that unlocks DON!! x2 whenAttacking', () => {
    const body = makeCharacterDef({
      cardDefinitionId: 'OP02-004',
      cardNumber: 'OP02-004',
      baseCost: 9,
      basePower: 10000,
    });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    const char = putCharacterInPlay(rig, 'p1', body);
    // Already has 1 DON — next attach unlocks x2 whenAttacking KO.
    const withOne = putDon(char.rig, 'p1', 2);
    const donIds = withOne.donIds;
    rig = {
      ...withOne.rig,
      state: {
        ...withOne.rig.state,
        cardsById: {
          ...withOne.rig.state.cardsById,
          [char.instanceId]: {
            ...withOne.rig.state.cardsById[char.instanceId],
            donAttached: [donIds[0]],
          },
          [donIds[0]]: {
            ...withOne.rig.state.cardsById[donIds[0]],
            currentZone: 'attached',
          },
        },
        players: {
          ...withOne.rig.state.players,
          p1: {
            ...withOne.rig.state.players.p1,
            costArea: {
              ...withOne.rig.state.players.p1.costArea,
              cardIds: withOne.rig.state.players.p1.costArea.cardIds.filter((id) => id !== donIds[0]),
            },
          },
        },
      },
    };

    const unlock = scoreDonConditionUnlock(rig.state, rig.defs, op02, char.instanceId);
    expect(unlock.unlocks).toBe(true);
    expect(unlock.value).toBeGreaterThan(8);
  });

  it('values onDonGiven Leader watchers when attaching to a Character', () => {
    const garp = makeLeaderDef({
      cardDefinitionId: 'OP02-002',
      cardNumber: 'OP02-002',
      name: 'Garp',
      basePower: 5000,
    });
    const body = makeCharacterDef({ cardNumber: 'BODY-G', baseCost: 2, basePower: 3000 });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 4,
      leaderOverridesP1: garp,
    });
    const char = putCharacterInPlay(rig, 'p1', body);
    rig = putDon(char.rig, 'p1', 1).rig;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, op02);

    const analysis = analyzeDonAttachment(
      state,
      'p1',
      rig.defs,
      op02,
      strategic,
      char.instanceId,
    );
    expect(analysis.onDonGivenValue).toBeGreaterThan(0);
    expect(analysis.scoreBonus).toBeGreaterThan(0);
  });

  it('chooseAction attaches DON to the unlock body over a vanilla peer', () => {
    const unlockDef = makeCharacterDef({
      cardDefinitionId: 'UNLOCK-C',
      cardNumber: 'UNLOCK-C',
      baseCost: 2,
      basePower: 4000,
    });
    const vanillaDef = makeCharacterDef({
      cardDefinitionId: 'VAN-C',
      cardNumber: 'VAN-C',
      baseCost: 2,
      basePower: 4000,
    });
    const registry: Record<string, EffectProgram> = {
      'UNLOCK-C': {
        cardNumber: 'UNLOCK-C',
        abilities: [
          {
            timing: 'whenAttacking',
            condition: { donAttachedAtLeast: 1 },
            ops: [{ op: 'ko', target: { sel: 'opponentCharacters', maxPower: 3000 } }],
          },
        ],
      },
    };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    rig = withDecks(rig);
    // Rest leaders so we do not prefer leader attacks / pumps.
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';
    rig.state.cardsById[rig.state.players.p2.leaderInstanceId!].orientation = 'rested';
    const unlock = putCharacterInPlay(rig, 'p1', unlockDef);
    rig = unlock.rig;
    const vanilla = putCharacterInPlay(rig, 'p1', vanillaDef);
    rig = putDon(vanilla.rig, 'p1', 1).rig;
    // Rest both so attach is the main decision (no winning attacks vs 5k leader).
    rig.state.cardsById[unlock.instanceId].orientation = 'rested';
    rig.state.cardsById[vanilla.instanceId].orientation = 'rested';
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    let n = 0;
    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry,
      config: { difficulty: 'hard', seed: 'don-unlock-recipient' },
      createActionId: () => `don-${n++}`,
    });

    expect(decision?.action.type).toBe('GIVE_DON');
    if (decision?.action.type === 'GIVE_DON') {
      expect(decision.action.targetInstanceId).toBe(unlock.instanceId);
    }
  });
});
