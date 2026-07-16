import { describe, expect, it } from 'vitest';
import type { CardDefinition, CardInstance } from '../../state/card';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { CardDefinitionLookup } from '../../rules/shared';
import { evaluateCondition_V2, evaluateValue_V2 } from '../conditions_V2';

function def(id: string, patch: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: id,
    cardNumber: id,
    name: id,
    category: 'character',
    colors: ['blue'],
    types: [],
    attributes: ['slash'],
    basePower: 3000,
    baseCost: 2,
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    isUnblockable: false,
    hasDoubleAttack: false,
    ...patch,
  };
}

function instance(instanceId: string, cardDefinitionId: string, currentZone: CardInstance['currentZone'] = 'deck'): CardInstance {
  return {
    instanceId,
    cardDefinitionId,
    ownerId: 'p1',
    controllerId: 'p1',
    currentZone,
    orientation: null,
    faceState: 'faceDown',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: [],
  };
}

describe('V2 conditions', () => {
  it('evaluates COUNT predicates with selector distinctness', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      a: def('a', { cardNumber: 'A', name: 'Alpha' }),
      b: def('b', { cardNumber: 'B', name: 'Beta' }),
      c: def('c', { cardNumber: 'B', name: 'Beta' }),
    };
    const withHand = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, hand: { ...state.players.p1.hand, cardIds: ['a', 'b', 'c'] } },
      },
      cardsById: {
        ...state.cardsById,
        a: instance('a', 'a', 'hand'),
        b: instance('b', 'b', 'hand'),
        c: instance('c', 'c', 'hand'),
      },
    };
    const ctx = { state: withHand, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    expect(evaluateCondition_V2(ctx, {
      kind: 'PREDICATE',
      left: { kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'], distinctBy: 'CARD_NUMBER' } },
      operator: 'EQUAL',
      right: { kind: 'NUMBER', value: 2 },
    })).toEqual({ value: true, unsupportedReasons: [] });
  });

  it('evaluates attached DON count and current property predicates', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader', basePower: 5000 }),
      don: def('don', { category: 'don', colors: [], basePower: undefined, baseCost: undefined, attributes: undefined }),
    };
    const withDon = {
      ...state,
      cardsById: {
        ...state.cardsById,
        'p1-leader': { ...state.cardsById['p1-leader'], donAttached: ['don-1', 'don-2'] },
        'don-1': instance('don-1', 'don', 'costArea'),
        'don-2': instance('don-2', 'don', 'costArea'),
      },
    };
    const ctx = { state: withDon, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    expect(evaluateValue_V2(ctx, {
      kind: 'ATTACHED_DON_COUNT',
      selector: { subject: 'CARD', relations: ['THIS_CARD'] },
    })).toEqual({ value: 2, unsupportedReasons: [] });

    expect(evaluateCondition_V2(ctx, {
      kind: 'PREDICATE',
      left: { kind: 'PROPERTY_VALUE', selector: { subject: 'CARD', relations: ['THIS_CARD'] }, property: 'POWER', propertyLayer: 'CURRENT' },
      operator: 'GREATER_OR_EQUAL',
      right: { kind: 'NUMBER', value: 7000 },
    })).toEqual({ value: true, unsupportedReasons: [] });
  });

  it('evaluates current-turn Event activation count by base cost', () => {
    const state = createSampleGameState();
    const withHistory = {
      ...state,
      turnNumber: 3,
      eventActivationHistory: [
        { playerId: 'p1', cardDefinitionId: 'cheap-event', cardNumber: 'E-1', baseCost: 2, turnNumber: 3 },
        { playerId: 'p1', cardDefinitionId: 'old-event', cardNumber: 'E-2', baseCost: 5, turnNumber: 2 },
        { playerId: 'p2', cardDefinitionId: 'opp-event', cardNumber: 'E-3', baseCost: 5, turnNumber: 3 },
        { playerId: 'p1', cardDefinitionId: 'valid-event', cardNumber: 'E-4', baseCost: 3, turnNumber: 3 },
      ],
    };
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state: withHistory, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    expect(evaluateCondition_V2(ctx, {
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
    })).toEqual({ value: true, unsupportedReasons: [] });

    expect(evaluateCondition_V2(ctx, {
      kind: 'PREDICATE',
      left: {
        kind: 'EVENT_ACTIVATION_COUNT',
        player: 'PLAYER',
        during: 'THIS_TURN',
        eventBaseCost: {
          propertyLayer: 'BASE',
          comparison: 'AT_LEAST',
          value: { kind: 'NUMBER', value: 6 },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: { kind: 'NUMBER', value: 1 },
    })).toEqual({ value: false, unsupportedReasons: [] });
  });

  it('evaluates controller own-turn count for first and second player', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };

    expect(evaluateCondition_V2(
      { state: { ...state, turnNumber: 1 }, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' },
      {
        kind: 'PREDICATE',
        left: { kind: 'SELF_TURN_COUNT', player: 'PLAYER' },
        operator: 'GREATER_OR_EQUAL',
        right: { kind: 'NUMBER', value: 2 },
      },
    )).toEqual({ value: false, unsupportedReasons: [] });

    expect(evaluateCondition_V2(
      { state: { ...state, turnNumber: 3 }, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' },
      {
        kind: 'PREDICATE',
        left: { kind: 'SELF_TURN_COUNT', player: 'PLAYER' },
        operator: 'GREATER_OR_EQUAL',
        right: { kind: 'NUMBER', value: 2 },
      },
    )).toEqual({ value: true, unsupportedReasons: [] });

    expect(evaluateCondition_V2(
      { state: { ...state, turnNumber: 2 }, defs, sourceInstanceId: 'p2-leader', controllerId: 'p2' },
      {
        kind: 'PREDICATE',
        left: { kind: 'SELF_TURN_COUNT', player: 'PLAYER' },
        operator: 'GREATER_OR_EQUAL',
        right: { kind: 'NUMBER', value: 2 },
      },
    )).toEqual({ value: false, unsupportedReasons: [] });

    expect(evaluateCondition_V2(
      { state: { ...state, turnNumber: 4 }, defs, sourceInstanceId: 'p2-leader', controllerId: 'p2' },
      {
        kind: 'PREDICATE',
        left: { kind: 'SELF_TURN_COUNT', player: 'PLAYER' },
        operator: 'GREATER_OR_EQUAL',
        right: { kind: 'NUMBER', value: 2 },
      },
    )).toEqual({ value: true, unsupportedReasons: [] });
  });

  it('evaluates boolean composition and reports unsupported atoms', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    expect(evaluateCondition_V2(ctx, {
      kind: 'AND',
      conditions: [
        { kind: 'TRUE' },
        { kind: 'NOT', condition: { kind: 'FALSE' } },
        { kind: 'PREDICATE', left: { kind: 'TURN_PLAYER' }, operator: 'EQUAL', right: { kind: 'STRING', value: 'PLAYER' } },
      ],
    })).toEqual({ value: true, unsupportedReasons: [] });

    const unsupported = evaluateCondition_V2(ctx, {
      kind: 'PREDICATE',
      left: { kind: 'UNKNOWN_ATOM' },
      operator: 'EXISTS',
    });
    expect(unsupported.value).toBe(false);
    expect(unsupported.unsupportedReasons[0]).toContain('UNKNOWN_ATOM');
  });
});
