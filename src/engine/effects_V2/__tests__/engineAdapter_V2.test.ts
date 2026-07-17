import { describe, expect, it } from 'vitest';
import type { EffectDefinition_V2, ResolutionNode_V2, StandardTiming_V2 } from '../../../cards/effectCompiler_V2/types_V2';
import type { EffectGate_V2 } from '../../../cards/effectCompiler_V2/effectIr_V2';
import type { CardDefinition, CardInstance } from '../../state/card';
import type { GameState } from '../../state/game';
import type { CardDefinitionLookup } from '../../rules/shared';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { GameLogEntry } from '../../logs/logEntry';
import type { EffectRuntimeBundle_V2 } from '../runtime_V2';
import { applyV2EffectsForAction, executeV2ActionOverride, validateActivateCardEffect_V2 } from '../engineAdapter_V2';
import { createEmptyEffectRuntimeSidecars_V2 } from '../dispatcher_V2';
import { executeResolutionNode_V2 } from '../resolution_V2';

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
  it('processes V2 start-of-game setup modifiers during going-first setup', () => {
    const base = createSampleGameState();
    const maryId = 'mary-deck';
    const fillerIds = ['filler-1', 'filler-2', 'filler-3', 'filler-4', 'filler-5', 'filler-6'];
    const state: GameState = {
      ...base,
      currentPhase: 'setup',
      setupState: {
        decidingPlayerId: 'p1',
        stage: 'awaitingGoingFirstChoice',
      },
      pendingChoices: [{
        id: 'p1__choose-going-first',
        playerId: 'p1',
        kind: 'YES_NO',
        prompt: 'Going first?',
        constraints: { min: 1, max: 1 },
        sourceInstanceId: null,
        sourceEffectId: 'rule:chooseGoingFirst',
      }],
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          deck: { ...base.players.p1.deck, cardIds: [maryId, ...fillerIds] },
          hand: { ...base.players.p1.hand, cardIds: [] },
          stageArea: { ...base.players.p1.stageArea, cardIds: [] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [base.players.p1.leaderInstanceId]: {
          ...base.cardsById[base.players.p1.leaderInstanceId],
          cardDefinitionId: 'TEST-LEADER',
        },
        [maryId]: instance(maryId, 'p1', 'deck', { cardDefinitionId: 'MARY' }),
        ...Object.fromEntries(fillerIds.map((id) => [id, instance(id, 'p1', 'deck', { cardDefinitionId: 'FILLER' })])),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      MARY: def('MARY', { name: 'Mary Geoise', category: 'stage', types: ['Mary Geoise'], baseCost: 1, basePower: undefined, life: undefined }),
      FILLER: def('FILLER', { name: 'Filler', category: 'character', baseCost: 1, basePower: 1000, life: undefined }),
    };
    const setupRuntime = runtime([effect('TEST-LEADER#setup', 'ON_ENTER_PLAY', {
      kind: 'ACTION',
      action: {
        type: 'MODIFY_STARTING_SETUP',
        modifier: {
          scope: 'GAME_SETUP',
          validFrom: 'GAME_START',
          modifier: {
            type: 'RULE_MODIFIER',
            scope: 'GAME_SETUP',
            expression: {
              operation: 'PLAY_FROM_DECK_AT_GAME_START',
              selector: {
                subject: 'CARD',
                owner: 'PLAYER',
                zones: ['DECK'],
                cardCategories: ['STAGE'],
                types: { kind: 'HAS_ANY_TYPE', values: ['Mary Geoise'] },
                quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
                chooser: 'EFFECT_OWNER',
              },
            },
          },
        },
      },
    })]);

    const choseFirst = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: setupRuntime,
      sidecars: null,
      action: { type: 'CHOOSE_GOING_FIRST', actionId: 'choose-first', playerId: 'p1', goingFirst: true },
    });

    expect(choseFirst).toMatchObject({ handled: true, ok: true });
    if (!choseFirst.handled || !choseFirst.ok) throw new Error('expected V2 choose-going-first to succeed');
    expect(choseFirst.state.setupState).toMatchObject({ stage: 'awaitingStartOfGameLeaderEffect', startOfGameEffectQueue: ['p2'] });
    expect(choseFirst.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectPlayCard',
      constraints: { candidateInstanceIds: [maryId] },
    });

    const resolved = executeV2ActionOverride({
      state: choseFirst.state,
      defs: cardDefs,
      runtime: setupRuntime,
      sidecars: choseFirst.sidecars,
      action: { type: 'RESOLVE_PENDING_CHOICE', actionId: 'choose-mary', playerId: 'p1', choiceId: choseFirst.state.pendingChoices[0].id, response: [maryId] },
    });

    expect(resolved).toMatchObject({ handled: true, ok: true });
    if (!resolved.handled || !resolved.ok) throw new Error('expected V2 setup play choice to resolve');
    const stageId = resolved.state.players.p1.stageArea.cardIds[0];
    expect(resolved.state.cardsById[stageId]?.cardDefinitionId).toBe('MARY');
    expect(resolved.state.setupState).toMatchObject({ stage: 'awaitingMulliganDecision' });
    expect(resolved.state.pendingChoices[0]).toMatchObject({ sourceEffectId: null, kind: 'YES_NO' });
  });

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
      state: state as GameState,
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
    if (!result.handled) throw new Error('unreachable: handled asserted above');
    expect(result.ok, !result.ok ? result.reasons.join('; ') : '').toBe(true);
    if (result.ok) {
      expect(result.state.players.p1.hand.cardIds).toEqual(['p1-override-draw']);
      expect(result.log.some((entry) => entry.type === 'CARD_DRAWN')).toBe(true);
    }
  });

  it('rejects manual hand play when a V2 PREVENT_ACTION play restriction matches the candidate', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const handId = 'p1-expensive-character';
    const state: GameState = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          hand: { ...base.players.p1.hand, cardIds: [handId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [handId]: instance(handId, 'p1', 'hand', { cardDefinitionId: 'EXPENSIVE-CHAR' }),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      'EXPENSIVE-CHAR': def('EXPENSIVE-CHAR', { category: 'character', baseCost: 5, basePower: 7000, life: undefined }),
    };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      permissionEffects: [{
        id: 'restrict-play',
        kind: 'PREVENT_ACTION',
        sourceInstanceId,
        controllerId: 'p1',
        selector: {
          subject: 'CARD',
          cardCategories: ['CHARACTER'],
          cost: { propertyLayer: 'BASE', comparison: 'AT_LEAST', value: { kind: 'NUMBER', value: 5 } },
        },
        action: 'PLAY_CARD',
        duration: { kind: 'THIS_TURN' },
        createdAtTurn: state.turnNumber,
        status: 'ACTIVE',
      }],
    });

    const result = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: runtime([]),
      sidecars,
      action: { type: 'PLAY_CHARACTER', actionId: 'play-expensive', playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
    });

    expect(result).toMatchObject({ handled: true, ok: false });
    if (result.handled && !result.ok) {
      expect(result.reasons).toContain('A V2 permission effect prevents playing this card.');
    }
  });

  it('skips native V2 effect play when a PREVENT_ACTION play restriction matches the candidate', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const handId = 'p1-effect-play-character';
    const state: GameState = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          hand: { ...base.players.p1.hand, cardIds: [handId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [handId]: instance(handId, 'p1', 'hand', { cardDefinitionId: 'EXPENSIVE-CHAR' }),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      'EXPENSIVE-CHAR': def('EXPENSIVE-CHAR', { category: 'character', baseCost: 5, basePower: 7000, life: undefined }),
    };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      permissionEffects: [{
        id: 'restrict-effect-play',
        kind: 'PREVENT_ACTION',
        sourceInstanceId,
        controllerId: 'p1',
        selector: {
          subject: 'CARD',
          cardCategories: ['CHARACTER'],
          cost: { propertyLayer: 'BASE', comparison: 'AT_LEAST', value: { kind: 'NUMBER', value: 5 } },
        },
        action: 'PLAY_CARD',
        duration: { kind: 'THIS_TURN' },
        createdAtTurn: state.turnNumber,
        status: 'ACTIVE',
      }],
    });

    const result = applyV2EffectsForAction({
      state,
      defs: cardDefs,
      runtime: runtime([effect('TEST-LEADER#play', 'ON_PLAY', {
        kind: 'ACTION',
        action: {
          type: 'PLAY_CARD',
          player: 'PLAYER',
          selector: {
            subject: 'CARD',
            owner: 'PLAYER',
            zones: ['HAND'],
            cardCategories: ['CHARACTER'],
            quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          },
        },
      })]),
      sidecars,
      action: { type: 'PASS_STEP', actionId: 'effect-play', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(result.state.players.p1.hand.cardIds).toEqual([handId]);
    expect(result.state.players.p1.characterArea.cardIds).toEqual([]);
  });

  it('rejects manual attacks when a V2 PREVENT_ACTION attack restriction matches the attacker', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetId = base.players.p2.leaderInstanceId;
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      cardsById: {
        ...base.cardsById,
        [attackerId]: { ...base.cardsById[attackerId], orientation: 'active' },
      },
    };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      permissionEffects: [{
        id: 'prevent-attack',
        kind: 'PREVENT_ACTION',
        sourceInstanceId: attackerId,
        controllerId: 'p1',
        selector: { subject: 'CARD', controller: 'PLAYER', zones: ['LEADER_AREA'] },
        action: 'DECLARE_ATTACK',
        duration: { kind: 'THIS_TURN' },
        createdAtTurn: state.turnNumber,
        status: 'ACTIVE',
      }],
    });

    const result = executeV2ActionOverride({
      state,
      defs: defs(),
      runtime: runtime([]),
      sidecars,
      action: { type: 'DECLARE_ATTACK', actionId: 'attack-prevented', playerId: 'p1', attackerInstanceId: attackerId, targetInstanceId: targetId },
    });

    expect(result).toMatchObject({ handled: true, ok: false });
    if (result.handled && !result.ok) {
      expect(result.reasons).toContain('A V2 permission effect prevents DECLARE_ATTACK on this card.');
    }
  });

  it('prevents battle K.O. during V2 counter-step PASS_STEP when a PREVENT_ACTION K.O. sidecar matches', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetId = 'p2-target';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        originalTargetInstanceId: targetId,
        step: 'counter',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p2: { ...base.players.p2, characterArea: { ...base.players.p2.characterArea, cardIds: [targetId] } },
      },
      cardsById: {
        ...base.cardsById,
        [attackerId]: { ...base.cardsById[attackerId], orientation: 'rested' },
        [targetId]: instance(targetId, 'p2', 'characterArea', { cardDefinitionId: 'TEST-CHARACTER', orientation: 'rested' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-CHARACTER': def('TEST-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
    };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      permissionEffects: [{
        id: 'prevent-battle-ko',
        kind: 'PREVENT_ACTION',
        sourceInstanceId: targetId,
        controllerId: 'p2',
        selector: { subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'] },
        action: 'KO_CARD',
        causeFilter: 'BATTLE',
        duration: { kind: 'THIS_TURN' },
        createdAtTurn: state.turnNumber,
        status: 'ACTIVE',
      }],
    });

    const result = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: runtime([]),
      sidecars,
      action: { type: 'PASS_STEP', actionId: 'counter-pass', playerId: 'p2' },
    });

    expect(result).toMatchObject({ handled: true, ok: true });
    if (!result.handled || !result.ok) throw new Error('expected V2 pass-step override to succeed');
    expect(result.state.players.p2.characterArea.cardIds).toEqual([targetId]);
    expect(result.state.players.p2.trash.cardIds).toEqual([]);
    expect(result.state.cardsById[targetId].currentZone).toBe('characterArea');
    expect(result.state.currentBattle).toBeNull();
    expect(result.log.some((entry) => entry.type === 'CHARACTER_KO')).toBe(false);
    expect(result.log.some((entry) => entry.type === 'DAMAGE_DEALT' && entry.data && (entry.data as Record<string, unknown>).koPrevented === true)).toBe(true);
  });

  it('prevents battle K.O. during V2 counter-step PASS_STEP when a PREVENT_ZONE_CHANGE sidecar blocks field removal', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetId = 'p2-target';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        originalTargetInstanceId: targetId,
        step: 'counter',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p2: { ...base.players.p2, characterArea: { ...base.players.p2.characterArea, cardIds: [targetId] } },
      },
      cardsById: {
        ...base.cardsById,
        [attackerId]: { ...base.cardsById[attackerId], orientation: 'rested' },
        [targetId]: instance(targetId, 'p2', 'characterArea', { cardDefinitionId: 'TEST-CHARACTER', orientation: 'rested' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-CHARACTER': def('TEST-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
    };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      permissionEffects: [{
        id: 'prevent-battle-removal',
        kind: 'PREVENT_ZONE_CHANGE',
        sourceInstanceId: targetId,
        controllerId: 'p2',
        selector: { subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'] },
        action: 'REMOVE_FROM_FIELD',
        duration: { kind: 'THIS_TURN' },
        createdAtTurn: state.turnNumber,
        status: 'ACTIVE',
      }],
    });

    const result = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: runtime([]),
      sidecars,
      action: { type: 'PASS_STEP', actionId: 'counter-pass', playerId: 'p2' },
    });

    expect(result).toMatchObject({ handled: true, ok: true });
    if (!result.handled || !result.ok) throw new Error('expected V2 pass-step override to succeed');
    expect(result.state.players.p2.characterArea.cardIds).toEqual([targetId]);
    expect(result.state.players.p2.trash.cardIds).toEqual([]);
    expect(result.state.currentBattle).toBeNull();
    expect(result.log.some((entry) => entry.type === 'CHARACTER_KO')).toBe(false);
  });

  it('still resolves ordinary battle K.O. through V2 PASS_STEP when no V2 prevention matches', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetId = 'p2-target';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        originalTargetInstanceId: targetId,
        step: 'counter',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p2: { ...base.players.p2, characterArea: { ...base.players.p2.characterArea, cardIds: [targetId] } },
      },
      cardsById: {
        ...base.cardsById,
        [attackerId]: { ...base.cardsById[attackerId], orientation: 'rested' },
        [targetId]: instance(targetId, 'p2', 'characterArea', { cardDefinitionId: 'TEST-CHARACTER', orientation: 'rested' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-CHARACTER': def('TEST-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
    };

    const result = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: runtime([]),
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
      action: { type: 'PASS_STEP', actionId: 'counter-pass', playerId: 'p2' },
    });

    expect(result).toMatchObject({ handled: true, ok: true });
    if (!result.handled || !result.ok) throw new Error('expected V2 pass-step override to succeed');
    expect(result.state.players.p2.characterArea.cardIds).toEqual([]);
    expect(result.state.players.p2.trash.cardIds).toEqual([targetId]);
    expect(result.state.cardsById[targetId].currentZone).toBe('trash');
    expect(result.state.currentBattle).toBeNull();
    expect(result.log.some((entry) => entry.type === 'CHARACTER_KO')).toBe(true);
  });

  it('applies V2 MODIFY_DAMAGE sidecars to leader battle damage during PASS_STEP', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetId = base.players.p2.leaderInstanceId;
    const lifeIds = ['p2-life-1', 'p2-life-2'];
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        originalTargetInstanceId: targetId,
        step: 'counter',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p2: {
          ...base.players.p2,
          lifeArea: { ...base.players.p2.lifeArea, cardIds: lifeIds },
        },
      },
      cardsById: {
        ...base.cardsById,
        [attackerId]: { ...base.cardsById[attackerId], orientation: 'rested' },
        [lifeIds[0]]: instance(lifeIds[0], 'p2', 'lifeArea', { cardDefinitionId: 'TEST-LIFE', faceState: 'faceDown', revealedTo: [] }),
        [lifeIds[1]]: instance(lifeIds[1], 'p2', 'lifeArea', { cardDefinitionId: 'TEST-LIFE', faceState: 'faceDown', revealedTo: [] }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-LIFE': def('TEST-LIFE', { category: 'character', life: undefined }),
    };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      statModifiers: [{
        id: 'battle-damage-plus-one',
        sourceInstanceId: attackerId,
        controllerId: 'p1',
        stat: 'DAMAGE',
        selector: { subject: 'CARD', relations: ['THIS_CARD'] },
        propertyLayer: 'CURRENT_VALUE',
        operation: 'ADD',
        value: { kind: 'NUMBER', value: 1 },
        duration: { kind: 'THIS_TURN' },
        createdAtTurn: state.turnNumber,
        status: 'ACTIVE',
      }],
    });

    const result = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: runtime([]),
      sidecars,
      action: { type: 'PASS_STEP', actionId: 'battle-damage-v2', playerId: 'p2' },
    });

    expect(result).toMatchObject({ handled: true, ok: true });
    if (!result.handled || !result.ok) throw new Error('expected V2 battle damage to resolve');
    expect(result.state.players.p2.lifeArea.cardIds).toEqual([]);
    expect(result.state.players.p2.hand.cardIds).toEqual(expect.arrayContaining(lifeIds));
    expect(result.state.currentBattle).toBeNull();
    expect(result.log.filter((entry) => entry.type === 'DAMAGE_DEALT' && entry.data && (entry.data as Record<string, unknown>).targetPlayerId === 'p2')).toHaveLength(2);
  });

  it('applies V2-granted DOUBLE_ATTACK to leader battle damage during PASS_STEP', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetId = base.players.p2.leaderInstanceId;
    const lifeIds = ['p2-life-1', 'p2-life-2'];
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        originalTargetInstanceId: targetId,
        step: 'counter',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p2: { ...base.players.p2, lifeArea: { ...base.players.p2.lifeArea, cardIds: lifeIds } },
      },
      cardsById: {
        ...base.cardsById,
        [attackerId]: { ...base.cardsById[attackerId], orientation: 'rested' },
        [lifeIds[0]]: instance(lifeIds[0], 'p2', 'lifeArea', { cardDefinitionId: 'TEST-LIFE', faceState: 'faceDown', revealedTo: [] }),
        [lifeIds[1]]: instance(lifeIds[1], 'p2', 'lifeArea', { cardDefinitionId: 'TEST-LIFE', faceState: 'faceDown', revealedTo: [] }),
      },
    };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      keywordModifiers: [{
        id: 'battle-double-attack',
        sourceInstanceId: attackerId,
        controllerId: 'p1',
        selector: { subject: 'CARD', relations: ['THIS_CARD'] },
        operation: 'GRANT_KEYWORD',
        keyword: 'DOUBLE_ATTACK',
        duration: { kind: 'THIS_TURN' },
        createdAtTurn: state.turnNumber,
        status: 'ACTIVE',
      }],
    });

    const result = executeV2ActionOverride({
      state,
      defs: { ...defs(), 'TEST-LIFE': def('TEST-LIFE', { category: 'character', life: undefined }) },
      runtime: runtime([]),
      sidecars,
      action: { type: 'PASS_STEP', actionId: 'battle-double-v2', playerId: 'p2' },
    });

    expect(result).toMatchObject({ handled: true, ok: true });
    if (!result.handled || !result.ok) throw new Error('expected V2 double attack battle damage to resolve');
    expect(result.state.players.p2.lifeArea.cardIds).toEqual([]);
    expect(result.state.players.p2.hand.cardIds).toEqual(expect.arrayContaining(lifeIds));
  });

  it('applies V2-granted BANISH to leader battle damage during PASS_STEP', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetId = base.players.p2.leaderInstanceId;
    const lifeId = 'p2-life-1';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        originalTargetInstanceId: targetId,
        step: 'counter',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p2: { ...base.players.p2, lifeArea: { ...base.players.p2.lifeArea, cardIds: [lifeId] } },
      },
      cardsById: {
        ...base.cardsById,
        [attackerId]: { ...base.cardsById[attackerId], orientation: 'rested' },
        [lifeId]: instance(lifeId, 'p2', 'lifeArea', { cardDefinitionId: 'TEST-LIFE', faceState: 'faceDown', revealedTo: [] }),
      },
    };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      keywordModifiers: [{
        id: 'battle-banish',
        sourceInstanceId: attackerId,
        controllerId: 'p1',
        selector: { subject: 'CARD', relations: ['THIS_CARD'] },
        operation: 'GRANT_KEYWORD',
        keyword: 'BANISH',
        duration: { kind: 'THIS_TURN' },
        createdAtTurn: state.turnNumber,
        status: 'ACTIVE',
      }],
    });

    const result = executeV2ActionOverride({
      state,
      defs: { ...defs(), 'TEST-LIFE': def('TEST-LIFE', { category: 'character', life: undefined }) },
      runtime: runtime([]),
      sidecars,
      action: { type: 'PASS_STEP', actionId: 'battle-banish-v2', playerId: 'p2' },
    });

    expect(result).toMatchObject({ handled: true, ok: true });
    if (!result.handled || !result.ok) throw new Error('expected V2 banish battle damage to resolve');
    expect(result.state.players.p2.lifeArea.cardIds).toEqual([]);
    expect(result.state.players.p2.hand.cardIds).not.toContain(lifeId);
    expect(result.state.players.p2.trash.cardIds).toContain(lifeId);
    expect(result.state.cardsById[lifeId]).toMatchObject({ currentZone: 'trash', faceState: 'faceUp', revealedTo: 'all' });
  });

  it('routes battle K.O. from V2 PASS_STEP through native ON_KO timing', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetId = 'p2-ko-target';
    const drawId = 'p2-ko-draw';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        originalTargetInstanceId: targetId,
        step: 'counter',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p2: {
          ...base.players.p2,
          characterArea: { ...base.players.p2.characterArea, cardIds: [targetId] },
          deck: { ...base.players.p2.deck, cardIds: [drawId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [targetId]: instance(targetId, 'p2', 'characterArea', { cardDefinitionId: 'TEST-KO-CHARACTER', orientation: 'rested' }),
        [drawId]: instance(drawId, 'p2', 'deck', { cardDefinitionId: 'TEST-CHARACTER' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-KO-CHARACTER': def('TEST-KO-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
      'TEST-CHARACTER': def('TEST-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
    };

    const result = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: runtime([effect('TEST-KO-CHARACTER#ko', 'ON_KO')], {}, 'TEST-KO-CHARACTER'),
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
      action: { type: 'PASS_STEP', actionId: 'battle-ko-v2', playerId: 'p2' },
    });

    expect(result).toMatchObject({ handled: true, ok: true });
    if (!result.handled || !result.ok) throw new Error('expected V2 battle K.O. to resolve');
    expect(result.state.players.p2.trash.cardIds).toContain(targetId);
    expect(result.state.players.p2.hand.cardIds).toEqual([drawId]);
    expect(result.log.some((entry) => entry.type === 'CHARACTER_KO')).toBe(true);
    expect(result.log.some((entry) => entry.type === 'CARD_DRAWN')).toBe(true);
  });

  it('preserves pending choices created by native ON_KO after V2 battle K.O.', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetId = 'p2-ko-target';
    const restTargetId = 'p1-rest-target';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        originalTargetInstanceId: targetId,
        step: 'counter',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p1: { ...base.players.p1, characterArea: { ...base.players.p1.characterArea, cardIds: [restTargetId] } },
        p2: { ...base.players.p2, characterArea: { ...base.players.p2.characterArea, cardIds: [targetId] } },
      },
      cardsById: {
        ...base.cardsById,
        [targetId]: instance(targetId, 'p2', 'characterArea', { cardDefinitionId: 'TEST-KO-CHARACTER', orientation: 'rested' }),
        [restTargetId]: instance(restTargetId, 'p1', 'characterArea', { cardDefinitionId: 'TEST-CHARACTER', orientation: 'active' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-KO-CHARACTER': def('TEST-KO-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
      'TEST-CHARACTER': def('TEST-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
    };
    const bundle = runtime([effect('TEST-KO-CHARACTER#ko', 'ON_KO', {
      kind: 'ACTION',
      action: {
        type: 'REST_CARD',
        selector: {
          subject: 'CARD',
          controller: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
      },
    })], {}, 'TEST-KO-CHARACTER');

    const prompted = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
      action: { type: 'PASS_STEP', actionId: 'battle-ko-v2-choice', playerId: 'p2' },
    });

    expect(prompted).toMatchObject({ handled: true, ok: true });
    if (!prompted.handled || !prompted.ok) throw new Error('expected V2 battle K.O. to prompt');
    expect(prompted.state.players.p2.trash.cardIds).toContain(targetId);
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      sourceInstanceId: targetId,
      constraints: { candidateInstanceIds: [restTargetId] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'battle-ko-v2-choice-resolve',
        playerId: 'p2',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [restTargetId],
      },
    });

    expect(resolved).toMatchObject({ handled: true, ok: true });
    if (!resolved.handled || !resolved.ok) throw new Error('expected V2 ON_KO target choice to resolve');
    expect(resolved.state.cardsById[restTargetId].orientation).toBe('rested');
  });

  it('routes blocker activation through V2 override and native ON_BLOCK timing', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const originalTargetId = base.players.p2.leaderInstanceId;
    const blockerId = 'p2-blocker';
    const drawId = 'p2-block-draw';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: originalTargetId,
        originalTargetInstanceId: originalTargetId,
        step: 'block',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p2: {
          ...base.players.p2,
          characterArea: { ...base.players.p2.characterArea, cardIds: [blockerId] },
          deck: { ...base.players.p2.deck, cardIds: [drawId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [blockerId]: instance(blockerId, 'p2', 'characterArea', { cardDefinitionId: 'TEST-BLOCKER', orientation: 'active' }),
        [drawId]: instance(drawId, 'p2', 'deck', { cardDefinitionId: 'TEST-CHARACTER' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-BLOCKER': def('TEST-BLOCKER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined, hasBlocker: true }),
      'TEST-CHARACTER': def('TEST-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
    };

    const result = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: runtime([effect('TEST-BLOCKER#block', 'ON_BLOCK')], {}, 'TEST-BLOCKER'),
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
      action: { type: 'ACTIVATE_BLOCKER', actionId: 'blocker-v2', playerId: 'p2', blockerInstanceId: blockerId },
    });

    expect(result).toMatchObject({ handled: true, ok: true });
    if (!result.handled || !result.ok) throw new Error('expected V2 blocker override to succeed');
    expect(result.state.currentBattle).toMatchObject({ targetInstanceId: blockerId, step: 'counter', blockerUsed: true });
    expect(result.state.cardsById[blockerId].orientation).toBe('rested');
    expect(result.state.players.p2.hand.cardIds).toEqual([drawId]);
    expect(result.log.some((entry) => entry.type === 'BLOCKER_ACTIVATED')).toBe(true);
  });

  it('preserves V2 ON_BLOCK pending target choices through blocker override', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const originalTargetId = base.players.p2.leaderInstanceId;
    const blockerId = 'p2-blocker';
    const targetId = 'p1-target';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: originalTargetId,
        originalTargetInstanceId: originalTargetId,
        step: 'block',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p1: { ...base.players.p1, characterArea: { ...base.players.p1.characterArea, cardIds: [targetId] } },
        p2: { ...base.players.p2, characterArea: { ...base.players.p2.characterArea, cardIds: [blockerId] } },
      },
      cardsById: {
        ...base.cardsById,
        [blockerId]: instance(blockerId, 'p2', 'characterArea', { cardDefinitionId: 'TEST-BLOCKER', orientation: 'active' }),
        [targetId]: instance(targetId, 'p1', 'characterArea', { cardDefinitionId: 'TEST-CHARACTER', orientation: 'active' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-BLOCKER': def('TEST-BLOCKER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined, hasBlocker: true }),
      'TEST-CHARACTER': def('TEST-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
    };
    const bundle = runtime([effect('TEST-BLOCKER#block', 'ON_BLOCK', {
      kind: 'ACTION',
      action: {
        type: 'REST_CARD',
        selector: {
          subject: 'CARD',
          controller: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
      },
    })], {}, 'TEST-BLOCKER');

    const prompted = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
      action: { type: 'ACTIVATE_BLOCKER', actionId: 'blocker-v2-choice', playerId: 'p2', blockerInstanceId: blockerId },
    });

    expect(prompted).toMatchObject({ handled: true, ok: true });
    if (!prompted.handled || !prompted.ok) throw new Error('expected V2 blocker override to prompt');
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      sourceInstanceId: blockerId,
      constraints: { candidateInstanceIds: [targetId] },
    });
    expect(prompted.state.currentBattle).toMatchObject({ targetInstanceId: blockerId, step: 'counter' });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'blocker-v2-choice-resolve',
        playerId: 'p2',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [targetId],
      },
    });

    expect(resolved).toMatchObject({ handled: true, ok: true });
    if (!resolved.handled || !resolved.ok) throw new Error('expected V2 blocker target choice to resolve');
    expect(resolved.state.cardsById[targetId].orientation).toBe('rested');
    expect(resolved.state.currentBattle).toMatchObject({ targetInstanceId: blockerId, step: 'counter' });
  });

  it('preserves V2 ON_OPPONENT_ATTACK pending target choices and marks usage', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetLeaderId = base.players.p2.leaderInstanceId;
    const sourceId = 'p2-on-attack-source';
    const targetId = 'p1-target';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetLeaderId,
        originalTargetInstanceId: targetLeaderId,
        step: 'block',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p1: { ...base.players.p1, characterArea: { ...base.players.p1.characterArea, cardIds: [targetId] } },
        p2: { ...base.players.p2, characterArea: { ...base.players.p2.characterArea, cardIds: [sourceId] } },
      },
      cardsById: {
        ...base.cardsById,
        [sourceId]: instance(sourceId, 'p2', 'characterArea', { cardDefinitionId: 'TEST-ON-ATTACK', orientation: 'active' }),
        [targetId]: instance(targetId, 'p1', 'characterArea', { cardDefinitionId: 'TEST-CHARACTER', orientation: 'active' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-ON-ATTACK': def('TEST-ON-ATTACK', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
      'TEST-CHARACTER': def('TEST-CHARACTER', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
    };
    const bundle = runtime([effect('TEST-ON-ATTACK#opp-attack', 'ON_OPPONENT_ATTACK', {
      kind: 'ACTION',
      action: {
        type: 'REST_CARD',
        selector: {
          subject: 'CARD',
          controller: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
          chooser: 'EFFECT_OWNER',
        },
      },
    })], {}, 'TEST-ON-ATTACK');

    const prompted = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
      action: { type: 'ACTIVATE_ON_OPPONENTS_ATTACK', actionId: 'opp-attack-v2-choice', playerId: 'p2', sourceInstanceId: sourceId, effectId: 'TEST-ON-ATTACK#opp-attack', donInstanceIds: [] },
    });

    expect(prompted).toMatchObject({ handled: true, ok: true });
    if (!prompted.handled || !prompted.ok) throw new Error('expected V2 opponent-attack override to prompt');
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      sourceInstanceId: sourceId,
      constraints: { candidateInstanceIds: [targetId] },
    });
    expect(prompted.state.currentBattle?.onOpponentsAttackUsedInstanceIds).toContain(sourceId);

    const duplicate = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: { type: 'ACTIVATE_ON_OPPONENTS_ATTACK', actionId: 'opp-attack-v2-repeat', playerId: 'p2', sourceInstanceId: sourceId, effectId: 'TEST-ON-ATTACK#opp-attack', donInstanceIds: [] },
    });
    expect(duplicate).toMatchObject({ handled: true, ok: false });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'opp-attack-v2-choice-resolve',
        playerId: 'p2',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [targetId],
      },
    });

    expect(resolved).toMatchObject({ handled: true, ok: true });
    if (!resolved.handled || !resolved.ok) throw new Error('expected V2 opponent-attack target choice to resolve');
    expect(resolved.state.cardsById[targetId].orientation).toBe('rested');
    expect(resolved.state.currentBattle).toMatchObject({ targetInstanceId: targetLeaderId, step: 'block' });
  });

  it('executes native CANCEL_ATTACK from ON_OPPONENT_ATTACK through the V2 adapter', () => {
    const base = createSampleGameState();
    const attackerId = base.players.p1.leaderInstanceId;
    const targetLeaderId = base.players.p2.leaderInstanceId;
    const sourceId = 'p2-on-attack-source';
    const state: GameState = {
      ...base,
      turnNumber: 3,
      currentPhase: 'main',
      activePlayerId: 'p1',
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: targetLeaderId,
        originalTargetInstanceId: targetLeaderId,
        step: 'block',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
      players: {
        ...base.players,
        p2: { ...base.players.p2, characterArea: { ...base.players.p2.characterArea, cardIds: [sourceId] } },
      },
      cardsById: {
        ...base.cardsById,
        [sourceId]: instance(sourceId, 'p2', 'characterArea', { cardDefinitionId: 'TEST-ON-ATTACK', orientation: 'active' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'TEST-ON-ATTACK': def('TEST-ON-ATTACK', { category: 'character', baseCost: 3, basePower: 1000, life: undefined }),
    };
    const bundle = runtime([effect('TEST-ON-ATTACK#cancel', 'ON_OPPONENT_ATTACK', {
      kind: 'ACTION',
      action: { type: 'CANCEL_ATTACK', battle: 'CURRENT_BATTLE' },
    })], {}, 'TEST-ON-ATTACK');

    const result = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
      action: { type: 'ACTIVATE_ON_OPPONENTS_ATTACK', actionId: 'opp-attack-cancel', playerId: 'p2', sourceInstanceId: sourceId, effectId: 'TEST-ON-ATTACK#cancel', donInstanceIds: [] },
    });

    expect(result).toMatchObject({ handled: true, ok: true });
    if (!result.handled || !result.ok) throw new Error('expected V2 cancel attack to resolve');
    expect(result.state.currentBattle).toBeNull();
    expect(result.log.some((entry) => entry.type === 'EFFECT_RESOLVED' && entry.data && (entry.data as Record<string, unknown>).action === 'CANCEL_ATTACK')).toBe(true);
  });

  it('resumes V2 OPTIONAL choices by declining or resolving the optional node', () => {
    const base = createSampleGameState();
    const deckIds = ['draw-1', 'draw-2'];
    const state: GameState = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1, deck: { ...base.players.p1.deck, cardIds: deckIds } },
      },
      cardsById: {
        ...base.cardsById,
        'draw-1': instance('draw-1', 'p1', 'deck', { cardDefinitionId: 'DRAW-CARD' }),
        'draw-2': instance('draw-2', 'p1', 'deck', { cardDefinitionId: 'DRAW-CARD' }),
      },
    };
    const cardDefs = { ...defs(), 'DRAW-CARD': def('DRAW-CARD', { category: 'character', life: undefined }) };
    const prompted = executeResolutionNode_V2({
      state,
      defs: cardDefs,
      runtime: runtime([]),
      sourceInstanceId: 'p1-leader',
      controllerId: 'p1',
      currentTiming: { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
    }, {
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'OPTIONAL', node: { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } } },
        { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
      ],
    }, 'optional-sequence');

    expect(prompted.state.pendingChoices).toHaveLength(1);

    const declined = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: runtime([]),
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'optional-decline',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: false,
      },
    });
    expect(declined).toMatchObject({ handled: true, ok: true });
    if (!declined.handled || !declined.ok) throw new Error('expected optional decline to resolve');
    expect(declined.state.players.p1.hand.cardIds).toEqual(['draw-1']);
    expect(declined.state.players.p1.deck.cardIds).toEqual(['draw-2']);

    const accepted = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: runtime([]),
      sidecars: createEmptyEffectRuntimeSidecars_V2(),
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'optional-accept',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: true,
      },
    });
    expect(accepted).toMatchObject({ handled: true, ok: true });
    if (!accepted.handled || !accepted.ok) throw new Error('expected optional accept to resolve');
    expect(accepted.state.players.p1.hand.cardIds).toEqual(['draw-1', 'draw-2']);
    expect(accepted.state.players.p1.deck.cardIds).toEqual([]);
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
    if (!result.handled) throw new Error('unreachable: handled asserted above');
    expect(result.ok, !result.ok ? result.reasons.join('; ') : '').toBe(true);
    if (result.ok) {
      expect(result.state.cardsById[donId].donRested).toBe(true);
      expect(result.state.cardsById[sourceInstanceId].orientation).toBe('rested');
      expect(result.state.players.p1.hand.cardIds).toEqual([deckCardId]);
    }
  });

  it('prompts and resumes simple activate-main CHOOSE_ONE_COST card payments', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const characterCostId = 'p1-celestial';
    const handCostId = 'p1-hand-cost';
    const deckCardId = 'p1-draw-choose-one';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          characterArea: { ...base.players.p1.characterArea, cardIds: [characterCostId] },
          hand: { ...base.players.p1.hand, cardIds: [handCostId] },
          deck: { ...base.players.p1.deck, cardIds: [deckCardId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [characterCostId]: instance(characterCostId, 'p1', 'characterArea', { cardDefinitionId: 'CELESTIAL-CHARACTER' }),
        [handCostId]: instance(handCostId, 'p1', 'hand', { cardDefinitionId: 'HAND-COST' }),
        [deckCardId]: instance(deckCardId, 'p1', 'deck', { cardDefinitionId: 'HAND-COST' }),
      },
    };
    const cardDefs = {
      ...defs(),
      'CELESTIAL-CHARACTER': def('CELESTIAL-CHARACTER', { category: 'character', types: ['Celestial Dragons'], baseCost: 1, life: undefined }),
      'HAND-COST': def('HAND-COST', { category: 'character', baseCost: 1, life: undefined }),
    };
    const activate = {
      ...effect('TEST-LEADER#choose-one', 'ACTIVATE_MAIN'),
      activationCost: {
        payments: [{
          type: 'CHOOSE_ONE_COST' as const,
          options: [
            [{
              type: 'TRASH_CARD_COST' as const,
              selector: {
                subject: 'CARD' as const,
                controller: 'PLAYER' as const,
                zones: ['CHARACTER_AREA' as const],
                cardCategories: ['CHARACTER' as const],
                types: { kind: 'HAS_ANY_TYPE' as const, values: ['Celestial Dragons'] },
                quantity: { kind: 'EXACTLY' as const, value: { kind: 'NUMBER' as const, value: 1 } },
                chooser: 'EFFECT_OWNER' as const,
              },
            }],
            [{
              type: 'TRASH_CARD_COST' as const,
              selector: {
                subject: 'CARD' as const,
                owner: 'PLAYER' as const,
                zones: ['HAND' as const],
                quantity: { kind: 'EXACTLY' as const, value: { kind: 'NUMBER' as const, value: 1 } },
                chooser: 'EFFECT_OWNER' as const,
              },
            }],
          ],
        }],
        optionalPayment: 'REQUIRED_TO_ACTIVATE' as const,
        executionPolicy: 'VERIFY_ALL_THEN_PAY_IN_ORDER' as const,
      },
    };
    const bundle = runtime([activate]);

    const prompted = executeV2ActionOverride({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: null,
      action: {
        type: 'ACTIVATE_CARD_EFFECT',
        actionId: 'activate-choose-one',
        playerId: 'p1',
        sourceInstanceId,
        effectId: 'TEST-LEADER#choose-one',
        donInstanceIds: [],
      },
    });

    expect(prompted.handled).toBe(true);
    if (!prompted.handled) return;
    expect(prompted.ok, !prompted.ok ? prompted.reasons.join('; ') : '').toBe(true);
    if (!prompted.ok) return;
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:activationCost',
      constraints: { min: 1, max: 1, candidateInstanceIds: [characterCostId, handCostId] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'pay-choose-one',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [characterCostId],
      },
    });

    expect(resolved.handled).toBe(true);
    if (!resolved.handled) return;
    expect(resolved.ok, !resolved.ok ? resolved.reasons.join('; ') : '').toBe(true);
    if (resolved.ok) {
      expect(resolved.state.players.p1.characterArea.cardIds).toEqual([]);
      expect(resolved.state.players.p1.trash.cardIds).toContain(characterCostId);
      expect(resolved.state.players.p1.hand.cardIds).toEqual([handCostId, deckCardId]);
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
      optionalPayment: 'REQUIRED_TO_ACTIVATE',
      executionPolicy: 'VERIFY_ALL_THEN_PAY_IN_ORDER',
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
    if (!resolved.handled) throw new Error('unreachable: handled asserted above');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
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
    if (!resolved.handled) throw new Error('unreachable: handled asserted above');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
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
      if (!reordered.handled) throw new Error('unreachable: handled asserted above');
      expect(reordered.ok).toBe(true);
      if (reordered.ok) {
        expect(reordered.state.pendingChoices).toEqual([]);
        expect(reordered.state.players.p1.deck.cardIds).toEqual([tailId, thirdId, otherId]);
      }
    }
  });

  it('prompts and resumes V2 direct deck search-to-hand selections', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const wantedId = 'deck-smile';
    const otherId = 'deck-other';
    const drawId = 'deck-draw-after-search';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          deck: { ...base.players.p1.deck, cardIds: [wantedId, otherId, drawId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [wantedId]: instance(wantedId, 'p1', 'deck', { cardDefinitionId: 'SMILE' }),
        [otherId]: instance(otherId, 'p1', 'deck', { cardDefinitionId: 'OTHER-CHAR' }),
        [drawId]: instance(drawId, 'p1', 'deck', { cardDefinitionId: 'OTHER-CHAR' }),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      SMILE: def('SMILE', { name: 'Artificial Devil Fruit SMILE', category: 'character', baseCost: 1, life: undefined }),
      'OTHER-CHAR': def('OTHER-CHAR', { name: 'Other Card', category: 'character', baseCost: 1, life: undefined }),
    };
    const bundle = runtime([
      effect('TEST-LEADER#direct-search', 'ON_PLAY', {
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
            action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } },
          },
        ],
      }),
    ]);

    const prompted = applyV2EffectsForAction({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'direct-search-played', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(prompted.state.players.p1.hand.cardIds).toEqual([]);
    expect(prompted.state.players.p1.deck.cardIds).toEqual([wantedId, otherId, drawId]);
    expect(prompted.state.pendingChoices).toHaveLength(1);
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectMoveToHand',
      constraints: { candidateInstanceIds: [wantedId], visibleInstanceIds: [wantedId] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'direct-search-pick',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [wantedId],
      },
    });

    expect(resolved.handled).toBe(true);
    if (!resolved.handled) throw new Error('unreachable: handled asserted above');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.state.pendingChoices).toEqual([]);
      expect(resolved.state.players.p1.hand.cardIds).toEqual([wantedId, otherId]);
      expect(resolved.state.players.p1.deck.cardIds).toEqual([drawId]);
    }
  });

  it('prompts and resumes V2 direct hand play selections', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const playableId = 'hand-playable';
    const otherPlayableId = 'hand-playable-2';
    const nonPlayableId = 'hand-other';
    const drawId = 'deck-after-play';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          hand: { ...base.players.p1.hand, cardIds: [playableId, otherPlayableId, nonPlayableId] },
          deck: { ...base.players.p1.deck, cardIds: [drawId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [playableId]: instance(playableId, 'p1', 'hand', { cardDefinitionId: 'PLAYABLE-CHAR' }),
        [otherPlayableId]: instance(otherPlayableId, 'p1', 'hand', { cardDefinitionId: 'PLAYABLE-CHAR' }),
        [nonPlayableId]: instance(nonPlayableId, 'p1', 'hand', { cardDefinitionId: 'OTHER-CHAR' }),
        [drawId]: instance(drawId, 'p1', 'deck', { cardDefinitionId: 'OTHER-CHAR' }),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      'PLAYABLE-CHAR': def('PLAYABLE-CHAR', { category: 'character', types: ['Straw Hat Crew'], baseCost: 2, basePower: 3000, life: undefined }),
      'OTHER-CHAR': def('OTHER-CHAR', { category: 'character', types: ['Animal'], baseCost: 2, basePower: 3000, life: undefined }),
    };
    const bundle = runtime([
      effect('TEST-LEADER#hand-play', 'ON_PLAY', {
        kind: 'SEQUENCE',
        nodes: [
          {
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
          },
          {
            kind: 'ACTION',
            action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } },
          },
        ],
      }),
    ]);

    const prompted = applyV2EffectsForAction({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'hand-played', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(prompted.state.players.p1.characterArea.cardIds).toEqual([]);
    expect(prompted.state.players.p1.hand.cardIds).toEqual([playableId, otherPlayableId, nonPlayableId]);
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectPlayCard',
      constraints: { candidateInstanceIds: [playableId, otherPlayableId], visibleInstanceIds: [playableId, otherPlayableId] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'hand-play-pick',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [otherPlayableId],
      },
    });

    expect(resolved.handled).toBe(true);
    if (!resolved.handled) throw new Error('unreachable: handled asserted above');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.state.pendingChoices).toEqual([]);
      expect(resolved.state.players.p1.hand.cardIds).toEqual([playableId, nonPlayableId, drawId]);
      expect(resolved.state.players.p1.characterArea.cardIds).toHaveLength(1);
      const playedId = resolved.state.players.p1.characterArea.cardIds[0];
      expect(resolved.state.cardsById[playedId].cardDefinitionId).toBe('PLAYABLE-CHAR');
    }
  });

  it('prompts and resumes V2 targeted return-to-hand selections', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const targetOneId = 'p2-target-1';
    const targetTwoId = 'p2-target-2';
    const drawId = 'deck-after-return';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1, deck: { ...base.players.p1.deck, cardIds: [drawId] } },
        p2: { ...base.players.p2, characterArea: { ...base.players.p2.characterArea, cardIds: [targetOneId, targetTwoId] } },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [targetOneId]: instance(targetOneId, 'p2', 'characterArea', { cardDefinitionId: 'TARGET-CHAR' }),
        [targetTwoId]: instance(targetTwoId, 'p2', 'characterArea', { cardDefinitionId: 'TARGET-CHAR' }),
        [drawId]: instance(drawId, 'p1', 'deck', { cardDefinitionId: 'TARGET-CHAR' }),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      'TARGET-CHAR': def('TARGET-CHAR', { category: 'character', baseCost: 3, basePower: 3000, life: undefined }),
    };
    const bundle = runtime([
      effect('TEST-LEADER#return-target', 'ON_PLAY', {
        kind: 'SEQUENCE',
        nodes: [
          {
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
          },
          {
            kind: 'ACTION',
            action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } },
          },
        ],
      }),
    ]);

    const prompted = applyV2EffectsForAction({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'target-return-played', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(prompted.state.players.p2.characterArea.cardIds).toEqual([targetOneId, targetTwoId]);
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      constraints: { candidateInstanceIds: [targetOneId, targetTwoId] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'target-return-pick',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [targetTwoId],
      },
    });

    expect(resolved.handled).toBe(true);
    if (!resolved.handled) throw new Error('unreachable: handled asserted above');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.state.pendingChoices).toEqual([]);
      expect(resolved.state.players.p2.characterArea.cardIds).toEqual([targetOneId]);
      expect(resolved.state.players.p2.hand.cardIds).toEqual([targetTwoId]);
      expect(resolved.state.players.p1.hand.cardIds).toEqual([drawId]);
    }
  });

  it('prompts and resumes V2 GIVE_DON DON and target selections', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const donOneId = 'don-choice-1';
    const donTwoId = 'don-choice-2';
    const targetOneId = 'don-target-1';
    const targetTwoId = 'don-target-2';
    const drawId = 'draw-after-give-don';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          costArea: { ...base.players.p1.costArea, cardIds: [donOneId, donTwoId] },
          characterArea: { ...base.players.p1.characterArea, cardIds: [targetOneId, targetTwoId] },
          deck: { ...base.players.p1.deck, cardIds: [drawId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [donOneId]: instance(donOneId, 'p1', 'costArea', { cardDefinitionId: 'DON', orientation: null, donRested: false }),
        [donTwoId]: instance(donTwoId, 'p1', 'costArea', { cardDefinitionId: 'DON', orientation: null, donRested: false }),
        [targetOneId]: instance(targetOneId, 'p1', 'characterArea', { cardDefinitionId: 'TARGET-CHAR' }),
        [targetTwoId]: instance(targetTwoId, 'p1', 'characterArea', { cardDefinitionId: 'TARGET-CHAR' }),
        [drawId]: instance(drawId, 'p1', 'deck', { cardDefinitionId: 'TARGET-CHAR' }),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      DON: def('DON', { category: 'don', baseCost: undefined, basePower: undefined, life: undefined, attributes: undefined }),
      'TARGET-CHAR': def('TARGET-CHAR', { category: 'character', baseCost: 3, basePower: 3000, life: undefined }),
    };
    const bundle = runtime([
      effect('TEST-LEADER#give-don', 'ON_PLAY', {
        kind: 'SEQUENCE',
        nodes: [
          {
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
          },
          {
            kind: 'ACTION',
            action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } },
          },
        ],
      }),
    ]);

    const promptedForDon = applyV2EffectsForAction({
      state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: null,
      action: { type: 'PASS_STEP', actionId: 'give-don-played', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(promptedForDon.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectGiveDon',
      constraints: { candidateInstanceIds: [donOneId, donTwoId] },
      resumeState: { v2SelectGiveDon: { targetField: 'donSelector' } },
    });

    const promptedForTarget = executeV2ActionOverride({
      state: promptedForDon.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: promptedForDon.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'give-don-pick-don',
        playerId: 'p1',
        choiceId: promptedForDon.state.pendingChoices[0].id,
        response: [donTwoId],
      },
    });

    expect(promptedForTarget.handled).toBe(true);
    if (!promptedForTarget.handled) throw new Error('unreachable: handled asserted above');
    expect(promptedForTarget.ok).toBe(true);
    if (!promptedForTarget.ok) throw new Error(promptedForTarget.reasons.join(', '));
    expect(promptedForTarget.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectGiveDon',
      constraints: { candidateInstanceIds: [targetOneId, targetTwoId] },
      resumeState: { v2SelectGiveDon: { targetField: 'target' } },
    });

    const resolved = executeV2ActionOverride({
      state: promptedForTarget.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: promptedForTarget.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'give-don-pick-target',
        playerId: 'p1',
        choiceId: promptedForTarget.state.pendingChoices[0].id,
        response: [targetTwoId],
      },
    });

    expect(resolved.handled).toBe(true);
    if (!resolved.handled) throw new Error('unreachable: handled asserted above');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.state.pendingChoices).toEqual([]);
      expect(resolved.state.cardsById[targetOneId].donAttached).toEqual([]);
      expect(resolved.state.cardsById[targetTwoId].donAttached).toEqual([donTwoId]);
      expect(resolved.state.cardsById[donTwoId].donRested).toBe(true);
      expect(resolved.state.players.p1.hand.cardIds).toEqual([drawId]);
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
    if (!resolved.handled) throw new Error('unreachable: handled asserted above');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
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
    if (!resolved.handled) throw new Error('unreachable: handled asserted above');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.state.pendingChoices).toEqual([]);
      expect(resolved.state.players.p1.deck.cardIds).toEqual([otherId]);
      expect(resolved.state.players.p1.characterArea.cardIds).toHaveLength(1);
      const playedId = resolved.state.players.p1.characterArea.cardIds[0];
      expect(resolved.state.cardsById[playedId].cardDefinitionId).toBe('PLAYABLE-CHAR');
    }
  });

  it('keeps revealed-card bindings stable across later prompted selections', () => {
    const base = createSampleGameState();
    const sourceInstanceId = base.players.p1.leaderInstanceId;
    const revealedId = 'deck-revealed';
    const remainingDeckId = 'deck-rest';
    const characterId = 'returnable-char';
    const state = {
      ...base,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          deck: { ...base.players.p1.deck, cardIds: [revealedId, remainingDeckId] },
          characterArea: { ...base.players.p1.characterArea, cardIds: [characterId] },
        },
      },
      cardsById: {
        ...base.cardsById,
        [sourceInstanceId]: { ...base.cardsById[sourceInstanceId], cardDefinitionId: 'TEST-LEADER' },
        [revealedId]: instance(revealedId, 'p1', 'deck', { cardDefinitionId: 'REVEALED-CARD' }),
        [remainingDeckId]: instance(remainingDeckId, 'p1', 'deck', { cardDefinitionId: 'REMAINING-CARD' }),
        [characterId]: instance(characterId, 'p1', 'characterArea', { cardDefinitionId: 'RETURNABLE-CHAR' }),
      },
    };
    const cardDefs: CardDefinitionLookup = {
      ...defs(),
      'REVEALED-CARD': def('REVEALED-CARD', { category: 'character', baseCost: 5, basePower: 6000 }),
      'REMAINING-CARD': def('REMAINING-CARD', { category: 'character', baseCost: 1, basePower: 1000 }),
      'RETURNABLE-CHAR': def('RETURNABLE-CHAR', { category: 'character', baseCost: 2, basePower: 3000 }),
    };
    const bundle = runtime([
      effect('TEST-LEADER#reveal-return-bottom', 'ON_PLAY', {
        kind: 'SEQUENCE',
        nodes: [
          {
            kind: 'ACTION',
            action: {
              type: 'REVEAL_CARD',
              selector: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } }, ordering: 'DECK_ORDER' },
              viewers: 'BOTH_PLAYERS',
            },
          },
          {
            kind: 'IF',
            condition: {
              kind: 'PREDICATE',
              left: {
                kind: 'COUNT',
                selector: {
                  subject: 'ACTION_RESULT',
                  relations: ['REVEALED_PREVIOUSLY'],
                  cost: { propertyLayer: 'CURRENT', comparison: 'AT_LEAST', value: { kind: 'NUMBER', value: 4 } },
                  quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } },
                },
              },
              operator: 'GREATER_OR_EQUAL',
              right: { kind: 'NUMBER', value: 1 },
            },
            then: {
              kind: 'SEQUENCE',
              nodes: [
                {
                  kind: 'ACTION',
                  action: {
                    type: 'MOVE_CARD',
                    selector: { subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'], cardCategories: ['CHARACTER'], quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } }, chooser: 'EFFECT_OWNER' },
                    to: { zone: 'HAND', owner: 'CARD_OWNER' },
                    cause: 'EFFECT',
                  },
                },
                {
                  kind: 'ACTION',
                  action: {
                    type: 'MOVE_CARD',
                    selector: { subject: 'ACTION_RESULT', relations: ['REVEALED_PREVIOUSLY'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } } },
                    to: { zone: 'DECK', owner: 'PLAYER', position: 'BOTTOM' },
                    cause: 'EFFECT',
                  },
                },
              ],
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
      action: { type: 'PASS_STEP', actionId: 'reveal-prompt', playerId: 'p1' },
      log: [logEntry({ relatedCardInstanceIds: [sourceInstanceId] })],
    });

    expect(prompted.state.pendingChoices).toHaveLength(1);
    expect(prompted.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'v2:selectActionTarget',
      constraints: { candidateInstanceIds: [characterId] },
    });

    const resolved = executeV2ActionOverride({
      state: prompted.state,
      defs: cardDefs,
      runtime: bundle,
      sidecars: prompted.sidecars,
      action: {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'reveal-prompt-pick',
        playerId: 'p1',
        choiceId: prompted.state.pendingChoices[0].id,
        response: [characterId],
      },
    });

    expect(resolved.handled).toBe(true);
    if (!resolved.handled) throw new Error('unreachable: handled asserted above');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.state.pendingChoices).toEqual([]);
      expect(resolved.state.players.p1.hand.cardIds).toContain(characterId);
      expect(resolved.state.players.p1.deck.cardIds).toEqual([remainingDeckId, revealedId]);
      expect(resolved.state.cardsById[revealedId].currentZone).toBe('deck');
      expect(resolved.state.cardsById[characterId].currentZone).toBe('hand');
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
      previousState: state as GameState,
      state: state as GameState,
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
