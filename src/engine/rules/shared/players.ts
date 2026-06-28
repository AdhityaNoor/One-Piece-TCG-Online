import type { GameState } from '../../state/game';

/** One Piece TCG is strictly 2-player (1-1-1) — there is always exactly one "the other player". */
export function getOpponentId(state: GameState, playerId: string): string {
  const opponentId = Object.keys(state.players).find((id) => id !== playerId);
  if (!opponentId) {
    throw new Error(`getOpponentId: no opponent found for '${playerId}' — expected exactly two players.`);
  }
  return opponentId;
}
