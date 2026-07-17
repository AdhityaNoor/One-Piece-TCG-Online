import { describe, expect, it } from 'vitest';
import type { CardDefinition, CardInstance } from '../../state/card';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { CardDefinitionLookup } from '../../rules/shared';
import { payCosts_V2, validateCostPayments_V2 } from '../costs_V2';
import type { CostAction_V2 } from '../../../cards/effectCompiler_V2/types_V2';

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

function instance(instanceId: string, cardDefinitionId: string, zone: CardInstance['currentZone'], ownerId = 'p1'): CardInstance {
  return {
    instanceId,
    cardDefinitionId,
    ownerId,
    controllerId: ownerId,
    currentZone: zone,
    orientation: zone === 'characterArea' ? 'active' : null,
    faceState: zone === 'lifeArea' ? 'faceDown' : 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: zone === 'lifeArea' ? [] : 'all',
  };
}

describe('V2 costs', () => {
  it('validates and pays add-life-to-hand costs', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = { 'OP01-001': def('OP01-001', { category: 'leader' }), life: def('life') };
    const withLife = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, lifeArea: { ...state.players.p1.lifeArea, cardIds: ['life-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'life-1': instance('life-1', 'life', 'lifeArea'),
      },
    };
    const cost: CostAction_V2 = {
      type: 'ADD_LIFE_TO_HAND_COST',
      selector: {
        subject: 'CARD',
        owner: 'PLAYER',
        zones: ['LIFE'],
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
      },
    };
    const ctx = { state: withLife, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    expect(validateCostPayments_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['life-1'] }])).toEqual({ legal: true, reasons: [] });
    const paid = payCosts_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['life-1'] }]);

    expect(paid.state.players.p1.lifeArea.cardIds).toEqual([]);
    expect(paid.state.players.p1.hand.cardIds).toEqual(['life-1']);
    expect(paid.state.cardsById['life-1']).toMatchObject({ currentZone: 'hand' });
    expect(paid.bindings?.selectedObjects.RETURNED_PREVIOUSLY).toEqual(['life-1']);
    expect(paid.bindings?.selectedObjects.RETURNED_TO_HAND_PREVIOUSLY).toEqual(['life-1']);
  });

  it('pays selector-based return-card-to-bottom-deck costs', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      chopper: def('chopper', { name: 'Tony Tony.Chopper', types: ['Animal'], basePower: 1000 }),
    };
    const withCharacter = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, characterArea: { ...state.players.p1.characterArea, cardIds: ['chopper-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'chopper-1': instance('chopper-1', 'chopper', 'characterArea'),
      },
    };
    const cost: CostAction_V2 = {
      type: 'RETURN_CARD_TO_DECK_COST',
      position: 'BOTTOM',
      selector: {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['CHARACTER_AREA'],
        cardCategories: ['CHARACTER'],
        power: { propertyLayer: 'PRINTED', comparison: 'EQUAL', value: { kind: 'NUMBER', value: 1000 } },
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
      },
    };
    const ctx = { state: withCharacter, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const paid = payCosts_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['chopper-1'] }]);

    expect(paid.state.players.p1.characterArea.cardIds).toEqual([]);
    expect(paid.state.players.p1.deck.cardIds.at(-1)).toBe('chopper-1');
    expect(paid.state.cardsById['chopper-1']).toMatchObject({ currentZone: 'deck', revealedTo: [] });
  });

  it('pays return-card-to-deck-and-shuffle costs with seeded RNG', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
    };
    const withTrash = {
      ...state,
      rng: { seed: 'v2-shuffle-test', cursor: 0 },
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          deck: { ...state.players.p1.deck, cardIds: ['deck-1', 'deck-2', 'deck-3'] },
          trash: { ...state.players.p1.trash, cardIds: ['trash-1', 'trash-2'] },
        },
      },
      cardsById: {
        ...state.cardsById,
        'deck-1': instance('deck-1', 'card', 'deck'),
        'deck-2': instance('deck-2', 'card', 'deck'),
        'deck-3': instance('deck-3', 'card', 'deck'),
        'trash-1': instance('trash-1', 'card', 'trash'),
        'trash-2': instance('trash-2', 'card', 'trash'),
      },
    };
    const cost: CostAction_V2 = {
      type: 'RETURN_CARD_TO_DECK_AND_SHUFFLE_COST',
      selector: {
        subject: 'CARD',
        owner: 'PLAYER',
        zones: ['TRASH'],
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 2 } },
      },
    };
    const ctx = { state: withTrash, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const paid = payCosts_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['trash-1', 'trash-2'] }]);

    expect(paid.state.players.p1.trash.cardIds).toEqual([]);
    expect(new Set(paid.state.players.p1.deck.cardIds)).toEqual(new Set(['deck-1', 'deck-2', 'deck-3', 'trash-1', 'trash-2']));
    expect(paid.state.rng.cursor).toBe(4);
    expect(paid.state.cardsById['trash-1']).toMatchObject({ currentZone: 'deck', revealedTo: [] });
    expect(paid.state.cardsById['trash-2']).toMatchObject({ currentZone: 'deck', revealedTo: [] });
  });

  it('pays play-card costs by moving the selected card from hand to character area', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      kotori: def('kotori', { name: 'Kotori' }),
    };
    const withHand = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, hand: { ...state.players.p1.hand, cardIds: ['kotori-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'kotori-1': instance('kotori-1', 'kotori', 'hand'),
      },
    };
    const cost: CostAction_V2 = {
      type: 'PLAY_CARD_COST',
      state: 'ACTIVE',
      selector: {
        subject: 'CARD',
        owner: 'PLAYER',
        zones: ['HAND'],
        names: [{ kind: 'NAME_EXACT', value: 'Kotori' }],
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
      },
    };
    const ctx = { state: withHand, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const paid = payCosts_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['kotori-1'] }]);

    expect(paid.state.players.p1.hand.cardIds).toEqual([]);
    expect(paid.state.players.p1.characterArea.cardIds).toContain('kotori-1');
    expect(paid.state.cardsById['kotori-1']).toMatchObject({ currentZone: 'characterArea', orientation: 'active', summoningSick: true });
  });

  it('pays add-card-to-life costs with face-up placement', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      blocker: def('blocker', { baseCost: 4, basePower: 7000 }),
    };
    const withCharacter = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, characterArea: { ...state.players.p1.characterArea, cardIds: ['blocker-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'blocker-1': instance('blocker-1', 'blocker', 'characterArea'),
      },
    };
    const cost: CostAction_V2 = {
      type: 'ADD_CARD_TO_LIFE_COST',
      position: 'TOP',
      face: 'FACE_UP',
      selector: {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['CHARACTER_AREA'],
        cardCategories: ['CHARACTER'],
        cost: { propertyLayer: 'CURRENT', comparison: 'AT_LEAST', value: { kind: 'NUMBER', value: 3 } },
        power: { propertyLayer: 'CURRENT', comparison: 'AT_LEAST', value: { kind: 'NUMBER', value: 7000 } },
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
      },
    };
    const ctx = { state: withCharacter, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const paid = payCosts_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['blocker-1'] }]);

    expect(paid.state.players.p1.characterArea.cardIds).toEqual([]);
    expect(paid.state.players.p1.lifeArea.cardIds[0]).toBe('blocker-1');
    expect(paid.state.cardsById['blocker-1']).toMatchObject({ currentZone: 'lifeArea', faceState: 'faceUp', revealedTo: 'all' });
  });

  it('pays choose-one costs using the selected option payment selection', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      fish: def('fish', { types: ['Fish-Man'] }),
      noah: def('noah', { name: 'The Ark Noah', category: 'stage' }),
    };
    const withOptions = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...state.players.p1.hand, cardIds: ['fish-1'] },
          stageArea: { ...state.players.p1.stageArea, cardIds: ['noah-1'] },
        },
      },
      cardsById: {
        ...state.cardsById,
        'fish-1': instance('fish-1', 'fish', 'hand'),
        'noah-1': instance('noah-1', 'noah', 'stageArea'),
      },
    };
    const cost: CostAction_V2 = {
      type: 'CHOOSE_ONE_COST',
      options: [
        [{
          type: 'TRASH_CARD_COST',
          selector: {
            subject: 'CARD',
            owner: 'PLAYER',
            zones: ['HAND'],
            types: { kind: 'HAS_ANY_TYPE', values: ['Fish-Man'] },
            quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
          },
        }],
        [{
          type: 'TRASH_CARD_COST',
          selector: {
            subject: 'CARD',
            owner: 'PLAYER',
            zones: ['HAND', 'STAGE_AREA'],
            names: [{ kind: 'NAME_EXACT', value: 'The Ark Noah' }],
            quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
          },
        }],
      ],
    };
    const ctx = { state: withOptions, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    expect(validateCostPayments_V2(ctx, [cost], [{
      costIndex: 0,
      selectedInstanceIds: [],
      selectedOptionIndex: 0,
      optionSelections: [{ costIndex: 0, selectedInstanceIds: ['fish-1'] }],
    }])).toEqual({ legal: true, reasons: [] });

    const paid = payCosts_V2(ctx, [cost], [{
      costIndex: 0,
      selectedInstanceIds: [],
      selectedOptionIndex: 0,
      optionSelections: [{ costIndex: 0, selectedInstanceIds: ['fish-1'] }],
    }]);

    expect(paid.state.players.p1.hand.cardIds).toEqual([]);
    expect(paid.state.players.p1.stageArea.cardIds).toEqual(['noah-1']);
    expect(paid.state.players.p1.trash.cardIds[0]).toBe('fish-1');
    expect(paid.paidInstanceIds).toEqual(['fish-1']);
  });

  it('binds trashed-card-count after trash-card cost payments', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      event: def('event', { category: 'event' }),
      stage: def('stage', { category: 'stage' }),
      character: def('character', { category: 'character' }),
    };
    const withHand = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, hand: { ...state.players.p1.hand, cardIds: ['event-1', 'stage-1', 'char-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'event-1': instance('event-1', 'event', 'hand'),
        'stage-1': instance('stage-1', 'stage', 'hand'),
        'char-1': instance('char-1', 'character', 'hand'),
      },
    };
    const cost: CostAction_V2 = {
      type: 'TRASH_CARD_COST',
      selector: {
        subject: 'CARD',
        owner: 'PLAYER',
        zones: ['HAND'],
        cardCategories: ['EVENT', 'STAGE'],
        quantity: { kind: 'ANY_NUMBER' },
      },
    };
    const ctx = { state: withHand, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    expect(validateCostPayments_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['event-1', 'stage-1'] }])).toEqual({ legal: true, reasons: [] });
    expect(validateCostPayments_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['char-1'] }]).legal).toBe(false);

    const paid = payCosts_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['event-1', 'stage-1'] }]);

    expect(paid.bindings?.selectedObjects.TRASHED_PREVIOUSLY).toEqual(['event-1', 'stage-1']);
    expect(paid.bindings?.actionResults['trashed-card-count']).toBe(2);
    expect(paid.state.players.p1.trash.cardIds).toEqual(['stage-1', 'event-1']);
    expect(paid.state.players.p1.hand.cardIds).toEqual(['char-1']);
  });

  it('pays temporary power modifier costs', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = { 'OP01-001': def('OP01-001', { category: 'leader' }) };
    const cost: CostAction_V2 = {
      type: 'MODIFY_POWER_COST',
      selector: {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['LEADER_AREA'],
        cardCategories: ['LEADER'],
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
      },
      operation: 'SUBTRACT',
      value: { kind: 'NUMBER', value: 5000 },
      duration: { kind: 'THIS_TURN' },
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const paid = payCosts_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['p1-leader'] }]);

    expect(paid.state.continuousEffects.at(-1)).toMatchObject({
      sourceInstanceId: 'p1-leader',
      ownerId: 'p1',
      duration: 'duringThisTurn',
      powerModifier: { appliesToInstanceId: 'p1-leader', amount: -5000 },
    });
  });

  it('pays give-DON costs by attaching selected DON to the selected target', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      don: def('don', { category: 'don' }),
    };
    const withDon = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, costArea: { ...state.players.p1.costArea, cardIds: ['don-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'don-1': { ...instance('don-1', 'don', 'costArea'), donRested: false },
      },
    };
    const cost: CostAction_V2 = {
      type: 'GIVE_DON_COST',
      donSelector: {
        subject: 'DON',
        owner: 'PLAYER',
        zones: ['COST_AREA'],
        states: ['ACTIVE'],
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
      },
      targetSelector: {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['LEADER_AREA'],
        cardCategories: ['LEADER'],
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
      },
    };
    const ctx = { state: withDon, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const paid = payCosts_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['don-1'], selectedTargetInstanceIds: ['p1-leader'] }]);

    expect(paid.state.players.p1.costArea.cardIds).toEqual([]);
    expect(paid.state.cardsById['p1-leader'].donAttached).toEqual(['don-1']);
    expect(paid.state.cardsById['don-1']).toMatchObject({ currentZone: 'leaderArea', donRested: true });
  });

  it('pays return-DON-to-cost-area costs by detaching selected DON rested', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      don: def('don', { category: 'don' }),
    };
    const withAttachedDon = {
      ...state,
      cardsById: {
        ...state.cardsById,
        'p1-leader': { ...state.cardsById['p1-leader'], donAttached: ['don-1'] },
        'don-1': { ...instance('don-1', 'don', 'leaderArea'), donRested: true },
      },
    };
    const cost: CostAction_V2 = {
      type: 'RETURN_DON_TO_COST_AREA_COST',
      state: 'RESTED',
      selector: {
        subject: 'DON',
        owner: 'PLAYER',
        zones: ['ATTACHED_DON'],
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
      },
    };
    const ctx = { state: withAttachedDon, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const paid = payCosts_V2(ctx, [cost], [{ costIndex: 0, selectedInstanceIds: ['don-1'] }]);

    expect(paid.state.cardsById['p1-leader'].donAttached).toEqual([]);
    expect(paid.state.players.p1.costArea.cardIds).toContain('don-1');
    expect(paid.state.cardsById['don-1']).toMatchObject({ currentZone: 'costArea', donRested: true });
  });
});
