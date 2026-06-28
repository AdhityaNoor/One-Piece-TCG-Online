/**
 * Output schema for the scrape, plus the JSON writers.
 *
 * One file per card NUMBER, foldered by set:
 *   scrape/cards/<setId>/<cardNumber>.json   (a ScrapedCard)
 *   scrape/index.json                         (a ScrapeIndex manifest)
 *
 * Each ScrapedCard is fully self-contained: the engine-facing normalized
 * `definition`, the structured-but-inert `effect`, every `printing`'s art
 * reference, and the raw text + warnings — so the game engine never has to
 * call optcgapi.com again, and a future normalizer/effect-author can re-derive
 * everything offline (same resilience guarantee as SavedDeck in docs/02 §7).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { CardCategory, CardDefinition } from '../../src/engine/state/card';
import type { ParsedEffect } from '../../src/cards/effectParser';
import type { NormalizationWarning } from '../../src/cards/normalization';
import { CARDS_DIR, INDEX_FILE, OUTPUT_DIR, PROVIDER, SCRAPE_SCHEMA_VERSION } from './config';

export interface ScrapedPrinting {
  imageId: string; // card_image_id, e.g. "OP01-016_p1"
  setId: string;
  setName: string;
  rarity: string;
  imageUrl: string | null;
  isCanonical: boolean;
}

export interface ScrapedCard {
  schemaVersion: number;
  cardNumber: string;
  name: string;
  category: CardCategory;
  set: { id: string; name: string };
  /** Engine-facing normalized data (stats, colors, keyword flags). Same CardDefinition the engine declares. */
  definition: CardDefinition;
  /** Structured-but-INERT ability hooks + draft action atoms. Authoring aid, never executed. */
  effect: ParsedEffect;
  /** Every printing (art variant) of this card number, canonical first. */
  printings: ScrapedPrinting[];
  /** Raw card_text of the canonical printing, verbatim. */
  rawText: string;
  normalizationWarnings: NormalizationWarning[];
  source: { provider: typeof PROVIDER; fetchedAt: string };
}

export interface ScrapeIndexEntry {
  cardNumber: string;
  name: string;
  category: CardCategory;
  setId: string;
  /** Path relative to scrape/, e.g. "cards/OP-01/OP01-016.json". */
  file: string;
  /** True if the card's effect still needs a hand-authored template (see ParsedEffect.needsReview). */
  needsReview: boolean;
}

export interface ScrapeIndex {
  schemaVersion: number;
  provider: typeof PROVIDER;
  generatedAt: string;
  counts: {
    total: number;
    needsReview: number;
    bySet: Record<string, number>;
  };
  cards: ScrapeIndexEntry[];
}

/** Filesystem-safe folder name for a set id (set ids observed are already safe, but be defensive). */
function safeSetFolder(setId: string): string {
  return setId.replace(/[^A-Za-z0-9._-]/g, '_');
}

/** Relative path (from scrape/) for a card's JSON file. */
export function cardRelativePath(setId: string, cardNumber: string): string {
  return join('cards', safeSetFolder(setId), `${cardNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.json`);
}

/** Writes one ScrapedCard to its per-set folder. Returns the index entry for it. */
export async function writeScrapedCard(card: ScrapedCard): Promise<ScrapeIndexEntry> {
  const rel = cardRelativePath(card.set.id, card.cardNumber);
  const abs = resolve(OUTPUT_DIR, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, JSON.stringify(card, null, 2), 'utf8');
  return {
    cardNumber: card.cardNumber,
    name: card.name,
    category: card.category,
    setId: card.set.id,
    file: rel.split('\\').join('/'), // POSIX separators in the manifest, regardless of OS
    needsReview: card.effect.needsReview,
  };
}

/** Writes the top-level manifest. */
export async function writeIndex(entries: ScrapeIndexEntry[]): Promise<void> {
  const bySet: Record<string, number> = {};
  let needsReview = 0;
  for (const e of entries) {
    bySet[e.setId] = (bySet[e.setId] ?? 0) + 1;
    if (e.needsReview) needsReview++;
  }
  const index: ScrapeIndex = {
    schemaVersion: SCRAPE_SCHEMA_VERSION,
    provider: PROVIDER,
    generatedAt: new Date().toISOString(),
    counts: { total: entries.length, needsReview, bySet },
    cards: entries.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber)),
  };
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
}

/** Ensures the base output directories exist. */
export async function ensureOutputDirs(): Promise<void> {
  await mkdir(CARDS_DIR, { recursive: true });
}
