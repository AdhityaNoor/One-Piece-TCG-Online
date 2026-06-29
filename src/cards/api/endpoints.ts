/**
 * Local card catalog paths under /public.
 *
 * The app now reads card metadata and images from checked-in assets instead
 * of depending on optcgapi.com. These helpers centralize the file layout so
 * the rest of the card layer can stay data-driven.
 */

export const CARD_CATALOG_BASE_URL = '/cards';

export const cardCatalogPaths = {
  index: () => `${CARD_CATALOG_BASE_URL}/index.json`,
  set: (setCode: string) => `${CARD_CATALOG_BASE_URL}/sets/${encodeURIComponent(setCode)}.json`,
} as const;
