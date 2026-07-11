import { describe, expect, it } from 'vitest';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putInHand } from '../../engine/rules/shared/__tests__/testRig';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { chooseAction } from '../cpuPlayer';

describe('counter efficiency', () => {
  function counterBattle(opts: {
    attackerPower: number;
    defenderPower: number;
    counters: number[];
  }) {
    const attacker = makeCharacterDef({ cardNumber: 'ATK', baseCost: 0, basePower: opts.attackerPower });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    // Override p2 leader power
    const leaderId = rig.state.players.p2.leaderInstanceId!;
    const leaderDefId = rig.state.cardsById[leaderId].cardDefinitionId;
    rig.defs[leaderDefId] = { ...rig.defs[leaderDefId], basePower: opts.defenderPower };
    rig.state.cardsById[leaderId] = { ...rig.state.cardsById[leaderId], currentPower: opts.defenderPower };

    const atk = putCharacterInPlay(rig, 'p1', attacker);
    rig = atk.rig;

    const handIds: string[] = [];
    for (const [i, counter] of opts.counters.entries()) {
      const card = makeCharacterDef({
        cardNumber: `CTR-${i}`,
        cardDefinitionId: `CTR-${i}`,
        baseCost: 1,
        basePower: 1000,
        counter,
      });
      const placed = putInHand(rig, 'p2', card);
      rig = placed.rig;
      handIds.push(placed.instanceId);
    }

    const state = {
      ...rig.state,
      setupState: null,
      pendingChoices: [],
      currentBattle: {
        attackerInstanceId: atk.instanceId,
        targetInstanceId: leaderId,
        originalTargetInstanceId: leaderId,
        step: 'counter' as const,
        blockerUsed: false,
        onOpponentsAttackUsedInstanceIds: [],
        battlePowerBonuses: {},
      },
    };

    return { state, rig, leaderId, handIds };
  }

  it('prefers 1k counter over 3k when only 1k is needed', () => {
    const { state, rig, leaderId, handIds } = counterBattle({
      attackerPower: 6000,
      defenderPower: 5000,
      counters: [1000, 3000],
    });
    const strategic = buildStrategicContext(state, 'p2', rig.defs, {});
    const oneK = handIds[0];
    const threeK = handIds[1];

    const score1k = scoreActionStrategic(
      state,
      {
        type: 'ACTIVATE_COUNTER_CHARACTER',
        actionId: 'c1',
        playerId: 'p2',
        handCardInstanceId: oneK,
        boostTargetInstanceId: leaderId,
      },
      'p2',
      rig.defs,
      {},
      strategic,
    );
    const score3k = scoreActionStrategic(
      state,
      {
        type: 'ACTIVATE_COUNTER_CHARACTER',
        actionId: 'c3',
        playerId: 'p2',
        handCardInstanceId: threeK,
        boostTargetInstanceId: leaderId,
      },
      'p2',
      rig.defs,
      {},
      strategic,
    );

    expect(score1k).toBeGreaterThan(score3k);
  });

  it('chooseAction picks the 1k counter when deficit is 1k', () => {
    const { state, rig, handIds } = counterBattle({
      attackerPower: 6000,
      defenderPower: 5000,
      counters: [1000, 3000],
    });

    const decision = chooseAction({
      state,
      playerId: 'p2',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'counter-eff' },
      createActionId: () => 'counter-eff',
    });

    expect(decision?.action.type).toBe('ACTIVATE_COUNTER_CHARACTER');
    if (decision?.action.type === 'ACTIVATE_COUNTER_CHARACTER') {
      expect(decision.action.handCardInstanceId).toBe(handIds[0]);
    }
  });

  it('passes when already safe without counters', () => {
    const { state, rig, leaderId, handIds } = counterBattle({
      attackerPower: 4000,
      defenderPower: 5000,
      counters: [1000, 3000],
    });
    const strategic = buildStrategicContext(state, 'p2', rig.defs, {});

    const passScore = scoreActionStrategic(
      state,
      { type: 'PASS_STEP', actionId: 'pass', playerId: 'p2' },
      'p2',
      rig.defs,
      {},
      strategic,
    );
    const counterScore = scoreActionStrategic(
      state,
      {
        type: 'ACTIVATE_COUNTER_CHARACTER',
        actionId: 'c',
        playerId: 'p2',
        handCardInstanceId: handIds[0],
        boostTargetInstanceId: leaderId,
      },
      'p2',
      rig.defs,
      {},
      strategic,
    );
    expect(passScore).toBeGreaterThan(counterScore);

    const decision = chooseAction({
      state,
      playerId: 'p2',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'normal', seed: 'counter-pass' },
      createActionId: () => 'counter-pass',
    });

    expect(decision?.action.type).toBe('PASS_STEP');
  });
});
