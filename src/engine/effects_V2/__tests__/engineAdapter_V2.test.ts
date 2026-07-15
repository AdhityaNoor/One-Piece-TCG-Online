import { describe, expect, it } from 'vitest';
import type { EffectDefinition_V2, ResolutionNode_V2, StandardTiming_V2 } from '../../../cards/effectCompiler_V2/types_V2';
import type { EffectGate_V2 } from '../../../cards/effectCompiler_V2/effectIr_V2';
import type { CardDefinition, CardInstance } from '../../state/card';
import type { CardDefinitionLookup } from '../../rules/shared';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { GameLogEntry } from '../../logs/logEntry';
import type { EffectRuntimeBundle_V2 } from '../runtime_V2';
import { applyV2EffectsForAction, validateActivateCardEffect_V2 } from '../engineAdapter_V2';

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

function runtime(effects: EffectDefinition_V2[], gatesByAbilityId: Record<string, EffectGate_V2[]> = {}): EffectRuntimeBundle_V2 {
  return {
    programsByCardNumber: {
      'TEST-LEADER': {
        schemaVersion: 'op-tcg-effect-v2.0.0',
        cardNumber: 'TEST-LEADER',
        canonicalEffects: effects,
        abilities: effects.map((candidate) => ({
          abilityId: candidate.id,
          timing: candidate.timing ?? { kind: 'STANDARD_TIMING', timing: 'ON_ENTER_PLAY' },
          gates: gatesByAbilityId[candidate.id],
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
