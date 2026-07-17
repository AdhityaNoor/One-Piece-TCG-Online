import { describe, expect, it } from 'vitest';
import type { EffectDefinition_V2, StandardTiming_V2 } from '../../../cards/effectCompiler_V2/types_V2';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { CardDefinition } from '../../state/card';
import type { GameState } from '../../state/game';
import type { CardDefinitionLookup } from '../../rules/shared';
import type { EffectRuntimeBundle_V2 } from '../runtime_V2';
import { createEffectInvalidationRecord_V2 } from '../modifiers_V2';
import { dispatchCardEffectsForTiming_V2 } from '../dispatcher_V2';

function def(id: string, patch: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: id,
    cardNumber: id,
    name: id,
    category: 'leader',
    colors: ['black'],
    types: [],
    attributes: ['slash'],
    basePower: 5000,
    baseCost: undefined,
    text: '',
    life: 5,
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    hasBanish: false,
    isUnblockable: false,
    ...patch,
  };
}

function effect(
  id: string,
  resolution: EffectDefinition_V2['resolution'],
  timing: StandardTiming_V2 = 'ON_PLAY',
): EffectDefinition_V2 {
  return {
    id,
    source: {
      objectRef: 'THIS_CARD',
      owner: 'PLAYER',
      controller: 'PLAYER',
      sourceZone: 'LEADER_AREA',
      effectIndex: 0,
    },
    category: 'AUTO',
    applicationMode: 'ONE_SHOT',
    activationZones: ['LEADER_AREA'],
    timing: { kind: 'STANDARD_TIMING', timing },
    optionality: 'MANDATORY',
    resolution,
    metadata: {
      sourceCardNumber: 'TEST-LEADER',
      effectIndex: 0,
      printedText: 'test',
      authoringStatus: 'ASSIGNED',
    },
  };
}

function runtime(effects: EffectDefinition_V2[]): EffectRuntimeBundle_V2 {
  return {
    programsByCardNumber: {
      'TEST-LEADER': {
        schemaVersion: 'op-tcg-effect-v2.0.0',
        cardNumber: 'TEST-LEADER',
        canonicalEffects: effects,
        abilities: effects.map((candidate) => ({
          abilityId: candidate.id,
          timing: candidate.timing ?? { kind: 'STANDARD_TIMING', timing: 'ON_ENTER_PLAY' },
          ...(candidate.conditions ? { gates: [candidate.conditions] } : {}),
          resolution: candidate.resolution,
          optionalActivate: false,
        })),
      },
    },
    compatibilityWarnings: [],
    summary: {
      cardCount: 1,
      assignmentCount: effects.length,
      v2AbilityCount: effects.length,
      legacyAbilityCount: 0,
      legacyWarningCount: 0,
    },
  };
}

describe('V2 effect dispatcher', () => {
  it('skips matching V2 effect candidates when an active effect-scope invalidation exists', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001'),
      'TEST-LEADER': def('TEST-LEADER'),
    };
    const sourceInstanceId = state.players.p1.leaderInstanceId;
    const withLeader = {
      ...state,
      cardsById: {
        ...state.cardsById,
        [sourceInstanceId]: {
          ...state.cardsById[sourceInstanceId],
          cardDefinitionId: 'TEST-LEADER',
          ownerId: 'p1',
          controllerId: 'p1',
        },
      },
    };
    const invalidation = createEffectInvalidationRecord_V2({
      sourceInstanceId,
      controllerId: 'p1',
      selector: { subject: 'EFFECT', controller: 'PLAYER', quantity: { kind: 'ALL' } },
      selectedInstanceIds: [],
      effectFilter: { kind: 'MATCHING_EFFECT', timing: 'ON_PLAY', rawText: '[On Play]' },
      operation: 'INVALIDATE_EFFECTS',
      duration: { kind: 'WHILE_SOURCE_VALID' },
      turnNumber: withLeader.turnNumber,
      existingCount: 0,
    });

    const result = dispatchCardEffectsForTiming_V2({
      state: withLeader as GameState,
      defs,
      runtime: runtime([
        effect('TEST-LEADER#0', { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } }),
      ]),
      sourceInstanceId,
      controllerId: 'p1',
      timing: { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
      sidecars: { effectInvalidations: [invalidation] },
    });

    expect(result.executedEffects).toEqual([]);
    expect(result.skippedEffects).toMatchObject([
      { abilityId: 'TEST-LEADER#0', reason: 'INVALIDATED', candidate: { timing: 'ON_PLAY', controllerId: 'p1' } },
    ]);
    expect(result.sidecars.effectInvalidations).toEqual([invalidation]);
  });

  it('lets earlier V2 invalidation records suppress later same-timing V2 abilities in one dispatch pass', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001'),
      'TEST-LEADER': def('TEST-LEADER'),
    };
    const sourceInstanceId = state.players.p1.leaderInstanceId;
    const withLeader = {
      ...state,
      cardsById: {
        ...state.cardsById,
        [sourceInstanceId]: {
          ...state.cardsById[sourceInstanceId],
          cardDefinitionId: 'TEST-LEADER',
          ownerId: 'p1',
          controllerId: 'p1',
        },
      },
    };

    const result = dispatchCardEffectsForTiming_V2({
      state: withLeader as GameState,
      defs,
      runtime: runtime([
        effect('TEST-LEADER#0', {
          kind: 'ACTION',
          action: {
            type: 'INVALIDATE_EFFECTS',
            selector: { subject: 'EFFECT', controller: 'PLAYER', quantity: { kind: 'ALL' } },
            effectFilter: { kind: 'MATCHING_EFFECT', timing: 'ON_PLAY', rawText: '[On Play]' },
            duration: { kind: 'WHILE_SOURCE_VALID' },
          },
        }),
        effect('TEST-LEADER#1', { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } }),
      ]),
      sourceInstanceId,
      controllerId: 'p1',
      timing: { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
    });

    expect(result.executedEffects).toEqual([
      { abilityId: 'TEST-LEADER#0', cardNumber: 'TEST-LEADER', sourceInstanceId },
    ]);
    expect(result.skippedEffects).toMatchObject([
      { abilityId: 'TEST-LEADER#1', cardNumber: 'TEST-LEADER', sourceInstanceId, reason: 'INVALIDATED' },
    ]);
    expect(result.sidecars.effectInvalidations).toHaveLength(1);
  });

  it('skips activate-main abilities when their V2 conditions fail', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001'),
      'TEST-LEADER': def('TEST-LEADER'),
    };
    const sourceInstanceId = state.players.p1.leaderInstanceId;
    const withLeader = {
      ...state,
      cardsById: {
        ...state.cardsById,
        [sourceInstanceId]: {
          ...state.cardsById[sourceInstanceId],
          cardDefinitionId: 'TEST-LEADER',
          ownerId: 'p1',
          controllerId: 'p1',
        },
      },
    };

    const result = dispatchCardEffectsForTiming_V2({
      state: withLeader as GameState,
      defs,
      runtime: runtime([
        {
          ...effect('TEST-LEADER#activate', { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } }, 'ACTIVATE_MAIN'),
          conditions: {
            kind: 'PREDICATE',
            left: {
              kind: 'EVENT_ACTIVATION_COUNT',
              player: 'PLAYER',
              during: 'THIS_TURN',
              eventBaseCost: {
                propertyLayer: 'BASE',
                comparison: 'AT_LEAST',
                value: { kind: 'NUMBER', value: 3 },
              },
            },
            operator: 'GREATER_OR_EQUAL',
            right: { kind: 'NUMBER', value: 1 },
          },
        },
      ]),
      sourceInstanceId,
      controllerId: 'p1',
      timing: { kind: 'STANDARD_TIMING', timing: 'ACTIVATE_MAIN' },
    });

    expect(result.executedEffects).toEqual([]);
    expect(result.skippedEffects).toMatchObject([
      { abilityId: 'TEST-LEADER#activate', reason: 'GATE_FAILED' },
    ]);
    expect(result.state.players.p1.deck.cardIds).toHaveLength(withLeader.players.p1.deck.cardIds.length);
  });

  it('evaluates native canonical V2 gate refs without lowering to V1 gates', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001'),
      'TEST-LEADER': def('TEST-LEADER'),
    };
    const sourceInstanceId = state.players.p1.leaderInstanceId;
    const withLeader = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, hand: { ...state.players.p1.hand, cardIds: ['hand-a'] } },
      },
      cardsById: {
        ...state.cardsById,
        [sourceInstanceId]: {
          ...state.cardsById[sourceInstanceId],
          cardDefinitionId: 'TEST-LEADER',
          ownerId: 'p1',
          controllerId: 'p1',
        },
        'hand-a': {
          instanceId: 'hand-a',
          cardDefinitionId: 'TEST-LEADER',
          ownerId: 'p1',
          controllerId: 'p1',
          currentZone: 'hand',
          orientation: null,
          faceState: 'faceDown',
          donAttached: [],
          appliedContinuousEffectIds: [],
          oncePerTurnUsed: [],
          summoningSick: false,
          revealedTo: ['p1'],
        },
      },
    };

    const gated = effect('TEST-LEADER#gate', { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } }, 'ACTIVATE_MAIN');
    const bundle = runtime([gated]);
    bundle.programsByCardNumber['TEST-LEADER'].abilities[0].gates = [
      { kind: 'CANONICAL_GATE_REF', gate: 'SELF_HAND', params: { atLeast: 1 } },
    ];

    const result = dispatchCardEffectsForTiming_V2({
      state: withLeader as GameState,
      defs,
      runtime: bundle,
      sourceInstanceId,
      controllerId: 'p1',
      timing: { kind: 'STANDARD_TIMING', timing: 'ACTIVATE_MAIN' },
    });

    expect(result.skippedEffects).toEqual([]);
    expect(result.executedEffects).toEqual([
      { abilityId: 'TEST-LEADER#gate', cardNumber: 'TEST-LEADER', sourceInstanceId },
    ]);
  });

  it('dispatches activate-main and event-main timings independently', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001'),
      'TEST-LEADER': def('TEST-LEADER'),
    };
    const sourceInstanceId = state.players.p1.leaderInstanceId;
    const withLeader = {
      ...state,
      cardsById: {
        ...state.cardsById,
        [sourceInstanceId]: {
          ...state.cardsById[sourceInstanceId],
          cardDefinitionId: 'TEST-LEADER',
          ownerId: 'p1',
          controllerId: 'p1',
        },
      },
    };
    const bundle = runtime([
      effect('TEST-LEADER#activate', { kind: 'NO_OP' }, 'ACTIVATE_MAIN'),
      effect('TEST-LEADER#event', { kind: 'NO_OP' }, 'EVENT_MAIN'),
    ]);

    const activateResult = dispatchCardEffectsForTiming_V2({
      state: withLeader,
      defs,
      runtime: bundle,
      sourceInstanceId,
      controllerId: 'p1',
      timing: { kind: 'STANDARD_TIMING', timing: 'ACTIVATE_MAIN' },
    });
    const eventResult = dispatchCardEffectsForTiming_V2({
      state: withLeader,
      defs,
      runtime: bundle,
      sourceInstanceId,
      controllerId: 'p1',
      timing: { kind: 'STANDARD_TIMING', timing: 'EVENT_MAIN' },
    });

    expect(activateResult.executedEffects.map((entry) => entry.abilityId)).toEqual(['TEST-LEADER#activate']);
    expect(eventResult.executedEffects.map((entry) => entry.abilityId)).toEqual(['TEST-LEADER#event']);
  });

  it('dispatches gained V2 effects from sidecars and honors gained-effect removals', () => {
    const state = createSampleGameState();
    const sourceInstanceId = state.players.p1.leaderInstanceId;
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001'),
      'TEST-LEADER': def('TEST-LEADER'),
    };
    const withLeader = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['draw-card'] } },
      },
      cardsById: {
        ...state.cardsById,
        [sourceInstanceId]: {
          ...state.cardsById[sourceInstanceId],
          cardDefinitionId: 'TEST-LEADER',
          ownerId: 'p1',
          controllerId: 'p1',
        },
        'draw-card': {
          instanceId: 'draw-card',
          cardDefinitionId: 'TEST-LEADER',
          ownerId: 'p1',
          controllerId: 'p1',
          currentZone: 'deck' as const,
          orientation: null,
          faceState: 'faceDown' as const,
          donAttached: [],
          appliedContinuousEffectIds: [],
          oncePerTurnUsed: [],
          summoningSick: false,
          revealedTo: [],
        },
      },
    };
    const gainedEffect = effect('gained:draw', {
      kind: 'ACTION',
      action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } },
    }, 'ACTIVATE_MAIN');
    const gainedRecord = {
      id: 'grant',
      sourceInstanceId,
      controllerId: 'p1',
      selector: { subject: 'CARD' as const, relations: ['INSTANCE_ID'], instanceIds: [sourceInstanceId] },
      selectedInstanceIds: [sourceInstanceId],
      effect: gainedEffect,
      duration: { kind: 'THIS_TURN' as const },
      createdAtTurn: withLeader.turnNumber,
      status: 'ACTIVE' as const,
    };
    const emptyRuntime: EffectRuntimeBundle_V2 = {
      programsByCardNumber: {},
      compatibilityWarnings: [],
      summary: { cardCount: 0, assignmentCount: 0, v2AbilityCount: 0, legacyAbilityCount: 0, legacyWarningCount: 0 },
    };

    const executed = dispatchCardEffectsForTiming_V2({
      state: withLeader,
      defs,
      runtime: emptyRuntime,
      sourceInstanceId,
      controllerId: 'p1',
      timing: { kind: 'STANDARD_TIMING', timing: 'ACTIVATE_MAIN' },
      sidecars: { gainedEffects: [gainedRecord] },
    });

    expect(executed.executedEffects).toEqual([{ abilityId: 'gained:draw', cardNumber: 'TEST-LEADER', sourceInstanceId }]);
    expect(executed.state.players.p1.hand.cardIds).toEqual(['draw-card']);

    const removed = dispatchCardEffectsForTiming_V2({
      state: withLeader,
      defs,
      runtime: emptyRuntime,
      sourceInstanceId,
      controllerId: 'p1',
      timing: { kind: 'STANDARD_TIMING', timing: 'ACTIVATE_MAIN' },
      sidecars: {
        gainedEffects: [gainedRecord],
        gainedEffectRemovals: [{
          id: 'remove',
          sourceInstanceId,
          controllerId: 'p1',
          selector: { subject: 'CARD', relations: ['INSTANCE_ID'], instanceIds: [sourceInstanceId] },
          selectedInstanceIds: [sourceInstanceId],
          effectFilter: 'ALL_EFFECTS',
          duration: { kind: 'THIS_TURN' },
          createdAtTurn: withLeader.turnNumber,
          status: 'ACTIVE',
        }],
      },
    });

    expect(removed.executedEffects).toEqual([]);
    expect(removed.state.players.p1.hand.cardIds).toEqual([]);
  });
});
