import { describe, expect, it } from 'vitest';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putLifeCards } from '../../engine/rules/shared/__tests__/testRig';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { chooseAction } from '../cpuPlayer';

describe('attack trade evaluation', () => {
  it('strongly penalizes leader attacks that lose the power comparison', () => {
    const weak = makeCharacterDef({ cardNumber: 'WEAK', baseCost: 0, basePower: 3000 });
    const strongLeader = makeCharacterDef({ cardNumber: 'STR-L', baseCost: 0, basePower: 8000, category: 'leader', life: 5 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, leaderOverridesP2: strongLeader });
    rig = putCharacterInPlay(rig, 'p1', weak).rig;
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, {});

    const leaderId = state.players.p2.leaderInstanceId!;
    const attackerId = state.players.p1.characterArea.cardIds[0];

    const badAttack = scoreActionStrategic(
      state,
      { type: 'DECLARE_ATTACK', actionId: 'bad', playerId: 'p1', attackerInstanceId: attackerId, targetInstanceId: leaderId },
      'p1',
      rig.defs,
      {},
      strategic,
    );
    const endTurn = scoreActionStrategic(
      state,
      { type: 'END_MAIN_PHASE', actionId: 'end', playerId: 'p1' },
      'p1',
      rig.defs,
      {},
      strategic,
    );

    expect(badAttack).toBeLessThan(endTurn);
    expect(badAttack).toBeLessThan(0);
  });

  it('scores losing character trades near the losing-trade floor', () => {
    const weak = makeCharacterDef({ cardNumber: 'WEAK-2', baseCost: 0, basePower: 2000 });
    const strong = makeCharacterDef({ cardNumber: 'STR-C', baseCost: 3, basePower: 6000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = putCharacterInPlay(rig, 'p1', weak).rig;
    rig = putCharacterInPlay(rig, 'p2', strong, { orientation: 'rested' }).rig;
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, {});

    const targetId = state.players.p2.characterArea.cardIds[0];
    const attackerId = state.players.p1.characterArea.cardIds[0];

    const badAttack = scoreActionStrategic(
      state,
      { type: 'DECLARE_ATTACK', actionId: 'bad2', playerId: 'p1', attackerInstanceId: attackerId, targetInstanceId: targetId },
      'p1',
      rig.defs,
      {},
      strategic,
    );

    expect(badAttack).toBeLessThanOrEqual(-90);
  });

  it('chooseAction does not pick a losing leader attack when END_MAIN is available', () => {
    const weak = makeCharacterDef({ cardNumber: 'WEAK-3', baseCost: 0, basePower: 2500 });
    const strongLeader = makeCharacterDef({ cardNumber: 'STR-L2', baseCost: 0, basePower: 9000, category: 'leader', life: 5 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, leaderOverridesP2: strongLeader });
    rig = putCharacterInPlay(rig, 'p1', weak).rig;
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';
    rig = putLifeCards(rig, 'p2', [makeCharacterDef({ cardNumber: 'L-X', baseCost: 0 })]).rig;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'no-losing-attack' },
      createActionId: () => 'no-losing-attack',
    });

    if (decision?.action.type === 'DECLARE_ATTACK') {
      const trade = decision.action;
      expect(computeCurrentPower(rig.defs, state, trade.attackerInstanceId)).toBeGreaterThanOrEqual(
        computeCurrentPower(rig.defs, state, trade.targetInstanceId),
      );
    }
  });
});
