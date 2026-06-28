/**
 * OPTCG card scraper — entry point.
 *
 * Run on a machine WITH internet access to optcgapi.com:
 *   npm run scrape
 *
 * What it does (and explicitly does NOT do):
 * - Reuses the project's own adapter (/src/cards/api), normalizer
 *   (/src/cards/normalization) and the new effect parser
 *   (/src/cards/effectParser) — it adds NO parallel logic.
 * - Hits only the documented "all*" bulk endpoints (a handful of requests
 *   total, not one-per-card) because the API runs on a self-funded VPS and the
 *   owner asks consumers to keep call volume low (see api/endpoints.ts).
 * - Writes per-card JSON foldered by set into the gitignored scrape/ dir.
 * - Never executes card text. Effects are structured into inert descriptors
 *   (ParsedEffect); anything not tightly recognized is flagged needsReview.
 */
import { fetchAllPlayableCardPrintings, fetchDonCards, type CardApiResult, type FetchLike } from '../../src/cards/api/client';
import { optcgEndpoints } from '../../src/cards/api/endpoints';
import type { CardPrintingDto, DonCardDto } from '../../src/cards/api/types';
import { groupPrintingsByCardNumber } from '../../src/cards/library/groupPrintingsByCardNumber';
import { normalizeCardPrintings, normalizeDonCard, pickCanonicalPrinting } from '../../src/cards/normalization';
import { parseEffect } from '../../src/cards/effectParser';
import { DON_SET_FOLDER, PROVIDER, SCRAPE_SCHEMA_VERSION } from './config';
import {
  ensureOutputDirs,
  writeIndex,
  writeScrapedCard,
  type ScrapeIndexEntry,
  type ScrapedCard,
  type ScrapedPrinting,
} from './scrapeOutput';

/** Node's global fetch satisfies the adapter's FetchLike contract directly. */
const fetchImpl: FetchLike = (url) => fetch(url);

function unwrap<T>(label: string, result: CardApiResult<T>): T {
  if (!result.ok) {
    const e = result.error;
    const detail =
      e.kind === 'http' ? `HTTP ${e.status} (${e.url})` : e.kind === 'network' ? `network: ${e.message}` : JSON.stringify(e);
    throw new Error(`Failed to fetch ${label}: ${detail}`);
  }
  return result.data;
}

function buildPrintings(group: CardPrintingDto[], canonicalImageId: string): ScrapedPrinting[] {
  return group.map((p) => ({
    imageId: p.card_image_id,
    setId: p.set_id,
    setName: p.set_name,
    rarity: p.rarity,
    imageUrl: p.card_image,
    isCanonical: p.card_image_id === canonicalImageId,
  }));
}

function scrapeCardFromGroup(group: CardPrintingDto[], fetchedAt: string): ScrapedCard {
  const { canonical } = pickCanonicalPrinting(group);
  const { definition, warnings } = normalizeCardPrintings(group);
  const effect = parseEffect(definition.cardNumber, canonical.card_text);
  // Canonical first, then the rest in first-seen order.
  const ordered = [canonical, ...group.filter((p) => p.card_image_id !== canonical.card_image_id)];
  return {
    schemaVersion: SCRAPE_SCHEMA_VERSION,
    cardNumber: definition.cardNumber,
    name: definition.name,
    category: definition.category,
    set: { id: canonical.set_id, name: canonical.set_name },
    definition,
    effect,
    printings: buildPrintings(ordered, canonical.card_image_id),
    rawText: canonical.card_text,
    normalizationWarnings: warnings,
    source: { provider: PROVIDER, fetchedAt },
  };
}

function scrapeCardFromDon(don: DonCardDto, fetchedAt: string): ScrapedCard {
  const { definition, warnings } = normalizeDonCard(don);
  const effect = parseEffect(definition.cardNumber, don.card_text);
  return {
    schemaVersion: SCRAPE_SCHEMA_VERSION,
    cardNumber: definition.cardNumber,
    name: definition.name,
    category: definition.category,
    set: { id: DON_SET_FOLDER, name: 'DON!! Cards' },
    definition,
    effect,
    printings: [
      {
        imageId: don.card_image_id,
        setId: DON_SET_FOLDER,
        setName: 'DON!! Cards',
        rarity: don.rarity,
        imageUrl: don.card_image,
        isCanonical: true,
      },
    ],
    rawText: don.card_text,
    normalizationWarnings: warnings,
    source: { provider: PROVIDER, fetchedAt },
  };
}

async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString();
  console.log(`[scrape] starting — provider=${PROVIDER}, ${fetchedAt}`);

  await ensureOutputDirs();
  const entries: ScrapeIndexEntry[] = [];

  // --- Playing cards (Sets + Starter Decks + Promos), 3 bulk requests. ---
  console.log('[scrape] fetching all playing-card printings (sets + starter decks + promos)…');
  const printings = unwrap('playable card printings', await fetchAllPlayableCardPrintings(fetchImpl));
  const groups = groupPrintingsByCardNumber(printings);
  console.log(`[scrape] ${printings.length} printings -> ${groups.length} unique card numbers`);

  for (const group of groups) {
    try {
      const card = scrapeCardFromGroup(group, fetchedAt);
      entries.push(await writeScrapedCard(card));
    } catch (err) {
      const num = group[0]?.card_set_id ?? '(unknown)';
      console.warn(`[scrape] skipped card ${num}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- DON!! cards, 1 bulk request. ---
  console.log('[scrape] fetching all DON!! cards…');
  const donCards = unwrap('DON cards', await fetchDonCards(fetchImpl, optcgEndpoints.allDonCards()));
  console.log(`[scrape] ${donCards.length} DON!! cards`);
  for (const don of donCards) {
    try {
      const card = scrapeCardFromDon(don, fetchedAt);
      entries.push(await writeScrapedCard(card));
    } catch (err) {
      console.warn(`[scrape] skipped DON ${don.card_image_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await writeIndex(entries);

  const needsReview = entries.filter((e) => e.needsReview).length;
  console.log(`[scrape] done. ${entries.length} cards written, ${needsReview} need a hand-authored effect template.`);
  console.log('[scrape] output: scrape/index.json + scrape/cards/<set>/<cardNumber>.json');
}

main().catch((err) => {
  console.error('[scrape] FAILED:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
