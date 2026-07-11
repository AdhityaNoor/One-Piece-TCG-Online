import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putInHand,
} from '../../engine/rules/shared/__tests__/testRig';
import type { EffectProgram } from '../../engine/effects';
import type { PendingChoice } from '../../engine/events/pendingChoice';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { scoreStrategicChoice } from '../evaluation/choiceEvaluator';
import {
  analyzeOpeningHand,
  scoreMulliganDecision,
  scoreSearchTargetForPlan,
} from '../planning/openingHandPlanner';
import type { EffectScoreContext } from '../heuristics/effectValue';
import { chooseAction } from '../cpuPlayer';

describe('opening hand / search quality', () => {
  it('keeps a synergistic early curve and redraws an all-brick hand', () => {
    const leader = makeLeaderDef({
      cardDefinitionId: 'L-CURVE',
      cardNumber: 'L-CURVE',
      types: ['Straw Hat Crew'],
      name: 'Curve Leader',
    });

    const early = makeCharacterDef({
      cardNumber: 'EARLY',
      baseCost: 2,
      basePower: 3000,
      types: ['Straw Hat Crew'],
    });
    const early2 = makeCharacterDef({
      cardNumber: 'EARLY2',
      baseCost: 1,
      basePower: 2000,
      types: ['Straw Hat Crew'],
    });
    const mid = makeCharacterDef({
      cardNumber: 'MID',
      baseCost: 4,
      basePower: 5000,
      types: ['Straw Hat Crew'],
    });

    let keepRig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'setup',
      turnNumber: 0,
      leaderOverridesP1: leader,
    });
    keepRig = putInHand(keepRig, 'p1', early).rig;
    keepRig = putInHand(keepRig, 'p1', early2).rig;
    keepRig = putInHand(keepRig, 'p1', mid).rig;
    const keepState = { ...keepRig.state, setupState: { decidingPlayerId: 'p1', stage: 'awaitingMulliganDecision' as const } };
    const keepStrategic = buildStrategicContext(keepState, 'p1', keepRig.defs, {});
    const keep = analyzeOpeningHand(keepState, 'p1', keepRig.defs, {}, keepStrategic);
    expect(keep.shouldRedraw).toBe(false);
    expect(keep.earlyPlayCount).toBeGreaterThanOrEqual(2);

    const brick = makeCharacterDef({ cardNumber: 'BRICK1', baseCost: 8, basePower: 9000 });
    const brick2 = makeCharacterDef({ cardNumber: 'BRICK2', baseCost: 9, basePower: 10000 });
    const brick3 = makeCharacterDef({ cardNumber: 'BRICK3', baseCost: 7, basePower: 8000 });
    let brickRig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'setup',
      turnNumber: 0,
      leaderOverridesP1: leader,
    });
    brickRig = putInHand(brickRig, 'p1', brick).rig;
    brickRig = putInHand(brickRig, 'p1', brick2).rig;
    brickRig = putInHand(brickRig, 'p1', brick3).rig;
    const brickState = {
      ...brickRig.state,
      setupState: { decidingPlayerId: 'p1', stage: 'awaitingMulliganDecision' as const },
    };
    const brickStrategic = buildStrategicContext(brickState, 'p1', brickRig.defs, {});
    const redraw = analyzeOpeningHand(brickState, 'p1', brickRig.defs, {}, brickStrategic);
    expect(redraw.shouldRedraw).toBe(true);
    expect(redraw.keepScore).toBeLessThan(keep.keepScore);

    expect(
      scoreMulliganDecision(keepState, 'p1', keepRig.defs, {}, keepStrategic, false),
    ).toBeGreaterThan(
      scoreMulliganDecision(keepState, 'p1', keepRig.defs, {}, keepStrategic, true),
    );
    expect(
      scoreMulliganDecision(brickState, 'p1', brickRig.defs, {}, brickStrategic, true),
    ).toBeGreaterThan(
      scoreMulliganDecision(brickState, 'p1', brickRig.defs, {}, brickStrategic, false),
    );
  });

  it('chooseAction redraws a bricked opening hand', () => {
    const leader = makeLeaderDef({
      cardDefinitionId: 'L-BRICK',
      cardNumber: 'L-BRICK',
      types: ['Navy'],
    });
    const brick = makeCharacterDef({ cardNumber: 'B1', baseCost: 8, basePower: 9000 });
    const brick2 = makeCharacterDef({ cardNumber: 'B2', baseCost: 9, basePower: 10000 });
    const brick3 = makeCharacterDef({ cardNumber: 'B3', baseCost: 7, basePower: 8000 });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'setup',
      turnNumber: 0,
      leaderOverridesP1: leader,
    });
    rig = putInHand(rig, 'p1', brick).rig;
    rig = putInHand(rig, 'p1', brick2).rig;
    rig = putInHand(rig, 'p1', brick3).rig;
    const state = {
      ...rig.state,
      currentPhase: 'setup' as const,
      activePlayerId: 'p1',
      setupState: {
        decidingPlayerId: 'p1',
        stage: 'awaitingMulliganDecision' as const,
        goingFirstPlayerId: 'p1',
        goingSecondPlayerId: 'p2',
      },
      players: {
        ...rig.state.players,
        p1: { ...rig.state.players.p1, hasMulliganed: false },
        p2: { ...rig.state.players.p2, hasMulliganed: false },
      },
      pendingChoices: [
        {
          id: 'p1__mulligan-decision',
          playerId: 'p1',
          kind: 'YES_NO' as const,
          prompt: 'Mulligan your hand?',
          constraints: { min: 0, max: 1 },
          sourceInstanceId: null,
          sourceEffectId: null,
        },
      ],
    };

    let n = 0;
    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'mulligan-brick' },
      createActionId: () => `mull-${n++}`,
    });
    expect(decision?.action.type).toBe('MULLIGAN_DECISION');
    if (decision?.action.type === 'MULLIGAN_DECISION') {
      expect(decision.action.redraw).toBe(true);
    }
  });

  it('prefers early leader-synergy search targets in early phase', () => {
    const leader = makeLeaderDef({
      cardDefinitionId: 'L-AK',
      cardNumber: 'L-AK',
      types: ['Animal Kingdom Pirates'],
      basePower: 5000,
    });
    const earlySyn = makeCharacterDef({
      cardNumber: 'EARLY-SYN',
      baseCost: 2,
      basePower: 3000,
      types: ['Animal Kingdom Pirates'],
    });
    const lateOff = makeCharacterDef({
      cardNumber: 'LATE-OFF',
      baseCost: 8,
      basePower: 9000,
      types: ['Navy'],
    });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 2,
      leaderOverridesP1: leader,
    });
    // Low DON / high life → early phase.
    const early = putInHand(rig, 'p1', earlySyn);
    rig = early.rig;
    const late = putInHand(rig, 'p1', lateOff);
    rig = late.rig;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = {
      ...buildStrategicContext(state, 'p1', rig.defs, {}),
      gamePhase: 'early' as const,
    };
    const ctx: EffectScoreContext = { state, playerId: 'p1', defs: rig.defs, registry: {} };

    expect(scoreSearchTargetForPlan(ctx, strategic, early.instanceId)).toBeGreaterThan(
      scoreSearchTargetForPlan(ctx, strategic, late.instanceId),
    );

    const sourceDef = makeCharacterDef({ cardNumber: 'SEARCH-SRC', baseCost: 1, basePower: 1000 });
    const src = putCharacterInPlay(rig, 'p1', sourceDef);
    const program: EffectProgram = {
      cardNumber: sourceDef.cardDefinitionId,
      abilities: [
        {
          timing: 'onPlay',
          ops: [
            {
              op: 'searchTopDeck',
              look: 3,
              pick: 1,
              reveal: false,
              destination: 'hand',
              prompt: 'Add 1 card to your hand',
            },
          ],
        },
      ],
    };
    const registry = { [sourceDef.cardDefinitionId]: program };
    const state2 = { ...src.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic2 = {
      ...buildStrategicContext(state2, 'p1', src.rig.defs, registry),
      gamePhase: 'early' as const,
    };
    const choice: PendingChoice = {
      id: 'search',
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'Add 1 card to your hand',
      constraints: {
        min: 1,
        max: 1,
        candidateInstanceIds: [early.instanceId, late.instanceId],
        visibleInstanceIds: [early.instanceId, late.instanceId],
      },
      sourceInstanceId: src.instanceId,
      sourceEffectId: 'ir',
      resumeState: { abilityIndex: 0, opIndex: 0, bindings: {} },
    };

    const earlyScore = scoreStrategicChoice(
      state2,
      'p1',
      src.rig.defs,
      registry,
      strategic2,
      choice,
      [early.instanceId],
    );
    const lateScore = scoreStrategicChoice(
      state2,
      'p1',
      src.rig.defs,
      registry,
      strategic2,
      choice,
      [late.instanceId],
    );
    expect(earlyScore).toBeGreaterThan(lateScore);
  });

  it('scores MULLIGAN_DECISION keep higher than redraw for a good hand', () => {
    const leader = makeLeaderDef({
      cardDefinitionId: 'L-GOOD',
      cardNumber: 'L-GOOD',
      types: ['Supernovas'],
    });
    const c1 = makeCharacterDef({
      cardNumber: 'G1',
      baseCost: 2,
      basePower: 3000,
      types: ['Supernovas'],
    });
    const c2 = makeCharacterDef({
      cardNumber: 'G2',
      baseCost: 3,
      basePower: 4000,
      types: ['Supernovas'],
    });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'setup',
      turnNumber: 0,
      leaderOverridesP1: leader,
    });
    rig = putInHand(rig, 'p1', c1).rig;
    rig = putInHand(rig, 'p1', c2).rig;
    const state = {
      ...rig.state,
      currentPhase: 'setup' as const,
      setupState: {
        decidingPlayerId: 'p1',
        stage: 'awaitingMulliganDecision' as const,
        goingFirstPlayerId: 'p1',
        goingSecondPlayerId: 'p2',
      },
      pendingChoices: [],
    };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, {});
    const keep = scoreActionStrategic(
      state,
      { type: 'MULLIGAN_DECISION', actionId: 'k', playerId: 'p1', redraw: false },
      'p1',
      rig.defs,
      {},
      strategic,
    );
    const redraw = scoreActionStrategic(
      state,
      { type: 'MULLIGAN_DECISION', actionId: 'r', playerId: 'p1', redraw: true },
      'p1',
      rig.defs,
      {},
      strategic,
    );
    expect(keep).toBeGreaterThan(redraw);
  });
});
