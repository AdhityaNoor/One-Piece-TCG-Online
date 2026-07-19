import { describe, expect, it } from 'vitest';
import type { GameLogEntry } from '../../../engine/logs/logEntry';
import type { CardInstance, CardDefinition } from '../../../engine/state/card';
import type { CardDefinitionLookup } from '../../../engine/rules/shared';
import type { PlayerState } from '../../../engine/state/player';
import type { Zone, ZoneId } from '../../../engine/state/zone';
import { buildBugReportCardOptions } from '../bugReportCardOptions';

function zone(id: ZoneId, visibility: Zone['visibility'] = 'secret'): Zone {
  return { id, visibility, cardIds: [] };
}

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    playerId: 'p1',
    leaderInstanceId: 'leader-p1',
    leaderLifeValue: 5,
    deck: zone('deck'),
    donDeck: zone('donDeck', 'open'),
    hand: zone('hand'),
    characterArea: zone('characterArea', 'open'),
    stageArea: zone('stageArea', 'open'),
    costArea: zone('costArea', 'open'),
    trash: zone('trash', 'open'),
    lifeArea: zone('lifeArea'),
    hasGoneFirst: false,
    hasMulliganed: false,
    ...overrides,
  };
}

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
    const state = { cardsById: { 'inst-1': instance() }, players: {} };
    const defs: CardDefinitionLookup = { 'OP01-001': definition() };

    expect(buildBugReportCardOptions(log, state, defs)).toHaveLength(0);
  });

  it('labels an option with name, card number, and turn from the definition lookup', () => {
    const log: GameLogEntry[] = [playedEntry({ relatedCardInstanceIds: ['inst-1'], turnNumber: 3, sequence: 7 })];
    const state = { cardsById: { 'inst-1': instance() }, players: {} };
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
      selectedEffectText: null,
    });
    // Single-ability text ("[On Play] Draw 1 card.") — nothing to choose between.
    expect(options[0].subEffects).toEqual([]);
  });

  it('falls back to a placeholder label when the instance or definition is missing', () => {
    const log: GameLogEntry[] = [playedEntry({ relatedCardInstanceIds: ['ghost-instance'] })];
    const state = { cardsById: {}, players: {} };
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
    const state = { cardsById: { 'inst-1': instance() }, players: {} };
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
      players: {},
    };
    const defs: CardDefinitionLookup = { 'OP01-001': definition() };

    const options = buildBugReportCardOptions(log, state, defs);
    expect(options.map((o) => o.cardInstanceId)).toEqual(['inst-2', 'inst-1']);
  });

  it('always includes both players\' Leaders, sorted before any CARD_PLAYED options', () => {
    const log: GameLogEntry[] = [playedEntry({ relatedCardInstanceIds: ['played-1'], sequence: 9 })];
    const state = {
      cardsById: {
        'leader-p1': instance({ instanceId: 'leader-p1', cardDefinitionId: 'OP01-001', currentZone: 'leaderArea' }),
        'leader-p2': instance({ instanceId: 'leader-p2', cardDefinitionId: 'OP01-001', currentZone: 'leaderArea', ownerId: 'p2', controllerId: 'p2' }),
        'played-1': instance({ instanceId: 'played-1' }),
      },
      players: {
        p1: player({ playerId: 'p1', leaderInstanceId: 'leader-p1' }),
        p2: player({ playerId: 'p2', leaderInstanceId: 'leader-p2' }),
      },
    };
    const defs: CardDefinitionLookup = { 'OP01-001': definition() };

    const options = buildBugReportCardOptions(log, state, defs);
    expect(options).toHaveLength(3);
    expect(options.slice(0, 2).map((o) => o.cardInstanceId).sort()).toEqual(['leader-p1', 'leader-p2']);
    expect(options[2].cardInstanceId).toBe('played-1');
    expect(options[0].label).toContain("Leader");
  });

  it('includes the handOwnerPlayerId player\'s hand, sorted after Leaders but before play history', () => {
    const log: GameLogEntry[] = [playedEntry({ relatedCardInstanceIds: ['played-1'], sequence: 4 })];
    const state = {
      cardsById: {
        'leader-p1': instance({ instanceId: 'leader-p1', cardDefinitionId: 'OP01-001', currentZone: 'leaderArea' }),
        'hand-1': instance({ instanceId: 'hand-1', currentZone: 'hand' }),
        'hand-2': instance({ instanceId: 'hand-2', currentZone: 'hand' }),
        'played-1': instance({ instanceId: 'played-1' }),
      },
      players: {
        p1: player({ playerId: 'p1', leaderInstanceId: 'leader-p1', hand: zone('hand', 'secret') }),
      },
    };
    state.players.p1.hand.cardIds.push('hand-1', 'hand-2');
    const defs: CardDefinitionLookup = { 'OP01-001': definition() };

    const options = buildBugReportCardOptions(log, state, defs, 'p1');
    expect(options.map((o) => o.cardInstanceId)).toEqual(['leader-p1', 'hand-1', 'hand-2', 'played-1']);
    expect(options[1].label).toContain('In Hand');
    expect(options.map((o) => o.section)).toEqual(['leader', 'hand', 'hand', 'field']);
  });

  it('omits hand cards when handOwnerPlayerId is null (default)', () => {
    const log: GameLogEntry[] = [];
    const state = {
      cardsById: { 'hand-1': instance({ instanceId: 'hand-1', currentZone: 'hand' }) },
      players: {
        p1: player({ playerId: 'p1', leaderInstanceId: 'leader-p1', hand: zone('hand', 'secret') }),
      },
    };
    state.players.p1.hand.cardIds.push('hand-1');
    const defs: CardDefinitionLookup = { 'OP01-001': definition() };

    // No handOwnerPlayerId passed — only the Leader (auto-included) should show up, never the hand card.
    const options = buildBugReportCardOptions(log, state, defs);
    expect(options.some((o) => o.cardInstanceId === 'hand-1')).toBe(false);
  });

  it('splits a multi-ability card into subEffects, one per bracketed ability', () => {
    const log: GameLogEntry[] = [playedEntry({ relatedCardInstanceIds: ['inst-1'] })];
    const state = {
      cardsById: { 'inst-1': instance() },
      players: {},
    };
    const defs: CardDefinitionLookup = {
      'OP01-001': definition({ text: '[On Play] Draw 1 card. [Trigger] Play this card.' }),
    };

    const options = buildBugReportCardOptions(log, state, defs);
    expect(options[0].subEffects).toHaveLength(2);
    expect(options[0].subEffects[0].text).toContain('[On Play]');
    expect(options[0].subEffects[1].text).toContain('[Trigger]');
  });
});
