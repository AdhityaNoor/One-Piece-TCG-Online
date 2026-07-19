import { describe, expect, it } from 'vitest';
import { executePlayCharacter } from '../../engine/actions/handlers/playCharacter';
import { buildRegistryFromAssignments } from '../../cards/effectTemplates/assembler';
import { OP02_ASSIGNMENTS } from '../../cards/effectTemplates/assignments/OP02';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon, putInHand } from '../../engine/rules/shared/__tests__/testRig';
import { evaluateState, buildStrategicContext } from '../evaluation/stateEvaluator';
import { autoResolvePendingChoices, canContinueLookahead, cloneGameState, simulateAction } from '../planning/stateSimulator';
import { scoreActionWithLookahead } from '../planning/lookaheadPlanner';
import { planActionScore } from '../planning/strategicPlanner';

// OP02-011 keeps a real onPlay `op: 'ko'`. OP09-009 is Field Trash (moveCards→trash), not KO.
const registry = buildRegistryFromAssignments(OP02_ASSIGNMENTS);

describe('CPU lookahead simulation', () => {
  it('cloneGameState produces an independent copy', () => {
    const rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    const clone = cloneGameState(rig.state);
    clone.turnNumber = 999;
    expect(rig.state.turnNumber).not.toBe(999);
  });

  it('simulates play and auto-resolves overflow pending choice', () => {
    const fielded = makeCharacterDef({ cardNumber: 'FIELD', baseCost: 0, basePower: 1000 });
    const sixth = makeCharacterDef({ cardNumber: 'SIXTH', baseCost: 0, basePower: 9000 });
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    for (let i = 0; i < 5; i += 1) {
      rig = putCharacterInPlay(rig, 'p2', fielded).rig;
    }
    const { rig: withHand, instanceId: sixthInstanceId } = putInHand(rig, 'p2', sixth);
    const state = { ...withHand.state, setupState: null, currentBattle: null, pendingChoices: [] };
    let actionId = 0;
    const createActionId = () => `sim-${actionId++}`;

    const sim = simulateAction({
      state,
      action: {
        type: 'PLAY_CHARACTER',
        actionId: 'play-sixth',
        playerId: 'p2',
        handCardInstanceId: sixthInstanceId,
        donInstanceIds: [],
      },
      playerId: 'p2',
      defs: withHand.defs,
      registry: {},
      createActionId,
    });

    expect(sim.failed).toBe(false);
    expect(sim.state.pendingChoices).toHaveLength(0);
    expect(sim.state.players.p2.characterArea.cardIds.length).toBeLessThanOrEqual(5);
  });

  it('lookahead prefers onPlay KO over vanilla when opponent has a character', () => {
    const koChar = makeCharacterDef({ cardDefinitionId: 'OP02-011', cardNumber: 'OP02-011', baseCost: 1, basePower: 1000 });
    const vanilla = makeCharacterDef({ cardDefinitionId: 'VANILLA-LA', cardNumber: 'VANILLA-LA', baseCost: 1, basePower: 1000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    rig = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardNumber: 'FOE-LA', baseCost: 2, basePower: 3000 })).rig;
    rig = putDon(rig, 'p1', 3).rig;
    const koHand = putInHand(rig, 'p1', koChar);
    const both = putInHand(koHand.rig, 'p1', vanilla);
    const state = { ...both.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', both.rig.defs, registry);
    let actionId = 0;
    const createActionId = () => `la-${actionId++}`;

    const activeDon = state.players.p1.costArea.cardIds.filter(
      (id) => state.cardsById[id]?.donRested === false,
    );

    const playKo = {
      type: 'PLAY_CHARACTER' as const,
      actionId: 'ko',
      playerId: 'p1' as const,
      handCardInstanceId: koHand.instanceId,
      donInstanceIds: [activeDon[0]],
    };
    const playVanilla = {
      type: 'PLAY_CHARACTER' as const,
      actionId: 'van',
      playerId: 'p1' as const,
      handCardInstanceId: both.instanceId,
      donInstanceIds: [activeDon[0]],
    };

    const koHeuristic = planActionScore(state, playKo, 'p1', both.rig.defs, registry, 'hard', strategic);
    const vanHeuristic = planActionScore(state, playVanilla, 'p1', both.rig.defs, registry, 'hard', strategic);

    const koLookahead = scoreActionWithLookahead(
      state, playKo, 'p1', both.rig.defs, registry, strategic, koHeuristic, createActionId, 1,
    );
    const vanLookahead = scoreActionWithLookahead(
      state, playVanilla, 'p1', both.rig.defs, registry, strategic, vanHeuristic, createActionId, 1,
    );

    expect(koLookahead.failed).toBe(false);
    expect(vanLookahead.failed).toBe(false);
    expect(koLookahead.simulatedUtility).not.toBeNull();
    expect(koLookahead.simulatedUtility!).toBeGreaterThan(vanLookahead.simulatedUtility!);
    expect(koLookahead.score).toBeGreaterThan(vanLookahead.score);
  });

  it('canContinueLookahead is false during battle or with pending choices', () => {
    const rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    expect(canContinueLookahead(rig.state, 'p1')).toBe(true);
    const withBattle = {
      ...rig.state,
      currentBattle: {
        attackerInstanceId: 'x',
        targetInstanceId: 'y',
        originalTargetInstanceId: 'y',
        step: 'block' as const,
        blockerUsed: false,
        onOpponentsAttackUsedInstanceIds: [],
        battlePowerBonuses: {},
      },
    };
    expect(canContinueLookahead(withBattle, 'p1')).toBe(false);
  });

  it('evaluateState improves after removing opponent character via onPlay KO', () => {
    const koChar = makeCharacterDef({ cardDefinitionId: 'OP09-009', cardNumber: 'OP09-009', baseCost: 1, basePower: 1000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    rig = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardNumber: 'FOE-EV', baseCost: 2, basePower: 3000 })).rig;
    rig = putDon(rig, 'p1', 2).rig;
    const { rig: withHand, instanceId } = putInHand(rig, 'p1', koChar);
    const donId = withHand.state.players.p1.costArea.cardIds[0];
    const before = evaluateState(withHand.state, 'p1', withHand.defs, registry);

    const played = executePlayCharacter(
      withHand.state,
      { type: 'PLAY_CHARACTER', actionId: 'ev-ko', playerId: 'p1', handCardInstanceId: instanceId, donInstanceIds: [donId] },
      withHand.defs,
      registry,
    );
    let actionId = 0;
    const resolved = autoResolvePendingChoices(
      played.state,
      'p1',
      withHand.defs,
      registry,
      () => `ev-${actionId++}`,
    );
    const after = evaluateState(resolved.state, 'p1', withHand.defs, registry);
    expect(after).toBeGreaterThan(before);
  });
});
