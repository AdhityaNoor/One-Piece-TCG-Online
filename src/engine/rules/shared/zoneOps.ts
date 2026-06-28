/**
 * Small, pure, immutable Zone helpers shared by every action handler that
 * moves a card between zones. Source of truth for zone shape: state/zone.ts.
 */
import type { Zone } from '../../state/zone';

export function removeFromZone(zone: Zone, instanceId: string): Zone {
  return { ...zone, cardIds: zone.cardIds.filter((id) => id !== instanceId) };
}

/** cardIds[0] is "top of stack" (zone.ts convention) — insert at the front. */
export function addToZoneTop(zone: Zone, instanceId: string): Zone {
  return { ...zone, cardIds: [instanceId, ...zone.cardIds] };
}

export function addToZoneBottom(zone: Zone, instanceId: string): Zone {
  return { ...zone, cardIds: [...zone.cardIds, instanceId] };
}
