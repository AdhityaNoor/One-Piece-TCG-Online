import { describe, expect, it } from 'vitest';
import { isKoImmune } from '../power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from './testRig';
import type { ContinuousEffectRecord, GameState } from '../../../state/game';

function withAura(
  state: GameState,
  record: Omit<ContinuousEffectRecord, 'id'> & { id?: string },
): GameState {
  return {
    ...state,
    continuousEffects: [...state.continuousEffects, { id: record.id ?? 'ce-test', ...record }],
  };
}

describe('isKoImmune: filtered controller-character aura', () => {
  const auraSource = makeCharacterDef({ cardDefinitionId: 'AURA-SRC', cardNumber: 'AURA-SRC', name: 'Pekoms', baseCost: 3, types: ['Minks'] });
  const allyLow = makeCharacterDef({ cardDefinitionId: 'ALLY-LOW', cardNumber: 'ALLY-LOW', baseCost: 2, types: ['Minks'] });
  const allyHigh = makeCharacterDef({ cardDefinitionId: 'ALLY-HIGH', cardNumber: 'ALLY-HIGH', baseCost: 5, types: ['Minks'] });
  const koSource = makeCharacterDef({ cardDefinitionId: 'KO-SRC', cardNumber: 'KO-SRC', baseCost: 4, basePower: 4000 });

  it('protects matching allies from effect K.O. when source is active, but not high-cost allies or the source itself', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let auraId: string;
    let lowId: string;
    let highId: string;
    let attackerId: string;
    ({ rig, instanceId: auraId } = putCharacterInPlay(rig, 'p1', auraSource, { orientation: 'active' }));
    ({ rig, instanceId: lowId } = putCharacterInPlay(rig, 'p1', allyLow));
    ({ rig, instanceId: highId } = putCharacterInPlay(rig, 'p1', allyHigh));
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p2', koSource));

    const state = withAura(rig.state, {
      sourceInstanceId: auraId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'Minks cost≤3 other than source cannot be KOed by effects',
      koImmunityModifier: {
        appliesToGroup: { ownLeaderAndCharacters: true, charactersOnly: true, anyOfTypes: ['Minks'], excludeSource: true },
        scope: 'effect',
        condition: { maxCost: 3 },
        sourceCondition: { rested: false },
      },
    });

    const ctx = { koSourceInstanceId: attackerId };
    expect(isKoImmune(rig.defs, state, lowId, 'effect', ctx)).toBe(true);
    expect(isKoImmune(rig.defs, state, highId, 'effect', ctx)).toBe(false);
    expect(isKoImmune(rig.defs, state, auraId, 'effect', ctx)).toBe(false);
  });

  it('drops protection when the aura source becomes rested', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let auraId: string;
    let lowId: string;
    let attackerId: string;
    ({ rig, instanceId: auraId } = putCharacterInPlay(rig, 'p1', auraSource, { orientation: 'rested' }));
    ({ rig, instanceId: lowId } = putCharacterInPlay(rig, 'p1', allyLow));
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p2', koSource));

    const state = withAura(rig.state, {
      sourceInstanceId: auraId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'aura',
      koImmunityModifier: {
        appliesToGroup: { ownLeaderAndCharacters: true, charactersOnly: true, anyOfTypes: ['Minks'], excludeSource: true },
        scope: 'effect',
        condition: { maxCost: 3 },
        sourceCondition: { rested: false },
      },
    });

    expect(isKoImmune(rig.defs, state, lowId, 'effect', { koSourceInstanceId: attackerId })).toBe(false);
  });
});

describe('isKoImmune: effect-source filters on self', () => {
  const bege = makeCharacterDef({ cardDefinitionId: 'BEGE', cardNumber: 'BEGE', baseCost: 4, basePower: 1000 });
  const weakKo = makeCharacterDef({ cardDefinitionId: 'WEAK', cardNumber: 'WEAK', baseCost: 5, basePower: 5000 });
  const strongKo = makeCharacterDef({ cardDefinitionId: 'STRONG', cardNumber: 'STRONG', baseCost: 7, basePower: 7000 });

  it('blocks opponent Character effect K.O.s at or below the base-power cap, but not above it', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let begeId: string;
    let weakId: string;
    let strongId: string;
    ({ rig, instanceId: begeId } = putCharacterInPlay(rig, 'p2', bege));
    ({ rig, instanceId: weakId } = putCharacterInPlay(rig, 'p1', weakKo));
    ({ rig, instanceId: strongId } = putCharacterInPlay(rig, 'p1', strongKo));

    const state = withAura(rig.state, {
      sourceInstanceId: begeId,
      ownerId: 'p2',
      duration: 'permanent',
      description: 'self immunity',
      koImmunityModifier: {
        appliesToInstanceId: begeId,
        scope: 'effect',
        effectSourceController: 'opponent',
        effectSourceMaxBasePower: 5000,
        effectSourceCategory: 'character',
      },
    });

    expect(isKoImmune(rig.defs, state, begeId, 'effect', { koSourceInstanceId: weakId })).toBe(true);
    expect(isKoImmune(rig.defs, state, begeId, 'effect', { koSourceInstanceId: strongId })).toBe(false);
  });
});
