/**
 * Tests for the "cannot be removed from the field by opponent's effects" capability
 * (ContinuousFieldRemovalImmunityModifier / cannotBeRemovedFromFieldByEffect / preventFieldRemoval),
 * introduced to cover the OP13-080/083/084/089/091 semantic family (7+ trash → field-removal immunity).
 *
 * Broader than K.O.-only immunity (ContinuousKoImmunityModifier / isKoImmune): also blocks
 * bounce-to-hand (returnToHand) and bottom-of-deck placement (moveToBottomDeck), but never
 * blocks battle K.O. — see the doc comment on ContinuousFieldRemovalImmunityModifier in
 * src/engine/state/game.ts.
 */
import { describe, expect, it } from 'vitest';
import { cannotBeRemovedFromFieldByEffect } from '../../rules/shared/power';
import { EffectContextImpl } from '../effectContext';
import { runTimings } from '../interpreter';
import { buildRegistryFromAssignments } from '../../../cards/effectTemplates/assembler';
import { OP13_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP13';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  nextTestId,
  putCharacterInPlay,
} from '../../rules/shared/__tests__/testRig';
import type { ContinuousEffectRecord, GameState } from '../../state/game';
import type { Rig } from '../../rules/shared/__tests__/testRig';

function withFieldRemovalImmunity(state: GameState, record: Omit<ContinuousEffectRecord, 'id'> & { id?: string }): GameState {
  return {
    ...state,
    continuousEffects: [...state.continuousEffects, { id: record.id ?? 'ce-test', ...record }],
  };
}

/** Directly seeds `count` trash cards for `playerId`, mirroring the manual-mutation convention used elsewhere for zone seeding (no dedicated testRig helper exists for trash). */
function seedTrash(rig: Rig, playerId: 'p1' | 'p2', count: number): Rig {
  const def = makeEventDef({ cardDefinitionId: nextTestId('trash-filler-def'), cardNumber: 'TEST-TRASH-FILLER' });
  const cardsById = { ...rig.state.cardsById };
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = nextTestId('trash-filler');
    ids.push(id);
    cardsById[id] = {
      instanceId: id,
      cardDefinitionId: def.cardDefinitionId,
      ownerId: playerId,
      controllerId: playerId,
      currentZone: 'trash',
      orientation: null,
      faceState: 'faceUp',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: 'all',
    };
  }
  const player = rig.state.players[playerId];
  const state: GameState = {
    ...rig.state,
    cardsById,
    players: { ...rig.state.players, [playerId]: { ...player, trash: { ...player.trash, cardIds: [...player.trash.cardIds, ...ids] } } },
  };
  return { state, defs: { ...rig.defs, [def.cardDefinitionId]: def } };
}

describe('cannotBeRemovedFromFieldByEffect: direct checker', () => {
  const protectedDef = makeCharacterDef({ cardDefinitionId: 'FR-PROTECTED', cardNumber: 'FR-PROTECTED', baseCost: 4 });
  const oppSourceDef = makeCharacterDef({ cardDefinitionId: 'FR-OPP-SRC', cardNumber: 'FR-OPP-SRC', baseCost: 3 });

  it('blocks removal when the effect source is the opponent', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let protectedId: string;
    let oppSourceId: string;
    ({ rig, instanceId: protectedId } = putCharacterInPlay(rig, 'p1', protectedDef));
    ({ rig, instanceId: oppSourceId } = putCharacterInPlay(rig, 'p2', oppSourceDef));

    const state = withFieldRemovalImmunity(rig.state, {
      sourceInstanceId: protectedId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'test immunity',
      fieldRemovalImmunityModifier: { appliesToInstanceId: protectedId, effectSourceController: 'opponent' },
    });

    expect(cannotBeRemovedFromFieldByEffect(state, protectedId, oppSourceId, rig.defs)).toBe(true);
  });

  it('does not block removal from the controller\'s own effects', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let protectedId: string;
    let ownSourceId: string;
    ({ rig, instanceId: protectedId } = putCharacterInPlay(rig, 'p1', protectedDef));
    ({ rig, instanceId: ownSourceId } = putCharacterInPlay(rig, 'p1', oppSourceDef));

    const state = withFieldRemovalImmunity(rig.state, {
      sourceInstanceId: protectedId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'test immunity',
      fieldRemovalImmunityModifier: { appliesToInstanceId: protectedId, effectSourceController: 'opponent' },
    });

    expect(cannotBeRemovedFromFieldByEffect(state, protectedId, ownSourceId, rig.defs)).toBe(false);
  });

  it('respects a selfTrashCount condition gate: false below threshold, true at/above it', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let protectedId: string;
    let oppSourceId: string;
    ({ rig, instanceId: protectedId } = putCharacterInPlay(rig, 'p1', protectedDef));
    ({ rig, instanceId: oppSourceId } = putCharacterInPlay(rig, 'p2', oppSourceDef));

    const record: Omit<ContinuousEffectRecord, 'id'> = {
      sourceInstanceId: protectedId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'test immunity gated on trash count',
      fieldRemovalImmunityModifier: {
        appliesToInstanceId: protectedId,
        effectSourceController: 'opponent',
        condition: { gate: [{ kind: 'selfTrashCount', atLeast: 7 }] },
      },
    };

    const belowThreshold = seedTrash(rig, 'p1', 6);
    const stateBelow = withFieldRemovalImmunity(belowThreshold.state, record);
    expect(cannotBeRemovedFromFieldByEffect(stateBelow, protectedId, oppSourceId, belowThreshold.defs)).toBe(false);

    const atThreshold = seedTrash(rig, 'p1', 7);
    const stateAt = withFieldRemovalImmunity(atThreshold.state, record);
    expect(cannotBeRemovedFromFieldByEffect(stateAt, protectedId, oppSourceId, atThreshold.defs)).toBe(true);
  });

  it('returns false when no fieldRemovalImmunityModifier applies to the instance', () => {
    const rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    expect(cannotBeRemovedFromFieldByEffect(rig.state, 'nonexistent', undefined, rig.defs)).toBe(false);
  });
});

describe('EffectContextImpl: field-removal immunity blocks koApply/returnToHand/moveToBottomDeck', () => {
  const protectedDef = makeCharacterDef({ cardDefinitionId: 'FR2-PROTECTED', cardNumber: 'FR2-PROTECTED', baseCost: 4 });
  const oppSourceDef = makeCharacterDef({ cardDefinitionId: 'FR2-OPP-SRC', cardNumber: 'FR2-OPP-SRC', baseCost: 3 });

  function setup() {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let protectedId: string;
    let oppSourceId: string;
    ({ rig, instanceId: protectedId } = putCharacterInPlay(rig, 'p1', protectedDef));
    ({ rig, instanceId: oppSourceId } = putCharacterInPlay(rig, 'p2', oppSourceDef));
    const state = withFieldRemovalImmunity(rig.state, {
      sourceInstanceId: protectedId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'test immunity',
      fieldRemovalImmunityModifier: { appliesToInstanceId: protectedId, effectSourceController: 'opponent' },
    });
    return { rig, state, protectedId, oppSourceId };
  }

  it('koApply: prevents K.O. by an opponent effect and leaves the card on the field', () => {
    const { rig, state, protectedId, oppSourceId } = setup();
    const ctx = new EffectContextImpl(state, oppSourceId, rig.defs, null);
    ctx.koApply(protectedId);
    expect(ctx.state().cardsById[protectedId]!.currentZone).toBe('characterArea');
    expect(ctx.state().players.p1.trash.cardIds).not.toContain(protectedId);
  });

  it('koApply: proceeds normally when the effect source is the controller\'s own', () => {
    const { rig, state, protectedId } = setup();
    // Use the protected card itself as a controller-owned effect source (still owned by p1).
    const ctx = new EffectContextImpl(state, protectedId, rig.defs, null);
    ctx.koApply(protectedId);
    expect(ctx.state().cardsById[protectedId]!.currentZone).toBe('trash');
  });

  it('returnToHand: prevents bounce by an opponent effect', () => {
    const { rig, state, protectedId, oppSourceId } = setup();
    const ctx = new EffectContextImpl(state, oppSourceId, rig.defs, null);
    ctx.returnToHand(protectedId);
    expect(ctx.state().cardsById[protectedId]!.currentZone).toBe('characterArea');
    expect(ctx.state().players.p1.hand.cardIds).not.toContain(protectedId);
  });

  it('moveToBottomDeck: prevents bottom-decking by an opponent effect', () => {
    const { rig, state, protectedId, oppSourceId } = setup();
    const ctx = new EffectContextImpl(state, oppSourceId, rig.defs, null);
    ctx.moveToBottomDeck(protectedId);
    expect(ctx.state().cardsById[protectedId]!.currentZone).toBe('characterArea');
    expect(ctx.state().players.p1.deck.cardIds).not.toContain(protectedId);
  });
});

describe('OP13 field-removal-immunity cards wire preventFieldRemoval into onEnterPlay', () => {
  const cardNumbers = ['OP13-080', 'OP13-083', 'OP13-084', 'OP13-089', 'OP13-091'];

  it.each(cardNumbers)('%s registers a fieldRemovalImmunityModifier gated on 7+ trash after onEnterPlay', (cardNumber) => {
    const selfDef = makeCharacterDef({ cardDefinitionId: cardNumber, cardNumber, baseCost: 4 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    rig = seedTrash(rig, 'p1', 7);
    let selfId: string;
    ({ rig, instanceId: selfId } = putCharacterInPlay(rig, 'p1', selfDef, { summoningSick: false }));

    const entry = OP13_ASSIGNMENTS.find((a) => a.cardNumber === cardNumber)!;
    const registry = buildRegistryFromAssignments([entry]);
    const fired = runTimings(registry[cardNumber], ['onEnterPlay'], rig.state, selfId, rig.defs, null, registry);

    const record = fired.state.continuousEffects.find((ce) => ce.fieldRemovalImmunityModifier?.appliesToInstanceId === selfId);
    expect(record).toBeDefined();
    expect(record?.fieldRemovalImmunityModifier?.effectSourceController).toBe('opponent');

    // End-to-end: an opponent effect K.O. against this instance is now blocked.
    const oppSourceDef = makeCharacterDef({ cardDefinitionId: nextTestId('opp-src-def'), cardNumber: 'TEST-OPP-SRC', baseCost: 3 });
    const { rig: withOppSource, instanceId: oppSourceId } = putCharacterInPlay({ state: fired.state, defs: rig.defs }, 'p2', oppSourceDef);
    const ctx = new EffectContextImpl(withOppSource.state, oppSourceId, withOppSource.defs, null);
    ctx.koApply(selfId);
    expect(ctx.state().cardsById[selfId]!.currentZone).toBe('characterArea');
  });

  it('does not register immunity when the 7-trash condition is unmet', () => {
    const selfDef = makeCharacterDef({ cardDefinitionId: 'OP13-084-LOW', cardNumber: 'OP13-084', baseCost: 4 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    rig = seedTrash(rig, 'p1', 3);
    let selfId: string;
    ({ rig, instanceId: selfId } = putCharacterInPlay(rig, 'p1', selfDef, { summoningSick: false }));

    const entry = OP13_ASSIGNMENTS.find((a) => a.cardNumber === 'OP13-084')!;
    const registry = buildRegistryFromAssignments([entry]);
    const fired = runTimings(registry['OP13-084'], ['onEnterPlay'], rig.state, selfId, rig.defs, null, registry);

    const record = fired.state.continuousEffects.find((ce) => ce.fieldRemovalImmunityModifier?.appliesToInstanceId === selfId);
    // The continuous effect record is registered unconditionally (duration: 'permanent'); the
    // gate is evaluated live by cannotBeRemovedFromFieldByEffect at removal-time, not at registration.
    expect(record).toBeDefined();

    const oppSourceDef = makeCharacterDef({ cardDefinitionId: nextTestId('opp-src-def-2'), cardNumber: 'TEST-OPP-SRC-2', baseCost: 3 });
    const { rig: withOppSource, instanceId: oppSourceId } = putCharacterInPlay({ state: fired.state, defs: rig.defs }, 'p2', oppSourceDef);
    const ctx = new EffectContextImpl(withOppSource.state, oppSourceId, withOppSource.defs, null);
    ctx.koApply(selfId);
    // Trash count is still below 7 (only the filler + K.O. moves happened), so removal proceeds.
    expect(ctx.state().cardsById[selfId]!.currentZone).toBe('trash');
  });
});
