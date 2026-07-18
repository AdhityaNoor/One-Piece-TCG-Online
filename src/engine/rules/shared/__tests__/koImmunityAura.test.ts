import { describe, expect, it } from 'vitest';
import { isKoImmune, withKoImmunityConsumed } from '../power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from './testRig';
import type { ContinuousEffectRecord, GameState } from '../../../state/game';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../../cards/effectTemplates/assembler';
import { resumeProgram, runTimings } from '../../../effects';

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

describe('isKoImmune: oncePerTurn effect shield', () => {
  it('prevents one opponent effect K.O., then spends the shield for the turn', () => {
    const luffyCard: CardEffectAssignment = {
      cardNumber: 'SYN-OPT-IMMUNE',
      templateId: 'ability',
      params: {
        timing: 'onEnterPlay',
        functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', oncePerTurn: true, effectSourceController: 'opponent' }],
      },
    };
    const koCard: CardEffectAssignment = {
      cardNumber: 'SYN-OPT-KO',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }] },
    };
    const registry = buildRegistryFromAssignments([luffyCard, koCard]);
    const luffyDef = makeCharacterDef({ cardDefinitionId: 'SYN-OPT-IMMUNE', cardNumber: 'SYN-OPT-IMMUNE', baseCost: 5 });
    const koDef = makeCharacterDef({ cardDefinitionId: 'SYN-OPT-KO', cardNumber: 'SYN-OPT-KO', baseCost: 4 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let luffyId: string;
    let koId: string;
    ({ rig, instanceId: luffyId } = putCharacterInPlay(rig, 'p2', luffyDef));
    const entered = runTimings(registry['SYN-OPT-IMMUNE'], ['onEnterPlay'], rig.state, luffyId, rig.defs, null, registry).state;

    ({ rig, instanceId: koId } = putCharacterInPlay({ state: entered, defs: rig.defs }, 'p1', koDef));
    const firstKo = runTimings(registry['SYN-OPT-KO'], ['onPlay'], rig.state, koId, rig.defs, null, registry);
    const firstResolved = resumeProgram(registry['SYN-OPT-KO'], firstKo.state, firstKo.state.pendingChoices[0], [luffyId], rig.defs, null, registry);
    expect(firstResolved.state.players.p2.characterArea.cardIds).toContain(luffyId);
    expect(firstResolved.state.cardsById[luffyId].oncePerTurnUsed.some((k) => k.startsWith('koImmunity:'))).toBe(true);
    expect(isKoImmune(rig.defs, firstResolved.state, luffyId, 'effect', { koSourceInstanceId: koId })).toBe(false);

    const secondKo = runTimings(registry['SYN-OPT-KO'], ['onPlay'], firstResolved.state, koId, rig.defs, null, registry);
    const secondResolved = resumeProgram(registry['SYN-OPT-KO'], secondKo.state, secondKo.state.pendingChoices[0], [luffyId], rig.defs, null, registry);
    expect(secondResolved.state.cardsById[luffyId].currentZone).toBe('trash');
  });

  it('withKoImmunityConsumed is a no-op when oncePerTurn is unset', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1' });
    let id: string;
    const def = makeCharacterDef({ cardDefinitionId: 'PERM-IMMUNE', cardNumber: 'PERM-IMMUNE' });
    ({ rig, instanceId: id } = putCharacterInPlay(rig, 'p1', def));
    const record: ContinuousEffectRecord = {
      id: 'ce-perm',
      sourceInstanceId: id,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'permanent',
      koImmunityModifier: { appliesToInstanceId: id, scope: 'effect' },
    };
    const next = withKoImmunityConsumed(rig.state, record);
    expect(next.cardsById[id].oncePerTurnUsed).toEqual([]);
  });
});
