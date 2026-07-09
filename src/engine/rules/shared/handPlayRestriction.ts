import type { GameState } from '../../state/game';

/** True when `playerId` cannot play any card from hand due to an active restriction. */
export function isControllerHandPlayPrevented(state: GameState, playerId: string): boolean {
  return state.continuousEffects.some(
    (record) => record.handPlayRestriction?.appliesToControllerId === playerId,
  );
}
