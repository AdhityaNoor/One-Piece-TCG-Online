import { describe, expect, it } from 'vitest';
import type { ContinuousEffectRecord, GameState } from '../../../state/game';
import { findKoReplacementRecord, applyKoReplacementCost } from '../koAttempt';
import { buildBaseRig, makeCharacterDef, makeEventDef, makeStageDef, putCharacterInPlay, putDon, putInHand, putLifeCards, putStageInPlay } from './testRig';

describe('findKoReplacementRecord', () => {
  it('finds a trash-from-hand replacement when an eligible Event is in hand', () => {
    const charDef = makeCharacterDef({ cardNumber: 'OP15-014' });
    const eventDef = makeEventDef({ cardNumber: 'EVT-1' });
    let rig = buildBaseRig();
    const { rig: withChar, instanceId } = putCharacterInPlay(rig, 'p1', charDef);
    rig = { ...withChar, defs: { ...withChar.defs, [charDef.cardDefinitionId]: charDef, [eventDef.cardDefinitionId]: eventDef } };
    const hand = putInHand(rig, 'p1', eventDef);
    rig = hand.rig;

    const record: ContinuousEffectRecord = {
      id: 'kr-1',
      sourceInstanceId: instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'replace ko',
      koReplacementModifier: {
        appliesToInstanceId: instanceId,
        scope: 'any',
        action: { kind: 'trashFromHand', count: 1, filter: { category: 'event' } },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    expect(findKoReplacementRecord(state, instanceId, 'effect', rig.defs)).not.toBeNull();
  });

  it('finds trash-from-hand replacement for Event or Stage categories', () => {
    const charDef = makeCharacterDef({ cardNumber: 'EB01-008' });
    const stageDef = makeStageDef({ cardNumber: 'STG-1' });
    let rig = buildBaseRig();
    const { rig: withChar, instanceId } = putCharacterInPlay(rig, 'p1', charDef);
    rig = { ...withChar, defs: { ...withChar.defs, [charDef.cardDefinitionId]: charDef, [stageDef.cardDefinitionId]: stageDef } };
    const hand = putInHand(rig, 'p1', stageDef);
    rig = hand.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-1',
      sourceInstanceId: instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'replace ko',
      koReplacementModifier: {
        appliesToInstanceId: instanceId,
        scope: 'effect',
        oncePerTurn: true,
        action: { kind: 'trashFromHand', count: 1, filter: { categories: ['event', 'stage'] } },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    expect(findKoReplacementRecord(state, instanceId, 'effect', rig.defs)).not.toBeNull();
    expect(findKoReplacementRecord(state, instanceId, 'battle', rig.defs)).toBeNull();
  });

  it('applyKoReplacementCost trashes the chosen hand card and leaves the Character in play', () => {
    const charDef = makeCharacterDef({ cardNumber: 'OP15-014' });
    const eventDef = makeEventDef({ cardNumber: 'EVT-1' });
    let rig = buildBaseRig();
    const { rig: withChar, instanceId } = putCharacterInPlay(rig, 'p1', charDef);
    rig = { ...withChar, defs: { ...withChar.defs, [charDef.cardDefinitionId]: charDef, [eventDef.cardDefinitionId]: eventDef } };
    const hand = putInHand(rig, 'p1', eventDef);
    rig = hand.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-1',
      sourceInstanceId: instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'replace ko',
      koReplacementModifier: {
        appliesToInstanceId: instanceId,
        scope: 'any',
        action: { kind: 'trashFromHand', count: 1, filter: { category: 'event' } },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    const result = applyKoReplacementCost(state, instanceId, record, [hand.instanceId], rig.defs, null);
    expect(result.state.cardsById[instanceId].currentZone).toBe('characterArea');
    expect(result.state.cardsById[hand.instanceId].currentZone).toBe('trash');
  });

  it('finds aura replacement when ally matches type and source is on field', () => {
    const auraDef = makeCharacterDef({ cardNumber: 'OP13-008', name: 'Emporio.Ivankov', types: ['Revolutionary Army'] });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-1', name: 'Sabo', types: ['Revolutionary Army'] });
    let rig = buildBaseRig();
    const aura = putCharacterInPlay(rig, 'p1', auraDef);
    rig = { ...aura.rig, defs: { ...aura.rig.defs, [auraDef.cardDefinitionId]: auraDef, [allyDef.cardDefinitionId]: allyDef } };
    const ally = putCharacterInPlay(rig, 'p1', allyDef);
    rig = ally.rig;

    const record: ContinuousEffectRecord = {
      id: 'kr-aura',
      sourceInstanceId: aura.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'aura replace',
      koReplacementModifier: {
        appliesToGroup: { ownLeaderAndCharacters: true, charactersOnly: true, anyOfTypes: ['Revolutionary Army'] },
        scope: 'effect',
        action: { kind: 'trashSource' },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    expect(findKoReplacementRecord(state, ally.instanceId, 'effect', rig.defs)).not.toBeNull();
    expect(findKoReplacementRecord(state, ally.instanceId, 'battle', rig.defs)).toBeNull();
  });

  it('applyKoReplacementCost trashes source and leaves aura target in play', () => {
    const auraDef = makeCharacterDef({ cardNumber: 'OP13-008' });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-1', types: ['Revolutionary Army'] });
    let rig = buildBaseRig();
    const aura = putCharacterInPlay(rig, 'p1', auraDef);
    rig = { ...aura.rig, defs: { ...aura.rig.defs, [auraDef.cardDefinitionId]: auraDef, [allyDef.cardDefinitionId]: allyDef } };
    const ally = putCharacterInPlay(rig, 'p1', allyDef);
    rig = ally.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-aura',
      sourceInstanceId: aura.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'aura replace',
      koReplacementModifier: {
        appliesToGroup: { ownLeaderAndCharacters: true, charactersOnly: true, anyOfTypes: ['Revolutionary Army'] },
        scope: 'effect',
        action: { kind: 'trashSource' },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    const result = applyKoReplacementCost(state, ally.instanceId, record, [], rig.defs, null);
    expect(result.state.cardsById[ally.instanceId].currentZone).toBe('characterArea');
    expect(result.state.cardsById[aura.instanceId].currentZone).toBe('trash');
  });

  it('finds aura replacement with restSource when source is on field', () => {
    const auraDef = makeCharacterDef({ cardNumber: 'OP12-027', attributes: ['slash'] });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-1', attributes: ['slash'], baseCost: 3 });
    let rig = buildBaseRig();
    const aura = putCharacterInPlay(rig, 'p1', auraDef);
    rig = { ...aura.rig, defs: { ...aura.rig.defs, [auraDef.cardDefinitionId]: auraDef, [allyDef.cardDefinitionId]: allyDef } };
    const ally = putCharacterInPlay(rig, 'p1', allyDef);
    rig = ally.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-rest',
      sourceInstanceId: aura.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'rest source',
      koReplacementModifier: {
        appliesToGroup: { ownLeaderAndCharacters: true, charactersOnly: true, anyOfAttributes: ['slash'], excludeSource: true },
        scope: 'effect',
        condition: { maxCost: 5 },
        action: { kind: 'restSource' },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    expect(findKoReplacementRecord(state, ally.instanceId, 'effect', rig.defs)).not.toBeNull();
  });

  it('applyKoReplacementCost rests source and leaves ally in play', () => {
    const auraDef = makeCharacterDef({ cardNumber: 'OP12-027' });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-1', attributes: ['slash'] });
    let rig = buildBaseRig();
    const aura = putCharacterInPlay(rig, 'p1', auraDef);
    rig = { ...aura.rig, defs: { ...aura.rig.defs, [auraDef.cardDefinitionId]: auraDef, [allyDef.cardDefinitionId]: allyDef } };
    const ally = putCharacterInPlay(rig, 'p1', allyDef);
    rig = ally.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-rest',
      sourceInstanceId: aura.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'rest source',
      koReplacementModifier: {
        appliesToGroup: { ownLeaderAndCharacters: true, charactersOnly: true, anyOfAttributes: ['slash'] },
        scope: 'effect',
        action: { kind: 'restSource' },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    const result = applyKoReplacementCost(state, ally.instanceId, record, [], rig.defs, null);
    expect(result.state.cardsById[ally.instanceId].currentZone).toBe('characterArea');
    expect(result.state.cardsById[aura.instanceId].orientation).toBe('rested');
  });

  it('applyKoReplacementCost rests chosen character for restCharacter action', () => {
    const luffyDef = makeCharacterDef({ cardNumber: 'OP14-034', types: ['Straw Hat Crew'] });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-1', types: ['Straw Hat Crew'] });
    const payerDef = makeCharacterDef({ cardNumber: 'PAY-1' });
    let rig = buildBaseRig();
    const luffy = putCharacterInPlay(rig, 'p1', luffyDef);
    rig = { ...luffy.rig, defs: { ...luffy.rig.defs, [luffyDef.cardDefinitionId]: luffyDef, [allyDef.cardDefinitionId]: allyDef, [payerDef.cardDefinitionId]: payerDef } };
    const ally = putCharacterInPlay(rig, 'p1', allyDef);
    rig = ally.rig;
    const payer = putCharacterInPlay(rig, 'p1', payerDef);
    rig = payer.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-rest-char',
      sourceInstanceId: luffy.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'rest character',
      koReplacementModifier: {
        appliesToGroup: { ownLeaderAndCharacters: true, charactersOnly: true, anyOfTypes: ['Straw Hat Crew'] },
        scope: 'effect',
        oncePerTurn: true,
        action: { kind: 'restCharacter', count: 1 },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    const result = applyKoReplacementCost(state, ally.instanceId, record, [payer.instanceId], rig.defs, null);
    expect(result.state.cardsById[ally.instanceId].currentZone).toBe('characterArea');
    expect(result.state.cardsById[payer.instanceId].orientation).toBe('rested');
  });

  it('applyKoReplacementCost rests chosen cards for restCards action', () => {
    const sourceDef = makeCharacterDef({ cardNumber: 'OP16-033' });
    const stageDef = makeStageDef({ cardNumber: 'REST-STAGE' });
    let rig = buildBaseRig();
    const source = putCharacterInPlay(rig, 'p1', sourceDef);
    rig = { ...source.rig, defs: { ...source.rig.defs, [sourceDef.cardDefinitionId]: sourceDef, [stageDef.cardDefinitionId]: stageDef } };
    const stage = putStageInPlay(rig, 'p1', stageDef);
    rig = stage.rig;
    const don = putDon(rig, 'p1', 1);
    rig = don.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-rest-cards',
      sourceInstanceId: source.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'rest cards',
      koReplacementModifier: {
        appliesToInstanceId: source.instanceId,
        scope: 'any',
        action: { kind: 'restCards', count: 2 },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    expect(findKoReplacementRecord(state, source.instanceId, 'effect', rig.defs)).not.toBeNull();
    const result = applyKoReplacementCost(state, source.instanceId, record, [stage.instanceId, don.donIds[0]], rig.defs, null);
    expect(result.state.cardsById[source.instanceId].currentZone).toBe('characterArea');
    expect(result.state.cardsById[stage.instanceId].orientation).toBe('rested');
    expect(result.state.cardsById[don.donIds[0]].donRested).toBe(true);
  });

  it('finds returnDon replacement when field DON is available', () => {
    const charDef = makeCharacterDef({ cardNumber: 'EB04-030' });
    let rig = buildBaseRig();
    const { rig: withChar, instanceId } = putCharacterInPlay(rig, 'p1', charDef);
    rig = { ...withChar, defs: { ...withChar.defs, [charDef.cardDefinitionId]: charDef } };
    const don = putDon(rig, 'p1', 1);
    rig = don.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-don',
      sourceInstanceId: instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'return don',
      koReplacementModifier: {
        appliesToInstanceId: instanceId,
        scope: 'any',
        action: { kind: 'payAbilityCosts', costs: [{ kind: 'donMinus', count: 1 }] },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    expect(findKoReplacementRecord(state, instanceId, 'effect', rig.defs)).not.toBeNull();
  });

  it('applyKoReplacementCost returns DON and leaves Character in play', () => {
    const charDef = makeCharacterDef({ cardNumber: 'EB04-030' });
    let rig = buildBaseRig();
    const { rig: withChar, instanceId } = putCharacterInPlay(rig, 'p1', charDef);
    rig = { ...withChar, defs: { ...withChar.defs, [charDef.cardDefinitionId]: charDef } };
    const don = putDon(rig, 'p1', 1);
    rig = don.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-don',
      sourceInstanceId: instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'return don',
      koReplacementModifier: {
        appliesToInstanceId: instanceId,
        scope: 'any',
        action: { kind: 'payAbilityCosts', costs: [{ kind: 'donMinus', count: 1 }] },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    const result = applyKoReplacementCost(state, instanceId, record, [don.donIds[0]], rig.defs, null);
    expect(result.state.cardsById[instanceId].currentZone).toBe('characterArea');
    expect(result.state.players.p1.costArea.cardIds).not.toContain(don.donIds[0]);
    expect(result.state.players.p1.donDeck.cardIds).toContain(don.donIds[0]);
  });

  it('finds restDon replacement when enough active DON are in cost area', () => {
    const charDef = makeCharacterDef({ cardNumber: 'OP10-074' });
    let rig = buildBaseRig();
    const { rig: withChar, instanceId } = putCharacterInPlay(rig, 'p1', charDef);
    rig = { ...withChar, defs: { ...withChar.defs, [charDef.cardDefinitionId]: charDef } };
    const don = putDon(rig, 'p1', 2);
    rig = don.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-rest-don',
      sourceInstanceId: instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'rest don',
      koReplacementModifier: {
        appliesToInstanceId: instanceId,
        scope: 'effect',
        oncePerTurn: true,
        action: { kind: 'payAbilityCosts', costs: [{ kind: 'restDon', count: 2 }] },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    expect(findKoReplacementRecord(state, instanceId, 'effect', rig.defs)).not.toBeNull();
  });

  it('applyKoReplacementCost rests DON and leaves Character in play', () => {
    const charDef = makeCharacterDef({ cardNumber: 'OP10-074' });
    let rig = buildBaseRig();
    const { rig: withChar, instanceId } = putCharacterInPlay(rig, 'p1', charDef);
    rig = { ...withChar, defs: { ...withChar.defs, [charDef.cardDefinitionId]: charDef } };
    const don = putDon(rig, 'p1', 2);
    rig = don.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-rest-don',
      sourceInstanceId: instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'rest don',
      koReplacementModifier: {
        appliesToInstanceId: instanceId,
        scope: 'effect',
        oncePerTurn: true,
        action: { kind: 'payAbilityCosts', costs: [{ kind: 'restDon', count: 2 }] },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    const result = applyKoReplacementCost(state, instanceId, record, [], rig.defs, null);
    expect(result.state.cardsById[instanceId].currentZone).toBe('characterArea');
    expect(result.state.cardsById[don.donIds[0]].donRested).toBe(true);
    expect(result.state.cardsById[don.donIds[1]].donRested).toBe(true);
  });

  it('applyKoReplacementCost moves top Life to hand and leaves Character in play', () => {
    const charDef = makeCharacterDef({ cardNumber: 'OP10-034' });
    const lifeDef = makeEventDef({ cardNumber: 'LIFE-1' });
    let rig = buildBaseRig();
    const { rig: withChar, instanceId } = putCharacterInPlay(rig, 'p1', charDef);
    rig = { ...withChar, defs: { ...withChar.defs, [charDef.cardDefinitionId]: charDef, [lifeDef.cardDefinitionId]: lifeDef } };
    const life = putLifeCards(rig, 'p1', [lifeDef]);
    rig = life.rig;
    const record: ContinuousEffectRecord = {
      id: 'kr-life',
      sourceInstanceId: instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'life to hand',
      koReplacementModifier: {
        appliesToInstanceId: instanceId,
        scope: 'battle',
        oncePerTurn: true,
        action: { kind: 'chooseLifeToHand', position: 'top' },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    const result = applyKoReplacementCost(state, instanceId, record, [], rig.defs, null);
    expect(result.state.cardsById[instanceId].currentZone).toBe('characterArea');
    expect(result.state.cardsById[life.lifeIds[0]].currentZone).toBe('hand');
    expect(result.state.players.p1.lifeArea.cardIds).not.toContain(life.lifeIds[0]);
  });

  it('restCharacter replacement requires cost 3+ and excludes source name (OP05-032 Pica)', () => {
    const picaDef = makeCharacterDef({ cardNumber: 'OP05-032', name: 'Pica', baseCost: 4 });
    const allyHighDef = makeCharacterDef({ cardNumber: 'ALLY-HIGH', name: 'Ally High', baseCost: 3 });
    const allyLowDef = makeCharacterDef({ cardNumber: 'ALLY-LOW', name: 'Ally Low', baseCost: 2 });
    const picaCopyDef = makeCharacterDef({ cardNumber: 'OP05-032-B', name: 'Pica', baseCost: 5 });
    let rig = buildBaseRig();
    const pica = putCharacterInPlay(rig, 'p1', picaDef);
    rig = { ...pica.rig, defs: { ...pica.rig.defs, [picaDef.cardDefinitionId]: picaDef, [allyHighDef.cardDefinitionId]: allyHighDef, [allyLowDef.cardDefinitionId]: allyLowDef, [picaCopyDef.cardDefinitionId]: picaCopyDef } };
    const allyHigh = putCharacterInPlay(rig, 'p1', allyHighDef);
    rig = allyHigh.rig;
    putCharacterInPlay(rig, 'p1', allyLowDef);
    putCharacterInPlay(rig, 'p1', picaCopyDef);

    const record: ContinuousEffectRecord = {
      id: 'kr-pica',
      sourceInstanceId: pica.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'rest ally',
      koReplacementModifier: {
        appliesToInstanceId: pica.instanceId,
        scope: 'any',
        oncePerTurn: true,
        action: {
          kind: 'restCharacter',
          count: 1,
          filter: { minCost: 3, excludeSourceName: true },
        },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    expect(findKoReplacementRecord(state, pica.instanceId, 'effect', rig.defs)).not.toBeNull();

    const result = applyKoReplacementCost(state, pica.instanceId, record, [allyHigh.instanceId], rig.defs, null);
    expect(result.state.cardsById[pica.instanceId].currentZone).toBe('characterArea');
    expect(result.state.cardsById[allyHigh.instanceId].orientation).toBe('rested');
  });

  it('giveTargetPowerPenalty applies −N to the protected ally, not the aura source (OP05-001)', () => {
    const saboDef = makeCharacterDef({ cardNumber: 'OP05-001', name: 'Sabo', basePower: 5000 });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-5K', name: 'Ally', basePower: 5000 });
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 2 });
    const don = putDon(rig, 'p1', 1);
    const sabo = putCharacterInPlay(don.rig, 'p1', saboDef, { donAttached: [don.donIds[0]!] });
    const ally = putCharacterInPlay(sabo.rig, 'p1', allyDef);
    rig = ally.rig;

    const record: ContinuousEffectRecord = {
      id: 'kr-sabo',
      sourceInstanceId: sabo.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'that Character −1000',
      koReplacementModifier: {
        appliesToGroup: { ownLeaderAndCharacters: true, charactersOnly: true },
        scope: 'any',
        oncePerTurn: true,
        condition: { minPower: 5000 },
        sourceCondition: { turn: 'opponent', donAttachedAtLeast: 1 },
        action: { kind: 'giveTargetPowerPenalty', amount: 1000, duration: 'duringThisTurn' },
      },
    };
    const state: GameState = { ...rig.state, continuousEffects: [record] };
    expect(findKoReplacementRecord(state, ally.instanceId, 'battle', rig.defs)).not.toBeNull();

    const result = applyKoReplacementCost(state, ally.instanceId, record, [], rig.defs, null);
    expect(result.state.cardsById[ally.instanceId].currentZone).toBe('characterArea');
    const allyPowerMod = result.state.continuousEffects.find(
      (ce) => ce.powerModifier?.appliesToInstanceId === ally.instanceId && ce.powerModifier.amount === -1000,
    );
    const sourcePowerMod = result.state.continuousEffects.find(
      (ce) => ce.powerModifier?.appliesToInstanceId === sabo.instanceId && ce.powerModifier.amount === -1000,
    );
    expect(allyPowerMod).toBeTruthy();
    expect(sourcePowerMod).toBeUndefined();
  });
});
