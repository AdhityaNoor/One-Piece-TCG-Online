import { describe, expect, it } from 'vitest';
import type { CardDefinition, CardInstance } from '../../state/card';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { CardDefinitionLookup } from '../../rules/shared';
import { executeResolutionNode_V2 } from '../resolution_V2';
import type { EffectRuntimeBundle_V2 } from '../runtime_V2';
import { createEmptyEffectRuntimeSidecars_V2 } from '../dispatcher_V2';

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

describe('V2 resolution nodes', () => {
  it('prompts OPTIONAL nodes instead of auto-resolving them', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'OPTIONAL',
      node: { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
    }, 'optional-test');

    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      kind: 'YES_NO',
      sourceEffectId: 'v2:optionalResolution',
      sourceInstanceId: 'p1-leader',
    });
  });

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

  it('prompts for direct deck search-to-hand instead of auto-moving a matching card', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      smile: def('smile', { name: 'Artificial Devil Fruit SMILE' }),
      other: def('other', { name: 'Other Card' }),
    };
    const withDeck = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['wanted', 'other'] } },
      },
      cardsById: {
        ...state.cardsById,
        wanted: instance('wanted', 'smile'),
        other: instance('other', 'other'),
      },
    };
    const ctx = { state: withDeck, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'SEQUENCE',
      nodes: [
        {
          kind: 'ACTION',
          action: {
            type: 'MOVE_CARD',
            selector: {
              subject: 'CARD',
              owner: 'PLAYER',
              zones: ['DECK'],
              names: [{ kind: 'NAME_EXACT', value: 'Artificial Devil Fruit SMILE' }],
              quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
              chooser: 'EFFECT_OWNER',
            },
            to: { zone: 'HAND', owner: 'PLAYER' },
            cause: 'EFFECT',
          },
        },
        {
          kind: 'ACTION',
          action: { type: 'SHUFFLE_ZONE', player: 'PLAYER', zone: 'DECK' },
        },
      ],
    }, 'direct-search-test');

    expect(result.state.players.p1.hand.cardIds).toEqual([]);
    expect(result.state.players.p1.deck.cardIds).toEqual(['wanted', 'other']);
    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectMoveToHand',
      constraints: {
        min: 0,
        max: 1,
        zoneId: 'deck',
        filterDescription: 'Cards in deck eligible for this V2 search effect.',
        candidateInstanceIds: ['wanted'],
        visibleInstanceIds: ['wanted'],
      },
    });
    expect(result.state.pendingChoices[0].resumeState?.v2SelectMoveToHand?.remainingNodes).toHaveLength(1);
    expect(result.log).toEqual([]);
  });

  it('prompts for direct hand play instead of auto-playing the first eligible card', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      ally: def('ally', { category: 'character', name: 'Ally', types: ['Straw Hat Crew'], baseCost: 2 }),
      other: def('other', { category: 'character', name: 'Other', types: ['Animal'], baseCost: 2 }),
    };
    const withHand = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, hand: { ...state.players.p1.hand, cardIds: ['ally-1', 'ally-2', 'other'] } },
      },
      cardsById: {
        ...state.cardsById,
        'ally-1': instance('ally-1', 'ally', 'hand'),
        'ally-2': instance('ally-2', 'ally', 'hand'),
        other: instance('other', 'other', 'hand'),
      },
    };
    const ctx = { state: withHand, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'SEQUENCE',
      nodes: [{
        kind: 'ACTION',
        action: {
          type: 'PLAY_CARD',
          player: 'PLAYER',
          selector: {
            subject: 'CARD',
            owner: 'PLAYER',
            zones: ['HAND'],
            types: { kind: 'HAS_ANY_TYPE', values: ['Straw Hat Crew'] },
            quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
            chooser: 'EFFECT_OWNER',
          },
        },
      }],
    }, 'direct-play-test');

    expect(result.state.players.p1.hand.cardIds).toEqual(['ally-1', 'ally-2', 'other']);
    expect(result.state.players.p1.characterArea.cardIds).toEqual([]);
    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectPlayCard',
      constraints: {
        min: 0,
        max: 1,
        zoneId: 'hand',
        filterDescription: 'Cards eligible to play with this V2 effect.',
        candidateInstanceIds: ['ally-1', 'ally-2'],
        visibleInstanceIds: ['ally-1', 'ally-2'],
      },
    });
  });

  it('prompts top-level targeted actions instead of auto-selecting the first target', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      target: def('target', { category: 'character', name: 'Target', baseCost: 3 }),
    };
    const withTargets = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players.p2, characterArea: { ...state.players.p2.characterArea, cardIds: ['target-1', 'target-2'] } },
      },
      cardsById: {
        ...state.cardsById,
        'target-1': { ...instance('target-1', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
        'target-2': { ...instance('target-2', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
    };
    const ctx = { state: withTargets, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'ACTION',
      action: {
        type: 'MOVE_CARD',
        selector: {
          subject: 'CARD',
          owner: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
        to: { zone: 'HAND', owner: 'OPPONENT' },
        cause: 'EFFECT',
      },
    }, 'target-choice-test');

    expect(result.state.players.p2.characterArea.cardIds).toEqual(['target-1', 'target-2']);
    expect(result.state.players.p2.hand.cardIds).toEqual([]);
    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      constraints: {
        min: 0,
        max: 1,
        zoneId: 'characterArea',
        candidateInstanceIds: ['target-1', 'target-2'],
      },
    });
  });

  it('does not prompt or execute a V2 move when permission sidecars block every target', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      target: def('target', { category: 'character', name: 'Target', baseCost: 3 }),
    };
    const withTargets = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players.p2, characterArea: { ...state.players.p2.characterArea, cardIds: ['target-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'target-1': { ...instance('target-1', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
    };
    const ctx = {
      state: withTargets,
      defs,
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      sidecars: createEmptyEffectRuntimeSidecars_V2({
        permissionEffects: [{
          id: 'prevent-remove',
          kind: 'PREVENT_ZONE_CHANGE',
          sourceInstanceId: 'p2-leader',
          controllerId: 'p2',
          selector: { subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'] },
          action: 'REMOVE_FROM_FIELD',
          sourceSelector: { subject: 'EFFECT', controller: 'OPPONENT', quantity: { kind: 'ANY_NUMBER' } },
          duration: { kind: 'THIS_TURN' },
          createdAtTurn: withTargets.turnNumber,
          status: 'ACTIVE',
        }],
      }),
    };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'ACTION',
      action: {
        type: 'MOVE_CARD',
        selector: {
          subject: 'CARD',
          owner: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
        to: { zone: 'HAND', owner: 'OPPONENT' },
        cause: 'EFFECT',
      },
    }, 'blocked-target-choice-test');

    expect(result.state.players.p2.characterArea.cardIds).toEqual(['target-1']);
    expect(result.state.players.p2.hand.cardIds).toEqual([]);
    expect(result.state.pendingChoices).toEqual([]);
    expect(result.log).toEqual([]);
  });

  it('filters V2 prompted target choices with PREVENT_SELECTION sidecars', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      target: def('target', { category: 'character', name: 'Target', baseCost: 3 }),
    };
    const withTargets = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players.p2, characterArea: { ...state.players.p2.characterArea, cardIds: ['target-1', 'target-2'] } },
      },
      cardsById: {
        ...state.cardsById,
        'target-1': { ...instance('target-1', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
        'target-2': { ...instance('target-2', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
    };
    const ctx = {
      state: withTargets,
      defs,
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      sidecars: createEmptyEffectRuntimeSidecars_V2({
        permissionEffects: [{
          id: 'prevent-select-target-1',
          kind: 'PREVENT_SELECTION',
          sourceInstanceId: 'p2-leader',
          controllerId: 'p2',
          selector: { subject: 'CARD', relations: ['INSTANCE_ID'], instanceIds: ['target-1'] },
          duration: { kind: 'THIS_TURN' },
          createdAtTurn: withTargets.turnNumber,
          status: 'ACTIVE',
        }],
      }),
    };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'ACTION',
      action: {
        type: 'REST_CARD',
        selector: {
          subject: 'CARD',
          owner: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
      },
    }, 'selection-filter-target-choice-test');

    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      constraints: {
        candidateInstanceIds: ['target-2'],
      },
    });
  });

  it('restricts V2 prompted target choices with MODIFY_VALID_TARGETS sidecars', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      target: def('target', { category: 'character', name: 'Target', baseCost: 3 }),
    };
    const withTargets = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players.p2, characterArea: { ...state.players.p2.characterArea, cardIds: ['target-1', 'target-2'] } },
      },
      cardsById: {
        ...state.cardsById,
        'target-1': { ...instance('target-1', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
        'target-2': { ...instance('target-2', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
    };
    const ctx = {
      state: withTargets,
      defs,
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      sidecars: createEmptyEffectRuntimeSidecars_V2({
        permissionEffects: [{
          id: 'valid-target-only-target-2',
          kind: 'MODIFY_VALID_TARGETS',
          sourceInstanceId: 'p1-leader',
          controllerId: 'p1',
          selector: { subject: 'CARD', relations: ['INSTANCE_ID'], instanceIds: ['target-2'] },
          action: 'REST_CARD',
          duration: { kind: 'THIS_TURN' },
          createdAtTurn: withTargets.turnNumber,
          status: 'ACTIVE',
        }],
      }),
    };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'ACTION',
      action: {
        type: 'REST_CARD',
        selector: {
          subject: 'CARD',
          owner: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
      },
    }, 'valid-target-filter-choice-test');

    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      constraints: {
        candidateInstanceIds: ['target-2'],
      },
    });
  });

  it('ignores MODIFY_VALID_TARGETS sidecars for unrelated prompted actions', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      target: def('target', { category: 'character', name: 'Target', baseCost: 3 }),
    };
    const withTargets = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players.p2, characterArea: { ...state.players.p2.characterArea, cardIds: ['target-1', 'target-2'] } },
      },
      cardsById: {
        ...state.cardsById,
        'target-1': { ...instance('target-1', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
        'target-2': { ...instance('target-2', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
    };
    const ctx = {
      state: withTargets,
      defs,
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      sidecars: createEmptyEffectRuntimeSidecars_V2({
        permissionEffects: [{
          id: 'valid-target-ko-only',
          kind: 'MODIFY_VALID_TARGETS',
          sourceInstanceId: 'p1-leader',
          controllerId: 'p1',
          selector: { subject: 'CARD', relations: ['INSTANCE_ID'], instanceIds: ['target-2'] },
          action: 'KO_CARD',
          duration: { kind: 'THIS_TURN' },
          createdAtTurn: withTargets.turnNumber,
          status: 'ACTIVE',
        }],
      }),
    };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'ACTION',
      action: {
        type: 'REST_CARD',
        selector: {
          subject: 'CARD',
          owner: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
      },
    }, 'unrelated-valid-target-filter-choice-test');

    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      constraints: {
        candidateInstanceIds: ['target-1', 'target-2'],
      },
    });
  });

  it('prompts GIVE_DON DON selection before auto-attaching anything', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      don: def('don', { category: 'don', baseCost: undefined, basePower: undefined, attributes: undefined }),
      target: def('target', { category: 'character', name: 'Target' }),
    };
    const withDonAndTargets = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          costArea: { ...state.players.p1.costArea, cardIds: ['don-1', 'don-2'] },
          characterArea: { ...state.players.p1.characterArea, cardIds: ['target-1', 'target-2'] },
        },
      },
      cardsById: {
        ...state.cardsById,
        'don-1': { ...instance('don-1', 'don', 'costArea'), donRested: false },
        'don-2': { ...instance('don-2', 'don', 'costArea'), donRested: false },
        'target-1': { ...instance('target-1', 'target', 'characterArea'), orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
        'target-2': { ...instance('target-2', 'target', 'characterArea'), orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
    };
    const ctx = { state: withDonAndTargets, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'ACTION',
      action: {
        type: 'GIVE_DON',
        donSelector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
          states: ['ACTIVE'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
        target: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['CHARACTER_AREA'],
          cardCategories: ['CHARACTER'],
          quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
      },
    }, 'give-don-prompt-test');

    expect(result.state.cardsById['target-1'].donAttached).toEqual([]);
    expect(result.state.cardsById['target-2'].donAttached).toEqual([]);
    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectGiveDon',
      constraints: {
        min: 0,
        max: 1,
        zoneId: 'costArea',
        candidateInstanceIds: ['don-1', 'don-2'],
      },
      resumeState: {
        v2SelectGiveDon: {
          targetField: 'donSelector',
        },
      },
    });
  });

  it('does not prompt for ordered top-deck movement even when quantity is up to', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
    };
    const withDeck = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['top', 'second'] } },
      },
      cardsById: {
        ...state.cardsById,
        top: instance('top', 'card'),
        second: instance('second', 'card'),
      },
    };
    const ctx = { state: withDeck, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'ACTION',
      action: {
        type: 'ADD_CARD_TO_LIFE',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['DECK'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          ordering: 'DECK_ORDER',
        },
        player: 'PLAYER',
        position: 'TOP',
        face: 'FACE_DOWN',
      },
    }, 'ordered-top-deck-test');

    expect(result.state.pendingChoices).toEqual([]);
    expect(result.state.players.p1.deck.cardIds).toEqual(['second']);
    expect(result.state.players.p1.lifeArea.cardIds[0]).toBe('top');
    expect(result.log.map((entry) => entry.type)).toEqual(['CARD_MOVED']);
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

  it('creates normal pending choices for CHOOSE nodes', () => {
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

    expect(result.choicePrompts ?? []).toEqual([]);
    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      id: 'p1-leader:v2-choose:1:0',
      sourceInstanceId: 'p1-leader',
      sourceEffectId: 'v2:chooseOption',
      playerId: 'p1',
      kind: 'SELECT_OPTION',
      constraints: {
        min: 1,
        max: 1,
        options: [{ label: 'Option 1' }, { label: 'Option 2' }],
      },
    });
    expect(result.log).toEqual([]);
  });

  it('prompts selectable ACTIVATE_EVENT effects instead of activating the first Event', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      event: def('event', { category: 'event', basePower: undefined, attributes: undefined, baseCost: 1 }),
    };
    const withEvents = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, trash: { ...state.players.p1.trash, cardIds: ['event-1', 'event-2'] } },
      },
      cardsById: {
        ...state.cardsById,
        'event-1': instance('event-1', 'event', 'trash'),
        'event-2': instance('event-2', 'event', 'trash'),
      },
    };
    const ctx = { state: withEvents, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'ACTION',
      action: {
        type: 'ACTIVATE_EVENT',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['TRASH'],
          cardCategories: ['EVENT'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
        player: 'PLAYER',
      },
    }, 'activate-event-choice-test');

    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      constraints: {
        min: 0,
        max: 1,
        zoneId: 'trash',
        candidateInstanceIds: ['event-1', 'event-2'],
      },
    });
    expect(result.activatedEvents ?? []).toEqual([]);
    expect(result.log).toEqual([]);
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

  it('executes REPEAT nodes with evaluated counts', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
    };
    const withDeck = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['a', 'b', 'c'] } },
      },
      cardsById: {
        ...state.cardsById,
        a: instance('a', 'card'),
        b: instance('b', 'card'),
        c: instance('c', 'card'),
      },
    };
    const ctx = { state: withDeck, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'REPEAT',
      count: { kind: 'NUMBER', value: 2 },
      node: { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
    });

    expect(result.state.players.p1.hand.cardIds).toEqual(['a', 'b']);
    expect(result.state.players.p1.deck.cardIds).toEqual(['c']);
    expect(result.log.map((entry) => entry.type)).toEqual(['CARD_DRAWN', 'CARD_DRAWN']);
  });

  it('executes FOR_EACH nodes with an item binding', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      target: def('target', { category: 'character' }),
    };
    const withTargets = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players.p2, characterArea: { ...state.players.p2.characterArea, cardIds: ['target-1', 'target-2'] } },
      },
      cardsById: {
        ...state.cardsById,
        'target-1': { ...instance('target-1', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
        'target-2': { ...instance('target-2', 'target', 'characterArea'), ownerId: 'p2', controllerId: 'p2', orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
    };
    const ctx = { state: withTargets, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeResolutionNode_V2(ctx, {
      kind: 'FOR_EACH',
      items: { subject: 'CARD', controller: 'OPPONENT', zones: ['CHARACTER_AREA'], quantity: { kind: 'ALL' } },
      node: {
        kind: 'ACTION',
        action: {
          type: 'REST_CARD',
          selector: { subject: 'ACTION_RESULT', relations: ['FOR_EACH_ITEM'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } } },
        },
      },
    });

    expect(result.state.cardsById['target-1'].orientation).toBe('rested');
    expect(result.state.cardsById['target-2'].orientation).toBe('rested');
  });

  it('registers DELAY and REPLACEMENT wrapper nodes as sidecars', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const delayed = executeResolutionNode_V2(ctx, {
      kind: 'DELAY',
      timing: { kind: 'STANDARD_TIMING', timing: 'END_OF_YOUR_TURN' },
      expiration: { kind: 'THIS_TURN' },
      node: { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
    });
    const replacement = executeResolutionNode_V2(ctx, {
      kind: 'REPLACEMENT',
      timing: { kind: 'CUSTOM_EVENT', eventType: 'WOULD_BE_KO' },
      node: { kind: 'NO_OP' },
    });

    expect(delayed.delayedEffects).toHaveLength(1);
    expect(delayed.delayedEffects?.[0]).toMatchObject({
      controllerId: 'p1',
      timing: { kind: 'STANDARD_TIMING', timing: 'END_OF_YOUR_TURN' },
      duration: { kind: 'THIS_TURN' },
    });
    expect(replacement.replacementEffects).toHaveLength(1);
    expect(replacement.replacementEffects?.[0]).toMatchObject({
      controllerId: 'p1',
      timing: { kind: 'CUSTOM_EVENT', eventType: 'WOULD_BE_KO' },
    });
  });

  it('registers CREATE_CONTINUOUS_EFFECT stat modifiers only when a selector is present', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const supported = executeResolutionNode_V2(ctx, {
      kind: 'CREATE_CONTINUOUS_EFFECT',
      selector: { subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'], cardCategories: ['CHARACTER'], quantity: { kind: 'ALL' } },
      modifier: { type: 'STAT_MODIFIER', stat: 'POWER', operation: 'ADD', value: { kind: 'NUMBER', value: 1000 } },
      duration: { kind: 'THIS_TURN' },
    });
    const unsupported = executeResolutionNode_V2(ctx, {
      kind: 'CREATE_CONTINUOUS_EFFECT',
      modifier: { type: 'STAT_MODIFIER', stat: 'POWER', operation: 'ADD', value: { kind: 'NUMBER', value: 1000 } },
      duration: { kind: 'THIS_TURN' },
    });

    expect(supported.statModifiers).toHaveLength(1);
    expect(supported.statModifiers?.[0]).toMatchObject({
      stat: 'POWER',
      selector: { zones: ['CHARACTER_AREA'] },
      value: { kind: 'NUMBER', value: 1000 },
    });
    expect(unsupported.statModifiers ?? []).toEqual([]);
    expect(unsupported.unsupportedReasons?.[0]).toContain('missing a selector');
  });
});
