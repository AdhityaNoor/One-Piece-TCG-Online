import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putDeckCards,
  putDon,
  putDonDeckCards,
  putInHand,
  putLifeCards,
} from '../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../../cards/effectTemplates/assembler';
import { ST03_ASSIGNMENTS } from '../../cards/effectTemplates/assignments/ST03';
import type { EffectProgram } from '../../engine/effects';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { chooseAction } from '../cpuPlayer';
import {
  analyzeLeaderActivation,
  unusedLeaderActivationEndPenalty,
} from '../planning/leaderActivationPlanner';
import { generateAndRankTurnPlans } from '../planning/sequenceGenerator';
import { generateLegalActions } from '../utilities/legalActions';

const st03Registry = buildRegistryFromAssignments(ST03_ASSIGNMENTS);

describe('leader activation sequencing', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK-FILL', baseCost: 0, basePower: 1000 });

  function crocLeader() {
    return makeLeaderDef({
      cardDefinitionId: 'ST03-001',
      cardNumber: 'ST03-001',
      name: 'Crocodile',
      basePower: 5000,
      life: 5,
    });
  }

  function withBasics(rig: ReturnType<typeof buildBaseRig>) {
    let next = putDeckCards(rig, 'p1', filler, 8).rig;
    next = putDeckCards(next, 'p2', filler, 8).rig;
    next = putDonDeckCards(next, 'p1', 10).rig;
    const life = Array.from({ length: 5 }, (_, i) =>
      makeCharacterDef({ cardNumber: `LIFE-${i}`, baseCost: 0 }),
    );
    next = putLifeCards(next, 'p1', life).rig;
    next = putLifeCards(next, 'p2', life).rig;
    return next;
  }

  it('detects available once-per-turn Leader activate when DON and gates are ready', () => {
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 5,
      leaderOverridesP1: crocLeader(),
    });
    rig = withBasics(rig);
    rig = putDon(rig, 'p1', 4).rig;
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardNumber: 'FOE', baseCost: 4, basePower: 5000 }));
    const state = { ...foe.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', foe.rig.defs, st03Registry);

    const analysis = analyzeLeaderActivation(state, 'p1', foe.rig.defs, st03Registry, strategic);
    expect(analysis.oncePerTurn).toBe(true);
    expect(analysis.available).toBe(true);
    expect(analysis.donCost).toBe(4);
    expect(analysis.preferActivateBeforeAttack).toBe(true);
    expect(analysis.alreadyUsed).toBe(false);
  });

  it('prefers preserving DON when activation would empty the cost area under pressure', () => {
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 8,
      leaderOverridesP1: crocLeader(),
    });
    rig = withBasics(rig);
    // Exactly 4 DON, no bounce target → low activation value, lethal mode wants DON for pumps.
    rig = putDon(rig, 'p1', 4).rig;
    const attacker = putCharacterInPlay(
      rig,
      'p1',
      makeCharacterDef({ cardNumber: 'ATK', baseCost: 0, basePower: 6000 }),
    );
    const state = { ...attacker.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = {
      ...buildStrategicContext(state, 'p1', attacker.rig.defs, st03Registry),
      mode: 'lethal_search' as const,
    };

    const analysis = analyzeLeaderActivation(state, 'p1', attacker.rig.defs, st03Registry, strategic);
    expect(analysis.preferPreserveDon).toBe(true);
  });

  it('penalizes ending Main with an unused valuable once-per-turn Leader activation', () => {
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 5,
      leaderOverridesP1: crocLeader(),
    });
    rig = withBasics(rig);
    rig = putDon(rig, 'p1', 5).rig;
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardNumber: 'FOE2', baseCost: 3, basePower: 4000 }));
    const state = { ...foe.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', foe.rig.defs, st03Registry);

    const penalty = unusedLeaderActivationEndPenalty(state, 'p1', foe.rig.defs, st03Registry, strategic);
    expect(penalty).toBeGreaterThan(10);

    let n = 0;
    const createActionId = () => `id-${n++}`;
    const endScore = scoreActionStrategic(
      state,
      { type: 'END_MAIN_PHASE', actionId: 'end', playerId: 'p1' },
      'p1',
      foe.rig.defs,
      st03Registry,
      strategic,
      createActionId,
    );
    const activate = generateLegalActions({
      state,
      playerId: 'p1',
      defs: foe.rig.defs,
      registry: st03Registry,
      createActionId,
    }).find((a) => a.type === 'ACTIVATE_CARD_EFFECT');
    expect(activate).toBeDefined();
    const activateScore = scoreActionStrategic(
      state,
      activate!,
      'p1',
      foe.rig.defs,
      st03Registry,
      strategic,
      createActionId,
    );
    expect(activateScore).toBeGreaterThan(endScore);
  });

  it('prefers play-before-activate when Leader gates need a board piece', () => {
    const leaderDef = makeLeaderDef({
      cardDefinitionId: 'GATE-LEAD',
      cardNumber: 'GATE-LEAD',
      name: 'Gate Leader',
    });
    const body = makeCharacterDef({ cardNumber: 'BODY', baseCost: 1, basePower: 2000 });
    const program: EffectProgram = {
      cardNumber: 'GATE-LEAD',
      abilities: [
        {
          timing: 'activateMain',
          oncePerTurn: true,
          gate: [{ kind: 'selfCharacterCount', atLeast: 1 }],
          ops: [{ op: 'draw', amount: 1 }],
        },
      ],
    };
    const registry = { 'GATE-LEAD': program };

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 4,
      leaderOverridesP1: leaderDef,
    });
    rig = withBasics(rig);
    rig = putDon(rig, 'p1', 3).rig;
    const hand = putInHand(rig, 'p1', body);
    const state = { ...hand.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', hand.rig.defs, registry);

    const analysis = analyzeLeaderActivation(state, 'p1', hand.rig.defs, registry, strategic);
    expect(analysis.gatesMet).toBe(false);
    expect(analysis.available).toBe(false);
    expect(analysis.preferPlayBeforeActivate).toBe(true);
  });

  it('ranks a leader_activate plan when bounce removal is available', () => {
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 5,
      leaderOverridesP1: crocLeader(),
    });
    rig = withBasics(rig);
    rig = putDon(rig, 'p1', 5).rig;
    // Rest leader so we do not prefer attacking with it over activating.
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardNumber: 'FOE3', baseCost: 4, basePower: 6000 }));
    const state = { ...foe.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', foe.rig.defs, st03Registry);
    let n = 0;
    const createActionId = () => `plan-${n++}`;

    const plans = generateAndRankTurnPlans(state, 'p1', foe.rig.defs, st03Registry, strategic, createActionId);
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.some((p) => p.steps.includes('leader_activate') || p.firstAction?.type === 'ACTIVATE_CARD_EFFECT')).toBe(
      true,
    );
  });

  it('chooseAction activates Leader bounce when a cost ≤5 target exists', () => {
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 5,
      leaderOverridesP1: crocLeader(),
    });
    rig = withBasics(rig);
    rig = putDon(rig, 'p1', 5).rig;
    rig.state.cardsById[rig.state.players.p1.leaderInstanceId!].orientation = 'rested';
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardNumber: 'FOE4', baseCost: 5, basePower: 7000 }));
    const state = { ...foe.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: foe.rig.defs,
      registry: st03Registry,
      config: { difficulty: 'hard', seed: 'leader-activate-bounce' },
      createActionId: () => `act-${Math.random()}`,
    });
    expect(decision).not.toBeNull();
    expect(decision!.action.type).toBe('ACTIVATE_CARD_EFFECT');
    if (decision!.action.type === 'ACTIVATE_CARD_EFFECT') {
      expect(decision!.action.sourceInstanceId).toBe(state.players.p1.leaderInstanceId);
    }
  });
});
