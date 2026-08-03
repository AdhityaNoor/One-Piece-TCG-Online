/**
 * STATIC FALLBACK catalog of One Piece official (Bandai) card-sleeve
 * products. The authoritative catalog is MASTER DATA in MongoDB, with images
 * in Vercel Blob, loaded at runtime from the server (see
 * multiplayer/net/accessoryClient.ts + accessoryCatalogStore.ts). This module
 * is what the app shows when NO backend is configured (VITE_API_BASE_URL
 * unset — e.g. a local hotseat build) or before the server responds, so the
 * feature still works offline (requirement #10).
 *
 * Source of truth for WHICH sleeves exist is `sleeveProducts.json` — the same
 * file the seed script (server/src/accessories/seedAccessories.ts) reads to
 * download images + upsert Mongo docs. Here we derive display options from it
 * with TCGplayer CDN image URLs (id-derived, see normalize.ts); the server
 * version instead points imageUrl at the uploaded Blob copies.
 */
import { registeredSleeveById } from './catalogRegistry';
import { normalizeSleeveProduct } from './normalize';
import sleeveProducts from './sleeveProducts.json';
import type { AccessoryOption, RawTcgSleeveProduct } from './types';

export const RAW_TCG_SLEEVE_PRODUCTS: RawTcgSleeveProduct[] = (sleeveProducts.products as RawTcgSleeveProduct[]).map((p) => ({
  productId: p.productId,
  name: p.name,
  packSize: p.packSize,
}));

/**
 * Normalized fallback sleeve options, deduped by product id and stable-ordered
 * by the source list. Computed once at module load — the list is small and
 * frozen.
 */
export const SLEEVE_CATALOG: AccessoryOption[] = (() => {
  const seen = new Set<number>();
  const options: AccessoryOption[] = [];
  for (const raw of RAW_TCG_SLEEVE_PRODUCTS) {
    if (seen.has(raw.productId)) continue;
    seen.add(raw.productId);
    options.push(normalizeSleeveProduct(raw));
  }
  return options;
})();

/** Lookup by normalized option id, over the static fallback list. Runtime code should prefer the loaded-catalog lookup (accessoryCatalogStore) which also covers server-only options. */
export function findSleeveOption(optionId: string | null | undefined): AccessoryOption | undefined {
  if (!optionId) return undefined;
  return registeredSleeveById(optionId) ?? SLEEVE_CATALOG.find((option) => option.id === optionId);
}
