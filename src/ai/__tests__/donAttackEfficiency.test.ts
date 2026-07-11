import { describe, expect, it } from 'vitest';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon, putDeckCards } from '../../engine/rules/shared/__tests__/testRig';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { chooseAction } from '../cpuPlayer';
import { analyzeLethalLine } from '../planning/lethalLineAnalyzer';

describe('DON assignment and winning attacks', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK', baseCost: 0, basePower: 1000 });

  function withDecks(rig: ReturnType<typeof buildBaseRig>) {
    let next = putDeckCards(rig, 'p1', filler, 10).rig;
    next = putDeckCards(next, 'p2', filler, 10).rig;
    return next;
  }

  it('does not count underpowered attackers in the lethal line', () => {
    const weak = makeCharacterDef({ cardNumber: 'WEAK', baseCost: 0, basePower: 3000 });
    const strongLeader = makeCharacterDef({
      cardNumber: 'STR-L',
      baseCost: 0,
      basePower: 8000,
      category: 'leader',
      life: 5,
    });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, leaderOverridesP2: strongLeader });
    rig = putCharacterInPlay(rig, 'p1', weak).rig;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    const line = analyzeLethalLine(state, 'p1', rig.defs);
    expect(line.remainingActiveAttackers).toHaveLength(0);
    expect(line.hasOpenLethalLine).toBe(false);
  });

  it('penalizes GIVE_DON that still cannot beat the opponent leader', () => {
    const weak = makeCharacterDef({ cardNumber: 'WEAK-D', baseCost: 0, basePower: 3000 });
    const strongLeader = makeCharacterDef({
      cardNumber: 'STR-LD',
      baseCost: 0,
      basePower: 8000,
      category: 'leader',
      life: 5,
    });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, leaderOverridesP2: strongLeader });
    const char = putCharacterInPlay(rig, 'p1', weak);
    rig = putDon(char.rig, 'p1', 2).rig;
    const donId = rig.state.players.p1.costArea.cardIds.find((id) => rig.state.cardsById[id]?.donRested === false)!;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, {});

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

    // 3000+1000=4000 still loses to 8000 — DON dump should not beat ending turn.
    expect(giveDon).toBeLessThan(endMain);
  });

  it('chooseAction does not attack leader after insufficient DON pump', () => {
    const weak = makeCharacterDef({ cardNumber: 'WEAK-A', baseCost: 0, basePower: 4000 });
    const strongLeader = makeCharacterDef({
      cardNumber: 'STR-LA',
      baseCost: 0,
      basePower: 7000,
      category: 'leader',
      life: 5,
    });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, leaderOverridesP2: strongLeader });
    rig = withDecks(rig);
    const char = putCharacterInPlay(rig, 'p1', weak);
    // Already has 1 DON attached → 5000 power, still < 7000
    rig = putDon(char.rig, 'p1', 3).rig;
    const donToAttach = rig.state.players.p1.costArea.cardIds.find((id) => rig.state.cardsById[id]?.donRested === false)!;
    rig.state.cardsById[char.instanceId] = {
      ...rig.state.cardsById[char.instanceId],
      donAttached: [donToAttach],
    };
    // Mark that DON as attached (still in cost area per engine model)
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    // Rest own leader so only the weak character can attack
    state.cardsById[state.players.p1.leaderInstanceId!].orientation = 'rested';

    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'no-losing-don-attack' },
      createActionId: () => 'no-losing-don-attack',
    });

    if (decision?.action.type === 'DECLARE_ATTACK') {
      expect(decision.action.targetInstanceId).not.toBe(state.players.p2.leaderInstanceId);
    } else {
      expect(['END_MAIN_PHASE', 'GIVE_DON', 'PLAY_CHARACTER', 'PLAY_STAGE', 'ACTIVATE_EVENT_MAIN']).toContain(
        decision?.action.type,
      );
    }
  });

  it('rewards GIVE_DON that enables a winning leader attack', () => {
    const almost = makeCharacterDef({ cardNumber: 'ALMOST', baseCost: 0, basePower: 4000 });
    const leader = makeCharacterDef({
      cardNumber: 'L-5K',
      baseCost: 0,
      basePower: 5000,
      category: 'leader',
      life: 5,
    });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, leaderOverridesP2: leader });
    const char = putCharacterInPlay(rig, 'p1', almost);
    rig = putDon(char.rig, 'p1', 2).rig;
    const donId = rig.state.players.p1.costArea.cardIds.find((id) => rig.state.cardsById[id]?.donRested === false)!;
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, {});

    const enableDon = scoreActionStrategic(
      state,
      {
        type: 'GIVE_DON',
        actionId: 'en',
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
      { type: 'END_MAIN_PHASE', actionId: 'end2', playerId: 'p1' },
      'p1',
      rig.defs,
      {},
      strategic,
    );

    // 4000+1000=5000 ties leader → enables a successful attack.
    expect(enableDon).toBeGreaterThan(endMain);
  });
});
