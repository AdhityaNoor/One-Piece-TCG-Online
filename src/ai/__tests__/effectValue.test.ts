import { describe, expect, it } from 'vitest';
import { scoreAction } from '../evaluators/heuristicEvaluator';
import { scoreHandCardValue } from '../heuristics/effectValue';
import { buildRegistryFromAssignments } from '../../cards/effectTemplates/assembler';
import { OP02_ASSIGNMENTS } from '../../cards/effectTemplates/assignments/OP02';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putInHand } from '../../engine/rules/shared/__tests__/testRig';
import type { ContinuousEffectRecord } from '../../engine/state/game';

// OP02-011 keeps a real onPlay `op: 'ko'`. OP09-009 was intentionally re-curated to
// moveCards→trash (Field Trash ≠ K.O.), so it is no longer a KO scoring fixture.
const registry = buildRegistryFromAssignments(OP02_ASSIGNMENTS);

describe('CPU effect-aware evaluation', () => {
  it('rates a character with onPlay KO higher than a vanilla character', () => {
    const koChar = makeCharacterDef({ cardDefinitionId: 'OP02-011', cardNumber: 'OP02-011', baseCost: 4, basePower: 5000 });
    const vanilla = makeCharacterDef({ cardDefinitionId: 'VANILLA', cardNumber: 'VANILLA', baseCost: 4, basePower: 5000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    const foe = makeCharacterDef({ cardNumber: 'FOE', baseCost: 3, basePower: 3000 });
    rig = putCharacterInPlay(rig, 'p2', foe).rig;
    const withKo = putInHand(rig, 'p1', koChar);
    const withVanilla = putInHand(withKo.rig, 'p1', vanilla);
    const state = { ...withVanilla.rig.state, setupState: null, currentBattle: null };
    const ctx = { state, playerId: 'p1' as const, defs: withVanilla.rig.defs, registry };

    const koValue = scoreHandCardValue(ctx, withKo.instanceId);
    const vanillaValue = scoreHandCardValue(ctx, withVanilla.instanceId);
    expect(koValue).toBeGreaterThan(vanillaValue);
  });

  it('prefers playing an onPlay KO character over a vanilla peer', () => {
    const koChar = makeCharacterDef({ cardDefinitionId: 'OP02-011', cardNumber: 'OP02-011', baseCost: 1, basePower: 1000 });
    const vanilla = makeCharacterDef({ cardDefinitionId: 'VANILLA-2', cardNumber: 'VANILLA-2', baseCost: 1, basePower: 1000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    rig = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardNumber: 'FOE-2', baseCost: 2, basePower: 3000 })).rig;
    const koHand = putInHand(rig, 'p1', koChar);
    const both = putInHand(koHand.rig, 'p1', vanilla);
    const state = { ...both.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    const playKo = scoreAction(
      state,
      { type: 'PLAY_CHARACTER', actionId: 'a1', playerId: 'p1', handCardInstanceId: koHand.instanceId, donInstanceIds: [] },
      'p1',
      both.rig.defs,
      registry,
      'hard',
    );
    const playVanilla = scoreAction(
      state,
      { type: 'PLAY_CHARACTER', actionId: 'a2', playerId: 'p1', handCardInstanceId: both.instanceId, donInstanceIds: [] },
      'p1',
      both.rig.defs,
      registry,
      'hard',
    );
    expect(playKo).toBeGreaterThan(playVanilla);
  });

  it('values combat keywords granted by active continuous effects', () => {
    const card = makeCharacterDef({
      cardDefinitionId: 'CPU-LIVE-KEYWORD',
      cardNumber: 'CPU-LIVE-KEYWORD',
      baseCost: 2,
      basePower: 3000,
      hasBlocker: false,
      hasRush: false,
    });
    const withHand = putInHand(buildBaseRig({ activePlayerId: 'p1', phase: 'main' }), 'p1', card);
    const keywordRecord = (keyword: 'blocker' | 'rush'): ContinuousEffectRecord => ({
      id: `grant-${keyword}`,
      sourceInstanceId: withHand.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: `Test grant ${keyword}`,
      keywordModifier: {
        appliesToInstanceId: withHand.instanceId,
        keyword,
      },
    });
    const baseCtx = {
      state: withHand.rig.state,
      playerId: 'p1' as const,
      defs: withHand.rig.defs,
      registry: {},
    };
    const blockerCtx = {
      ...baseCtx,
      state: { ...baseCtx.state, continuousEffects: [keywordRecord('blocker')] },
    };
    const rushCtx = {
      ...baseCtx,
      state: { ...baseCtx.state, continuousEffects: [keywordRecord('rush')] },
    };

    const base = scoreHandCardValue(baseCtx, withHand.instanceId);
    expect(scoreHandCardValue(blockerCtx, withHand.instanceId)).toBeGreaterThan(base);
    expect(scoreHandCardValue(rushCtx, withHand.instanceId)).toBeGreaterThan(base);
  });
});
