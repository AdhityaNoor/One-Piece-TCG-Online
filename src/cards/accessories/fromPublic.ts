/**
 * Maps a server master-data row (shared/accessories.ts PublicAccessory,
 * backed by MongoDB + Vercel Blob) onto the app's own AccessoryOption shape.
 * The only real differences are the id field name (`optionId` -> `id`) and
 * that Blob URLs are already absolute. `packSize` is display-only and dropped
 * here (AccessoryOption has no such field).
 */
import type { PublicAccessory } from '../../../shared/accessories';
import type { AccessoryOption } from './types';

export function accessoryOptionFromPublic(row: PublicAccessory): AccessoryOption {
  return {
    id: row.optionId,
    kind: row.kind,
    name: row.name,
    source: row.source,
    imageUrl: row.imageUrl,
    thumbnailUrl: row.thumbnailUrl,
  };
}
