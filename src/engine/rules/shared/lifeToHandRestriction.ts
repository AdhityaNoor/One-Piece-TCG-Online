import type { GameState } from '../../state/game';

/** True when `playerId` has an active "cannot add Life to hand using your own effects" restriction. */
export function isControllerLifeToHandPrevented(state: GameState, playerId: string): boolean {
  return state.continuousEffects.some(
    (record) => record.lifeToHandRestriction?.appliesToControllerId === playerId,
  );
}

/** True when `playerId` cannot draw via card effects (Draw Phase still draws). */
export function isControllerEffectDrawPrevented(state: GameState, playerId: string): boolean {
  return state.continuousEffects.some(
    (record) => record.effectDrawRestriction?.appliesToControllerId === playerId,
  );
}

/** True when face-up Life for `playerId` must go to deck bottom instead of hand (ST13-003). */
export function isFaceUpLifeRedirectedToDeckBottom(state: GameState, playerId: string): boolean {
  return state.continuousEffects.some(
    (record) =>
      record.faceUpLifeLeaveReplacement?.appliesToControllerId === playerId
      && record.faceUpLifeLeaveReplacement.destination === 'deckBottom',
  );
}
