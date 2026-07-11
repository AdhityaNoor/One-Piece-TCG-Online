import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putInHand,
} from '../../engine/rules/shared/__tests__/testRig';
import type { PendingChoice } from '../../engine/events/pendingChoice';
import type { EffectProgram } from '../../engine/effects';
import { executePlayCharacter } from '../../engine/actions/handlers/playCharacter';
import { chooseAction } from '../cpuPlayer';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import {
  inferSelectionIntent,
  scoreStrategicChoice,
} from '../evaluation/choiceEvaluator';
import type { EffectScoreContext } from '../heuristics/effectValue';
import type { StrategicContext } from '../strategy/types';

describe('strategic selection decisions', () => {
  function baseStrategic(state: ReturnType<typeof buildBaseRig>['state'], defs: ReturnType<typeof buildBaseRig>['defs']): StrategicContext {
    return buildStrategicContext(state, 'p1', defs, {});
  }

  it('infers KO intent from chooseTargets follow-up ops', () => {
    const targetDef = makeCharacterDef({ cardNumber: 'TGT', baseCost: 3, basePower: 5000 });
    const sourceDef = makeCharacterDef({ cardNumber: 'SRC', baseCost: 2, basePower: 3000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 4 });
    const source = putCharacterInPlay(rig, 'p1', sourceDef);
    rig = source.rig;
    const program: EffectProgram = {
      cardDefinitionId: sourceDef.cardDefinitionId,
      abilities: [
        {
          timing: 'onPlay',
          ops: [
            {
              op: 'chooseTargets',
              var: 't',
              from: { sel: 'opponentCharacters' },
              min: 1,
              max: 1,
              prompt: 'Choose a Character to K.O.',
            },
            { op: 'ko', target: { sel: 'var', name: 't' } },
          ],
        },
      ],
    };
    const registry = { [sourceDef.cardDefinitionId]: program };
    const choice: PendingChoice = {
      id: 'ko-choice',
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'Choose a Character to K.O.',
      constraints: { min: 1, max: 1, candidateInstanceIds: ['x'] },
      sourceInstanceId: source.instanceId,
      sourceEffectId: 'ir',
      resumeState: { abilityIndex: 0, opIndex: 0, bindings: {} },
    };
    const ctx: EffectScoreContext = {
      state: rig.state,
      playerId: 'p1',
      defs: { ...rig.defs, [targetDef.cardDefinitionId]: targetDef },
      registry,
      sourceInstanceId: source.instanceId,
    };
    expect(inferSelectionIntent(ctx, choice)).toBe('ko');
  });

  it('prefers K.O.ing a high-threat engine over a vanilla beater', () => {
    const vanilla = makeCharacterDef({ cardNumber: 'VAN', baseCost: 5, basePower: 7000 });
    const engine = makeCharacterDef({ cardNumber: 'ENG', baseCost: 2, basePower: 2000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    const v = putCharacterInPlay(rig, 'p2', vanilla);
    rig = v.rig;
    const e = putCharacterInPlay(rig, 'p2', engine);
    rig = e.rig;

    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic: StrategicContext = {
      ...baseStrategic(state, rig.defs),
      opponentThreats: [
        {
          instanceId: e.instanceId,
          cardDefinitionId: engine.cardDefinitionId,
          immediateThreat: 4,
          recurringValue: 12,
          synergyCentrality: 10,
          lethalContribution: 2,
          removalUrgency: 22,
        },
        {
          instanceId: v.instanceId,
          cardDefinitionId: vanilla.cardDefinitionId,
          immediateThreat: 9,
          recurringValue: 1,
          synergyCentrality: 0,
          lethalContribution: 6,
          removalUrgency: 8,
        },
      ],
    };

    const choice: PendingChoice = {
      id: 'pick-ko',
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'K.O. one Character',
      constraints: {
        min: 1,
        max: 1,
        candidateInstanceIds: [v.instanceId, e.instanceId],
      },
      sourceInstanceId: null,
      sourceEffectId: null,
    };

    const engineScore = scoreStrategicChoice(
      state,
      'p1',
      rig.defs,
      {},
      strategic,
      choice,
      [e.instanceId],
    );
    const vanillaScore = scoreStrategicChoice(
      state,
      'p1',
      rig.defs,
      {},
      strategic,
      choice,
      [v.instanceId],
    );
    expect(engineScore).toBeGreaterThan(vanillaScore);
  });

  it('prefers discarding a low-value filler over a high-counter combo piece', () => {
    const filler = makeCharacterDef({ cardNumber: 'FILL', baseCost: 1, basePower: 1000, counter: 0 });
    const combo = makeCharacterDef({
      cardNumber: 'COMBO',
      baseCost: 4,
      basePower: 5000,
      counter: 2000,
      types: ['Straw Hat Crew'],
    });
    const leader = makeLeaderDef({
      cardNumber: 'L-SH',
      types: ['Straw Hat Crew'],
      basePower: 5000,
    });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 4,
      leaderOverridesP1: leader,
    });
    const fill = putInHand(rig, 'p1', filler);
    rig = fill.rig;
    const comb = putInHand(rig, 'p1', combo);
    rig = comb.rig;

    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = baseStrategic(state, rig.defs);
    const choice: PendingChoice = {
      id: 'discard',
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'Trash 1 card from your hand',
      constraints: {
        min: 1,
        max: 1,
        candidateInstanceIds: [fill.instanceId, comb.instanceId],
      },
      sourceInstanceId: null,
      sourceEffectId: null,
    };

    // Force discard intent via prompt + no IR (unknown→ownCardValue). Set sourceEffectId path:
    // Without IR, intent is unknown. Use filterDescription/prompt path — add discard keyword.
    // inferSelectionIntent without IR returns unknown unless overflow. Manually use discard by
    // scoring through a fake IR isn't needed if we set prompt and use controllerHand via...
    // Easiest: call with a choice that has prompt including trash and we enhance unknown.
    // Actually unknown uses ownCardValue * 0.2 which prefers HIGH value — wrong for discard.
    // Wire intent via a minimal IR program on a field source.
    const sourceDef = makeCharacterDef({ cardNumber: 'DISC-SRC', baseCost: 1, basePower: 1000 });
    const src = putCharacterInPlay(rig, 'p1', sourceDef);
    rig = src.rig;
    const program: EffectProgram = {
      cardDefinitionId: sourceDef.cardDefinitionId,
      abilities: [
        {
          timing: 'activateMain',
          ops: [
            {
              op: 'chooseTargets',
              var: 'h',
              from: { sel: 'controllerHand' },
              min: 1,
              max: 1,
              prompt: 'Trash 1 card from your hand',
            },
            { op: 'trashCards', target: { sel: 'var', name: 'h' } },
          ],
        },
      ],
    };
    const registry = { [sourceDef.cardDefinitionId]: program };
    const state2 = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic2 = buildStrategicContext(state2, 'p1', rig.defs, registry);
    const irChoice: PendingChoice = {
      id: 'discard-ir',
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'Trash 1 card from your hand',
      constraints: {
        min: 1,
        max: 1,
        candidateInstanceIds: [fill.instanceId, comb.instanceId],
      },
      sourceInstanceId: src.instanceId,
      sourceEffectId: 'ir',
      resumeState: { abilityIndex: 0, opIndex: 0, bindings: {} },
    };

    const fillerScore = scoreStrategicChoice(
      state2,
      'p1',
      rig.defs,
      registry,
      strategic2,
      irChoice,
      [fill.instanceId],
    );
    const comboScore = scoreStrategicChoice(
      state2,
      'p1',
      rig.defs,
      registry,
      strategic2,
      irChoice,
      [comb.instanceId],
    );
    expect(fillerScore).toBeGreaterThan(comboScore);
  });

  it('prefers searching a leader-synergy card over a vanilla off-type', () => {
    const offType = makeCharacterDef({
      cardNumber: 'OFF',
      baseCost: 3,
      basePower: 4000,
      types: ['Navy'],
    });
    const onType = makeCharacterDef({
      cardNumber: 'ON',
      baseCost: 3,
      basePower: 4000,
      types: ['Animal Kingdom Pirates'],
    });
    const leader = makeLeaderDef({
      cardNumber: 'L-AK',
      types: ['Animal Kingdom Pirates'],
      basePower: 5000,
    });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 4,
      leaderOverridesP1: leader,
    });
    // Put search candidates as "deck" cards in cardsById without needing real deck zone for scoring.
    const off = putInHand(rig, 'p1', offType);
    rig = off.rig;
    const on = putInHand(rig, 'p1', onType);
    rig = on.rig;
    // Move them conceptually — scoring only needs cardsById + defs.
    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = baseStrategic(state, rig.defs);

    const sourceDef = makeCharacterDef({ cardNumber: 'SEARCH-SRC', baseCost: 1, basePower: 1000 });
    const src = putCharacterInPlay(rig, 'p1', sourceDef);
    const program: EffectProgram = {
      cardDefinitionId: sourceDef.cardDefinitionId,
      abilities: [
        {
          timing: 'onPlay',
          ops: [
            {
              op: 'searchTopDeck',
              look: 3,
              pick: 1,
              reveal: false,
              destination: 'hand',
              prompt: 'Add 1 card to your hand',
            },
          ],
        },
      ],
    };
    const registry = { [sourceDef.cardDefinitionId]: program };
    const state2 = { ...src.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic2 = buildStrategicContext(state2, 'p1', src.rig.defs, registry);

    const choice: PendingChoice = {
      id: 'search',
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'Add 1 card to your hand',
      constraints: {
        min: 0,
        max: 1,
        candidateInstanceIds: [off.instanceId, on.instanceId],
        visibleInstanceIds: [off.instanceId, on.instanceId],
      },
      sourceInstanceId: src.instanceId,
      sourceEffectId: 'ir',
      resumeState: { abilityIndex: 0, opIndex: 0, bindings: { __looked: [off.instanceId, on.instanceId] } },
    };

    const onScore = scoreStrategicChoice(
      state2,
      'p1',
      src.rig.defs,
      registry,
      strategic2,
      choice,
      [on.instanceId],
    );
    const offScore = scoreStrategicChoice(
      state2,
      'p1',
      src.rig.defs,
      registry,
      strategic2,
      choice,
      [off.instanceId],
    );
    expect(onScore).toBeGreaterThan(offScore);
  });

  it('chooseAction trashes the weakest character on overflow', () => {
    const weak = makeCharacterDef({ cardNumber: 'WEAK-OV', baseCost: 0, basePower: 1000 });
    const strong = makeCharacterDef({ cardNumber: 'STR-OV', baseCost: 0, basePower: 8000 });
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    for (let i = 0; i < 4; i += 1) {
      rig = putCharacterInPlay(rig, 'p2', { ...strong, cardDefinitionId: `STR-OV-${i}`, cardNumber: `STR-OV-${i}` }).rig;
    }
    const weakPlay = putCharacterInPlay(rig, 'p2', weak);
    rig = weakPlay.rig;
    const sixth = makeCharacterDef({ cardNumber: 'SIXTH-OV', baseCost: 0, basePower: 9000 });
    const withHand = putInHand(rig, 'p2', sixth);
    const played = executePlayCharacter(
      withHand.rig.state,
      {
        type: 'PLAY_CHARACTER',
        actionId: 'overflow-play',
        playerId: 'p2',
        handCardInstanceId: withHand.instanceId,
        donInstanceIds: [],
      },
      withHand.rig.defs,
    );

    const state = {
      ...played.state,
      turnNumber: 3,
      setupState: null,
      currentBattle: null,
    };

    const decision = chooseAction({
      state,
      playerId: 'p2',
      defs: withHand.rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'overflow-strategic' },
      createActionId: () => 'overflow-strategic',
    });

    expect(decision?.action.type).toBe('RESOLVE_PENDING_CHOICE');
    if (decision?.action.type === 'RESOLVE_PENDING_CHOICE') {
      expect(decision.action.response).toEqual([weakPlay.instanceId]);
    }
  });

  it('scores RESOLVE_PENDING_CHOICE through actionEvaluator with strategic context', () => {
    const a = makeCharacterDef({ cardNumber: 'A-SC', baseCost: 1, basePower: 2000 });
    const b = makeCharacterDef({ cardNumber: 'B-SC', baseCost: 4, basePower: 6000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 4 });
    const low = putCharacterInPlay(rig, 'p1', a);
    rig = low.rig;
    const high = putCharacterInPlay(rig, 'p1', b);
    rig = high.rig;
    const state = {
      ...rig.state,
      setupState: null,
      currentBattle: null,
      pendingChoices: [
        {
          id: 'ov',
          playerId: 'p1',
          kind: 'SELECT_CARDS' as const,
          prompt: 'Trash 1 Character',
          constraints: {
            min: 1,
            max: 1,
            zoneId: 'characterArea',
            candidateInstanceIds: [low.instanceId, high.instanceId],
          },
          sourceInstanceId: null,
          sourceEffectId: 'rule:characterAreaOverflow',
        },
      ],
    };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, {});

    const trashLow = scoreActionStrategic(
      state,
      {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'r1',
        playerId: 'p1',
        choiceId: 'ov',
        response: [low.instanceId],
      },
      'p1',
      rig.defs,
      {},
      strategic,
    );
    const trashHigh = scoreActionStrategic(
      state,
      {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'r2',
        playerId: 'p1',
        choiceId: 'ov',
        response: [high.instanceId],
      },
      'p1',
      rig.defs,
      {},
      strategic,
    );
    expect(trashLow).toBeGreaterThan(trashHigh);
  });
});
