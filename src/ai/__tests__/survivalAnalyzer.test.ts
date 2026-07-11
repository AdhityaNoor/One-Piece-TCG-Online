import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putInHand,
  putLifeCards,
} from '../../engine/rules/shared/__tests__/testRig';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import {
  evaluateSurvivalProjection,
  projectIncomingLifeDamage,
  shouldPreserveDefenses,
} from '../evaluation/survivalAnalyzer';
import { selectStrategicMode } from '../strategy/strategicModeSelector';
import { analyzeLeaderStrategy } from '../strategy/leaderStrategyAnalyzer';

describe('own-life survival model', () => {
  function withLife(rig: ReturnType<typeof buildBaseRig>, playerId: 'p1' | 'p2', count: number) {
    const cards = Array.from({ length: count }, (_, i) =>
      makeCharacterDef({ cardNumber: `L-${playerId}-${i}`, baseCost: 0 }),
    );
    return putLifeCards(rig, playerId, cards).rig;
  }

  it('projects Life damage reduced by active blockers', () => {
    const damage = projectIncomingLifeDamage(
      [
        { instanceId: 'a', power: 7000, lifeDamageIfLeaderHit: 1, isUnblockable: false, hasRush: false, isLeader: false },
        { instanceId: 'b', power: 6000, lifeDamageIfLeaderHit: 1, isUnblockable: false, hasRush: false, isLeader: false },
        { instanceId: 'c', power: 5000, lifeDamageIfLeaderHit: 2, isUnblockable: true, hasRush: false, isLeader: false },
      ],
      1,
    );
    // One blockable absorbed, one blockable hits, unblockable DA hits for 2 → 3
    expect(damage).toBe(3);
  });

  it('flags high next-turn loss risk with multiple attackers into low Life', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = withLife(rig, 'p1', 2);
    rig = withLife(rig, 'p2', 5);
    const beater = makeCharacterDef({ cardNumber: 'BEAT', baseCost: 4, basePower: 6000 });
    rig = putCharacterInPlay(rig, 'p2', beater).rig;
    rig = putCharacterInPlay(rig, 'p2', { ...beater, cardDefinitionId: 'BEAT-2', cardNumber: 'BEAT-2' }).rig;

    const survival = evaluateSurvivalProjection(rig.state, 'p1', rig.defs);
    expect(survival.projectedIncomingAttacks).toBeGreaterThanOrEqual(2);
    expect(survival.nextTurnLossRisk).toBeGreaterThanOrEqual(0.55);
    expect(shouldPreserveDefenses(survival)).toBe(true);
  });

  it('counts Double Attack as two Life toward the projection', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = withLife(rig, 'p1', 2);
    const da = makeCharacterDef({
      cardNumber: 'DA',
      baseCost: 5,
      basePower: 7000,
      hasDoubleAttack: true,
    });
    rig = putCharacterInPlay(rig, 'p2', da).rig;

    const survival = evaluateSurvivalProjection(rig.state, 'p1', rig.defs);
    expect(survival.projectedLifeDamage).toBeGreaterThanOrEqual(2);
    expect(survival.nextTurnLossRisk).toBeGreaterThan(0.5);
  });

  it('reduces risk when active blockers cover incoming swings', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = withLife(rig, 'p1', 2);
    const beater = makeCharacterDef({ cardNumber: 'ATK', baseCost: 4, basePower: 6000 });
    const blocker = makeCharacterDef({
      cardNumber: 'BLK',
      baseCost: 3,
      basePower: 5000,
      hasBlocker: true,
    });
    rig = putCharacterInPlay(rig, 'p2', beater).rig;
    const withBlocker = putCharacterInPlay(rig, 'p1', blocker);

    const without = evaluateSurvivalProjection(rig.state, 'p1', rig.defs);
    const withBlk = evaluateSurvivalProjection(withBlocker.rig.state, 'p1', withBlocker.rig.defs);
    expect(withBlk.projectedLifeDamage).toBeLessThan(without.projectedLifeDamage);
    expect(withBlk.activeBlockerCount).toBe(1);
  });

  it('selects defend when crack-back threatens remaining Life', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = withLife(rig, 'p1', 2);
    rig = withLife(rig, 'p2', 8);
    // Rest own leader so crude lethalPressure does not dominate mode selection.
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';
    const beater = makeCharacterDef({ cardNumber: 'THREAT', baseCost: 5, basePower: 8000 });
    rig = putCharacterInPlay(rig, 'p2', beater).rig;
    rig = putCharacterInPlay(rig, 'p2', { ...beater, cardDefinitionId: 'THREAT-2', cardNumber: 'THREAT-2' }).rig;

    const leader = analyzeLeaderStrategy(rig.state, 'p1', rig.defs, {});
    const mode = selectStrategicMode(rig.state, 'p1', rig.defs, {}, leader);
    expect(['defend', 'recovery']).toContain(mode);
  });

  it('penalizes playing a Counter piece when defenses must be preserved', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = withLife(rig, 'p1', 2);
    const beater = makeCharacterDef({ cardNumber: 'OPP', baseCost: 5, basePower: 7000 });
    rig = putCharacterInPlay(rig, 'p2', beater).rig;
    rig = putCharacterInPlay(rig, 'p2', { ...beater, cardDefinitionId: 'OPP-2', cardNumber: 'OPP-2' }).rig;

    const counterChar = makeCharacterDef({
      cardNumber: 'CTR',
      baseCost: 1,
      basePower: 2000,
      counter: 2000,
    });
    const blocker = makeCharacterDef({
      cardNumber: 'BLK2',
      baseCost: 2,
      basePower: 3000,
      hasBlocker: true,
      counter: 0,
    });
    const withCounter = putInHand(rig, 'p1', counterChar);
    const withBoth = putInHand(withCounter.rig, 'p1', blocker);
    const state = { ...withBoth.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', withBoth.rig.defs, {});

    expect(shouldPreserveDefenses(strategic.survival)).toBe(true);

    const playCounter = scoreActionStrategic(
      state,
      {
        type: 'PLAY_CHARACTER',
        actionId: 'pc',
        playerId: 'p1',
        handCardInstanceId: withCounter.instanceId,
        donInstanceIds: [],
      },
      'p1',
      withBoth.rig.defs,
      {},
      strategic,
    );
    const playBlocker = scoreActionStrategic(
      state,
      {
        type: 'PLAY_CHARACTER',
        actionId: 'pb',
        playerId: 'p1',
        handCardInstanceId: withBoth.instanceId,
        donInstanceIds: [],
      },
      'p1',
      withBoth.rig.defs,
      {},
      strategic,
    );

    expect(playBlocker).toBeGreaterThan(playCounter);
  });
});
