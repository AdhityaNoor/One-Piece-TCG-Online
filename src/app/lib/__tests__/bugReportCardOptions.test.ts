import { describe, expect, it } from 'vitest';
import type { GameLogEntry } from '../../../engine/logs/logEntry';
import type { CardInstance, CardDefinition } from '../../../engine/state/card';
import type { CardDefinitionLookup } from '../../../engine/rules/shared';
import { buildBugReportCardOptions } from '../bugReportCardOptions';

function playedEntry(overrides: Partial<GameLogEntry> = {}): GameLogEntry {
  return {
    id: 'log-1',
    sequence: 1,
    turnNumber: 1,
    phase: 'main',
    actorPlayerId: 'p1',
    type: 'CARD_PLAYED',
    message: 'p1 played a card.',
    data: {},
    relatedCardInstanceIds: [],
    visibility: 'public',
    causedByActionId: null,
    ...overrides,
  };
}

function instance(overrides: Partial<CardInstance> = {}): CardInstance {
  return {
    instanceId: 'inst-1',
    cardDefinitionId: 'OP01-001',
    ownerId: 'p1',
    controllerId: 'p1',
    currentZone: 'characterArea',
    orientation: 'active',
    faceState: 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: 'all',
    ...overrides,
  };
}

function definition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: 'OP01-001',
    name: 'Monkey.D.Luffy',
    category: 'character',
    colors: ['red'],
    types: ['Straw Hat Crew'],
    text: '[On Play] Draw 1 card.',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: 'OP01-001',
    ...overrides,
  };
}

describe('buildBugReportCardOptions', () => {
  it('only surfaces CARD_PLAYED entries, skipping other log event types', () => {
    const log: GameLogEntry[] = [
      playedEntry({ type: 'PHASE_CHANGED', relatedCardInstanceIds: ['inst-1'] }),
      playedEntry({ type: 'ATTACK_DECLARED', relatedCardInstanceIds: ['inst-1'] }),
    ];
    const state = { cardsById: { 'inst-1': instance() } };
    const defs: CardDefinitionLookup = { 'OP01-001': definition() };

    expect(buildBugReportCardOptions(log, state, defs)).toHaveLength(0);
  });

  it('labels an option with name, card number, and turn from the definition lookup', () => {
    const log: GameLogEntry[] = [playedEntry({ relatedCardInstanceIds: ['inst-1'], turnNumber: 3, sequence: 7 })];
    const state = { cardsById: { 'inst-1': instance() } };
    const defs: CardDefinitionLookup = { 'OP01-001': definition() };

    const options = buildBugReportCardOptions(log, state, defs);
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe('Monkey.D.Luffy (OP01-001) — Turn 3');
    expect(options[0].snapshot).toEqual({
      cardInstanceId: 'inst-1',
      cardDefinitionId: 'OP01-001',
      cardNumber: 'OP01-001',
      cardName: 'Monkey.D.Luffy',
      cardText: '[On Play] Draw 1 card.',
    });
  });

  it('falls back to a placeholder label when the instance or definition is missing', () => {
    const log: GameLogEntry[] = [playedEntry({ relatedCardInstanceIds: ['ghost-instance'] })];
    const state = { cardsById: {} };
    const defs: CardDefinitionLookup = {};

    const options = buildBugReportCardOptions(log, state, defs);
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe('Card ghost-instance — Turn 1');
    expect(options[0].snapshot.cardDefinitionId).toBe('unknown');
  });

  it('de-duplicates an instance id that appears in more than one CARD_PLAYED entry', () => {
    const log: GameLogEntry[] = [
      playedEntry({ id: 'a', sequence: 1, relatedCardInstanceIds: ['inst-1'] }),
      playedEntry({ id: 'b', sequence: 2, relatedCardInstanceIds: ['inst-1'] }),
    ];
    const state = { cardsById: { 'inst-1': instance() } };
    const defs: CardDefinitionLookup = { 'OP01-001': definition() };

    expect(buildBugReportCardOptions(log, state, defs)).toHaveLength(1);
  });

  it('orders options newest-play-first by log sequence', () => {
    const log: GameLogEntry[] = [
      playedEntry({ id: 'a', sequence: 1, relatedCardInstanceIds: ['inst-1'] }),
      playedEntry({ id: 'b', sequence: 5, relatedCardInstanceIds: ['inst-2'] }),
    ];
    const state = {
      cardsById: {
        'inst-1': instance({ instanceId: 'inst-1' }),
        'inst-2': instance({ instanceId: 'inst-2' }),
      },
    };
    const defs: CardDefinitionLookup = { 'OP01-001': definition() };

    const options = buildBugReportCardOptions(log, state, defs);
    expect(options.map((o) => o.cardInstanceId)).toEqual(['inst-2', 'inst-1']);
  });
});
