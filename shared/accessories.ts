/**
 * Client/server contract for cosmetic deck ACCESSORIES (card sleeves + DON!!
 * card arts). The catalog is MASTER DATA: rows live in MongoDB, image
 * binaries live in Vercel Blob. The server exposes the active catalog at
 * `GET /accessories` (public, unauthenticated — it's display content, not
 * account data), and the player-facing app maps these rows onto its own
 * AccessoryOption shape (src/cards/accessories/types.ts).
 *
 * Types only — no runtime code, no imports from either side's internals.
 */

export type AccessoryKind = 'sleeve' | 'donArt';

/** Where the art originally came from. 'local-upload' = a file the operator uploaded (e.g. DON!! arts from a local folder) straight to Blob. */
export type AccessorySource = 'tcgplayer' | 'bundled' | 'optcg-api' | 'local-upload';

/** One cosmetic option as served to players. `imageUrl`/`thumbnailUrl` are absolute Blob URLs. */
export interface PublicAccessory {
  optionId: string;
  kind: AccessoryKind;
  name: string;
  source: AccessorySource;
  imageUrl: string;
  thumbnailUrl: string;
  /** Sleeve pack size (10/70) where known — display hint only. */
  packSize?: number;
}

export interface PublicAccessoryCatalogResponse {
  accessories: PublicAccessory[];
}
