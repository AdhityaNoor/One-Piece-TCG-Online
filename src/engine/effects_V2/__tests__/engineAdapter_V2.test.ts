import { describe, expect, it } from 'vitest';
import type { EffectDefinition_V2, ResolutionNode_V2, StandardTiming_V2 } from '../../../cards/effectCompiler_V2/types_V2';
import type { EffectGate_V2 } from '../../../cards/effectCompiler_V2/effectIr_V2';
import type { CardDefinition, CardInstance } from '../../state/card';
import type { CardDefinitionLookup } from '../../rules/shared';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { GameLogEntry } from '../../logs/logEntry';
import type { EffectRuntimeBundle_V2 } from '../runtime_V2';
import { applyV2EffectsForAction, executeV2ActionOverride, validateActivateCardEffect_V2 } from '../engineAdapter_V2';

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
  timing: StandardTiming_V2,
  resolution: ResolutionNode_V2 = { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
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

function runtime(effects: EffectDefinition_V2[], gatesByAbilityId: Record<string, EffectGate_V2[]> = {}, cardNumber = 'TEST-LEADER'): EffectRuntimeBundle_V2 {
  return {
    programsByCardNumber: {
      [cardNumber]: {
        schemaVersion: 'op-tcg-effect-v2.0.0',
        cardNumber,
        canonicalEffects: effects,
        abilities: effects.map((candidate) => ({
          abilityId: candidate.id,
          timing: candidate.timing ?? { kind: 'STANDARD_TIMING', timing: 'ON_ENTER_PLAY' },
          gates: gatesByAbilityId[candidate.id],
          activationCost: candidate.activationCost,
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
    },
  };
}

function logEntry(patch: Partial<GameLogEntry>): GameLogEntry {
  return {
    id: 'log-1',
    sequence: 1,
    turnNumber: 1,
    phase: 'main',
    actorPlayerId: 'p1',
    type: 'CARD_PLAYED',
    message: 'played',
    data: {},
    relatedCardInstanceIds: [],
    visibility: 'public',
    causedByActionId: 'action-1',
    ...patch,
  };
}

function instance(id: string, ownerId: string, currentZone: CardInstance['currentZone'], patch: Partial<CardInstance> = {}): CardInstance {
  return {
    instanceId: id,
    cardDefinitionId: 'TEST-LEADER',
    ownerId,
    controllerId: ownerId,
    currentZone,
    orientation: currentZone === 'leaderArea' || currentZone === 'characterArea' ? 'active' : null,
    faceState: currentZone === 'deck' ? 'faceDown' : 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: currentZone === 'deck' ? [] : 'all',
    ...patch,
  };
}

function defs(): CardDefinitionLookup {
  return {
    'OP01-001': def('OP01-001'),
    'TEST-LEADER': def('TEST-LEADER'),
  };
}

describe('V2 engine adapter', () => {
  it('rejects activate-main when native V2 gates fail even if the ability has no activation cost', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const state = {
      ...base,
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: {
          ...base.cardsById[sourceInstanceId],
          cardDefinitionId: 'TEST-LEADER',
        },
      },
    };
    const cardDefs = defs();
    const reasons = validateActivateCardEffect_V2(
      state,
      {
        type: 'ACTIVATE_CARD_EFFECT',
        actionId: 'action-1',
        playerId: 'p1',
        sourceInstanceId,
        effectId: 'TEST-LEADER#activate',
        donInstanceIds: [],
      },
      cardDefs,
      runtime([effect('TEST-LEADER#activate', 'ACTIVATE_MAIN')], {
        'TEST-LEADER#activate': [{ kind: 'CANONICAL_GATE_REF', gate: 'SELF_HAND', params: { atLeast: 1 } }],
      }),
    );

    expect(reasons).toContain('V2 ability gates are not satisfied.');
  });

  it('routes CARD_PLAYED logs through native ON_ENTER_PLAY and ON_PLAY V2 timings', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const deckCardId = 'p1-deck-1';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          deck: { ...base.players.p1.deck, cardIds: [deckCardId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: {
          ...base.cardsById[sourceInstanceId],
          cardDefinitionId: 'TEST-LEADER',
        },
        [deckCardId]: {
          instanceId: deckCardId,
          cardDefinitionId: 'TEST-LEADER',
          ownerId: 'p1',
          controllerId: 'p1',
          currentZone: 'deck',
          orientation: null,
          faceState: 'faceDown',
          donAttached: [],
          appliedContinuousEffectIds: [],
          oncePerTurnUsed: [],
          summoningSick: false,
          revealedTo: [],
        },
      },
    };
    const cardDefs = defs();

    const result = applyV2EffectsForAction({
      state,
      defs: cardDefs,
      runtime: runtime([
        effect('TEST-LEADER#enter', 'ON_ENTER_PLAY', { kind: 'NO_OP' }),
        effect('TEST-LEADER#play', 'ON_PLAY'),
      ]),
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'action-1', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(result.log.some((entry) => entry.type === 'CARD_DRAWN')).toBe(true);
    expect(result.state.players.p1.hand.cardIds).toEqual([deckCardId]);
    expect(result.sidecars).toMatchObject({ delayedEffects: [], effectInvalidations: [], replacementEffects: [] });
  });

  it('handles V2-only activate-main overrides without falling through to the V1 action executor', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1, deck: { ...base.players.p1.deck, cardIds: ['p1-override-draw'] } },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        'p1-override-draw': instance('p1-override-draw', 'p1', 'deck'),
      },
    };

    const result = executeV2ActionOverride({
      state,
      defs: defs(),
      runtime: runtime([effect('TEST-LEADER#activate', 'ACTIVATE_MAIN')]),
      sidecars: null,
      action: {
        type: 'ACTIVATE_CARD_EFFECT',
        actionId: 'activate-1',
        playerId: 'p1',
        sourceInstanceId,
        effectId: 'TEST-LEADER#activate',
        donInstanceIds: [],
      },
    });

    expect(result.handled).toBe(true);
    expect(result.ok, result.handled && !result.ok ? result.reasons.join('; ') : '').toBe(true);
    if (result.handled && result.ok) {
      expect(result.state.players.p1.hand.cardIds).toEqual(['p1-override-draw']);
      expect(result.log.some((entry) => entry.type === 'CARD_DRAWN')).toBe(true);
    }
  });

  it('pays activate-main REST_DON_COST plus rest-this-card cost natively', () => {
    const base = createSampleGameState();
    const sourceInstanceId = 'p1-op09-095';
    const donId = 'p1-don-1';
    const deckCardId = 'p1-draw-1';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          characterArea: { ...base.players.p1.characterArea, cardIds: [sourceInstanceId] },
          costArea: { ...base.players.p1.costArea, cardIds: [donId] },
          deck: { ...base.players.p1.deck, cardIds: [deckCardId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: instance(sourceInstanceId, 'p1', 'characterArea', { cardDefinitionId: 'TEST-CHARACTER' }),
        [donId]: instance(donId, 'p1', 'costArea', { cardDefinitionId: 'DON-001', donRested: false, faceState: 'faceUp', revealedTo: 'all' }),
        [deckCardId]: instance(deckCardId, 'p1', 'deck', { cardDefinitionId: 'TEST-CHARACTER' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-CHARACTER': def('TEST-CHARACTER', { category: 'character', baseCost: 4, life: undefined }),
      'DON-001': def('DON-001', { category: 'don', baseCost: undefined, basePower: undefined, life: undefined }),
    };
    const activate = {
      ...effect('TEST-CHARACTER#activate', 'ACTIVATE_MAIN'),
      activationCost: {
        payments: [
          { type: 'REST_DON_COST' as const, count: { kind: 'NUMBER' as const, value: 1 } },
          {
            type: 'REST_CARD_COST' as const,
            selector: {
              subject: 'CARD' as const,
              relations: ['THIS_CARD' as const],
              quantity: { kind: 'EXACTLY' as const, value: { kind: 'NUMBER' as const, value: 1 } },
              chooser: 'EFFECT_OWNER' as const,
            },
          },
        ],
        optionalPayment: 'REQUIRED_TO_ACTIVATE' as const,
        executionPolicy: 'VERIFY_ALL_THEN_PAY_IN_ORDER' as const,
      },
    };

    const result = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: runtime([activate], {}, 'TEST-CHARACTER'),
      sidecars: null,
      action: {
        type: 'ACTIVATE_CARD_EFFECT',
        actionId: 'activate-op09-095',
        playerId: 'p1',
        sourceInstanceId,
        effectId: 'TEST-CHARACTER#activate',
        donInstanceIds: [donId],
      },
    });

    expect(result.handled).toBe(true);
    expect(result.ok, result.handled && !result.ok ? result.reasons.join('; ') : '').toBe(true);
    if (result.handled && result.ok) {
      expect(result.state.cardsById[donId].donRested).toBe(true);
      expect(result.state.cardsById[sourceInstanceId].orientation).toBe('rested');
      expect(result.state.players.p1.hand.cardIds).toEqual([deckCardId]);
    }
  });

  it('prompts and resumes automatic ON_PLAY DON-minus costs through V2 pending choices', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const donId = 'p1-don-1';
    const drawId = 'p1-paid-draw';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          costArea: { ...base.players.p1.costArea, cardIds: [donId] },
          deck: { ...base.players.p1.deck, cardIds: [drawId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [donId]: instance(donId, 'p1', 'costArea', { cardDefinitionId: 'DON-001', donRested: false, faceState: 'faceUp', revealedTo: 'all' }),
        [drawId]: instance(drawId, 'p1', 'deck'),
      },
    };
    const cardDefs = { ...defs(), 'DON-001': def('DON-001', { category: 'don', baseCost: undefined, basePower: undefined, life: undefined }) };
    const bundle = runtime([effect('TEST-LEADER#paid-onplay', 'ON_PLAY')]);
    bundle.programsByCardNumber['TEST-LEADER'].abilities[0].activationCost = {
      payments: [{ type: 'DON_MINUS_COST', count: { kind: 'NUMBER', value: 1 }, selectableZones: ['COST_AREA'] }],
    };

    const prompted = applyV2EffectsForAction({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'played-1', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(prompted.state.players.p1.hand.cardIds).toEqual([]);
    expect(prompted.state.pendingChoices).toHaveLength(1);
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      playerId: 'p1',
      sourceEffectId: 'v2:activationCost',
      constraints: { min: 1, max: 1, candidateInstanceIds: [donId] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'pay-1',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [donId],
      },
    });

    expect(resolved.handled).toBe(true);
    expect(resolved.ok).toBe(true);
    if (resolved.handled && resolved.ok) {
      expect(resolved.state.pendingChoices).toEqual([]);
      expect(resolved.state.players.p1.hand.cardIds).toEqual([drawId]);
      expect(resolved.state.players.p1.costArea.cardIds).toEqual([]);
      expect(resolved.state.players.p1.donDeck.cardIds).toEqual([donId]);
    }
  });

  it('prompts and resumes V2 On Play search selection before processing the remainder', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const wantedId = 'deck-wanted';
    const otherId = 'deck-other';
    const thirdId = 'deck-third';
    const tailId = 'deck-tail';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          deck: { ...base.players.p1.deck, cardIds: [wantedId, otherId, thirdId, tailId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [wantedId]: instance(wantedId, 'p1', 'deck', { cardDefinitionId: 'SEARCH-WANTED' }),
        [otherId]: instance(otherId, 'p1', 'deck', { cardDefinitionId: 'SEARCH-OTHER' }),
        [thirdId]: instance(thirdId, 'p1', 'deck', { cardDefinitionId: 'SEARCH-THIRD' }),
        [tailId]: instance(tailId, 'p1', 'deck', { cardDefinitionId: 'SEARCH-TAIL' }),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      'SEARCH-WANTED': def('SEARCH-WANTED', { category: 'character', types: ['Straw Hat Crew'], baseCost: 1 }),
      'SEARCH-OTHER': def('SEARCH-OTHER', { category: 'character', types: ['Animal'], baseCost: 1 }),
      'SEARCH-THIRD': def('SEARCH-THIRD', { category: 'character', types: ['Animal'], baseCost: 1 }),
      'SEARCH-TAIL': def('SEARCH-TAIL', { category: 'character', types: ['Animal'], baseCost: 1 }),
    };
    const bundle = runtime([
      effect('TEST-LEADER#search', 'ON_PLAY', {
        kind: 'SEQUENCE',
        nodes: [
          {
            kind: 'ACTION',
            action: {
              type: 'LOOK_AT_CARDS',
              player: 'PLAYER',
              source: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 3 } }, ordering: 'DECK_ORDER' },
              count: { kind: 'NUMBER', value: 3 },
            },
          },
          {
            kind: 'ACTION',
            action: {
              type: 'MOVE_CARD',
              selector: {
                subject: 'ACTION_RESULT',
                relations: ['SELECTED_PREVIOUSLY'],
                types: { kind: 'HAS_ANY_TYPE', values: ['Straw Hat Crew'] },
                quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
              },
              to: { zone: 'HAND', owner: 'PLAYER' },
              cause: 'EFFECT',
            },
          },
          {
            kind: 'ACTION',
            action: {
              type: 'REORDER_CARDS',
              selector: { subject: 'ACTION_RESULT', relations: ['REMAINDER_OF_PREVIOUS_SELECTION'], quantity: { kind: 'ANY_NUMBER' } },
              destination: { zone: 'DECK', owner: 'PLAYER', position: 'BOTTOM' },
              orderChooser: 'PLAYER',
            },
          },
        ],
      }),
    ]);

    const prompted = applyV2EffectsForAction({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'search-played', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(prompted.state.players.p1.hand.cardIds).toEqual([]);
    expect(prompted.state.pendingChoices).toHaveLength(1);
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectMoveToHand',
      constraints: { min: 0, max: 1, candidateInstanceIds: [wantedId], visibleInstanceIds: [wantedId, otherId, thirdId] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'search-pick',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [wantedId],
      },
    });

    expect(resolved.handled).toBe(true);
    expect(resolved.ok).toBe(true);
    if (resolved.handled && resolved.ok) {
      expect(resolved.state.players.p1.hand.cardIds).toEqual([wantedId]);
      expect(resolved.state.pendingChoices).toHaveLength(1);
      expect(resolved.state.pendingChoices[0]).toMatchObject({
        sourceEffectId: 'v2:reorderCards',
        constraints: { candidateInstanceIds: [otherId, thirdId] },
      });
      const reordered = executeV2ActionOverride({
        state: resolved.state,
        defs: cardDefs,
        runtime: bundle,
        sidecars: resolved.sidecars,
        action: {
          type: 'RESOLVE_PENDING_CHOICE',
          actionId: 'search-order',
          playerId: 'p1',
          choiceId: resolved.state.pendingChoices[0].id,
          response: [thirdId, otherId],
        },
      });
      expect(reordered.handled).toBe(true);
      expect(reordered.ok).toBe(true);
      if (reordered.handled && reordered.ok) {
        expect(reordered.state.pendingChoices).toEqual([]);
        expect(reordered.state.players.p1.deck.cardIds).toEqual([tailId, thirdId, otherId]);
      }
    }
  });

  it('prompts and resumes V2 modal choose options', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const drawId = 'choice-draw';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1, deck: { ...base.players.p1.deck, cardIds: [drawId] } },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [drawId]: instance(drawId, 'p1', 'deck'),
      },
    };
    const bundle = runtime([
      effect('TEST-LEADER#choose', 'ON_PLAY', {
        kind: 'SEQUENCE',
        nodes: [{
          kind: 'CHOOSE',
          chooser: 'PLAYER',
          minimumChoices: 1,
          maximumChoices: 1,
          options: [
            { kind: 'NO_OP' },
            { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
          ],
        }],
      }),
    ]);

    const prompted = applyV2EffectsForAction({
      state,
      defs: defs(),
      runtime: bundle,
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'choose-played', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(prompted.state.pendingChoices).toHaveLength(1);
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:chooseOption',
      kind: 'SELECT_OPTION',
      constraints: { options: [{ label: 'Option 1' }, { label: 'Option 2' }] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: defs(),
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'choose-resolve',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: 1,
      },
    });

    expect(resolved.handled).toBe(true);
    expect(resolved.ok).toBe(true);
    if (resolved.handled && resolved.ok) {
      expect(resolved.state.pendingChoices).toEqual([]);
      expect(resolved.state.players.p1.hand.cardIds).toEqual([drawId]);
    }
  });

  it('prompts and resumes V2 search-to-play selections', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const playableId = 'deck-playable';
    const otherId = 'deck-nonplayable';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1, deck: { ...base.players.p1.deck, cardIds: [playableId, otherId] } },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [playableId]: instance(playableId, 'p1', 'deck', { cardDefinitionId: 'PLAYABLE-CHAR' }),
        [otherId]: instance(otherId, 'p1', 'deck', { cardDefinitionId: 'OTHER-CHAR' }),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      'PLAYABLE-CHAR': def('PLAYABLE-CHAR', { category: 'character', types: ['Zou'], baseCost: 2, basePower: 3000 }),
      'OTHER-CHAR': def('OTHER-CHAR', { category: 'character', types: ['Animal'], baseCost: 2, basePower: 3000 }),
    };
    const bundle = runtime([
      effect('TEST-LEADER#search-play', 'ON_PLAY', {
        kind: 'SEQUENCE',
        nodes: [
          {
            kind: 'ACTION',
            action: {
              type: 'LOOK_AT_CARDS',
              player: 'PLAYER',
              source: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 2 } }, ordering: 'DECK_ORDER' },
              count: { kind: 'NUMBER', value: 2 },
            },
          },
          {
            kind: 'ACTION',
            action: {
              type: 'PLAY_CARD',
              player: 'PLAYER',
              selector: {
                subject: 'ACTION_RESULT',
                relations: ['SELECTED_PREVIOUSLY'],
                types: { kind: 'HAS_ANY_TYPE', values: ['Zou'] },
                cardCategories: ['CHARACTER'],
                quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
              },
            },
          },
        ],
      }),
    ]);

    const prompted = applyV2EffectsForAction({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'play-search', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(prompted.state.pendingChoices).toHaveLength(1);
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectPlayCard',
      constraints: { candidateInstanceIds: [playableId], visibleInstanceIds: [playableId, otherId] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'play-search-pick',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [playableId],
      },
    });

    expect(resolved.handled).toBe(true);
    expect(resolved.ok).toBe(true);
    if (resolved.handled && resolved.ok) {
      expect(resolved.state.pendingChoices).toEqual([]);
      expect(resolved.state.players.p1.deck.cardIds).toEqual([otherId]);
      expect(resolved.state.players.p1.characterArea.cardIds).toHaveLength(1);
      const playedId = resolved.state.players.p1.characterArea.cardIds[0];
      expect(resolved.state.cardsById[playedId].cardDefinitionId).toBe('PLAYABLE-CHAR');
    }
  });

  it('routes attack and blocker actions through native combat timings', () => {
    const base = createSampleGameState();
    const p1Leader = base.players.p1.leaderInstanceId;
    const p2Leader = base.players.p2.leaderInstanceId;
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1, deck: { ...base.players.p1.deck, cardIds: ['p1-draw'] } },
        p2: { ...base.players.p2, deck: { ...base.players.p2.deck, cardIds: ['p2-draw'] } },
      },
      cardsById: {
        ...base.cardsById,
        [p1Leader]: { ...base.cardsById[p1Leader], cardDefinitionId: 'TEST-LEADER' },
        [p2Leader]: { ...base.cardsById[p2Leader], cardDefinitionId: 'TEST-LEADER' },
        'p1-draw': instance('p1-draw', 'p1', 'deck'),
        'p2-draw': instance('p2-draw', 'p2', 'deck'),
      },
    };
    const bundle = runtime([
      effect('TEST-LEADER#attack', 'WHEN_ATTACKING'),
      effect('TEST-LEADER#block', 'ON_BLOCK'),
    ]);

    const attack = applyV2EffectsForAction({
      state,
      defs: defs(),
      runtime: bundle,
      sidecars: null,
      action: { type: 'DECLARE_ATTACK', actionId: 'attack-1', playerId: 'p1', attackerInstanceId: p1Leader, targetInstanceId: p2Leader },
      log: [],
    });
    const block = applyV2EffectsForAction({
      state: attack.state,
      defs: defs(),
      runtime: bundle,
      sidecars: attack.sidecars,
      action: { type: 'ACTIVATE_BLOCKER', actionId: 'block-1', playerId: 'p2', blockerInstanceId: p2Leader },
      log: [],
    });

    expect(attack.state.players.p1.hand.cardIds).toEqual(['p1-draw']);
    expect(block.state.players.p2.hand.cardIds).toEqual(['p2-draw']);
  });

  it('routes trigger choices through native TRIGGER timing only when the trigger source is selected', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1, deck: { ...base.players.p1.deck, cardIds: ['p1-trigger-draw'] } },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        'p1-trigger-draw': instance('p1-trigger-draw', 'p1', 'deck'),
      },
      pendingChoices: [{
        id: 'trigger-choice',
        playerId: 'p1',
        kind: 'SELECT_CARDS',
        prompt: 'trigger',
        constraints: { min: 0, max: 1, candidateInstanceIds: [sourceInstanceId] },
        sourceInstanceId,
        sourceEffectId: 'trigger',
      }],
    };

    const result = applyV2EffectsForAction({
      previousState: state,
      state,
      defs: defs(),
      runtime: runtime([effect('TEST-LEADER#trigger', 'TRIGGER')]),
      sidecars: null,
      action: { type: 'RESOLVE_PENDING_CHOICE', actionId: 'choice-1', playerId: 'p1', choiceId: 'trigger-choice', response: [sourceInstanceId] },
      log: [],
    });

    expect(result.state.players.p1.hand.cardIds).toEqual(['p1-trigger-draw']);
  });

  it('routes end-main through owner and opponent end-turn V2 timings', () => {
    const base = createSampleGameState();
    const p1Leader = base.players.p1.leaderInstanceId;
    const p2Leader = base.players.p2.leaderInstanceId;
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1, deck: { ...base.players.p1.deck, cardIds: ['p1-end-draw'] } },
        p2: { ...base.players.p2, deck: { ...base.players.p2.deck, cardIds: ['p2-end-draw'] } },
      },
      cardsById: {
        ...base.cardsById,
        [p1Leader]: { ...base.cardsById[p1Leader], cardDefinitionId: 'TEST-LEADER' },
        [p2Leader]: { ...base.cardsById[p2Leader], cardDefinitionId: 'TEST-LEADER' },
        'p1-end-draw': instance('p1-end-draw', 'p1', 'deck'),
        'p2-end-draw': instance('p2-end-draw', 'p2', 'deck'),
      },
    };

    const result = applyV2EffectsForAction({
      previousState: state,
      state,
      defs: defs(),
      runtime: runtime([
        effect('TEST-LEADER#your-end', 'END_OF_YOUR_TURN'),
        effect('TEST-LEADER#opp-end', 'END_OF_OPPONENT_TURN'),
      ]),
      sidecars: null,
      action: { type: 'END_MAIN_PHASE', actionId: 'end-1', playerId: 'p1' },
      log: [],
    });

    expect(result.state.players.p1.hand.cardIds).toEqual(['p1-end-draw']);
    expect(result.state.players.p2.hand.cardIds).toEqual(['p2-end-draw']);
  });

  it('routes character trash diffs through native ON_KO timing', () => {
    const base = createSampleGameState();
    const koSource = 'ko-source';
    const before = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          characterArea: { ...base.players.p1.characterArea, cardIds: [koSource] },
          deck: { ...base.players.p1.deck, cardIds: ['p1-ko-draw'] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [koSource]: instance(koSource, 'p1', 'characterArea'),
        'p1-ko-draw': instance('p1-ko-draw', 'p1', 'deck'),
      },
    };
    const after = {
      ...before,
      players: {
        ...before.players,
        p1: {
          ...before.players.p1,
          characterArea: { ...before.players.p1.characterArea, cardIds: [] },
          trash: { ...before.players.p1.trash, cardIds: [koSource] },
        },
      },
      cardsById: {
        ...before.cardsById,
        [koSource]: { ...before.cardsById[koSource], currentZone: 'trash' as const },
      },
    };

    const result = applyV2EffectsForAction({
      previousState: before,
      state: after,
      defs: defs(),
      runtime: runtime([effect('TEST-LEADER#ko', 'ON_KO')]),
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'ko-1', playerId: 'p1' },
      log: [],
    });

    expect(result.state.players.p1.hand.cardIds).toEqual(['p1-ko-draw']);
  });
});
