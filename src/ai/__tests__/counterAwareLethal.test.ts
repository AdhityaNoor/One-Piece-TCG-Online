import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDeckCards,
  putDon,
  putInHand,
  putLifeCards,
} from '../../engine/rules/shared/__tests__/testRig';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import {
  analyzeCounterAwareLeaderAttack,
  scoreCounterAwareLeaderAttack,
  scoreOverkillDonForLethal,
} from '../evaluation/counterAwareLethal';
import { estimateOpponentCounterCapacity } from '../evaluation/opponentCounterEstimate';
import { analyzeLethalLine } from '../planning/lethalLineAnalyzer';
import { analyzeSequencedLethalInsight } from '../planning/lethalSequencePlanner';
import { chooseAction } from '../cpuPlayer';

describe('counter-aware lethal', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK', baseCost: 0, basePower: 1000 });

  function withDecks(rig: ReturnType<typeof buildBaseRig>) {
    let next = putDeckCards(rig, 'p1', filler, 10).rig;
    next = putDeckCards(next, 'p2', filler, 10).rig;
    return next;
  }

  function putOpaqueHandCards(rig: ReturnType<typeof buildBaseRig>, count: number) {
    // Hand count is public; card identities must not affect the estimate.
    let next = rig;
    for (let i = 0; i < count; i += 1) {
      next = putInHand(next, 'p2', makeCharacterDef({
        cardNumber: `HIDDEN-${i}`,
        baseCost: 5,
        basePower: 6000,
        // Deliberately no counter — if the estimator cheats by reading hand, spend stays 0.
      })).rig;
    }
    return next;
  }

  it('estimates Counter capacity from hand count without reading hand contents', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = putOpaqueHandCards(rig, 6);

    const estimate = estimateOpponentCounterCapacity(rig.state, 'p1', rig.defs);
    expect(estimate.handCount).toBe(6);
    expect(estimate.estimatedLikelySpend).toBeGreaterThan(0);
    // Hand cards have no printed counter — a cheating read would yield ~0.
    expect(estimate.estimatedLikelySpend).toBeGreaterThanOrEqual(2000);
  });

  it('returns zero Counter estimate on empty hand', () => {
    const rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    const estimate = estimateOpponentCounterCapacity(rig.state, 'p1', rig.defs);
    expect(estimate.handCount).toBe(0);
    expect(estimate.estimatedLikelySpend).toBe(0);
    expect(estimate.confidence).toBe('high');
  });

  it('penalizes thin lethal into a large estimated Counter hand', () => {
    const attacker = makeCharacterDef({ cardNumber: 'FIN', baseCost: 0, basePower: 6000 });
    const leader = makeCharacterDef({
      cardNumber: 'L-5',
      baseCost: 0,
      basePower: 5000,
      category: 'leader',
      life: 5,
    });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 6,
      leaderOverridesP2: leader,
    });
    rig = withDecks(rig);
    const atk = putCharacterInPlay(rig, 'p1', attacker);
    rig = putLifeCards(atk.rig, 'p2', [makeCharacterDef({ cardNumber: 'LIFE1', baseCost: 0 })]).rig;
    rig = putOpaqueHandCards(rig, 7);

    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const line = analyzeLethalLine(state, 'p1', rig.defs);
    const leaderId = state.players.p2.leaderInstanceId!;

    const aware = analyzeCounterAwareLeaderAttack(
      state,
      'p1',
      rig.defs,
      atk.instanceId,
      leaderId,
      undefined,
      line,
    );

    expect(aware.powerMargin).toBe(1000);
    expect(aware.survivesEstimatedCounters).toBe(false);
    expect(scoreCounterAwareLeaderAttack(aware, { isClosingLethal: true })).toBeLessThan(0);
  });

  it('rewards overkill that clears estimated Counters', () => {
    const attacker = makeCharacterDef({ cardNumber: 'OVK', baseCost: 0, basePower: 9000 });
    const leader = makeCharacterDef({
      cardNumber: 'L-5B',
      baseCost: 0,
      basePower: 5000,
      category: 'leader',
      life: 5,
    });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 6,
      leaderOverridesP2: leader,
    });
    const atk = putCharacterInPlay(rig, 'p1', attacker);
    rig = putLifeCards(atk.rig, 'p2', [makeCharacterDef({ cardNumber: 'LIFE2', baseCost: 0 })]).rig;
    rig = putOpaqueHandCards(rig, 5);

    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const line = analyzeLethalLine(state, 'p1', rig.defs);
    const leaderId = state.players.p2.leaderInstanceId!;

    const aware = analyzeCounterAwareLeaderAttack(
      state,
      'p1',
      rig.defs,
      atk.instanceId,
      leaderId,
      undefined,
      line,
    );

    expect(aware.survivesEstimatedCounters).toBe(true);
    expect(scoreCounterAwareLeaderAttack(aware, { isClosingLethal: true })).toBeGreaterThan(20);
  });

  it('prefers baiting a low-cost rested character before thin lethal', () => {
    const attacker = makeCharacterDef({ cardNumber: 'A1', baseCost: 0, basePower: 6000 });
    const attacker2 = makeCharacterDef({ cardNumber: 'A2', baseCost: 0, basePower: 6500 });
    const bait = makeCharacterDef({ cardNumber: 'BAIT', baseCost: 2, basePower: 3000, counter: 1000 });
    const leader = makeCharacterDef({
      cardNumber: 'L-BAIT',
      baseCost: 0,
      basePower: 5000,
      category: 'leader',
      life: 5,
    });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 6,
      leaderOverridesP2: leader,
    });
    rig = withDecks(rig);
    rig = putCharacterInPlay(rig, 'p1', attacker).rig;
    rig = putCharacterInPlay(rig, 'p1', { ...attacker2, cardDefinitionId: 'A2-DEF' }).rig;
    const baitPlay = putCharacterInPlay(rig, 'p2', bait, { orientation: 'rested' });
    rig = putLifeCards(baitPlay.rig, 'p2', [makeCharacterDef({ cardNumber: 'LIFE3', baseCost: 0 })]).rig;
    rig = putOpaqueHandCards(rig, 6);

    const state = {
      ...rig.state,
      setupState: null,
      currentBattle: null,
      pendingChoices: [],
    };
    // Rest own leader so character attacks are the lethal line.
    state.cardsById[state.players.p1.leaderInstanceId!].orientation = 'rested';

    const line = analyzeLethalLine(state, 'p1', rig.defs);
    const insight = analyzeSequencedLethalInsight(state, 'p1', rig.defs, line);
    expect(insight.shouldBaitCountersFirst).toBe(true);
    expect(insight.clearTargetIds).toContain(baitPlay.instanceId);

    const strategic = { ...buildStrategicContext(state, 'p1', rig.defs, {}), mode: 'lethal_search' as const };
    const leaderId = state.players.p2.leaderInstanceId!;
    const atkId = state.players.p1.characterArea.cardIds[0];

    const baitScore = scoreActionStrategic(
      state,
      {
        type: 'DECLARE_ATTACK',
        actionId: 'bait',
        playerId: 'p1',
        attackerInstanceId: atkId,
        targetInstanceId: baitPlay.instanceId,
      },
      'p1',
      rig.defs,
      {},
      strategic,
      () => 'bait-id',
    );
    const leaderScore = scoreActionStrategic(
      state,
      {
        type: 'DECLARE_ATTACK',
        actionId: 'lead',
        playerId: 'p1',
        attackerInstanceId: atkId,
        targetInstanceId: leaderId,
      },
      'p1',
      rig.defs,
      {},
      strategic,
      () => 'lead-id',
    );

    expect(baitScore).toBeGreaterThan(leaderScore);
  });

  it('rewards GIVE_DON that secures Counter-beating overkill', () => {
    const almost = makeCharacterDef({ cardNumber: 'ALMOST-OV', baseCost: 0, basePower: 6000 });
    const leader = makeCharacterDef({
      cardNumber: 'L-OV',
      baseCost: 0,
      basePower: 5000,
      category: 'leader',
      life: 5,
    });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 6,
      leaderOverridesP2: leader,
    });
    const char = putCharacterInPlay(rig, 'p1', almost);
    rig = putDon(char.rig, 'p1', 2).rig;
    rig = putLifeCards(rig, 'p2', [makeCharacterDef({ cardNumber: 'LIFE4', baseCost: 0 })]).rig;
    rig = putOpaqueHandCards(rig, 6);
    const donId = rig.state.players.p1.costArea.cardIds.find((id) => rig.state.cardsById[id]?.donRested === false)!;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const line = analyzeLethalLine(state, 'p1', rig.defs);

    const overkillBonus = scoreOverkillDonForLethal(state, 'p1', rig.defs, char.instanceId, line);
    expect(overkillBonus).toBeGreaterThan(0);

    const strategic = { ...buildStrategicContext(state, 'p1', rig.defs, {}), mode: 'lethal_search' as const };
    const giveDon = scoreActionStrategic(
      state,
      {
        type: 'GIVE_DON',
        actionId: 'gd',
        playerId: 'p1',
        donInstanceId: donId,
        targetInstanceId: char.instanceId,
      },
      'p1',
      rig.defs,
      {},
      strategic,
    );
    const endMain = scoreActionStrategic(
      state,
      { type: 'END_MAIN_PHASE', actionId: 'end', playerId: 'p1' },
      'p1',
      rig.defs,
      {},
      strategic,
    );
    expect(giveDon).toBeGreaterThan(endMain);
  });

  it('chooseAction baits low-cost piece before thin leader lethal', () => {
    const attacker = makeCharacterDef({ cardNumber: 'CA1', baseCost: 0, basePower: 6000 });
    const attacker2 = makeCharacterDef({ cardNumber: 'CA2', baseCost: 0, basePower: 7000 });
    const bait = makeCharacterDef({ cardNumber: 'CBAIT', baseCost: 1, basePower: 2000 });
    const leader = makeCharacterDef({
      cardNumber: 'L-CA',
      baseCost: 0,
      basePower: 5000,
      category: 'leader',
      life: 5,
    });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 6,
      leaderOverridesP2: leader,
    });
    rig = withDecks(rig);
    rig = putCharacterInPlay(rig, 'p1', attacker).rig;
    rig = putCharacterInPlay(rig, 'p1', { ...attacker2, cardDefinitionId: 'CA2-DEF' }).rig;
    const baitPlay = putCharacterInPlay(rig, 'p2', bait, { orientation: 'rested' });
    rig = putLifeCards(baitPlay.rig, 'p2', [makeCharacterDef({ cardNumber: 'LIFE5', baseCost: 0 })]).rig;
    rig = putOpaqueHandCards(rig, 7);

    const state = {
      ...rig.state,
      setupState: null,
      currentBattle: null,
      pendingChoices: [],
    };
    state.cardsById[state.players.p1.leaderInstanceId!].orientation = 'rested';

    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'counter-aware-lethal' },
      createActionId: () => 'counter-aware-lethal',
    });

    expect(decision?.action.type).toBe('DECLARE_ATTACK');
    if (decision?.action.type === 'DECLARE_ATTACK') {
      expect(decision.action.targetInstanceId).toBe(baitPlay.instanceId);
    }
  });
});
