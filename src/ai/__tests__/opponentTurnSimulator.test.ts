import { describe, expect, it } from 'vitest';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDeckCards, putLifeCards } from '../../engine/rules/shared/__tests__/testRig';
import { evaluateState, buildStrategicContext } from '../evaluation/stateEvaluator';
import { projectOpponentTurn, simulateOpponentAttackPhase } from '../planning/opponentTurnSimulator';
import { scoreActionWithLookahead } from '../planning/lookaheadPlanner';
import { ownLifeCount } from '../visibility/playerView';

describe('opponent turn pessimism', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK-FILL', baseCost: 0, basePower: 1000 });

  function rigWithDecks(rig: ReturnType<typeof buildBaseRig>): ReturnType<typeof buildBaseRig> {
    let next = putDeckCards(rig, 'p1', filler, 10).rig;
    next = putDeckCards(next, 'p2', filler, 10).rig;
    return next;
  }

  it('simulates opponent attacks that reduce CPU life', () => {
    const attacker = makeCharacterDef({ cardNumber: 'OPP-ATK', baseCost: 1, basePower: 12000 });
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 6 });
    rig = putCharacterInPlay(rig, 'p2', attacker).rig;
    rig = putLifeCards(rig, 'p1', [makeCharacterDef({ cardNumber: 'LIFE-1', baseCost: 0 })]).rig;
    const state = {
      ...rig.state,
      setupState: null,
      currentBattle: null,
      pendingChoices: [],
    };
    expect(ownLifeCount(state, 'p1')).toBe(1);

    let actionId = 0;
    const createActionId = () => `opp-${actionId++}`;
    const projected = simulateOpponentAttackPhase(state, 'p1', rig.defs, {}, createActionId);

    expect(projected.failed).toBe(false);
    expect(projected.attacksSimulated).toBeGreaterThan(0);
    expect(ownLifeCount(projected.state, 'p1')).toBe(0);
  });

  it('projectOpponentTurn lowers utility when CPU ends into lethal attack', () => {
    const attacker = makeCharacterDef({ cardNumber: 'OPP-LETHAL', baseCost: 1, basePower: 12000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = rigWithDecks(rig);
    rig = putCharacterInPlay(rig, 'p2', attacker).rig;
    rig = putLifeCards(rig, 'p1', [makeCharacterDef({ cardNumber: 'LIFE-ONLY', baseCost: 0 })]).rig;
    const state = {
      ...rig.state,
      setupState: null,
      currentBattle: null,
      pendingChoices: [],
    };

    const before = evaluateState(state, 'p1', rig.defs, {});
    let actionId = 0;
    const projected = projectOpponentTurn(state, 'p1', rig.defs, {}, () => `proj-${actionId++}`);
    expect(projected.failed).toBe(false);
    expect(projected.attacksSimulated).toBeGreaterThan(0);
    expect(ownLifeCount(projected.state, 'p1')).toBeLessThan(ownLifeCount(state, 'p1'));

    const after = evaluateState(projected.state, 'p1', rig.defs, {});
    expect(after).toBeLessThan(before);
  });

  it('END_MAIN lookahead utility reflects opponent threat', () => {
    const attacker = makeCharacterDef({ cardNumber: 'OPP-END', baseCost: 1, basePower: 12000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = rigWithDecks(rig);
    rig = putCharacterInPlay(rig, 'p2', attacker).rig;
    rig = putLifeCards(rig, 'p1', [makeCharacterDef({ cardNumber: 'LIFE-END', baseCost: 0 })]).rig;
    const state = {
      ...rig.state,
      setupState: null,
      currentBattle: null,
      pendingChoices: [],
    };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, {});
    let actionId = 0;
    const createActionId = () => `end-${actionId++}`;
    const baseline = evaluateState(state, 'p1', rig.defs, {});

    const { simulatedUtility, failed } = scoreActionWithLookahead(
      state,
      { type: 'END_MAIN_PHASE', actionId: 'end', playerId: 'p1' },
      'p1',
      rig.defs,
      {},
      strategic,
      10,
      createActionId,
      1,
    );

    expect(failed).toBe(false);
    expect(simulatedUtility).not.toBeNull();
    expect(simulatedUtility!).toBeLessThan(baseline);
  });
});
