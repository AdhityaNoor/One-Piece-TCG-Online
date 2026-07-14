/**
 * Predefined profile-banner catalog. Mirrors avatars.ts's shape/role
 * exactly, but there is no shipped banner art anywhere in the project (see
 * server/src/profile/cosmeticCatalog.ts's banner entries — those only ever
 * had name/description/icon slugs, never an image). Rather than block on
 * commissioning art, banners are CSS gradients: each option's `id` matches
 * a COSMETIC_CATALOG banner id 1:1 (server owns which ids exist/are owned;
 * this file only owns how to *render* one), and `gradient` is a plain CSS
 * background-image value applied directly, no asset request involved.
 */

export interface BannerOption {
  id: string;
  label: string;
  /** CSS `background` value — used as-is, no url()/asset resolution needed. */
  gradient: string;
}

export const BANNER_OPTIONS: BannerOption[] = [
  { id: 'banner_east_blue', label: 'East Blue Waters', gradient: 'linear-gradient(135deg, #0ea5a3 0%, #0b3d6b 55%, #041427 100%)' },
  { id: 'banner_grand_line', label: 'Grand Line Storm', gradient: 'linear-gradient(135deg, #6d28d9 0%, #312e81 55%, #0f0a24 100%)' },
  { id: 'banner_new_world', label: 'New World Horizon', gradient: 'linear-gradient(135deg, #b91c1c 0%, #6b1113 55%, #1a0505 100%)' },
  { id: 'banner_jolly_roger', label: 'Jolly Roger', gradient: 'linear-gradient(135deg, #1f2937 0%, #030712 60%, #000000 100%)' },
  { id: 'banner_sunset_sea', label: 'Sunset Sea', gradient: 'linear-gradient(135deg, #f59e0b 0%, #c2410c 55%, #431407 100%)' },
  { id: 'banner_gold_rush', label: 'Gold Rush', gradient: 'linear-gradient(135deg, #d9a441 0%, #92640c 55%, #2b1c04 100%)' },
];

export const DEFAULT_BANNER_ID = 'banner_east_blue';

/** Resolves a saved bannerId (possibly stale/unknown/null) to a real CSS gradient, always falling back to the default. */
export function resolveBannerGradient(bannerId: string | null | undefined): string {
  const option = BANNER_OPTIONS.find((b) => b.id === bannerId) ?? BANNER_OPTIONS.find((b) => b.id === DEFAULT_BANNER_ID) ?? BANNER_OPTIONS[0];
  return option.gradient;
}
