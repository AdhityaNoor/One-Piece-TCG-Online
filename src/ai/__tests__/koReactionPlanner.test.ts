import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDeckCards,
} from '../../engine/rules/shared/__tests__/testRig';
import type { EffectProgram, EffectTemplateRegistry } from '../../engine/effects';
import type { PendingChoice } from '../../engine/events/pendingChoice';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { scoreStrategicChoice } from '../evaluation/choiceEvaluator';
import {
  analyzeKoReaction,
  scoreKoReactionForRemoval,
  scoreOwnSacrificeWithOnKo,
} from '../planning/koReactionPlanner';

describe('onKO / removal-reactive evaluation', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK-KO', baseCost: 0, basePower: 1000 });

  function withDecks(rig: ReturnType<typeof buildBaseRig>) {
    let next = putDeckCards(rig, 'p1', filler, 8).rig;
    next = putDeckCards(next, 'p2', filler, 8).rig;
    return next;
  }

  const onKoDraw: EffectProgram = {
    cardNumber: 'KO-DRAW',
    abilities: [{ timing: 'onKO', ops: [{ op: 'draw', amount: 1 }] }],
  };

  const onKoPlay: EffectProgram = {
    cardNumber: 'KO-PLAY',
    abilities: [
      {
        timing: 'onKO',
        ops: [{ op: 'draw', amount: 2 }],
      },
    ],
  };

  it('penalizes K.O.ing an opponent with a strong [On K.O.] vs a vanilla peer', () => {
    const reactive = makeCharacterDef({
      cardDefinitionId: 'KO-DRAW',
      cardNumber: 'KO-DRAW',
      baseCost: 4,
      basePower: 5000,
    });
    const vanilla = makeCharacterDef({
      cardDefinitionId: 'VAN-KO',
      cardNumber: 'VAN-KO',
      baseCost: 4,
      basePower: 5000,
    });
    const registry: EffectTemplateRegistry = { 'KO-DRAW': onKoDraw };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    const r = putCharacterInPlay(rig, 'p2', reactive);
    const v = putCharacterInPlay(r.rig, 'p2', vanilla);
    const state = { ...v.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', v.rig.defs, registry);

    const reactiveAnalysis = analyzeKoReaction(
      state,
      'p1',
      v.rig.defs,
      registry,
      strategic,
      r.instanceId,
    );
    const vanillaAnalysis = analyzeKoReaction(
      state,
      'p1',
      v.rig.defs,
      registry,
      strategic,
      v.instanceId,
    );

    expect(reactiveAnalysis.hasOnKo).toBe(true);
    expect(reactiveAnalysis.preferAvoidKo).toBe(true);
    expect(reactiveAnalysis.scoreAdjust).toBeLessThan(vanillaAnalysis.scoreAdjust);
    expect(scoreKoReactionForRemoval(state, 'p1', v.rig.defs, registry, strategic, r.instanceId)).toBeLessThan(
      0,
    );
  });

  it('prefers K.O. choice on vanilla over [On K.O.] draw body', () => {
    const reactive = makeCharacterDef({
      cardDefinitionId: 'KO-DRAW',
      cardNumber: 'KO-DRAW',
      baseCost: 3,
      basePower: 4000,
    });
    const vanilla = makeCharacterDef({
      cardDefinitionId: 'VAN-KO2',
      cardNumber: 'VAN-KO2',
      baseCost: 3,
      basePower: 4000,
    });
    const registry: EffectTemplateRegistry = { 'KO-DRAW': onKoDraw };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    const r = putCharacterInPlay(rig, 'p2', reactive);
    const v = putCharacterInPlay(r.rig, 'p2', vanilla);
    const state = { ...v.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', v.rig.defs, registry);

    const choice: PendingChoice = {
      id: 'pick-ko',
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'K.O. one Character',
      constraints: {
        min: 1,
        max: 1,
        candidateInstanceIds: [r.instanceId, v.instanceId],
      },
      sourceInstanceId: null,
      sourceEffectId: null,
    };

    const pickReactive = scoreStrategicChoice(
      state,
      'p1',
      v.rig.defs,
      registry,
      strategic,
      choice,
      [r.instanceId],
    );
    const pickVanilla = scoreStrategicChoice(
      state,
      'p1',
      v.rig.defs,
      registry,
      strategic,
      choice,
      [v.instanceId],
    );
    expect(pickVanilla).toBeGreaterThan(pickReactive);
  });

  it('rewards sacrificing own Character when [On K.O.] is strong', () => {
    const sacrifice = makeCharacterDef({
      cardDefinitionId: 'KO-PLAY',
      cardNumber: 'KO-PLAY',
      baseCost: 2,
      basePower: 2000,
    });
    const vanilla = makeCharacterDef({
      cardDefinitionId: 'VAN-SAC',
      cardNumber: 'VAN-SAC',
      baseCost: 2,
      basePower: 2000,
    });
    const registry: EffectTemplateRegistry = { 'KO-PLAY': onKoPlay };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 4 });
    const s = putCharacterInPlay(rig, 'p1', sacrifice);
    const v = putCharacterInPlay(s.rig, 'p1', vanilla);
    const state = { ...v.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', v.rig.defs, registry);

    const sacBonus = scoreOwnSacrificeWithOnKo(state, 'p1', v.rig.defs, registry, strategic, s.instanceId);
    const vanBonus = scoreOwnSacrificeWithOnKo(state, 'p1', v.rig.defs, registry, strategic, v.instanceId);
    expect(sacBonus).toBeGreaterThan(vanBonus);

    const analysis = analyzeKoReaction(state, 'p1', v.rig.defs, registry, strategic, s.instanceId);
    expect(analysis.preferSacrifice).toBe(true);
  });

  it('prefers attacking a vanilla over an equal-power [On K.O.] body', () => {
    const reactive = makeCharacterDef({
      cardDefinitionId: 'KO-DRAW',
      cardNumber: 'KO-DRAW',
      baseCost: 3,
      basePower: 4000,
    });
    const vanilla = makeCharacterDef({
      cardDefinitionId: 'VAN-ATK-KO',
      cardNumber: 'VAN-ATK-KO',
      baseCost: 3,
      basePower: 4000,
    });
    const attacker = makeCharacterDef({
      cardDefinitionId: 'ATK-KO',
      cardNumber: 'ATK-KO',
      baseCost: 0,
      basePower: 6000,
    });
    const registry: EffectTemplateRegistry = { 'KO-DRAW': onKoDraw };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    rig = withDecks(rig);
    const atk = putCharacterInPlay(rig, 'p1', attacker);
    const r = putCharacterInPlay(atk.rig, 'p2', reactive);
    const v = putCharacterInPlay(r.rig, 'p2', vanilla);
    // Rest leaders so character trades are the focus.
    v.rig.state.cardsById[v.rig.state.players.p1.leaderInstanceId!].orientation = 'rested';
    v.rig.state.cardsById[v.rig.state.players.p2.leaderInstanceId!].orientation = 'rested';
    const state = { ...v.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', v.rig.defs, registry);

    const hitReactive = scoreActionStrategic(
      state,
      {
        type: 'DECLARE_ATTACK',
        actionId: 'a1',
        playerId: 'p1',
        attackerInstanceId: atk.instanceId,
        targetInstanceId: r.instanceId,
      },
      'p1',
      v.rig.defs,
      registry,
      strategic,
    );
    const hitVanilla = scoreActionStrategic(
      state,
      {
        type: 'DECLARE_ATTACK',
        actionId: 'a2',
        playerId: 'p1',
        attackerInstanceId: atk.instanceId,
        targetInstanceId: v.instanceId,
      },
      'p1',
      v.rig.defs,
      registry,
      strategic,
    );
    expect(hitVanilla).toBeGreaterThan(hitReactive);
  });
});
