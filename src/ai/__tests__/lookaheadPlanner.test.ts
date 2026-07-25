import { describe, expect, it } from 'vitest';
import { executePlayCharacter } from '../../engine/actions/handlers/playCharacter';
import { buildRegistryFromAssignments } from '../../cards/effectTemplates/assembler';
import { OP02_ASSIGNMENTS } from '../../cards/effectTemplates/assignments/OP02';
import type { EffectProgram } from '../../engine/effects';
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

  it('rebuilds strategic context while auto-resolving pending target choices', () => {
    const sourceDef = makeCharacterDef({
      cardDefinitionId: 'CPU-KO-SOURCE',
      cardNumber: 'CPU-KO-SOURCE',
      baseCost: 1,
      basePower: 1000,
    });
    const weakDef = makeCharacterDef({
      cardDefinitionId: 'CPU-WEAK-TARGET',
      cardNumber: 'CPU-WEAK-TARGET',
      baseCost: 1,
      basePower: 1000,
    });
    const strongDef = makeCharacterDef({
      cardDefinitionId: 'CPU-STRONG-TARGET',
      cardNumber: 'CPU-STRONG-TARGET',
      baseCost: 8,
      basePower: 10000,
    });
    const program: EffectProgram = {
      cardNumber: sourceDef.cardNumber,
      abilities: [
        {
          timing: 'activateMain',
          ops: [
            {
              op: 'chooseTargets',
              var: 't',
              from: { sel: 'opponentCharacters' },
              min: 1,
              max: 1,
              prompt: 'Choose a Character to K.O.',
            },
            { op: 'ko', target: { sel: 'var', name: 't' } },
          ],
        },
      ],
    };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    const source = putCharacterInPlay(rig, 'p1', sourceDef);
    const weak = putCharacterInPlay(source.rig, 'p2', weakDef);
    const strong = putCharacterInPlay(weak.rig, 'p2', strongDef);
    rig = strong.rig;

    const state = {
      ...rig.state,
      pendingChoices: [
        {
          id: 'pick-ko-target',
          playerId: 'p1',
          kind: 'SELECT_CARDS' as const,
          prompt: 'Choose a Character to K.O.',
          constraints: {
            min: 1,
            max: 1,
            candidateInstanceIds: [weak.instanceId, strong.instanceId],
          },
          sourceInstanceId: source.instanceId,
          sourceEffectId: 'ir',
          resumeState: { abilityIndex: 0, opIndex: 0, bindings: {} },
        },
      ],
    };
    const freshStrategic = buildStrategicContext(state, 'p1', rig.defs, { [sourceDef.cardDefinitionId]: program });
    const staleStrategic = {
      ...freshStrategic,
      opponentThreats: [
        {
          instanceId: weak.instanceId,
          cardDefinitionId: weakDef.cardDefinitionId,
          immediateThreat: 0,
          recurringValue: 0,
          synergyCentrality: 0,
          lethalContribution: 0,
          removalUrgency: 1000,
        },
        {
          instanceId: strong.instanceId,
          cardDefinitionId: strongDef.cardDefinitionId,
          immediateThreat: 0,
          recurringValue: 0,
          synergyCentrality: 0,
          lethalContribution: 0,
          removalUrgency: 0,
        },
      ],
    };
    let actionId = 0;

    const resolved = autoResolvePendingChoices(
      state,
      'p1',
      rig.defs,
      { [sourceDef.cardDefinitionId]: program },
      () => `target-${actionId++}`,
      staleStrategic,
    );

    expect(resolved.failed).toBe(false);
    expect(resolved.state.pendingChoices).toHaveLength(0);
    expect(resolved.state.cardsById[strong.instanceId].currentZone).toBe('trash');
    expect(resolved.state.cardsById[weak.instanceId].currentZone).toBe('characterArea');
  });
});
