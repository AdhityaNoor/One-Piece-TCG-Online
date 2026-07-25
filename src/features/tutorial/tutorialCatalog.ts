/**
 * Local card catalog fetch, scoped to the tutorial's needs. Deliberately a
 * small, isolated copy of the same `/cards/index.json` + `/cards/sets/*.json`
 * fetch PlayTestScreen.tsx already uses (see project memory: "Card data
 * source pivoted to local catalog" — runtime never calls the live OPTCG
 * API) rather than importing PlayTestScreen's module-private helper, so the
 * tutorial feature module has no dependency on the Play Test screen at all
 * (project rule: tutorial is "completely separated" from other game
 * modes/screens, not just from standard gameplay).
 */
import type { CardDefinition } from '../../engine/state/card';

export interface TutorialCatalogEntry {
  definition: CardDefinition;
  imageUrl: string | null;
}

interface CatalogIndex {
  sets?: Array<{ code: string }>;
}

interface CatalogRow {
  en?: { image?: string | null };
  definition?: CardDefinition;
}

function isCatalogRow(row: unknown): row is CatalogRow {
  return typeof row === 'object' && row !== null && typeof (row as CatalogRow).definition === 'object';
}

let cachedCatalog: Promise<TutorialCatalogEntry[]> | null = null;

async function fetchCatalog(): Promise<TutorialCatalogEntry[]> {
  const indexResponse = await fetch('/cards/index.json');
  if (!indexResponse.ok) throw new Error(`Tutorial: could not load local card catalog index (${indexResponse.status}).`);
  const index = (await indexResponse.json()) as CatalogIndex;
  const entries: TutorialCatalogEntry[] = [];

  for (const set of index.sets ?? []) {
    const response = await fetch(`/cards/sets/${encodeURIComponent(set.code)}.json`);
    if (!response.ok) continue;
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!isCatalogRow(row) || !row.definition) continue;
      entries.push({ definition: row.definition, imageUrl: row.en?.image ?? null });
    }
  }

  if (entries.length === 0) throw new Error('Tutorial: local card catalog is empty.');
  return entries;
}

/** Memoized — the tutorial may build a fresh scenario per chapter/restart; no reason to refetch the whole catalog every time. */
export function loadTutorialCatalog(): Promise<TutorialCatalogEntry[]> {
  if (!cachedCatalog) {
    cachedCatalog = fetchCatalog().catch((error) => {
      cachedCatalog = null; // allow retry on the next call rather than caching a permanent failure
      throw error;
    });
  }
  return cachedCatalog;
}
