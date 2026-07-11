/**
 * Player-visible information helpers for the CPU.
 * Never read opponent hand contents or unrevealed private zones.
 */
import type { GameState } from '../../engine/state/game';
import type { CardInstance } from '../../engine/state/card';
import { getOpponentId } from '../../engine/rules/shared';

export function ownHandIds(state: GameState, playerId: string): string[] {
  return state.players[playerId]?.hand.cardIds ?? [];
}

export function ownActiveDonIds(state: GameState, playerId: string): string[] {
  const player = state.players[playerId];
  if (!player) return [];
  return player.costArea.cardIds.filter((id) => {
    const inst = state.cardsById[id];
    return inst?.ownerId === playerId && inst.currentZone === 'costArea' && inst.donRested === false;
  });
}

export function ownFieldCardIds(state: GameState, playerId: string): string[] {
  const player = state.players[playerId];
  if (!player) return [];
  return [
    player.leaderInstanceId,
    ...player.characterArea.cardIds,
    ...player.stageArea.cardIds,
  ].filter((id): id is string => !!id);
}

export function opponentPublicCardIds(state: GameState, playerId: string): string[] {
  const opponentId = getOpponentId(state, playerId);
  const opponent = state.players[opponentId];
  if (!opponent) return [];
  return [
    opponent.leaderInstanceId,
    ...opponent.characterArea.cardIds,
    ...opponent.stageArea.cardIds,
  ].filter((id): id is string => !!id);
}

export function visibleInstance(state: GameState, instanceId: string, viewerId: string): CardInstance | null {
  const inst = state.cardsById[instanceId];
  if (!inst) return null;
  if (inst.ownerId === viewerId) return inst;
  if (inst.currentZone === 'characterArea' || inst.currentZone === 'leaderArea' || inst.currentZone === 'stageArea') {
    return inst;
  }
  if (inst.currentZone === 'trash' && inst.revealedTo === 'all') return inst;
  if (inst.currentZone === 'lifeArea' && inst.faceState === 'faceUp') return inst;
  return null;
}

export function opponentHandCount(state: GameState, playerId: string): number {
  return state.players[getOpponentId(state, playerId)]?.hand.cardIds.length ?? 0;
}

export function opponentDeckCount(state: GameState, playerId: string): number {
  return state.players[getOpponentId(state, playerId)]?.deck.cardIds.length ?? 0;
}

export function ownLifeCount(state: GameState, playerId: string): number {
  return state.players[playerId]?.lifeArea.cardIds.length ?? 0;
}

export function opponentLifeCount(state: GameState, playerId: string): number {
  return state.players[getOpponentId(state, playerId)]?.lifeArea.cardIds.length ?? 0;
}
