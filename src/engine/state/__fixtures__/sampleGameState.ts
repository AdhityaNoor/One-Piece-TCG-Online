/**
 * Minimal but fully-valid GameState fixture. Exists purely to prove the
 * Section 20 interfaces are usable and serializable — it is NOT a real
 * setup flow (see blueprint Known Limitations / Next Recommended Task).
 */
import type { GameState } from '../game';
import type { PlayerState } from '../player';
import type { CardInstance } from '../card';
import type { Zone, ZoneId } from '../zone';

function emptyZone(id: ZoneId, visibility: 'open' | 'secret', maxSize?: number): Zone {
  // Deliberately omit the `maxSize` key entirely when absent, rather than
  // setting it to `undefined` — an explicit undefined-valued key survives
  // in memory but is silently dropped by JSON.stringify, which would make
  // this object fail the "no undefined values anywhere" serializability
  // check (see __tests__/serialization.test.ts).
  return maxSize === undefined
    ? { id, visibility, cardIds: [] }
    : { id, visibility, cardIds: [], maxSize };
}

function makeLeader(instanceId: string, ownerId: string): CardInstance {
  return {
    instanceId,
    cardDefinitionId: 'OP01-001',
    ownerId,
    controllerId: ownerId,
    currentZone: 'leaderArea',
    orientation: 'active',
    faceState: 'faceUp',
    donAttached: [],
    currentPower: 5000,
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: 'all',
  };
}

function makePlayer(playerId: string, leaderInstanceId: string): PlayerState {
  return {
    playerId,
    leaderInstanceId,
    leaderLifeValue: 5,
    deck: emptyZone('deck', 'secret'),
    donDeck: emptyZone('donDeck', 'open'),
    hand: emptyZone('hand', 'secret'),
    characterArea: emptyZone('characterArea', 'open', 5),
    stageArea: emptyZone('stageArea', 'open', 1),
    costArea: emptyZone('costArea', 'open'),
    trash: emptyZone('trash', 'open'),
    lifeArea: emptyZone('lifeArea', 'secret'),
    hasGoneFirst: playerId === 'p1',
    hasMulliganed: false,
  };
}

export function createSampleGameState(): GameState {
  const p1Leader = makeLeader('p1-leader', 'p1');
  const p2Leader = makeLeader('p2-leader', 'p2');

  return {
    turnNumber: 1,
    activePlayerId: 'p1',
    currentPhase: 'main',
    currentBattle: null,
    setupState: null,
    players: {
      p1: makePlayer('p1', p1Leader.instanceId),
      p2: makePlayer('p2', p2Leader.instanceId),
    },
    cardsById: {
      [p1Leader.instanceId]: p1Leader,
      [p2Leader.instanceId]: p2Leader,
    },
    rng: { seed: 'test-seed', cursor: 0 },
    continuousEffects: [],
    oncePerTurnUsage: {},
    pendingChoices: [],
    log: [],
    gameOver: null,
    isFirstTurnOfGame: true,
  };
}
