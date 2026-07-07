import type { CardMovementSpec } from './types';

/** Layer-5 presentation tweaks that depend on seat binding (not engine state). */
export function applyMovementPresentation(
  specs: CardMovementSpec[],
  localPlayerId: string | null,
): CardMovementSpec[] {
  return specs.map((spec) => ({
    ...spec,
    revealFaceOnLand:
      spec.to.zone === 'hand' &&
      (localPlayerId === null || spec.playerId === localPlayerId),
  }));
}
