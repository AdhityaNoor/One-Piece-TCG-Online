import type { GameState } from '../../state/game';

/** True when a Character-sourced effect from `sourceInstanceId` cannot set DON!! active for `controllerId`. */
export function isControllerCharacterSetActiveDonPrevented(
  state: GameState,
  controllerId: string,
  sourceInstanceId: string,
): boolean {
  const restricted = state.continuousEffects.some(
    (record) => record.characterSetActiveDonRestriction?.appliesToControllerId === controllerId,
  );
  if (!restricted) return false;
  const source = state.cardsById[sourceInstanceId];
  return source?.controllerId === controllerId && source.currentZone === 'characterArea';
}
