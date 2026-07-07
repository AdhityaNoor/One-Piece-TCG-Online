import { describe, expect, it } from 'vitest';
import type { GameLogEntry } from '../../engine/logs/logEntry';
import type { GameState } from '../../engine/state/game';
import { parseMovementSpecs } from './parseLogEntries';

function logEntry(partial: Partial<GameLogEntry> & Pick<GameLogEntry, 'type' | 'id'>): GameLogEntry {
  return {
    sequence: 1,
    turnNumber: 1,
    phase: 'main',
    actorPlayerId: 'p1',
    message: '',
    data: {},
    relatedCardInstanceIds: [],
    visibility: 'public',
    causedByActionId: 'a1',
    ...partial,
  };
}

function minimalState(cardsById: GameState['cardsById']): GameState {
  return {
    cardsById,
    players: {} as GameState['players'],
    activePlayerId: 'p1',
    turnNumber: 1,
    currentPhase: 'main',
    log: [],
    pendingChoices: [],
    continuousEffects: [],
    isFirstTurnOfGame: false,
    rngState: { seed: 's', cursor: 0 },
    gameOver: null,
  };
}

describe('parseMovementSpecs', () => {
  it('maps CARD_DRAWN to deck → hand', () => {
    const prev = minimalState({
      c1: {
        instanceId: 'c1',
        cardDefinitionId: 'OP01-001',
        ownerId: 'p1',
        currentZone: 'deck',
        faceState: 'faceDown',
        orientation: 'active',
        donAttached: [],
        revealedTo: [],
        appliedContinuousEffectIds: [],
        oncePerTurnUsed: [],
        summoningSick: false,
        enteredPlayTurn: 0,
      },
    });

    const specs = parseMovementSpecs(
      prev,
      [
        logEntry({
          id: 'l1',
          type: 'CARD_DRAWN',
          actorPlayerId: 'p1',
          relatedCardInstanceIds: ['c1'],
        }),
      ],
      { 'OP01-001': 'https://example/card.jpg' },
    );

    expect(specs).toHaveLength(1);
    expect(specs[0]?.from.zone).toBe('deck');
    expect(specs[0]?.to.zone).toBe('hand');
    expect(specs[0]?.faceDown).toBe(true);
  });

  it('maps life damage to life → hand or trash', () => {
    const prev = minimalState({
      life1: {
        instanceId: 'life1',
        cardDefinitionId: 'OP01-002',
        ownerId: 'p2',
        currentZone: 'lifeArea',
        faceState: 'faceDown',
        orientation: 'active',
        donAttached: [],
        revealedTo: [],
        appliedContinuousEffectIds: [],
        oncePerTurnUsed: [],
        summoningSick: false,
        enteredPlayTurn: 0,
      },
    });

    const toHand = parseMovementSpecs(
      prev,
      [
        logEntry({
          id: 'l2',
          type: 'DAMAGE_DEALT',
          actorPlayerId: 'p2',
          data: { lifeCardInstanceId: 'life1', banish: false },
          relatedCardInstanceIds: ['life1'],
        }),
      ],
      {},
    );
    expect(toHand[0]?.from.zone).toBe('life');
    expect(toHand[0]?.to.zone).toBe('hand');

    const toTrash = parseMovementSpecs(
      prev,
      [
        logEntry({
          id: 'l3',
          type: 'DAMAGE_DEALT',
          actorPlayerId: 'p2',
          data: { lifeCardInstanceId: 'life1', banish: true },
          relatedCardInstanceIds: ['life1'],
        }),
      ],
      {},
    );
    expect(toTrash[0]?.to.zone).toBe('trash');
  });
});
