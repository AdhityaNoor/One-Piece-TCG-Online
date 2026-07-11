import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putDeckCards,
  putInHand,
} from '../../engine/rules/shared/__tests__/testRig';
import type { EffectProgram } from '../../engine/effects';
import type { PendingChoice } from '../../engine/events/pendingChoice';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { scoreStrategicChoice } from '../evaluation/choiceEvaluator';
import {
  analyzeOptionalSelectCost,
  analyzeOptionalYesNo,
  scoreOptionalYesNoResponse,
} from '../evaluation/optionalCostEvaluator';
import type { EffectScoreContext } from '../heuristics/effectValue';
import { chooseAction } from '../cpuPlayer';

describe('optional cost / YES_NO evaluation', () => {
  it('accepts optional activate when payoff is strong and cost is free', () => {
    const leader = makeLeaderDef({ cardDefinitionId: 'OPT-LEAD', cardNumber: 'OPT-LEAD' });
    const program: EffectProgram = {
      cardNumber: 'OPT-LEAD',
      abilities: [
        {
          timing: 'onStartOfTurn',
          optionalActivate: true,
          ops: [{ op: 'draw', amount: 1 }],
        },
      ],
    };
    const registry = { 'OPT-LEAD': program };
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: leader,
    });
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, registry);
    const leaderId = state.players.p1.leaderInstanceId!;
    const choice: PendingChoice = {
      id: 'opt-activate',
      playerId: 'p1',
      kind: 'YES_NO',
      prompt: 'Activate start-of-turn effect?',
      constraints: { min: 0, max: 1 },
      sourceInstanceId: leaderId,
      sourceEffectId: 'ir',
      resumeState: { abilityIndex: 0, opIndex: -2, bindings: {} },
    };
    const ctx: EffectScoreContext = { state, playerId: 'p1', defs: rig.defs, registry };

    const analysis = analyzeOptionalYesNo(ctx, strategic, choice);
    expect(analysis.preferAccept).toBe(true);
    expect(scoreOptionalYesNoResponse(ctx, strategic, choice, true)).toBeGreaterThan(
      scoreOptionalYesNoResponse(ctx, strategic, choice, false),
    );
  });

  it('declines optional activate when ability cost outweighs weak payoff', () => {
    const leader = makeLeaderDef({ cardDefinitionId: 'COSTLY-LEAD', cardNumber: 'COSTLY-LEAD' });
    const program: EffectProgram = {
      cardNumber: 'COSTLY-LEAD',
      abilities: [
        {
          timing: 'onStartOfTurn',
          optionalActivate: true,
          cost: [{ kind: 'donMinus', count: 4 }],
          ops: [{ op: 'draw', amount: 1 }],
        },
      ],
    };
    const registry = { 'COSTLY-LEAD': program };
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: leader,
    });
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, registry);
    const choice: PendingChoice = {
      id: 'costly',
      playerId: 'p1',
      kind: 'YES_NO',
      prompt: 'Activate start-of-turn effect?',
      constraints: { min: 0, max: 1 },
      sourceInstanceId: state.players.p1.leaderInstanceId!,
      sourceEffectId: 'ir',
      resumeState: { abilityIndex: 0, opIndex: -2, bindings: {} },
    };
    const ctx: EffectScoreContext = { state, playerId: 'p1', defs: rig.defs, registry };

    const analysis = analyzeOptionalYesNo(ctx, strategic, choice);
    expect(analysis.preferAccept).toBe(false);
    expect(scoreOptionalYesNoResponse(ctx, strategic, choice, false)).toBeGreaterThan(
      scoreOptionalYesNoResponse(ctx, strategic, choice, true),
    );
  });

  it('skips optional trash when hand card is valuable and follow-up is weak', () => {
    const sourceDef = makeCharacterDef({
      cardDefinitionId: 'TRASH-SRC',
      cardNumber: 'TRASH-SRC',
      baseCost: 2,
      basePower: 3000,
    });
    const valuable = makeCharacterDef({
      cardNumber: 'VAL',
      baseCost: 5,
      basePower: 7000,
      counter: 2000,
      hasBlocker: true,
    });
    const program: EffectProgram = {
      cardNumber: 'TRASH-SRC',
      abilities: [
        {
          timing: 'onPlay',
          ops: [
            {
              op: 'chooseTargets',
              var: 't',
              from: { sel: 'controllerHand' },
              min: 0,
              max: 1,
              prompt: 'You may trash 1 card from your hand.',
            },
            { op: 'trashCards', target: { sel: 'var', name: 't' } },
            {
              op: 'addPower',
              target: { sel: 'self' },
              amount: 1000,
              duration: 'duringThisTurn',
              ifPrevious: 'previousMovedAny',
            },
          ],
        },
      ],
    };
    const registry = { 'TRASH-SRC': program };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 4 });
    const src = putCharacterInPlay(rig, 'p1', sourceDef);
    const hand = putInHand(src.rig, 'p1', valuable);
    const state = { ...hand.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', hand.rig.defs, registry);
    const choice: PendingChoice = {
      id: 'opt-trash',
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'You may trash 1 card from your hand.',
      constraints: {
        min: 0,
        max: 1,
        candidateInstanceIds: [hand.instanceId],
      },
      sourceInstanceId: src.instanceId,
      sourceEffectId: 'ir',
      resumeState: { abilityIndex: 0, opIndex: 0, bindings: {} },
    };
    const ctx: EffectScoreContext = {
      state,
      playerId: 'p1',
      defs: hand.rig.defs,
      registry,
      sourceInstanceId: src.instanceId,
    };

    const skip = analyzeOptionalSelectCost(ctx, strategic, choice, []);
    const pay = analyzeOptionalSelectCost(ctx, strategic, choice, [hand.instanceId]);
    expect(pay.preferAccept).toBe(false);

    const skipScore = scoreStrategicChoice(state, 'p1', hand.rig.defs, registry, strategic, choice, []);
    const payScore = scoreStrategicChoice(
      state,
      'p1',
      hand.rig.defs,
      registry,
      strategic,
      choice,
      [hand.instanceId],
    );
    expect(skipScore).toBeGreaterThan(payScore);
    expect(skip.preferAccept).toBe(true); // prefer skip flag when payoff weak
  });

  it('pays optional trash when follow-up draw payoff is strong and filler is cheap', () => {
    const sourceDef = makeCharacterDef({
      cardDefinitionId: 'DRAW-SRC',
      cardNumber: 'DRAW-SRC',
      baseCost: 2,
      basePower: 2000,
    });
    const filler = makeCharacterDef({
      cardNumber: 'FILL',
      baseCost: 0,
      basePower: 1000,
      counter: 0,
    });
    const program: EffectProgram = {
      cardNumber: 'DRAW-SRC',
      abilities: [
        {
          timing: 'onPlay',
          ops: [
            {
              op: 'chooseTargets',
              var: 't',
              from: { sel: 'controllerHand' },
              min: 0,
              max: 1,
              prompt: 'You may trash 1 card from your hand.',
            },
            { op: 'trashCards', target: { sel: 'var', name: 't' } },
            { op: 'draw', amount: 2, ifPrevious: 'previousMovedAny' },
          ],
        },
      ],
    };
    const registry = { 'DRAW-SRC': program };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 4 });
    const deckFiller = makeCharacterDef({ cardNumber: 'DECK-OPT', baseCost: 0, basePower: 1000 });
    rig = putDeckCards(rig, 'p1', deckFiller, 10).rig;
    const src = putCharacterInPlay(rig, 'p1', sourceDef);
    const hand = putInHand(src.rig, 'p1', filler);
    const state = { ...hand.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', hand.rig.defs, registry);
    const choice: PendingChoice = {
      id: 'opt-trash-draw',
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'You may trash 1 card from your hand.',
      constraints: {
        min: 0,
        max: 1,
        candidateInstanceIds: [hand.instanceId],
      },
      sourceInstanceId: src.instanceId,
      sourceEffectId: 'ir',
      resumeState: { abilityIndex: 0, opIndex: 0, bindings: {} },
    };

    const payScore = scoreStrategicChoice(
      state,
      'p1',
      hand.rig.defs,
      registry,
      strategic,
      choice,
      [hand.instanceId],
    );
    const skipScore = scoreStrategicChoice(state, 'p1', hand.rig.defs, registry, strategic, choice, []);
    expect(payScore).toBeGreaterThan(skipScore);

    let n = 0;
    const decision = chooseAction({
      state: {
        ...state,
        pendingChoices: [choice],
      },
      playerId: 'p1',
      defs: hand.rig.defs,
      registry,
      config: { difficulty: 'hard', seed: 'opt-trash-draw' },
      createActionId: () => `opt-${n++}`,
    });
    expect(decision?.action.type).toBe('RESOLVE_PENDING_CHOICE');
    if (decision?.action.type === 'RESOLVE_PENDING_CHOICE') {
      expect(decision.action.response).toEqual([hand.instanceId]);
    }
  });
});
