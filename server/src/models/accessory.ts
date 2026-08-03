/**
 * Cosmetic deck ACCESSORY master-data row (card sleeves + DON!! card arts).
 * Metadata lives here in MongoDB; the image binary itself lives in Vercel
 * Blob and is referenced by absolute URL. Seeded/updated by
 * server/src/accessories/seedAccessories.ts and read publicly by
 * server/src/accessories/publicRoutes.ts.
 *
 * `optionId` is the STABLE, app-facing identifier a saved deck stores when a
 * player picks this accessory (see src/cards/accessories). It never changes
 * for a given product, so decks keep resolving even as rows are re-seeded —
 * upserts match on `optionId`.
 */
import type { ObjectId } from 'mongodb';

export type AccessoryKind = 'sleeve' | 'donArt';
export type AccessorySource = 'tcgplayer' | 'bundled' | 'optcg-api' | 'local-upload';

export interface AccessoryDocument {
  _id?: ObjectId;
  /** Stable catalog id, e.g. `sleeve-tcg-552134` or `don-art-<slug>`. Unique. */
  optionId: string;
  kind: AccessoryKind;
  name: string;
  source: AccessorySource;
  /** Absolute Vercel Blob URL of the full-resolution art. */
  imageUrl: string;
  /** Absolute Vercel Blob URL of the grid thumbnail (may equal imageUrl). */
  thumbnailUrl: string;
  /** Sleeve pack size (10/70) where known. */
  packSize?: number;
  /** Hidden from players when false, without deleting the row/asset. */
  active: boolean;
  /** Lower sorts first within a kind. */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
