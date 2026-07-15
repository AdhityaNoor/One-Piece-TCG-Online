import type { GameState } from '../state/game';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../rules/shared/zoneOps';

export interface LookBuffer_V2 {
  id: string;
  playerId: string;
  sourceZone: 'deck' | 'lifeArea';
  lookedInstanceIds: string[];
  selectedInstanceIds: string[];
  remainingInstanceIds: string[];
}

export interface LookBufferMoveResult_V2 {
  state: GameState;
  buffer: LookBuffer_V2;
}

export function createDeckLookBuffer_V2(state: GameState, playerId: string, count: number, id = `look:${playerId}:${state.turnNumber}`): LookBuffer_V2 {
  const lookedInstanceIds = state.players[playerId]?.deck.cardIds.slice(0, Math.max(0, count)) ?? [];
  return {
    id,
    playerId,
    sourceZone: 'deck',
    lookedInstanceIds,
    selectedInstanceIds: [],
    remainingInstanceIds: [...lookedInstanceIds],
  };
}

export function createLifeLookBuffer_V2(state: GameState, playerId: string, count: number, id = `look-life:${playerId}:${state.turnNumber}`): LookBuffer_V2 {
  const lookedInstanceIds = state.players[playerId]?.lifeArea.cardIds.slice(0, Math.max(0, count)) ?? [];
  return {
    id,
    playerId,
    sourceZone: 'lifeArea',
    lookedInstanceIds,
    selectedInstanceIds: [],
    remainingInstanceIds: [...lookedInstanceIds],
  };
}

export function createLookBufferFromIds_V2(params: {
  id: string;
  playerId: string;
  sourceZone: LookBuffer_V2['sourceZone'];
  lookedInstanceIds: readonly string[];
}): LookBuffer_V2 {
  return {
    id: params.id,
    playerId: params.playerId,
    sourceZone: params.sourceZone,
    lookedInstanceIds: [...params.lookedInstanceIds],
    selectedInstanceIds: [],
    remainingInstanceIds: [...params.lookedInstanceIds],
  };
}

export function createLifeLookBufferAtPosition_V2(
  state: GameState,
  playerId: string,
  count: number,
  position: 'TOP' | 'BOTTOM' | 'ALL',
  id = `look-life:${playerId}:${state.turnNumber}`,
): LookBuffer_V2 {
  const lifeIds = state.players[playerId]?.lifeArea.cardIds ?? [];
  const lookedInstanceIds = position === 'ALL'
    ? lifeIds
    : position === 'BOTTOM'
      ? lifeIds.slice(Math.max(0, lifeIds.length - Math.max(0, count)))
      : lifeIds.slice(0, Math.max(0, count));
  return createLookBufferFromIds_V2({ id, playerId, sourceZone: 'lifeArea', lookedInstanceIds });
}

export function selectFromLookBuffer_V2(buffer: LookBuffer_V2, selectedInstanceIds: readonly string[]): LookBuffer_V2 {
  const looked = new Set(buffer.lookedInstanceIds);
  const selected = selectedInstanceIds.filter((id) => looked.has(id));
  const selectedSet = new Set(selected);
  return {
    ...buffer,
    selectedInstanceIds: selected,
    remainingInstanceIds: buffer.lookedInstanceIds.filter((id) => !selectedSet.has(id)),
  };
}

function assertSameMembers(expected: readonly string[], actual: readonly string[]): void {
  const expectedSorted = [...expected].sort();
  const actualSorted = [...actual].sort();
  if (expectedSorted.length !== actualSorted.length || expectedSorted.some((id, index) => id !== actualSorted[index])) {
    throw new Error('V2 look-buffer reorder must include exactly the remaining looked cards.');
  }
}

export function reorderLookBufferRemainderToDeckBottom_V2(state: GameState, buffer: LookBuffer_V2, orderedRemainderIds: readonly string[]): GameState {
  assertSameMembers(buffer.remainingInstanceIds, orderedRemainderIds);
  const player = state.players[buffer.playerId];
  if (!player) return state;
  let deck = player.deck;
  for (const id of orderedRemainderIds) deck = removeFromZone(deck, id);
  for (const id of orderedRemainderIds) deck = addToZoneBottom(deck, id);
  return {
    ...state,
    players: {
      ...state.players,
      [buffer.playerId]: { ...player, deck },
    },
  };
}

export function reorderLookBufferRemainderToDeckTop_V2(state: GameState, buffer: LookBuffer_V2, orderedRemainderIds: readonly string[]): GameState {
  assertSameMembers(buffer.remainingInstanceIds, orderedRemainderIds);
  const player = state.players[buffer.playerId];
  if (!player) return state;
  let deck = player.deck;
  for (const id of orderedRemainderIds) deck = removeFromZone(deck, id);
  for (const id of [...orderedRemainderIds].reverse()) deck = addToZoneTop(deck, id);
  return {
    ...state,
    players: {
      ...state.players,
      [buffer.playerId]: { ...player, deck },
    },
  };
}

export function reorderLifeArea_V2(state: GameState, playerId: string, orderedLifeIds: readonly string[]): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  assertSameMembers(player.lifeArea.cardIds, orderedLifeIds);
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, lifeArea: { ...player.lifeArea, cardIds: [...orderedLifeIds] } },
    },
  };
}
