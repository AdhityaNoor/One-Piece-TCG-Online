import { describe, expect, it } from 'vitest';
import type { CardDefinition, CardInstance } from '../../state/card';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { CardDefinitionLookup } from '../../rules/shared';
import { executeAction_V2 } from '../actions_V2';
import { isEffectInvalidated_V2 } from '../modifiers_V2';

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

function instance(
  instanceId: string,
  cardDefinitionId: string,
  ownerId = 'p1',
  currentZone: CardInstance['currentZone'] = 'deck',
): CardInstance {
  return {
    instanceId,
    cardDefinitionId,
    ownerId,
    controllerId: ownerId,
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

describe('V2 actions', () => {
  it('executes SHUFFLE_ZONE with serialized seeded RNG state', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
    };
    const withDeck = {
      ...state,
      rng: { seed: 'v2-action-shuffle', cursor: 0 },
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['a', 'b', 'c', 'd'] } },
      },
      cardsById: {
        ...state.cardsById,
        a: instance('a', 'card'),
        b: instance('b', 'card'),
        c: instance('c', 'card'),
        d: instance('d', 'card'),
      },
    };
    const ctx = { state: withDeck, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, { type: 'SHUFFLE_ZONE', player: 'PLAYER', zone: 'DECK' }, 'shuffle-test');

    expect(new Set(result.state.players.p1.deck.cardIds)).toEqual(new Set(['a', 'b', 'c', 'd']));
    expect(result.state.players.p1.deck.cardIds).not.toEqual(['a', 'b', 'c', 'd']);
    expect(result.state.rng.cursor).toBe(3);
    expect(result.log).toHaveLength(1);
    expect(result.log[0]).toMatchObject({
      actorPlayerId: 'p1',
      type: 'EFFECT_RESOLVED',
      causedByActionId: 'shuffle-test',
      data: { playerId: 'p1', zone: 'DECK' },
      visibility: { visibleTo: ['p1'] },
    });
  });

  it('executes PLAYER_WINS and PLAYER_LOSES as card-effect game-over actions', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const win = executeAction_V2(ctx, { type: 'PLAYER_WINS', player: 'PLAYER' }, 'win-test');
    expect(win.state.gameOver).toEqual({ winnerId: 'p1', reason: 'cardEffect' });
    expect(win.log[0]).toMatchObject({
      actorPlayerId: 'p1',
      type: 'GAME_OVER',
      causedByActionId: 'win-test',
      data: { winnerId: 'p1', affectedPlayerId: 'p1', result: 'PLAYER_WINS' },
    });

    const lose = executeAction_V2(ctx, { type: 'PLAYER_LOSES', player: 'PLAYER' }, 'lose-test');
    expect(lose.state.gameOver).toEqual({ winnerId: 'p2', reason: 'cardEffect' });
    expect(lose.log[0]).toMatchObject({
      actorPlayerId: 'p1',
      type: 'GAME_OVER',
      causedByActionId: 'lose-test',
      data: { winnerId: 'p2', affectedPlayerId: 'p1', result: 'PLAYER_LOSES' },
    });
  });

  it('executes PLAYER_CHOOSES as a serializable V2 choice sidecar prompt', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeAction_V2(ctx, {
      type: 'PLAYER_CHOOSES',
      minimumChoices: 1,
      maximumChoices: 1,
      options: [
        { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
        { kind: 'NO_OP' },
      ],
    }, 'choice-action-test');

    expect(result.choicePrompts?.[0]).toMatchObject({
      id: 'p1-leader:choice:1:0',
      chooserPlayerId: 'p1',
      minimumChoices: 1,
      maximumChoices: 1,
      options: [{ index: 0 }, { index: 1 }],
    });
    expect(result.state.pendingChoices).toEqual([]);
    expect(result.log[0]).toMatchObject({
      type: 'CHOICE_REQUESTED',
      causedByActionId: 'choice-action-test',
    });
  });

  it('executes DRAW_CARD by moving deck top cards to hand in order', () => {
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
    const result = executeAction_V2(ctx, {
      type: 'DRAW_CARD',
      player: 'PLAYER',
      count: { kind: 'NUMBER', value: 2 },
    }, 'draw-test');

    expect(result.state.players.p1.deck.cardIds).toEqual(['c']);
    expect(result.state.players.p1.hand.cardIds).toEqual(['a', 'b']);
    expect(result.state.cardsById.a.currentZone).toBe('hand');
    expect(result.state.cardsById.b.currentZone).toBe('hand');
    expect(result.log).toHaveLength(2);
    expect(result.log[0]).toMatchObject({
      actorPlayerId: 'p1',
      type: 'CARD_DRAWN',
      causedByActionId: 'draw-test',
      relatedCardInstanceIds: ['a'],
      visibility: { visibleTo: ['p1'] },
    });
  });

  it('executes DRAW_CARD as deck-out when the target deck is empty', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'DRAW_CARD',
      player: 'PLAYER',
      count: { kind: 'NUMBER', value: 1 },
    }, 'draw-deckout-test');

    expect(result.state.gameOver).toEqual({ winnerId: 'p2', reason: 'deckedOut' });
    expect(result.log[0]).toMatchObject({
      actorPlayerId: 'p1',
      type: 'GAME_OVER',
      data: { reason: 'deckedOut', loserId: 'p1', winnerId: 'p2' },
    });
  });

  it('executes ADD_DON_FROM_DON_DECK into the cost area with requested state', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      don: def('don', { category: 'don', colors: [], baseCost: undefined, basePower: undefined, attributes: undefined }),
    };
    const withDonDeck = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, donDeck: { ...state.players.p1.donDeck, cardIds: ['don-1', 'don-2', 'don-3'] } },
      },
      cardsById: {
        ...state.cardsById,
        'don-1': instance('don-1', 'don', 'p1', 'donDeck'),
        'don-2': instance('don-2', 'don', 'p1', 'donDeck'),
        'don-3': instance('don-3', 'don', 'p1', 'donDeck'),
      },
    };
    const ctx = { state: withDonDeck, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'ADD_DON_FROM_DON_DECK',
      player: 'PLAYER',
      count: { kind: 'NUMBER', value: 2 },
      destination: 'COST_AREA',
      state: 'RESTED',
    }, 'don-ramp-test');

    expect(result.state.players.p1.donDeck.cardIds).toEqual(['don-3']);
    expect(result.state.players.p1.costArea.cardIds).toEqual(['don-1', 'don-2']);
    expect(result.state.cardsById['don-1']).toMatchObject({ currentZone: 'costArea', faceState: 'faceUp', donRested: true });
    expect(result.state.cardsById['don-2']).toMatchObject({ currentZone: 'costArea', faceState: 'faceUp', donRested: true });
    expect(result.log[0]).toMatchObject({
      type: 'EFFECT_RESOLVED',
      data: { playerId: 'p1', from: 'DON_DECK', to: 'COST_AREA', count: 2, state: 'RESTED', donInstanceIds: ['don-1', 'don-2'] },
    });
  });

  it('executes MOVE_CARD from deck to bottom deck with zone and visibility updates', () => {
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
    const result = executeAction_V2(ctx, {
      type: 'MOVE_CARD',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } }, ordering: 'DECK_ORDER' },
      to: { zone: 'DECK', position: 'BOTTOM' },
      cause: 'EFFECT',
    }, 'move-deck-test');

    expect(result.state.players.p1.deck.cardIds).toEqual(['b', 'c', 'a']);
    expect(result.state.cardsById.a).toMatchObject({ currentZone: 'deck', faceState: 'faceDown', revealedTo: [] });
    expect(result.log[0]).toMatchObject({
      type: 'CARD_MOVED',
      causedByActionId: 'move-deck-test',
      data: { cause: 'EFFECT', movedInstanceIds: ['a'], to: { zone: 'DECK', position: 'BOTTOM' } },
      relatedCardInstanceIds: ['a'],
      visibility: { visibleTo: ['p1'] },
    });
  });

  it('executes MOVE_CARD to trash and clears field attachments/effects for the moved card', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
      don: def('don', { category: 'don', colors: [], baseCost: undefined, basePower: undefined, attributes: undefined }),
    };
    const character = { ...instance('char-1', 'card', 'p1', 'characterArea'), orientation: 'active' as const, donAttached: ['don-1'] };
    const withCharacter = {
      ...state,
      continuousEffects: [{ id: 'ce-char', sourceInstanceId: 'char-1', ownerId: 'p1', duration: 'duringThisTurn' as const, description: 'test' }],
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          characterArea: { ...state.players.p1.characterArea, cardIds: ['char-1'] },
          costArea: { ...state.players.p1.costArea, cardIds: ['don-1'] },
        },
      },
      cardsById: {
        ...state.cardsById,
        'char-1': character,
        'don-1': { ...instance('don-1', 'don', 'p1', 'costArea'), donRested: true },
      },
    };
    const ctx = { state: withCharacter, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'MOVE_CARD',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['CHARACTER_AREA'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } } },
      to: { zone: 'TRASH' },
      cause: 'EFFECT',
    }, 'move-trash-test');

    expect(result.state.players.p1.characterArea.cardIds).toEqual([]);
    expect(result.state.players.p1.trash.cardIds).toEqual(['char-1']);
    expect(result.state.cardsById['char-1']).toMatchObject({ currentZone: 'trash', donAttached: [], faceState: 'faceUp', revealedTo: 'all' });
    expect(result.state.cardsById['don-1'].currentZone).toBe('costArea');
    expect(result.state.continuousEffects).toEqual([]);
    expect(result.log[0]).toMatchObject({
      type: 'CARD_MOVED',
      data: { movedInstanceIds: ['char-1'], to: { zone: 'TRASH' } },
      visibility: 'public',
    });
  });

  it('executes TRASH_CARD through native V2 trash movement', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
    };
    const withHand = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, hand: { ...state.players.p1.hand, cardIds: ['hand-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'hand-1': instance('hand-1', 'card', 'p1', 'hand'),
      },
    };
    const ctx = { state: withHand, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'TRASH_CARD',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'] },
      cause: 'EFFECT',
    }, 'trash-test');

    expect(result.state.players.p1.hand.cardIds).toEqual([]);
    expect(result.state.players.p1.trash.cardIds).toEqual(['hand-1']);
    expect(result.state.cardsById['hand-1']).toMatchObject({ currentZone: 'trash', faceState: 'faceUp', revealedTo: 'all' });
    expect(result.log[0]).toMatchObject({ type: 'CARD_MOVED', data: { movedInstanceIds: ['hand-1'], to: { zone: 'TRASH' } } });
  });

  it('executes rest and set-active actions for cards and DON', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
      don: def('don', { category: 'don', colors: [], baseCost: undefined, basePower: undefined, attributes: undefined }),
    };
    const withCards = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          characterArea: { ...state.players.p1.characterArea, cardIds: ['char-1'] },
          costArea: { ...state.players.p1.costArea, cardIds: ['don-1'] },
        },
      },
      cardsById: {
        ...state.cardsById,
        'char-1': { ...instance('char-1', 'card', 'p1', 'characterArea'), orientation: 'active' as const },
        'don-1': { ...instance('don-1', 'don', 'p1', 'costArea'), donRested: false },
      },
    };
    const ctx = { state: withCards, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const rested = executeAction_V2(ctx, {
      type: 'REST_CARD',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['CHARACTER_AREA'] },
    }, 'rest-card-test');
    expect(rested.state.cardsById['char-1'].orientation).toBe('rested');
    expect(rested.log[0]).toMatchObject({ type: 'CARD_RESTED', data: { action: 'REST_CARD', targetInstanceIds: ['char-1'] } });

    const donRested = executeAction_V2(ctx, {
      type: 'REST_DON',
      selector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA'] },
    }, 'rest-don-test');
    expect(donRested.state.cardsById['don-1'].donRested).toBe(true);

    const active = executeAction_V2({ ...ctx, state: donRested.state }, {
      type: 'SET_DON_ACTIVE',
      selector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA'] },
    }, 'active-don-test');
    expect(active.state.cardsById['don-1'].donRested).toBe(false);
  });

  it('executes native V2 life, reveal, and DON-return utility actions', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
      don: def('don', { category: 'don', colors: [], baseCost: undefined, basePower: undefined, attributes: undefined }),
    };
    const withCards = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...state.players.p1.hand, cardIds: ['hand-1'] },
          deck: { ...state.players.p1.deck, cardIds: ['deck-1'] },
          lifeArea: { ...state.players.p1.lifeArea, cardIds: ['life-1'] },
          costArea: { ...state.players.p1.costArea, cardIds: ['don-1'] },
        },
      },
      cardsById: {
        ...state.cardsById,
        'hand-1': instance('hand-1', 'card', 'p1', 'hand'),
        'deck-1': instance('deck-1', 'card', 'p1', 'deck'),
        'life-1': { ...instance('life-1', 'card', 'p1', 'lifeArea'), faceState: 'faceDown' as const },
        'don-1': { ...instance('don-1', 'don', 'p1', 'costArea'), donRested: true },
      },
    };
    const ctx = { state: withCards, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const added = executeAction_V2(ctx, {
      type: 'ADD_CARD_TO_LIFE',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'] },
      player: 'PLAYER',
      position: 'TOP',
      face: 'FACE_UP',
    }, 'add-life-test');
    expect(added.state.players.p1.lifeArea.cardIds[0]).toBe('hand-1');
    expect(added.state.cardsById['hand-1']).toMatchObject({ currentZone: 'lifeArea', faceState: 'faceUp', revealedTo: 'all' });

    const revealed = executeAction_V2({ ...ctx, state: added.state }, {
      type: 'REVEAL_CARD',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'] },
      viewers: 'BOTH_PLAYERS',
    }, 'reveal-test');
    expect(revealed.state.cardsById['deck-1'].revealedTo).toBe('all');

    const faceDown = executeAction_V2({ ...ctx, state: added.state }, {
      type: 'TURN_LIFE_FACE_DOWN',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } } },
    }, 'life-face-down-test');
    expect(faceDown.state.cardsById['hand-1']).toMatchObject({ faceState: 'faceDown', revealedTo: [] });

    const trashedLife = executeAction_V2({ ...ctx, state: faceDown.state }, {
      type: 'TRASH_LIFE',
      player: 'PLAYER',
      position: 'TOP',
      count: { kind: 'NUMBER', value: 1 },
      activateTrigger: false,
    }, 'trash-life-test');
    expect(trashedLife.state.players.p1.trash.cardIds[0]).toBe('hand-1');

    const returnedDon = executeAction_V2({ ...ctx, state: trashedLife.state }, {
      type: 'RETURN_DON_TO_DON_DECK',
      selector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA'] },
    }, 'return-don-test');
    expect(returnedDon.state.players.p1.donDeck.cardIds[0]).toBe('don-1');
    expect(returnedDon.state.cardsById['don-1']).toMatchObject({ currentZone: 'donDeck', donRested: false });
  });

  it('executes look and reorder actions with V2 bindings', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      card: def('card'),
    };
    const withDeckAndLife = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          deck: { ...state.players.p1.deck, cardIds: ['a', 'b', 'c'] },
          lifeArea: { ...state.players.p1.lifeArea, cardIds: ['l1', 'l2'] },
        },
      },
      cardsById: {
        ...state.cardsById,
        a: instance('a', 'card', 'p1', 'deck'),
        b: instance('b', 'card', 'p1', 'deck'),
        c: instance('c', 'card', 'p1', 'deck'),
        l1: instance('l1', 'card', 'p1', 'lifeArea'),
        l2: instance('l2', 'card', 'p1', 'lifeArea'),
      },
    };
    const ctx = { state: withDeckAndLife, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const looked = executeAction_V2(ctx, {
      type: 'LOOK_AT_CARDS',
      player: 'PLAYER',
      source: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], ordering: 'DECK_ORDER' },
      count: { kind: 'NUMBER', value: 2 },
    }, 'look-test');
    expect(looked.lookBuffers?.[0].lookedInstanceIds).toEqual(['a', 'b']);
    expect(looked.bindings?.selectedObjects.LOOKED_AT_PREVIOUSLY).toEqual(['a', 'b']);

    const reordered = executeAction_V2({ ...ctx, bindings: looked.bindings }, {
      type: 'REORDER_CARDS',
      selector: { subject: 'ACTION_RESULT', relations: ['REMAINDER_OF_PREVIOUS_SELECTION'], quantity: { kind: 'ANY_NUMBER' } },
      destination: { zone: 'DECK', owner: 'PLAYER', position: 'BOTTOM' },
      orderChooser: 'PLAYER',
    }, 'reorder-test');
    expect(reordered.state.players.p1.deck.cardIds).toEqual(['c', 'a', 'b']);

    const lookedLife = executeAction_V2(ctx, {
      type: 'LOOK_AT_LIFE',
      player: 'PLAYER',
      count: { kind: 'NUMBER', value: 2 },
      position: 'ALL',
    }, 'look-life-test');
    const reorderedLife = executeAction_V2({ ...ctx, bindings: lookedLife.bindings }, {
      type: 'REORDER_LIFE',
      player: 'PLAYER',
      selector: { subject: 'ACTION_RESULT', relations: ['LOOKED_AT_PREVIOUSLY'], quantity: { kind: 'ANY_NUMBER' } },
      orderChooser: 'PLAYER',
    }, 'reorder-life-test');
    expect(reorderedLife.state.players.p1.lifeArea.cardIds).toEqual(['l1', 'l2']);
  });

  it('updates V2 look-buffer bindings after playing a selected looked card', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      animal: def('animal', { types: ['Animal'], baseCost: 3 }),
      other: def('other', { types: ['East Blue'], baseCost: 2 }),
      third: def('third', { types: ['Animal'], baseCost: 5 }),
    };
    const withDeck = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, deck: { ...state.players.p1.deck, cardIds: ['animal-old', 'other-old', 'third-old', 'deck-rest'] } },
      },
      cardsById: {
        ...state.cardsById,
        'animal-old': instance('animal-old', 'animal', 'p1', 'deck'),
        'other-old': instance('other-old', 'other', 'p1', 'deck'),
        'third-old': instance('third-old', 'third', 'p1', 'deck'),
        'deck-rest': instance('deck-rest', 'other', 'p1', 'deck'),
      },
    };
    const ctx = { state: withDeck, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const looked = executeAction_V2(ctx, {
      type: 'LOOK_AT_CARDS',
      player: 'PLAYER',
      source: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], ordering: 'DECK_ORDER' },
      count: { kind: 'NUMBER', value: 3 },
    }, 'look-for-play');

    const played = executeAction_V2({ ...ctx, bindings: looked.bindings }, {
      type: 'PLAY_CARD',
      selector: {
        subject: 'ACTION_RESULT',
        relations: ['SELECTED_PREVIOUSLY'],
        types: { kind: 'HAS_ANY_TYPE', values: ['Animal'] },
        cost: { propertyLayer: 'CURRENT', comparison: 'AT_MOST', value: { kind: 'NUMBER', value: 3 } },
        quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
      },
      player: 'PLAYER',
    }, 'play-looked-card');
    const playedId = played.playedInstanceIds[0];

    expect(playedId).toBeDefined();
    expect(played.bindings?.selectedObjects.PLAYED_SOURCE_PREVIOUSLY).toEqual(['animal-old']);
    expect(played.bindings?.selectedObjects.SELECTED_PREVIOUSLY).toEqual([playedId]);
    expect(played.bindings?.selectedObjects.REMAINDER_OF_PREVIOUS_SELECTION).toEqual(['other-old', 'third-old']);

    const reordered = executeAction_V2({ ...ctx, state: played.state, bindings: played.bindings }, {
      type: 'REORDER_CARDS',
      selector: { subject: 'ACTION_RESULT', relations: ['REMAINDER_OF_PREVIOUS_SELECTION'], quantity: { kind: 'ANY_NUMBER' } },
      destination: { zone: 'DECK', owner: 'PLAYER', position: 'BOTTOM' },
      orderChooser: 'PLAYER',
    }, 'reorder-after-play');

    expect(reordered.state.players.p1.characterArea.cardIds).toContain(playedId);
    expect(reordered.state.players.p1.deck.cardIds).toEqual(['deck-rest', 'other-old', 'third-old']);
  });

  it('executes GIVE_DON by resting DON and attaching it to the target', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      don: def('don', { category: 'don', colors: [], baseCost: undefined, basePower: undefined, attributes: undefined }),
    };
    const withDon = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, costArea: { ...state.players.p1.costArea, cardIds: ['don-1', 'don-2'] } },
      },
      cardsById: {
        ...state.cardsById,
        'don-1': { ...instance('don-1', 'don', 'p1', 'costArea'), donRested: false },
        'don-2': { ...instance('don-2', 'don', 'p1', 'costArea'), donRested: false },
      },
    };
    const ctx = { state: withDon, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'GIVE_DON',
      donSelector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 2 } } },
      target: { subject: 'CARD', owner: 'PLAYER', zones: ['LEADER_AREA'] },
    }, 'give-don-test');

    expect(result.state.players.p1.costArea.cardIds).toEqual(['don-1', 'don-2']);
    expect(result.state.cardsById['don-1']).toMatchObject({ currentZone: 'costArea', donRested: true, revealedTo: 'all' });
    expect(result.state.cardsById['don-2']).toMatchObject({ currentZone: 'costArea', donRested: true, revealedTo: 'all' });
    expect(result.state.cardsById['p1-leader'].donAttached).toEqual(['don-1', 'don-2']);
    expect(result.log[0]).toMatchObject({
      type: 'DON_GIVEN',
      data: { donInstanceIds: ['don-1', 'don-2'], targetInstanceId: 'p1-leader' },
    });
  });

  it('executes PLAY_CARD by minting a fresh Character instance into play', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      char: def('char', { category: 'character', basePower: 5000, baseCost: 3 }),
    };
    const withHand = {
      ...state,
      nextInstanceSeq: 7,
      players: {
        ...state.players,
        p1: { ...state.players.p1, hand: { ...state.players.p1.hand, cardIds: ['hand-char'] } },
      },
      cardsById: {
        ...state.cardsById,
        'hand-char': instance('hand-char', 'char', 'p1', 'hand'),
      },
    };
    const ctx = { state: withHand, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'PLAY_CARD',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'] },
      player: 'PLAYER',
    }, 'play-card-test');

    expect(result.state.players.p1.hand.cardIds).toEqual([]);
    expect(result.state.players.p1.characterArea.cardIds).toEqual(['rt-7']);
    expect(result.state.cardsById['hand-char']).toBeUndefined();
    expect(result.state.cardsById['rt-7']).toMatchObject({
      cardDefinitionId: 'char',
      ownerId: 'p1',
      controllerId: 'p1',
      currentZone: 'characterArea',
      orientation: 'active',
      faceState: 'faceUp',
      currentPower: 5000,
      currentCost: 3,
      summoningSick: true,
      enteredPlayTurn: 1,
      revealedTo: 'all',
    });
    expect(result.state.nextInstanceSeq).toBe(8);
    expect(result.log[0]).toMatchObject({
      type: 'CARD_PLAYED',
      data: { from: 'hand', to: 'characterArea', oldInstanceId: 'hand-char', newInstanceId: 'rt-7', via: 'V2_EFFECT' },
    });
  });

  it('executes PLAY_CARD for Stage by replacing the previous Stage', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      stage: def('stage', { category: 'stage', attributes: undefined, basePower: undefined, baseCost: 1 }),
    };
    const withStages = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...state.players.p1.hand, cardIds: ['new-stage'] },
          stageArea: { ...state.players.p1.stageArea, cardIds: ['old-stage'] },
        },
      },
      cardsById: {
        ...state.cardsById,
        'new-stage': instance('new-stage', 'stage', 'p1', 'hand'),
        'old-stage': { ...instance('old-stage', 'stage', 'p1', 'stageArea'), orientation: 'active' as const, faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
    };
    const ctx = { state: withStages, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'PLAY_CARD',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'] },
      player: 'PLAYER',
    }, 'play-stage-test');

    expect(result.state.players.p1.stageArea.cardIds).toEqual(['rt-0']);
    expect(result.state.players.p1.trash.cardIds).toEqual(['old-stage']);
    expect(result.state.cardsById['old-stage']).toMatchObject({ currentZone: 'trash', faceState: 'faceUp', revealedTo: 'all' });
    expect(result.state.cardsById['rt-0']).toMatchObject({ cardDefinitionId: 'stage', currentZone: 'stageArea', orientation: 'active', summoningSick: false });
    expect(result.log.map((entry) => entry.type)).toEqual(['CARD_MOVED', 'CARD_PLAYED']);
  });

  it('executes PLAY_CARD with character-area overflow pending choice', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      char: def('char', { category: 'character' }),
    };
    const existing = ['c1', 'c2', 'c3', 'c4', 'c5'];
    const withFullArea = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          hand: { ...state.players.p1.hand, cardIds: ['hand-char'] },
          characterArea: { ...state.players.p1.characterArea, cardIds: existing },
        },
      },
      cardsById: {
        ...state.cardsById,
        'hand-char': instance('hand-char', 'char', 'p1', 'hand'),
        ...Object.fromEntries(existing.map((id) => [id, { ...instance(id, 'char', 'p1', 'characterArea'), orientation: 'active' as const }])),
      },
    };
    const ctx = { state: withFullArea, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'PLAY_CARD',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'] },
      player: 'PLAYER',
    }, 'play-overflow-test');

    expect(result.state.players.p1.characterArea.cardIds).toHaveLength(6);
    expect(result.state.pendingChoices[0]).toMatchObject({
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      sourceEffectId: 'rule:characterAreaOverflow',
      constraints: { min: 1, max: 1, zoneId: 'characterArea' },
    });
    expect(result.log.some((entry) => entry.type === 'CHOICE_REQUESTED')).toBe(true);
  });

  it('executes CREATE_REPLACEMENT_EFFECT as a serializable sidecar registration', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'CREATE_REPLACEMENT_EFFECT',
      duration: { kind: 'THIS_TURN' },
      effect: {
        id: 'replacement:test',
        source: { objectRef: 'THIS_CARD', owner: 'PLAYER', controller: 'PLAYER', sourceZone: 'LEADER_AREA', effectIndex: 0 },
        category: 'REPLACEMENT',
        applicationMode: 'CONTINUOUS',
        activationZones: ['LEADER_AREA'],
        timing: {
          kind: 'CUSTOM_EVENT',
          eventType: 'CARD_WOULD_BE_KO',
        },
        optionality: 'OPTIONAL',
        resolution: { kind: 'NO_OP' },
        metadata: {
          sourceCardNumber: 'TEST-001',
          effectIndex: 0,
          printedText: 'If this card would be K.O.d, you may do nothing instead.',
          authoringStatus: 'ASSIGNED',
        },
      },
    }, 'replacement-test');

    expect(result.state).not.toBe(state);
    expect(result.replacementEffects).toHaveLength(1);
    expect(result.replacementEffects?.[0]).toMatchObject({
      id: 'p1-leader:replacement:replacement:test:1:0',
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      duration: { kind: 'THIS_TURN' },
      createdAtTurn: 1,
      status: 'ACTIVE',
      timing: { kind: 'CUSTOM_EVENT', eventType: 'CARD_WOULD_BE_KO' },
    });
    expect(result.log[0]).toMatchObject({
      actorPlayerId: 'p1',
      type: 'EFFECT_RESOLVED',
      causedByActionId: 'replacement-test',
      data: { replacementEffectId: 'p1-leader:replacement:replacement:test:1:0' },
    });
  });

  it('executes permission actions as serializable sidecar registrations', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const prevent = executeAction_V2(ctx, {
      type: 'PREVENT_ZONE_CHANGE',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: { kind: 'ANY_NUMBER' } },
      sourceSelector: { subject: 'EFFECT', controller: 'PLAYER' },
      action: 'ADD_LIFE_TO_HAND_BY_OWN_EFFECT',
      duration: { kind: 'THIS_TURN' },
    }, 'prevent-test');

    expect(prevent.permissionEffects).toHaveLength(1);
    expect(prevent.permissionEffects?.[0]).toMatchObject({
      id: 'p1-leader:permission:PREVENT_ZONE_CHANGE:1:0',
      kind: 'PREVENT_ZONE_CHANGE',
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      action: 'ADD_LIFE_TO_HAND_BY_OWN_EFFECT',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'] },
      sourceSelector: { subject: 'EFFECT', controller: 'PLAYER' },
      duration: { kind: 'THIS_TURN' },
      status: 'ACTIVE',
    });

    const rule = executeAction_V2(ctx, {
      type: 'MODIFY_RULE_PERMISSION',
      modifier: {
        scope: 'CARD_NAME',
        validFrom: 'ALWAYS',
        modifier: { type: 'RULE_MODIFIER', scope: 'CARD_NAME', expression: { operation: 'TREAT_AS_ADDITIONAL_NAME', names: ['Monkey.D.Luffy'] } },
      },
    }, 'rule-test');

    expect(rule.permissionEffects?.[0]).toMatchObject({
      id: 'p1-leader:permission:MODIFY_RULE_PERMISSION:1:0',
      kind: 'MODIFY_RULE_PERMISSION',
      modifier: { scope: 'CARD_NAME' },
      duration: { kind: 'PERMANENT' },
    });
    expect(rule.log[0]).toMatchObject({
      type: 'EFFECT_RESOLVED',
      data: { permissionEffectId: 'p1-leader:permission:MODIFY_RULE_PERMISSION:1:0', kind: 'MODIFY_RULE_PERMISSION' },
    });

    const preventAction = executeAction_V2(ctx, {
      type: 'PREVENT_ACTION',
      selector: { subject: 'CARD', owner: 'OPPONENT', zones: ['CHARACTER_AREA'], quantity: { kind: 'ANY_NUMBER' } },
      action: 'ATTACK',
      duration: { kind: 'THIS_TURN' },
    }, 'prevent-action-test');

    expect(preventAction.permissionEffects?.[0]).toMatchObject({
      id: 'p1-leader:permission:PREVENT_ACTION:1:0',
      kind: 'PREVENT_ACTION',
      selector: { subject: 'CARD', owner: 'OPPONENT', zones: ['CHARACTER_AREA'] },
      action: 'ATTACK',
      duration: { kind: 'THIS_TURN' },
      status: 'ACTIVE',
    });
  });

  it('executes CREATE_DELAYED_EFFECT as a serializable sidecar registration', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'CREATE_DELAYED_EFFECT',
      duration: { kind: 'THIS_TURN' },
      effect: {
        id: 'delayed:test',
        source: { objectRef: 'THIS_CARD', owner: 'PLAYER', controller: 'PLAYER', sourceZone: 'LEADER_AREA', effectIndex: 0 },
        category: 'AUTO',
        applicationMode: 'DELAYED',
        activationZones: ['NONE'],
        timing: { kind: 'STANDARD_TIMING', timing: 'END_OF_YOUR_TURN' },
        optionality: 'MANDATORY',
        resolution: { kind: 'NO_OP' },
        metadata: {
          sourceCardNumber: 'TEST-001',
          effectIndex: 0,
          printedText: 'At end of turn, do nothing.',
          authoringStatus: 'ASSIGNED',
        },
      },
    }, 'delayed-test');

    expect(result.delayedEffects?.[0]).toMatchObject({
      id: 'p1-leader:delayed:delayed:test:1:0',
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      duration: { kind: 'THIS_TURN' },
      timing: { kind: 'STANDARD_TIMING', timing: 'END_OF_YOUR_TURN' },
      status: 'PENDING',
    });
    expect(result.log[0]).toMatchObject({
      type: 'EFFECT_RESOLVED',
      data: { delayedEffectId: 'p1-leader:delayed:delayed:test:1:0' },
    });
  });

  it('executes deck-construction modifiers as serializable sidecar registrations', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'MODIFY_DECK_CONSTRUCTION',
      modifier: {
        scope: 'DECK_CONSTRUCTION',
        validFrom: 'DECK_REGISTRATION',
        modifier: { type: 'RULE_MODIFIER', scope: 'DECK_CONSTRUCTION', expression: { operation: 'ALLOW_EXTRA_COPIES', cardName: 'Test' } },
      },
    }, 'deck-rule-test');

    expect(result.permissionEffects?.[0]).toMatchObject({
      id: 'p1-leader:permission:MODIFY_DECK_CONSTRUCTION:1:0',
      kind: 'MODIFY_DECK_CONSTRUCTION',
      modifier: { scope: 'DECK_CONSTRUCTION', validFrom: 'DECK_REGISTRATION' },
      duration: { kind: 'PERMANENT' },
    });
  });

  it('executes TAKE_DAMAGE by moving top Life to hand one hit at a time', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      life: def('life'),
    };
    const withLife = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, lifeArea: { ...state.players.p1.lifeArea, cardIds: ['life-1', 'life-2'] } },
      },
      cardsById: {
        ...state.cardsById,
        'life-1': instance('life-1', 'life', 'p1', 'lifeArea'),
        'life-2': instance('life-2', 'life', 'p1', 'lifeArea'),
      },
    };
    const ctx = { state: withLife, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'TAKE_DAMAGE',
      targetPlayer: 'PLAYER',
      amount: { kind: 'NUMBER', value: 1 },
      lifeProcessing: 'CHECK_TRIGGER',
    }, 'damage-test');

    expect(result.state.players.p1.lifeArea.cardIds).toEqual(['life-2']);
    expect(result.state.players.p1.hand.cardIds).toEqual(['life-1']);
    expect(result.state.cardsById['life-1']).toMatchObject({
      currentZone: 'hand',
      faceState: 'faceUp',
      revealedTo: ['p1'],
    });
    expect(result.log[0]).toMatchObject({
      actorPlayerId: 'p1',
      type: 'DAMAGE_DEALT',
      causedByActionId: 'damage-test',
      data: { lifeCardInstanceId: 'life-1', processing: 'CHECK_TRIGGER', destination: 'HAND' },
      visibility: { visibleTo: ['p1'] },
    });
  });

  it('executes BANISH damage by moving top Life to trash', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      life: def('life'),
    };
    const withLife = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, lifeArea: { ...state.players.p1.lifeArea, cardIds: ['life-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'life-1': instance('life-1', 'life', 'p1', 'lifeArea'),
      },
    };
    const ctx = { state: withLife, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'TAKE_DAMAGE',
      targetPlayer: 'PLAYER',
      amount: { kind: 'NUMBER', value: 1 },
      lifeProcessing: 'BANISH',
    }, 'banish-damage-test');

    expect(result.state.players.p1.lifeArea.cardIds).toEqual([]);
    expect(result.state.players.p1.trash.cardIds).toEqual(['life-1']);
    expect(result.state.cardsById['life-1']).toMatchObject({
      currentZone: 'trash',
      faceState: 'faceUp',
      revealedTo: 'all',
    });
    expect(result.log[0]).toMatchObject({
      type: 'DAMAGE_DEALT',
      data: { processing: 'BANISH', destination: 'TRASH' },
      visibility: 'public',
    });
  });

  it('executes DEAL_DAMAGE as lethal when the target has no Life', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'DEAL_DAMAGE',
      source: { subject: 'CARD', relations: ['THIS_CARD'] },
      targetPlayer: 'OPPONENT',
      amount: { kind: 'NUMBER', value: 1 },
    }, 'lethal-damage-test');

    expect(result.state.gameOver).toEqual({ winnerId: 'p1', reason: 'lifeDamageAtZero' });
    expect(result.log[0]).toMatchObject({
      actorPlayerId: 'p1',
      type: 'GAME_OVER',
      data: { loserId: 'p2', winnerId: 'p1', reason: 'lifeDamageAtZero' },
    });
  });

  it('executes stat modifiers as serializable sidecar registrations', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const selector = { subject: 'CARD' as const, owner: 'PLAYER' as const, zones: ['HAND' as const] };
    const result = executeAction_V2(ctx, {
      type: 'MODIFY_COUNTER',
      selector,
      propertyLayer: 'CURRENT_VALUE',
      operation: 'ADD',
      value: { kind: 'NUMBER', value: 1000 },
      duration: { kind: 'THIS_TURN' },
    }, 'counter-mod-test');

    expect(result.statModifiers?.[0]).toMatchObject({
      id: 'p1-leader:stat:COUNTER:1:0',
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      stat: 'COUNTER',
      selector,
      propertyLayer: 'CURRENT_VALUE',
      operation: 'ADD',
      value: { kind: 'NUMBER', value: 1000 },
      duration: { kind: 'THIS_TURN' },
      status: 'ACTIVE',
    });
    expect(result.counterModifiers?.[0]).toEqual(result.statModifiers?.[0]);
    expect(result.log[0]).toMatchObject({
      type: 'EFFECT_RESOLVED',
      data: { statModifierId: 'p1-leader:stat:COUNTER:1:0', stat: 'COUNTER', operation: 'ADD' },
    });

    const power = executeAction_V2(ctx, {
      type: 'MODIFY_POWER',
      selector,
      propertyLayer: 'CURRENT_VALUE',
      operation: 'SUBTRACT',
      value: { kind: 'NUMBER', value: 2000 },
      duration: { kind: 'THIS_TURN' },
    }, 'power-mod-test');

    expect(power.statModifiers?.[0]).toMatchObject({
      id: 'p1-leader:stat:POWER:1:0',
      stat: 'POWER',
      operation: 'SUBTRACT',
      value: { kind: 'NUMBER', value: 2000 },
    });
  });

  it('executes SWAP_POWER as paired native V2 power SET sidecars', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      a: def('a', { basePower: 4000 }),
      b: def('b', { basePower: 7000 }),
    };
    const withCharacters = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, characterArea: { ...state.players.p1.characterArea, cardIds: ['char-a', 'char-b'] } },
      },
      cardsById: {
        ...state.cardsById,
        'char-a': { ...instance('char-a', 'a', 'p1', 'characterArea'), orientation: 'active' as const, currentPower: 4000 },
        'char-b': { ...instance('char-b', 'b', 'p1', 'characterArea'), orientation: 'active' as const, currentPower: 7000 },
      },
    };
    const ctx = {
      state: withCharacters,
      defs,
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      bindings: { selectedObjects: { SELECTED_PREVIOUSLY: ['char-a', 'char-b'] }, actionResults: {} },
    };
    const result = executeAction_V2(ctx, {
      type: 'SWAP_POWER',
      selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: { kind: 'ALL' } },
      propertyLayer: 'BASE_VALUE',
      duration: { kind: 'THIS_TURN' },
    }, 'swap-power-test');

    expect(result.statModifiers).toHaveLength(2);
    expect(result.statModifiers?.[0]).toMatchObject({
      id: 'p1-leader:stat:POWER:1:0',
      selector: { instanceIds: ['char-a'] },
      propertyLayer: 'BASE_VALUE',
      operation: 'SET',
      value: { kind: 'NUMBER', value: 7000 },
    });
    expect(result.statModifiers?.[1]).toMatchObject({
      id: 'p1-leader:stat:POWER:1:1',
      selector: { instanceIds: ['char-b'] },
      propertyLayer: 'BASE_VALUE',
      operation: 'SET',
      value: { kind: 'NUMBER', value: 4000 },
    });
    expect(result.bindings?.selectedObjects.SELECTED_PREVIOUSLY).toEqual(['char-a', 'char-b']);
    expect(result.log[0]).toMatchObject({
      type: 'EFFECT_RESOLVED',
      causedByActionId: 'swap-power-test',
      data: { action: 'SWAP_POWER', targetInstanceIds: ['char-a', 'char-b'], propertyLayer: 'BASE_VALUE' },
    });
  });

  it('executes CHANGE_ATTACK_TARGET by updating the current battle target', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      attacker: def('attacker', { basePower: 5000 }),
      blocker: def('blocker', { basePower: 3000 }),
    };
    const withBattle = {
      ...state,
      currentBattle: {
        attackerInstanceId: 'opp-attacker',
        targetInstanceId: state.players.p1.leaderInstanceId,
        originalTargetInstanceId: state.players.p1.leaderInstanceId,
        step: 'block' as const,
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...state.players,
        p1: { ...state.players.p1, characterArea: { ...state.players.p1.characterArea, cardIds: ['new-target'] } },
        p2: { ...state.players.p2, characterArea: { ...state.players.p2.characterArea, cardIds: ['opp-attacker'] } },
      },
      cardsById: {
        ...state.cardsById,
        'new-target': { ...instance('new-target', 'blocker', 'p1', 'characterArea'), orientation: 'rested' as const, currentPower: 3000 },
        'opp-attacker': { ...instance('opp-attacker', 'attacker', 'p2', 'characterArea'), orientation: 'rested' as const, currentPower: 5000 },
      },
    };
    const ctx = {
      state: withBattle,
      defs,
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      bindings: { selectedObjects: { SELECTED_PREVIOUSLY: ['new-target'] }, actionResults: {} },
    };
    const result = executeAction_V2(ctx, {
      type: 'CHANGE_ATTACK_TARGET',
      newTarget: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } } },
    }, 'change-attack-target-test');

    expect(result.state.currentBattle?.targetInstanceId).toBe('new-target');
    expect(result.state.currentBattle?.originalTargetInstanceId).toBe(state.players.p1.leaderInstanceId);
    expect(result.log[0]).toMatchObject({
      type: 'EFFECT_RESOLVED',
      causedByActionId: 'change-attack-target-test',
      data: {
        action: 'CHANGE_ATTACK_TARGET',
        newTargetInstanceId: 'new-target',
        previousTargetInstanceId: state.players.p1.leaderInstanceId,
      },
    });
  });

  it('executes ACTIVATE_EVENT as a serializable native V2 activation record', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      event: def('event', { category: 'event', basePower: undefined, attributes: undefined, baseCost: 1, cardNumber: 'TEST-EVENT' }),
    };
    const withEvent = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, hand: { ...state.players.p1.hand, cardIds: ['event-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'event-1': instance('event-1', 'event', 'p1', 'hand'),
      },
    };
    const ctx = { state: withEvent, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const result = executeAction_V2(ctx, {
      type: 'ACTIVATE_EVENT',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'], cardCategories: ['EVENT'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } } },
      player: 'PLAYER',
    }, 'activate-event-test');

    expect(result.activatedEvents?.[0]).toMatchObject({
      id: 'p1-leader:activate-event:event-1:1:0',
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      eventInstanceId: 'event-1',
      eventCardNumber: 'TEST-EVENT',
      timing: { kind: 'STANDARD_TIMING', timing: 'EVENT_MAIN' },
      status: 'PENDING',
    });
    expect(result.bindings?.selectedObjects.SELECTED_PREVIOUSLY).toEqual(['event-1']);
    expect(result.log[0]).toMatchObject({
      type: 'EFFECT_RESOLVED',
      data: { action: 'ACTIVATE_EVENT', eventInstanceIds: ['event-1'] },
    });
  });

  it('executes keyword modifiers as serializable sidecar registrations', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };
    const selector = { subject: 'CARD' as const, relations: ['THIS_CARD'] };

    const result = executeAction_V2(ctx, {
      type: 'GRANT_KEYWORD',
      selector,
      keyword: 'DOUBLE_ATTACK',
      duration: { kind: 'THIS_TURN' },
    }, 'keyword-mod-test');

    expect(result.keywordModifiers?.[0]).toMatchObject({
      id: 'p1-leader:keyword:DOUBLE_ATTACK:1:0',
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      selector,
      operation: 'GRANT_KEYWORD',
      keyword: 'DOUBLE_ATTACK',
      duration: { kind: 'THIS_TURN' },
      status: 'ACTIVE',
    });
    expect(result.log[0]).toMatchObject({
      type: 'EFFECT_RESOLVED',
      data: { keywordModifierId: 'p1-leader:keyword:DOUBLE_ATTACK:1:0', operation: 'GRANT_KEYWORD', keyword: 'DOUBLE_ATTACK' },
    });
  });

  it('executes effect invalidation as a serializable sidecar registration with selection bindings', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      target: def('target'),
    };
    const withTarget = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players.p2, characterArea: { ...state.players.p2.characterArea, cardIds: ['opp-char'] } },
      },
      cardsById: {
        ...state.cardsById,
        'opp-char': { ...instance('opp-char', 'target', 'p2', 'characterArea'), orientation: 'active' as const },
      },
    };
    const ctx = { state: withTarget, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeAction_V2(ctx, {
      type: 'INVALIDATE_EFFECTS',
      selector: {
        subject: 'CARD',
        controller: 'OPPONENT',
        zones: ['CHARACTER_AREA'],
        cardCategories: ['CHARACTER'],
        quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
      },
      effectFilter: 'ALL_EFFECTS',
      duration: { kind: 'THIS_TURN' },
    }, 'invalidate-test');

    expect(result.effectInvalidations?.[0]).toMatchObject({
      id: 'p1-leader:effect-status:INVALIDATE_EFFECTS:1:0',
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      selectedInstanceIds: ['opp-char'],
      effectFilter: 'ALL_EFFECTS',
      operation: 'INVALIDATE_EFFECTS',
      duration: { kind: 'THIS_TURN' },
      status: 'ACTIVE',
    });
    expect(result.bindings?.selectedObjects.SELECTED_PREVIOUSLY).toEqual(['opp-char']);
    expect(result.log[0]).toMatchObject({
      type: 'EFFECT_RESOLVED',
      data: {
        effectInvalidationId: 'p1-leader:effect-status:INVALIDATE_EFFECTS:1:0',
        operation: 'INVALIDATE_EFFECTS',
      },
    });
    expect(isEffectInvalidated_V2({
      sourceInstanceId: 'opp-char',
      sourceOwnerId: 'p2',
      controllerId: 'p2',
      category: 'AUTO',
      timing: 'ON_PLAY',
    }, result.effectInvalidations ?? [])).toBe(true);
  });

  it('executes effect-scope invalidation records for matching timing filters', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
    };
    const ctx = { state, defs, sourceInstanceId: 'p1-leader', controllerId: 'p1' };

    const result = executeAction_V2(ctx, {
      type: 'INVALIDATE_EFFECTS',
      selector: { subject: 'EFFECT', controller: 'PLAYER', quantity: { kind: 'ALL' } },
      effectFilter: { kind: 'MATCHING_EFFECT', timing: 'ON_PLAY', rawText: '[On Play]' },
      duration: { kind: 'WHILE_SOURCE_VALID' },
    }, 'effect-scope-invalidate-test');

    expect(result.effectInvalidations?.[0]).toMatchObject({
      id: 'p1-leader:effect-status:INVALIDATE_EFFECTS:1:0',
      selector: { subject: 'EFFECT', controller: 'PLAYER', quantity: { kind: 'ALL' } },
      selectedInstanceIds: [],
      effectFilter: { kind: 'MATCHING_EFFECT', timing: 'ON_PLAY' },
      duration: { kind: 'WHILE_SOURCE_VALID' },
    });
    expect(result.bindings?.selectedObjects.SELECTED_PREVIOUSLY).toEqual([]);
    expect(isEffectInvalidated_V2({
      sourceInstanceId: 'p1-char',
      sourceOwnerId: 'p1',
      controllerId: 'p1',
      sourceZone: 'CHARACTER_AREA',
      category: 'AUTO',
      timing: 'ON_PLAY',
    }, result.effectInvalidations ?? [])).toBe(true);
    expect(isEffectInvalidated_V2({
      sourceInstanceId: 'p1-char',
      sourceOwnerId: 'p1',
      controllerId: 'p1',
      sourceZone: 'CHARACTER_AREA',
      category: 'AUTO',
      timing: 'WHEN_ATTACKING',
    }, result.effectInvalidations ?? [])).toBe(false);
    expect(isEffectInvalidated_V2({
      sourceInstanceId: 'p2-char',
      sourceOwnerId: 'p2',
      controllerId: 'p2',
      sourceZone: 'CHARACTER_AREA',
      category: 'AUTO',
      timing: 'ON_PLAY',
    }, result.effectInvalidations ?? [])).toBe(false);
  });
});
