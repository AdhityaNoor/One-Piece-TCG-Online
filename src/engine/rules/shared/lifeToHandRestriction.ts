import type { GameState } from '../../state/game';

/** True when `playerId` has an active "cannot add Life to hand using your own effects" restriction. */
export function isControllerLifeToHandPrevented(state: GameState, playerId: string): boolean {
  return state.continuousEffects.some(
    (record) => record.lifeToHandRestriction?.appliesToControllerId === playerId,
  );
}
