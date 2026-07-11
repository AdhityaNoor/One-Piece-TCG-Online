import { describe, expect, it } from 'vitest';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDeckCards, putLifeCards } from '../../engine/rules/shared/__tests__/testRig';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { chooseAction } from '../cpuPlayer';
import {
  analyzeSequencedLethalInsight,
  evaluateSequencedLethalBonus,
} from '../planning/lethalSequencePlanner';
import { analyzeLethalLine } from '../planning/lethalLineAnalyzer';

describe('sequenced lethal (character then leader)', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK', baseCost: 0, basePower: 1000 });

  function withDecks(rig: ReturnType<typeof buildBaseRig>) {
    let next = putDeckCards(rig, 'p1', filler, 10).rig;
    next = putDeckCards(next, 'p2', filler, 10).rig;
    return next;
  }

  function lethalBoard() {
    const blocker = makeCharacterDef({
      cardNumber: 'BLK-1',
      baseCost: 3,
      basePower: 4000,
      hasBlocker: true,
    });
    const attacker = makeCharacterDef({ cardNumber: 'ATK-A', baseCost: 0, basePower: 7000 });
    const attacker2 = makeCharacterDef({ cardNumber: 'ATK-B', baseCost: 0, basePower: 6500 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = withDecks(rig);
    rig = putCharacterInPlay(rig, 'p1', attacker).rig;
    rig = putCharacterInPlay(rig, 'p1', { ...attacker2, cardDefinitionId: 'ATK-B-DEF' }).rig;
    const blockerPlay = putCharacterInPlay(rig, 'p2', blocker, { orientation: 'rested' });
    rig = putLifeCards(blockerPlay.rig, 'p2', [makeCharacterDef({ cardNumber: 'L-SEQ', baseCost: 0 })]).rig;

    const state = {
      ...rig.state,
      setupState: null,
      currentBattle: null,
      pendingChoices: [],
    };
    return { state, rig, blockerId: blockerPlay.instanceId };
  }

  it('detects rested blocker clear before leader lethal', () => {
    const { state, rig } = lethalBoard();
    const line = analyzeLethalLine(state, 'p1', rig.defs);
    const insight = analyzeSequencedLethalInsight(state, 'p1', rig.defs, line);

    expect(line.hasOpenLethalLine).toBe(true);
    expect(insight.shouldClearFirst).toBe(true);
    expect(insight.clearTargetIds.length).toBeGreaterThan(0);
  });

  it('prefers attacking rested blocker before leader when clearing opens lethal', () => {
    const { state, rig, blockerId } = lethalBoard();
    const strategic = { ...buildStrategicContext(state, 'p1', rig.defs, {}), mode: 'lethal_search' as const };
    let actionId = 0;
    const createActionId = () => `seq-${actionId++}`;

    const leaderId = state.players.p2.leaderInstanceId!;
    const attackerA = state.players.p1.characterArea.cardIds[0];

    const blockerBonus = evaluateSequencedLethalBonus(
      state,
      { type: 'DECLARE_ATTACK', actionId: 'b', playerId: 'p1', attackerInstanceId: attackerA, targetInstanceId: blockerId },
      'p1',
      rig.defs,
      {},
      strategic,
      createActionId,
      analyzeLethalLine(state, 'p1', rig.defs),
    );
    const leaderBonus = evaluateSequencedLethalBonus(
      state,
      { type: 'DECLARE_ATTACK', actionId: 'l', playerId: 'p1', attackerInstanceId: attackerA, targetInstanceId: leaderId },
      'p1',
      rig.defs,
      {},
      strategic,
      createActionId,
      analyzeLethalLine(state, 'p1', rig.defs),
    );

    expect(blockerBonus).toBeGreaterThan(leaderBonus);

    const blockerScore = scoreActionStrategic(
      state,
      { type: 'DECLARE_ATTACK', actionId: 'bs', playerId: 'p1', attackerInstanceId: attackerA, targetInstanceId: blockerId },
      'p1',
      rig.defs,
      {},
      strategic,
      createActionId,
    );
    const leaderScore = scoreActionStrategic(
      state,
      { type: 'DECLARE_ATTACK', actionId: 'ls', playerId: 'p1', attackerInstanceId: attackerA, targetInstanceId: leaderId },
      'p1',
      rig.defs,
      {},
      strategic,
      createActionId,
    );

    expect(blockerScore).toBeGreaterThan(leaderScore);
  });

  it('chooseAction clears rested blocker before going to leader', () => {
    const { state, rig, blockerId } = lethalBoard();
    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'seq-lethal' },
      createActionId: () => 'seq-lethal-action',
    });

    expect(decision?.action.type).toBe('DECLARE_ATTACK');
    if (decision?.action.type === 'DECLARE_ATTACK') {
      expect(decision.action.targetInstanceId).toBe(blockerId);
    }
  });
});
