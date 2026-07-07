import { useCardAnimationStore } from '../store/cardAnimationStore';

/** True while a flying-card clone is animating for this instance (hide the live tile). */
export function useCardFlightHidden(instanceId: string): boolean {
  return useCardAnimationStore((s) => s.hiddenDuringFlight[instanceId] === true);
}
