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
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { chooseAction } from '../cpuPlayer';
import {
  generateAndRankTurnPlans,
  simulateTurnPlan,
  type TurnPlanTemplate,
} from '../planning/sequenceGenerator';

describe('turn plan sequence generator', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK', baseCost: 0, basePower: 1000 });

  function withDecks(rig: ReturnType<typeof buildBaseRig>) {
    let next = putDeckCards(rig, 'p1', filler, 10).rig;
    next = putDeckCards(next, 'p2', filler, 10).rig;
    return next;
  }

  function withLife(rig: ReturnType<typeof buildBaseRig>, playerId: 'p1' | 'p2', count: number) {
    const cards = Array.from({ length: count }, (_, i) =>
      makeCharacterDef({ cardNumber: `LIFE-${playerId}-${i}`, baseCost: 0 }),
    );
    return putLifeCards(rig, playerId, cards).rig;
  }

  it('simulates a don → attack_leader → end plan', () => {
    const attacker = makeCharacterDef({ cardNumber: 'ATK-P', baseCost: 0, basePower: 4000 });
    const leader = makeCharacterDef({
      cardNumber: 'L-P',
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
    rig = withLife(rig, 'p2', 1);
    const char = putCharacterInPlay(rig, 'p1', attacker);
    rig = putDon(char.rig, 'p1', 3).rig;
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';

    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = { ...buildStrategicContext(state, 'p1', rig.defs, {}), mode: 'lethal_search' as const };
    let n = 0;
    const createActionId = () => `plan-${n++}`;

    const template: TurnPlanTemplate = {
      id: 'test-don-leader',
      steps: ['give_don', 'attack_leader', 'end'],
      required: ['attack_leader'],
    };
    const result = simulateTurnPlan(state, 'p1', rig.defs, {}, strategic, createActionId, template);

    expect(result.failed).toBe(false);
    expect(result.actions[0]?.type).toBe('GIVE_DON');
    expect(result.actions.some((a) => a.type === 'DECLARE_ATTACK')).toBe(true);
    expect(result.firstAction?.type).toBe('GIVE_DON');
  });

  it('ranks clear-then-leader above thin leader-first when a rested blocker exists', () => {
    const attacker = makeCharacterDef({ cardNumber: 'A1', baseCost: 0, basePower: 7000 });
    const attacker2 = makeCharacterDef({ cardNumber: 'A2', baseCost: 0, basePower: 6500 });
    const blocker = makeCharacterDef({
      cardNumber: 'BLK',
      baseCost: 3,
      basePower: 4000,
      hasBlocker: true,
    });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
    rig = withDecks(rig);
    // 2 Life: a single leader hit does not win (engine requires damage at 0 Life).
    // Keeps both plans non-terminal so sequencing preference decides.
    rig = withLife(rig, 'p2', 2);
    rig = withLife(rig, 'p1', 5);
    rig = putCharacterInPlay(rig, 'p1', attacker).rig;
    rig = putCharacterInPlay(rig, 'p1', { ...attacker2, cardDefinitionId: 'A2-DEF' }).rig;
    const blockerPlay = putCharacterInPlay(rig, 'p2', blocker, { orientation: 'rested' });
    rig = blockerPlay.rig;
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';

    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = { ...buildStrategicContext(state, 'p1', rig.defs, {}), mode: 'lethal_search' as const };
    let n = 0;
    const createActionId = () => `rank-${n++}`;

    const plans = generateAndRankTurnPlans(state, 'p1', rig.defs, {}, strategic, createActionId);
    expect(plans.length).toBeGreaterThan(0);

    const clearPlan = plans.find((p) => p.id === 'lethal-clear-then-leader');
    expect(clearPlan).toBeTruthy();
    expect(clearPlan!.firstAction?.type).toBe('DECLARE_ATTACK');
    if (clearPlan!.firstAction?.type === 'DECLARE_ATTACK') {
      expect(clearPlan!.firstAction.targetInstanceId).toBe(blockerPlay.instanceId);
    }

    const leaderFirst = plans.find(
      (p) =>
        p.firstAction?.type === 'DECLARE_ATTACK' &&
        p.firstAction.targetInstanceId === state.players.p2.leaderInstanceId,
    );
    expect(clearPlan!.endUtility).toBeGreaterThan(leaderFirst?.endUtility ?? -Infinity);
  });

  it('chooseAction opens with DON pump when the best turn plan needs overkill setup', () => {
    const attacker = makeCharacterDef({ cardNumber: 'PUMP', baseCost: 0, basePower: 4000 });
    const leader = makeCharacterDef({
      cardNumber: 'L-PUMP',
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
    rig = withLife(rig, 'p2', 1);
    // Empty opponent hand so Counter-aware lethal does not force bait.
    const char = putCharacterInPlay(rig, 'p1', attacker);
    rig = putDon(char.rig, 'p1', 4).rig;
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';

    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'turn-plan-don' },
      createActionId: () => 'turn-plan-don',
    });

    // Without DON the character loses to 5k leader; the turn plan should open with GIVE_DON.
    expect(decision?.action.type).toBe('GIVE_DON');
  });

  it('develop mode includes a play-first plan when a character is in hand', () => {
    const body = makeCharacterDef({ cardNumber: 'BODY', baseCost: 0, basePower: 3000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 4 });
    rig = withDecks(rig);
    rig = withLife(rig, 'p1', 5);
    rig = withLife(rig, 'p2', 5);
    const hand = putInHand(rig, 'p1', body);
    const state = { ...hand.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    // Rest leaders so mode stays develop-ish without lethal pressure.
    state.cardsById[state.players.p1.leaderInstanceId!].orientation = 'rested';
    state.cardsById[state.players.p2.leaderInstanceId!].orientation = 'rested';

    const strategic = { ...buildStrategicContext(state, 'p1', hand.rig.defs, {}), mode: 'develop' as const };
    let n = 0;
    const plans = generateAndRankTurnPlans(state, 'p1', hand.rig.defs, {}, strategic, () => `dev-${n++}`);
    const playFirst = plans.find((p) => p.firstAction?.type === 'PLAY_CHARACTER');
    expect(playFirst).toBeTruthy();
  });
});
