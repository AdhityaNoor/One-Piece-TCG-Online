import { describe, expect, it } from 'vitest';
import type { CardDefinition, CardInstance } from '../../state/card';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { CardDefinitionLookup } from '../../rules/shared';
import { executeResolutionNode_V2 } from '../resolution_V2';
import type { EffectRuntimeBundle_V2 } from '../runtime_V2';

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

describe('V2 resolution nodes', () => {
  it('executes IF branches with native V2 condition evaluation', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
    };
    const withDeck = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['a', 'b'] } },
      },
      cardsById: {
        ...state.cardsById,
        a: instance('a', 'card'),
        b: instance('b', 'card'),
      },
    };
    const ctx = { state: withDeck, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'IF',
      condition: {
        kind: 'PREDICATE',
        left: { kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'] } },
        operator: 'GREATER_OR_EQUAL',
        right: { kind: 'NUMBER', value: 2 },
      },
      then: { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
      else: { kind: 'NO_OP' },
    }, 'if-test');

    expect(result.state.players.p1.deck.cardIds).toEqual(['b']);
    expect(result.state.players.p1.hand.cardIds).toEqual(['a']);
    expect(result.unsupportedReasons ?? []).toEqual([]);
  });

  it('executes SEQUENCE nodes and preserves sidecar results', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'GRANT_KEYWORD', selector: { subject: 'CARD', relations: ['THIS_CARD'] }, keyword: 'DOUBLE_ATTACK', duration: { kind: 'THIS_TURN' } } },
        { kind: 'ACTION', action: { type: 'PREVENT_ACTION', selector: { subject: 'CARD', owner: 'OPPONENT', zones: ['CHARACTER_AREA'] }, action: 'ATTACK', duration: { kind: 'THIS_TURN' } } },
      ],
    }, 'sequence-test');

    expect(result.keywordModifiers).toHaveLength(1);
    expect(result.permissionEffects).toHaveLength(1);
    expect(result.log).toHaveLength(2);
  });

  it('does not execute an IF branch when condition atoms are unsupported', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
    };
    const withDeck = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['a'] } },
      },
      cardsById: {
        ...state.cardsById,
        a: instance('a', 'card'),
      },
    };
    const ctx = { state: withDeck, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'IF',
      condition: { kind: 'PREDICATE', left: { kind: 'UNKNOWN_ATOM' }, operator: 'EXISTS' },
      then: { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
    });

    expect(result.state.players.p1.deck.cardIds).toEqual(['a']);
    expect(result.unsupportedReasons?.[0]).toContain('UNKNOWN_ATOM');
  });

  it('creates V2 choice sidecar prompts for CHOOSE nodes', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'CHOOSE',
      chooser: 'PLAYER',
      minimumChoices: 1,
      maximumChoices: 1,
      options: [
        { kind: 'NO_OP' },
        { kind: 'ACTION', action: { type: 'PLAYER_WINS', player: 'PLAYER' } },
      ],
    }, 'choose-test');

    expect(result.choicePrompts).toHaveLength(1);
    expect(result.choicePrompts?.[0]).toMatchObject({
      id: 'p1-leader:choice:1:0',
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      chooserPlayerId: 'p1',
      minimumChoices: 1,
      maximumChoices: 1,
      options: [
        { index: 0, label: 'Option 1', node: { kind: 'NO_OP' } },
        { index: 1, label: 'Option 2', node: { kind: 'ACTION' } },
      ],
      status: 'PENDING',
    });
    expect(result.state.pendingChoices).toEqual([]);
    expect(result.log[0]).toMatchObject({
      type: 'CHOICE_REQUESTED',
      data: { choicePromptId: 'p1-leader:choice:1:0', optionCount: 2 },
    });
  });

  it('executes ACTIVATE_EVENT against the selected Event V2 runtime ability', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      event: def('event', { category: 'event', basePower: undefined, attributes: undefined, baseCost: 1, cardNumber: 'TEST-EVENT' }),
      card: def('card'),
    };
    const withEventAndDeck = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...state.players.p1.hand, cardIds: ['event-1'] },
          deck: { ...state.players.p1.deck, cardIds: ['deck-1'] },
        },
      },
      cardsById: {
        ...state.cardsById,
        'event-1': instance('event-1', 'event', 'hand'),
        'deck-1': instance('deck-1', 'card', 'deck'),
      },
    };
    const runtime: EffectRuntimeBundle_V2 = {
      programsByCardNumber: {
        'TEST-EVENT': {
          schemaVersion: 'op-tcg-effect-v2.0.0',
          cardNumber: 'TEST-EVENT',
          canonicalEffects: [],
          abilities: [{
            abilityId: 'TEST-EVENT#main',
            timing: { kind: 'STANDARD_TIMING', timing: 'EVENT_MAIN' },
            optionalActivate: false,
            resolution: { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
          }],
        },
      },
      compatibilityWarnings: [],
      summary: {
        cardCount: 1,
        assignmentCount: 1,
        v2AbilityCount: 1,
        legacyAbilityCount: 0,
        legacyWarningCount: 0,
      },
    };
    const ctx = {
      state: withEventAndDeck,
      defs,
      runtime,
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
    };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'ACTION',
      action: {
        type: 'ACTIVATE_EVENT',
        selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'], cardCategories: ['EVENT'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } } },
        player: 'PLAYER',
      },
    }, 'activate-event-resolution-test');

    expect(result.state.players.p1.deck.cardIds).toEqual([]);
    expect(result.state.players.p1.hand.cardIds).toEqual(['event-1', 'deck-1']);
    expect(result.activatedEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventInstanceId: 'event-1', eventCardNumber: 'TEST-EVENT', status: 'PENDING' }),
      expect.objectContaining({ eventInstanceId: 'event-1', eventCardNumber: 'TEST-EVENT', status: 'RESOLVED' }),
    ]));
    expect(result.log.map((entry) => entry.type)).toEqual(['EFFECT_RESOLVED', 'CARD_DRAWN']);
    expect(result.unsupportedReasons ?? []).toEqual([]);
  });
});
