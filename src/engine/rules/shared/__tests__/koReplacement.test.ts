import { describe, expect, it } from 'vitest';
import type { ContinuousEffectRecord, GameState } from '../../../state/game';
import { findKoReplacementRecord, applyKoReplacementCost } from '../koAttempt';
import { buildBaseRig, makeCharacterDef, makeEventDef, makeStageDef, putCharacterInPlay, putInHand } from './testRig';

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
    const result = applyKoReplacementCost(state, instanceId, record, [hand.instanceId], null);
    expect(result.state.cardsById[instanceId].currentZone).toBe('characterArea');
    expect(result.state.cardsById[hand.instanceId].currentZone).toBe('trash');
  });
});
