import { describe, expect, it } from 'vitest';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDeckCards, putLifeCards } from '../../engine/rules/shared/__tests__/testRig';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { chooseAction } from '../cpuPlayer';
import {
  analyzeLethalLine,
  prematureEndMainPenalty,
} from '../planning/lethalLineAnalyzer';

describe('lethal line preservation', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK', baseCost: 0, basePower: 1000 });

  function withDecks(rig: ReturnType<typeof buildBaseRig>) {
    let next = rig;
    next = putDeckCards(next, 'p1', filler, 10).rig;
    next = putDeckCards(next, 'p2', filler, 10).rig;
    return next;
  }

  it('detects remaining attackers that can close this turn', () => {
    const char = makeCharacterDef({ cardNumber: 'ATK-1', baseCost: 0, basePower: 5000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = putCharacterInPlay(rig, 'p1', char).rig;
    rig = putCharacterInPlay(rig, 'p1', { ...char, cardDefinitionId: 'ATK-2', cardNumber: 'ATK-2' }).rig;
    rig = putLifeCards(rig, 'p2', [makeCharacterDef({ cardNumber: 'L-1', baseCost: 0 })]).rig;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    const line = analyzeLethalLine(state, 'p1', rig.defs);
    expect(line.remainingActiveAttackers.length).toBeGreaterThanOrEqual(2);
    expect(line.canCloseThisTurn).toBe(true);
    expect(prematureEndMainPenalty(line, 'lethal_search', true)).toBeGreaterThan(100);
  });

  it('scores END_MAIN far below leader attack when lethal is open', () => {
    const char = makeCharacterDef({ cardNumber: 'ATK-3', baseCost: 0, basePower: 6000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = putCharacterInPlay(rig, 'p1', char).rig;
    rig = putLifeCards(rig, 'p2', [makeCharacterDef({ cardNumber: 'L-2', baseCost: 0 })]).rig;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, {});

    const leaderId = state.players.p2.leaderInstanceId!;
    const attackerId = state.players.p1.characterArea.cardIds[0];

    const endScore = scoreActionStrategic(
      state,
      { type: 'END_MAIN_PHASE', actionId: 'end', playerId: 'p1' },
      'p1',
      rig.defs,
      {},
      strategic,
    );
    const attackScore = scoreActionStrategic(
      state,
      { type: 'DECLARE_ATTACK', actionId: 'atk', playerId: 'p1', attackerInstanceId: attackerId, targetInstanceId: leaderId },
      'p1',
      rig.defs,
      {},
      strategic,
    );

    expect(endScore).toBeLessThan(0);
    expect(attackScore).toBeGreaterThan(endScore);
  });

  it('chooseAction attacks leader instead of ending with lethal on board', () => {
    const char = makeCharacterDef({ cardNumber: 'ATK-CPU', baseCost: 0, basePower: 7000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = withDecks(rig);
    rig = putCharacterInPlay(rig, 'p1', char).rig;
    rig = putLifeCards(rig, 'p2', [makeCharacterDef({ cardNumber: 'L-CPU', baseCost: 0 })]).rig;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'lethal-line' },
      createActionId: () => 'lethal-line-action',
    });

    expect(decision?.action.type).toBe('DECLARE_ATTACK');
    expect(decision?.action.type === 'DECLARE_ATTACK' && decision.action.targetInstanceId).toBe(state.players.p2.leaderInstanceId);
  });
});
