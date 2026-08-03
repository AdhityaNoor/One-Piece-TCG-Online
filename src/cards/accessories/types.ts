/**
 * Cosmetic-accessory data model — the deck-customization equivalent of the
 * card api/normalization split (see /src/cards/api + /src/cards/normalization).
 *
 * Accessories are PURELY COSMETIC chrome layered on top of a deck: which
 * sleeve art the main deck / DON!! deck are shown behind, and which DON!!
 * card face art is used. Nothing here ever touches rules, effects, or the
 * engine — an accessory choice changes only how a fixed GameState is
 * PROJECTED (Layer 3), exactly like `CasualMatchPresentation` in
 * navigationStore.ts. This is enforced by keeping accessories out of
 * `SavedDeckCardSnapshot`/`CardDefinition` entirely and giving them their
 * own `DeckAccessories` slot on `SavedDeck` (see savedDeck.ts).
 *
 * Two-layer shape, mirroring the card pipeline:
 *  - `RawAccessoryProduct` = verbatim provider row (here: a TCGplayer
 *    card-sleeve product). Treated as DATA, never executable — same ground
 *    rule as card API rows.
 *  - `AccessoryOption` = normalized, provider-agnostic option the gallery UI
 *    and the deck snapshot both consume. Derived from the raw row by
 *    `normalizeSleeveProduct` / `normalizeDonArtOption`.
 */

/** Which of a deck's three cosmetic slots an option can fill. */
export type AccessoryKind = 'sleeve' | 'donArt';

/** Where an option's data/art originally came from — provenance only, never branched on for rules. 'local-upload' = a file the operator uploaded straight to Blob (e.g. DON!! arts). */
export type AccessorySource = 'tcgplayer' | 'bundled' | 'optcg-api' | 'local-upload';

/**
 * Verbatim TCGplayer "Bandai Card Sleeves / One Piece" product row. Kept as
 * plain data (requirement: "Treat the card API as data input, not as
 * executable logic" — same discipline applied to this cosmetic provider).
 * `productId` + `name` are all we need: the product IMAGE is derived from
 * the id via TCGplayer's stable image CDN (see accessoryImageUrls), so no
 * detail-page scrape is required per product.
 */
export interface RawTcgSleeveProduct {
  productId: number;
  /** Human name as listed on TCGplayer (e.g. "Buggy (10-Pack)"). */
  name: string;
  /** 10 or 70 where known — display hint only, never affects the art shown. */
  packSize?: number;
}

/**
 * Normalized, provider-agnostic cosmetic option. This is what the gallery
 * renders and what a SavedDeck snapshots (by value, see DeckAccessories) so
 * a deck stays stable even if the catalog changes later (requirement #4).
 *
 * JSON-serializable only — no functions, no class instances.
 */
export interface AccessoryOption {
  /** Stable, catalog-unique id, e.g. `sleeve-tcg-552134` or `don-art-default`. Safe to persist. */
  id: string;
  kind: AccessoryKind;
  /** Clean display label, e.g. "Buggy". */
  name: string;
  source: AccessorySource;
  /** Full-resolution art URL. Remote today; cacheable later via the same AssetCacheManager seam as card art (assets/assetCache.ts). */
  imageUrl: string;
  /** Smaller URL for the gallery grid. May equal imageUrl if the provider has no distinct thumbnail. */
  thumbnailUrl: string;
}
