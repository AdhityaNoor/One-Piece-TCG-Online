import { describe, expect, it } from 'vitest';
import type { CardDefinition, CardInstance } from '../../state/card';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { CardDefinitionLookup } from '../../rules/shared';
import {
  createDeckLookBuffer_V2,
  createLifeLookBufferAtPosition_V2,
  reorderLookBufferRemainderToDeckBottom_V2,
  reorderLifeArea_V2,
  selectFromLookBuffer_V2,
} from '../lookBuffer_V2';
import { resolveSelector_V2, selectResolvedCandidateIds_V2 } from '../selectorResolver_V2';

function def(id: string, patch: Partial<CardDefinition>): CardDefinition {
  return {
    cardDefinitionId: id,
    cardNumber: id,
    name: id,
    category: 'character',
    colors: ['green'],
    types: [],
    attributes: ['strike'],
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

function instance(instanceId: string, cardDefinitionId: string, ownerId = 'p1'): CardInstance {
  return {
    instanceId,
    cardDefinitionId,
    ownerId,
    controllerId: ownerId,
    currentZone: 'deck',
    orientation: 'active',
    faceState: 'faceDown',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: [],
  };
}

describe('V2 selector resolver and look buffer', () => {
  it('resolves V2 name/type/category/cost selectors from deck order', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { name: 'Leader', category: 'leader', basePower: 5000 }),
      'deck-a': def('deck-a', { name: 'Zou', category: 'stage', types: ['Zou'], baseCost: 1 }),
      'deck-b': def('deck-b', { name: 'Nami', types: ['Straw Hat Crew'], baseCost: 1 }),
      'deck-c': def('deck-c', { name: 'Monkey.D.Luffy', types: ['Straw Hat Crew'], baseCost: 5 }),
    };
    const withDeck = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['a', 'b', 'c'] } },
      },
      cardsById: {
        ...state.cardsById,
        a: instance('a', 'deck-a'),
        b: instance('b', 'deck-b'),
        c: instance('c', 'deck-c'),
      },
    };

    const resolved = resolveSelector_V2(
      { state: withDeck, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' },
      {
        subject: 'CARD',
        owner: 'PLAYER',
        zones: ['DECK'],
        cardCategories: ['CHARACTER'],
        types: { kind: 'HAS_ANY_TYPE', values: ['Straw Hat Crew'] },
        names: [{ kind: 'NAME_NOT', value: 'Nami' }],
        cost: { propertyLayer: 'PRINTED', comparison: 'AT_LEAST', value: { kind: 'NUMBER', value: 4 } },
        quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
        ordering: 'DECK_ORDER',
      },
    );

    expect(resolved.candidateInstanceIds).toEqual(['c']);
    expect(resolved.minimum).toBe(0);
    expect(resolved.maximum).toBe(1);
    expect(resolved.isOrdered).toBe(true);
  });

  it('resolves IN_SET numeric filters without treating them as a range', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { name: 'Leader', category: 'leader', basePower: 5000 }),
      cost2: def('cost2', { baseCost: 2 }),
      cost3: def('cost3', { baseCost: 3 }),
      cost4: def('cost4', { baseCost: 4 }),
      cost5: def('cost5', { baseCost: 5 }),
    };
    const withCharacters = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, characterArea: { ...state.players.p1.characterArea, cardIds: ['c2', 'c3', 'c4', 'c5'] } },
      },
      cardsById: {
        ...state.cardsById,
        c2: { ...instance('c2', 'cost2'), currentZone: 'characterArea' as const },
        c3: { ...instance('c3', 'cost3'), currentZone: 'characterArea' as const },
        c4: { ...instance('c4', 'cost4'), currentZone: 'characterArea' as const },
        c5: { ...instance('c5', 'cost5'), currentZone: 'characterArea' as const },
      },
    };

    const resolved = resolveSelector_V2(
      { state: withCharacters, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' },
      {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['CHARACTER_AREA'],
        cardCategories: ['CHARACTER'],
        cost: {
          propertyLayer: 'CURRENT',
          comparison: 'IN_SET',
          values: [{ kind: 'NUMBER', value: 3 }, { kind: 'NUMBER', value: 4 }],
        },
        quantity: { kind: 'ALL' },
      },
    );

    expect(resolved.candidateInstanceIds).toEqual(['c3', 'c4']);
  });

  it('excludes the source card when EXCLUDE_THIS_CARD is present', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { name: 'Leader', category: 'leader', basePower: 5000 }),
      source: def('source', { name: 'Source Character' }),
      other: def('other', { name: 'Other Character' }),
    };
    const withCharacters = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, characterArea: { ...state.players.p1.characterArea, cardIds: ['source-id', 'other-id'] } },
      },
      cardsById: {
        ...state.cardsById,
        'source-id': { ...instance('source-id', 'source'), currentZone: 'characterArea' as const },
        'other-id': { ...instance('other-id', 'other'), currentZone: 'characterArea' as const },
      },
    };

    const resolved = resolveSelector_V2(
      { state: withCharacters, defs, sourceInstanceId: 'source-id', controllerId: 'p1' },
      {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['CHARACTER_AREA'],
        cardCategories: ['CHARACTER'],
        relations: ['EXCLUDE_THIS_CARD'],
        quantity: { kind: 'ALL' },
      },
    );

    expect(resolved.candidateInstanceIds).toEqual(['other-id']);
  });

  it('includes the source card when INCLUDE_THIS_CARD is present even if name filters do not match', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { name: 'Leader', category: 'leader', basePower: 5000 }),
      source: def('source', { name: 'Aisa' }),
      shura: def('shura', { name: 'Shura' }),
      other: def('other', { name: 'Ohm' }),
    };
    const withCharacters = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, characterArea: { ...state.players.p1.characterArea, cardIds: ['source-id', 'shura-id', 'other-id'] } },
      },
      cardsById: {
        ...state.cardsById,
        'source-id': { ...instance('source-id', 'source'), currentZone: 'characterArea' as const },
        'shura-id': { ...instance('shura-id', 'shura'), currentZone: 'characterArea' as const },
        'other-id': { ...instance('other-id', 'other'), currentZone: 'characterArea' as const },
      },
    };

    const resolved = resolveSelector_V2(
      { state: withCharacters, defs, sourceInstanceId: 'source-id', controllerId: 'p1' },
      {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['CHARACTER_AREA'],
        cardCategories: ['CHARACTER'],
        names: [{ kind: 'NAME_EXACT', value: 'Shura' }],
        relations: ['INCLUDE_THIS_CARD'],
        quantity: { kind: 'ALL' },
      },
    );

    expect(resolved.candidateInstanceIds).toEqual(['source-id', 'shura-id']);
  });

  it('selects no more than the per-card-category limit for category-wise selectors', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { name: 'Leader', category: 'leader', basePower: 5000 }),
      char1: def('char1', { name: 'Character 1' }),
      char2: def('char2', { name: 'Character 2' }),
    };
    const withTargets = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players.p2, characterArea: { ...state.players.p2.characterArea, cardIds: ['c1', 'c2'] } },
      },
      cardsById: {
        ...state.cardsById,
        'p2-leader': { ...state.cardsById['p2-leader'], cardDefinitionId: 'OP01-001' },
        c1: { ...instance('c1', 'char1', 'p2'), currentZone: 'characterArea' as const },
        c2: { ...instance('c2', 'char2', 'p2'), currentZone: 'characterArea' as const },
      },
    };
    const ctx = { state: withTargets, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const resolved = resolveSelector_V2(ctx, {
      subject: 'CARD',
      controller: 'OPPONENT',
      zones: ['LEADER_AREA', 'CHARACTER_AREA'],
      cardCategories: ['LEADER', 'CHARACTER'],
      quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 2 } },
      perCardCategoryQuantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
      relations: ['EACH_CARD_CATEGORY'],
    });

    expect(resolved.candidateInstanceIds).toEqual(['p2-leader', 'c1', 'c2']);
    expect(resolved.perCardCategory).toEqual({ minimum: 0, maximum: 1 });
    expect(selectResolvedCandidateIds_V2(ctx, resolved)).toEqual(['p2-leader', 'c1']);
  });

  it('tracks selected looked cards and reorders the remainder to deck bottom', () => {
    const state = createSampleGameState();
    const withDeck = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['a', 'b', 'c', 'd'] } },
      },
    };

    const looked = createDeckLookBuffer_V2(withDeck, 'p1', 3);
    const afterPick = selectFromLookBuffer_V2(looked, ['b']);
    const afterReorder = reorderLookBufferRemainderToDeckBottom_V2(withDeck, afterPick, ['c', 'a']);

    expect(looked.lookedInstanceIds).toEqual(['a', 'b', 'c']);
    expect(afterPick.selectedInstanceIds).toEqual(['b']);
    expect(afterPick.remainingInstanceIds).toEqual(['a', 'c']);
    expect(afterReorder.players.p1.deck.cardIds).toEqual(['b', 'd', 'c', 'a']);
  });

  it('creates Life look buffers and reorders Life area', () => {
    const state = createSampleGameState();
    const withLife = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, lifeArea: { ...state.players.p1.lifeArea, cardIds: ['l1', 'l2', 'l3'] } },
      },
    };

    const looked = createLifeLookBufferAtPosition_V2(withLife, 'p1', 2, 'BOTTOM');
    const reordered = reorderLifeArea_V2(withLife, 'p1', ['l3', 'l2', 'l1']);

    expect(looked.lookedInstanceIds).toEqual(['l2', 'l3']);
    expect(reordered.players.p1.lifeArea.cardIds).toEqual(['l3', 'l2', 'l1']);
  });
});
