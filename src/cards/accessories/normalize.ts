/**
 * Raw TCGplayer sleeve rows -> normalized AccessoryOption. Same role as
 * cards/normalization/normalizeCardPrinting.ts, for the cosmetic pipeline.
 *
 * Image URLs are DERIVED from the product id, not scraped per product:
 * TCGplayer serves every product image off a stable CDN keyed by product id
 * (`product-images.tcgplayer.com/fit-in/{W}x{H}/{id}.jpg`), so once we know a
 * product's id we can build both a grid thumbnail and a full-res art URL
 * without opening the detail page. This keeps the catalog cheap to expand
 * (just a list of id+name pairs, see sleeveCatalog.ts) and keeps us off any
 * page that requires JS to render.
 */
import type { AccessoryOption, RawTcgSleeveProduct } from './types';

const TCG_IMAGE_BASE = 'https://product-images.tcgplayer.com/fit-in';

/** Grid thumbnail + full-res URLs for a TCGplayer product id. */
export function tcgSleeveImageUrls(productId: number): { thumbnailUrl: string; imageUrl: string } {
  return {
    thumbnailUrl: `${TCG_IMAGE_BASE}/437x437/${productId}.jpg`,
    imageUrl: `${TCG_IMAGE_BASE}/1000x1000/${productId}.jpg`,
  };
}

/**
 * Strips the marketing boilerplate TCGplayer prefixes/suffixes onto every
 * product name so the gallery shows just the distinguishing part, e.g.
 * "One Piece Card Game Official Sleeves - Buggy (10-Pack)" -> "Buggy".
 * Purely for display; the raw name is still recoverable from the catalog row.
 */
export function cleanSleeveName(rawName: string): string {
  let name = rawName.trim();
  // Drop the long product-line prefix in its common variants.
  name = name.replace(/^One Piece Card Game Official (Limited )?Sleeves\s*[:\-]?\s*/i, '');
  // Drop a trailing "(NN-Pack)" / "(NN Pack)" pack-size suffix.
  name = name.replace(/\s*\(\d+[\s-]?pack\)\s*$/i, '');
  return name.trim() || rawName.trim();
}

/** Best-effort pack size parsed from the raw name, for a display hint only. */
export function parsePackSize(rawName: string): number | undefined {
  const match = rawName.match(/\((\d+)[\s-]?pack\)/i);
  return match ? Number(match[1]) : undefined;
}

export function normalizeSleeveProduct(raw: RawTcgSleeveProduct): AccessoryOption {
  const { thumbnailUrl, imageUrl } = tcgSleeveImageUrls(raw.productId);
  return {
    id: `sleeve-tcg-${raw.productId}`,
    kind: 'sleeve',
    name: cleanSleeveName(raw.name),
    source: 'tcgplayer',
    imageUrl,
    thumbnailUrl,
  };
}
