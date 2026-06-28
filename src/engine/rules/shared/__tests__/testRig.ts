/**
 * Test-only mid-game GameState builder, shared by every dispatch/handler/
 * battle/phase test file under /src/engine. Constructs a fully-valid,
 * "live" GameState DIRECTLY (bypassing the real setup flow) so a test can
 * set up exactly the board position it needs in a couple of lines — the
 * same "direct construction" convention as state/__fixtures__/sampleGameState.ts
 * and setup/__tests__/fixtures.ts, generalized with parameters.
 *
 * Fabricated card data only (never the OPTCG API) — mirrors the project
 * ground rule that nothing in /src/engine imports /src/cards; these tests
 * keep that same boundary.
 */
import type { GameState, Phase } from '../../../state/game';
import type { PlayerState } from '../../../state/player';
import type { CardDefinition, CardInstance } from '../../../state/card';
import type { Zone, ZoneId } from '../../../state/zone';
import type { CardDefinitionLookup } from '../definitions';

export interface Rig {
  state: GameState;
  defs: CardDefinitionLookup;
}

let counter = 0;
export function nextTestId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeLeaderDef(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: nextTestId('leaderDef'),
    name: 'Test Leader',
    category: 'leader',
    colors: ['red'],
    types: [],
    basePower: 5000,
    text: '',
    life: 5,
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: nextTestId('TL'),
    ...overrides,
  };
}

export function makeCharacterDef(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: nextTestId('charDef'),
    name: 'Test Character',
    category: 'character',
    colors: ['red'],
    types: [],
    basePower: 1000,
    baseCost: 1,
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: nextTestId('TC'),
    ...overrides,
  };
}

export function makeStageDef(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: nextTestId('stageDef'),
    name: 'Test Stage',
    category: 'stage',
    colors: ['red'],
    types: [],
    baseCost: 1,
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: nextTestId('TS'),
    ...overrides,
  };
}

export function makeEventDef(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: nextTestId('eventDef'),
    name: 'Test Event',
    category: 'event',
    colors: ['red'],
    types: [],
    baseCost: 1,
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: nextTestId('TE'),
    ...overrides,
  };
}

export function makeDonDef(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: 'DON-CARD',
    name: 'DON!!',
    category: 'don',
    colors: [],
    types: [],
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: 'DON-CARD',
    ...overrides,
  };
}

function emptyZone(id: ZoneId, visibility: 'open' | 'secret', maxSize?: number): Zone {
  return maxSize === undefined ? { id, visibility, cardIds: [] } : { id, visibility, cardIds: [], maxSize };
}

function makePlayerState(playerId: string, leaderInstanceId: string, leaderLifeValue: number): PlayerState {
  return {
    playerId,
    leaderInstanceId,
    leaderLifeValue,
    deck: emptyZone('deck', 'secret'),
    donDeck: emptyZone('donDeck', 'open'),
    hand: emptyZone('hand', 'secret'),
    characterArea: emptyZone('characterArea', 'open', 5),
    stageArea: emptyZone('stageArea', 'open', 1),
    costArea: emptyZone('costArea', 'open'),
    trash: emptyZone('trash', 'open'),
    lifeArea: emptyZone('lifeArea', 'secret'),
    hasGoneFirst: playerId === 'p1',
    hasMulliganed: true,
  };
}

export interface BuildBaseRigOptions {
  turnNumber?: number;
  activePlayerId?: 'p1' | 'p2';
  phase?: Phase;
  isFirstTurnOfGame?: boolean;
  leaderOverridesP1?: Partial<CardDefinition>;
  leaderOverridesP2?: Partial<CardDefinition>;
}

/** Base 2-player rig: both Leaders active/face-up, everything else empty. Defaults to a turn-3 Main Phase (battle-legal, no first-turn exceptions). */
export function buildBaseRig(opts: BuildBaseRigOptions = {}): Rig {
  const leaderDefP1 = makeLeaderDef(opts.leaderOverridesP1);
  const leaderDefP2 = makeLeaderDef(opts.leaderOverridesP2);
  const leaderP1Id = nextTestId('leader-instance');
  const leaderP2Id = nextTestId('leader-instance');

  const makeLeaderInstance = (instanceId: string, def: CardDefinition, ownerId: string): CardInstance => ({
    instanceId,
    cardDefinitionId: def.cardDefinitionId,
    ownerId,
    controllerId: ownerId,
    currentZone: 'leaderArea',
    orientation: 'active',
    faceState: 'faceUp',
    donAttached: [],
    currentPower: def.basePower,
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: 'all',
  });

  const p1Leader = makeLeaderInstance(leaderP1Id, leaderDefP1, 'p1');
  const p2Leader = makeLeaderInstance(leaderP2Id, leaderDefP2, 'p2');

  const state: GameState = {
    turnNumber: opts.turnNumber ?? 3,
    activePlayerId: opts.activePlayerId ?? 'p1',
    currentPhase: opts.phase ?? 'main',
    currentBattle: null,
    setupState: null,
    players: {
      p1: makePlayerState('p1', leaderP1Id, leaderDefP1.life ?? 5),
      p2: makePlayerState('p2', leaderP2Id, leaderDefP2.life ?? 5),
    },
    cardsById: { [leaderP1Id]: p1Leader, [leaderP2Id]: p2Leader },
    rng: { seed: 'rig-seed', cursor: 0 },
    continuousEffects: [],
    oncePerTurnUsage: {},
    pendingChoices: [],
    log: [],
    gameOver: null,
    isFirstTurnOfGame: opts.isFirstTurnOfGame ?? false,
    nextInstanceSeq: 0,
  };

  const defs: CardDefinitionLookup = {
    [leaderDefP1.cardDefinitionId]: leaderDefP1,
    [leaderDefP2.cardDefinitionId]: leaderDefP2,
  };

  return { state, defs };
}

export function putInHand(rig: Rig, playerId: 'p1' | 'p2', def: CardDefinition, overrides: Partial<CardInstance> = {}): { rig: Rig; instanceId: string } {
  const instanceId = nextTestId('hand-card');
  const instance: CardInstance = {
    instanceId,
    cardDefinitionId: def.cardDefinitionId,
    ownerId: playerId,
    controllerId: playerId,
    currentZone: 'hand',
    orientation: null,
    faceState: 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: 'all',
    ...overrides,
  };
  const player = rig.state.players[playerId];
  const nextState: GameState = {
    ...rig.state,
    cardsById: { ...rig.state.cardsById, [instanceId]: instance },
    players: {
      ...rig.state.players,
      [playerId]: { ...player, hand: { ...player.hand, cardIds: [...player.hand.cardIds, instanceId] } },
    },
  };
  return { rig: { state: nextState, defs: { ...rig.defs, [def.cardDefinitionId]: def } }, instanceId };
}

/** Places a Character directly into play (characterArea), bypassing PLAY_CHARACTER. */
export function putCharacterInPlay(rig: Rig, playerId: 'p1' | 'p2', def: CardDefinition, overrides: Partial<CardInstance> = {}): { rig: Rig; instanceId: string } {
  const instanceId = nextTestId('field-character');
  const instance: CardInstance = {
    instanceId,
    cardDefinitionId: def.cardDefinitionId,
    ownerId: playerId,
    controllerId: playerId,
    currentZone: 'characterArea',
    orientation: 'active',
    faceState: 'faceUp',
    donAttached: [],
    currentPower: def.basePower,
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: 'all',
    ...overrides,
  };
  const player = rig.state.players[playerId];
  const nextState: GameState = {
    ...rig.state,
    cardsById: { ...rig.state.cardsById, [instanceId]: instance },
    players: {
      ...rig.state.players,
      [playerId]: { ...player, characterArea: { ...player.characterArea, cardIds: [...player.characterArea.cardIds, instanceId] } },
    },
  };
  return { rig: { state: nextState, defs: { ...rig.defs, [def.cardDefinitionId]: def } }, instanceId };
}

export function putStageInPlay(rig: Rig, playerId: 'p1' | 'p2', def: CardDefinition, overrides: Partial<CardInstance> = {}): { rig: Rig; instanceId: string } {
  const instanceId = nextTestId('field-stage');
  const instance: CardInstance = {
    instanceId,
    cardDefinitionId: def.cardDefinitionId,
    ownerId: playerId,
    controllerId: playerId,
    currentZone: 'stageArea',
    orientation: null,
    faceState: 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: 'all',
    ...overrides,
  };
  const player = rig.state.players[playerId];
  const nextState: GameState = {
    ...rig.state,
    cardsById: { ...rig.state.cardsById, [instanceId]: instance },
    players: {
      ...rig.state.players,
      [playerId]: { ...player, stageArea: { ...player.stageArea, cardIds: [instanceId] } },
    },
  };
  return { rig: { state: nextState, defs: { ...rig.defs, [def.cardDefinitionId]: def } }, instanceId };
}

export function putDon(rig: Rig, playerId: 'p1' | 'p2', count: number, opts: { rested?: boolean } = {}): { rig: Rig; donIds: string[] } {
  const donDef = makeDonDef();
  const donIds: string[] = [];
  const cardsById = { ...rig.state.cardsById };
  for (let i = 0; i < count; i += 1) {
    const id = nextTestId('don');
    donIds.push(id);
    cardsById[id] = {
      instanceId: id,
      cardDefinitionId: donDef.cardDefinitionId,
      ownerId: playerId,
      controllerId: playerId,
      currentZone: 'costArea',
      orientation: null,
      donRested: opts.rested ?? false,
      faceState: 'faceUp',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: 'all',
    };
  }
  const player = rig.state.players[playerId];
  const nextState: GameState = {
    ...rig.state,
    cardsById,
    players: {
      ...rig.state.players,
      [playerId]: { ...player, costArea: { ...player.costArea, cardIds: [...player.costArea.cardIds, ...donIds] } },
    },
  };
  return { rig: { state: nextState, defs: { ...rig.defs, [donDef.cardDefinitionId]: donDef } }, donIds };
}

/** defsList[0] ends up on TOP of the Life area (cardIds[0]) — i.e. the first card taken as damage. */
export function putLifeCards(rig: Rig, playerId: 'p1' | 'p2', defsList: CardDefinition[]): { rig: Rig; lifeIds: string[] } {
  const lifeIds: string[] = [];
  const cardsById = { ...rig.state.cardsById };
  const defs = { ...rig.defs };
  for (const def of defsList) {
    const id = nextTestId('life-card');
    lifeIds.push(id);
    defs[def.cardDefinitionId] = def;
    cardsById[id] = {
      instanceId: id,
      cardDefinitionId: def.cardDefinitionId,
      ownerId: playerId,
      controllerId: playerId,
      currentZone: 'lifeArea',
      orientation: null,
      faceState: 'faceDown',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: [], // 3-10: secret even from its own owner until revealed
    };
  }
  const player = rig.state.players[playerId];
  const nextState: GameState = {
    ...rig.state,
    cardsById,
    players: {
      ...rig.state.players,
      [playerId]: { ...player, lifeArea: { ...player.lifeArea, cardIds: [...player.lifeArea.cardIds, ...lifeIds] } },
    },
  };
  return { rig: { state: nextState, defs }, lifeIds };
}

export function putDeckCards(rig: Rig, playerId: 'p1' | 'p2', def: CardDefinition, count: number): { rig: Rig; deckIds: string[] } {
  const deckIds: string[] = [];
  const cardsById = { ...rig.state.cardsById };
  for (let i = 0; i < count; i += 1) {
    const id = nextTestId('deck-card');
    deckIds.push(id);
    cardsById[id] = {
      instanceId: id,
      cardDefinitionId: def.cardDefinitionId,
      ownerId: playerId,
      controllerId: playerId,
      currentZone: 'deck',
      orientation: null,
      faceState: 'faceDown',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: [],
    };
  }
  const player = rig.state.players[playerId];
  const nextState: GameState = {
    ...rig.state,
    cardsById,
    players: {
      ...rig.state.players,
      [playerId]: { ...player, deck: { ...player.deck, cardIds: [...player.deck.cardIds, ...deckIds] } },
    },
  };
  return { rig: { state: nextState, defs: { ...rig.defs, [def.cardDefinitionId]: def } }, deckIds };
}

export function putDonDeckCards(rig: Rig, playerId: 'p1' | 'p2', count: number): { rig: Rig; donDeckIds: string[] } {
  const donDef = makeDonDef();
  const donDeckIds: string[] = [];
  const cardsById = { ...rig.state.cardsById };
  for (let i = 0; i < count; i += 1) {
    const id = nextTestId('dondeck-card');
    donDeckIds.push(id);
    cardsById[id] = {
      instanceId: id,
      cardDefinitionId: donDef.cardDefinitionId,
      ownerId: playerId,
      controllerId: playerId,
      currentZone: 'donDeck',
      orientation: null,
      faceState: 'faceDown',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: 'all',
    };
  }
  const player = rig.state.players[playerId];
  const nextState: GameState = {
    ...rig.state,
    cardsById,
    players: {
      ...rig.state.players,
      [playerId]: { ...player, donDeck: { ...player.donDeck, cardIds: [...player.donDeck.cardIds, ...donDeckIds] } },
    },
  };
  return { rig: { state: nextState, defs: { ...rig.defs, [donDef.cardDefinitionId]: donDef } }, donDeckIds };
}
