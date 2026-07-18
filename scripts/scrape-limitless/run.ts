/**
 * Limitless One Piece scraper — entry point.
 *
 *   npm run scrape:limitless              # full crawl (resumable)
 *   npm run scrape:limitless -- --refresh # re-enumerate all products/cards first
 *   npm run scrape:limitless -- --refresh-promos # merge /cards/promos into worklist
 *   npm run scrape:limitless -- --set OP01
 *   npm run scrape:limitless -- --set P
 *   npm run scrape:limitless -- --limit 20 --delay 2000
 *   npm run scrape:limitless -- --force   # re-scrape even completed cards
 *
 * Behavior:
 * - Enumerates sets from /cards AND promo products from /cards/promos, then
 *   card numbers per product (cached in progress.json; only re-enumerated
 *   with --refresh / --refresh-promos).
 * - For each card, fetches the EN and JP page, parses both, writes one
 *   self-contained JSON per card under scrape/limitless/cards/<set>/.
 * - RESUMABLE: already-completed cards are skipped; Ctrl+C saves progress and
 *   exits cleanly so the next run continues.
 * - FAILSAFE: a failed page is recorded and the crawl continues; nothing here
 *   throws past the per-card boundary.
 * - POLITE: single connection, delay+jitter between requests, retry/backoff
 *   (see httpClient.ts).
 */
import { DEFAULTS, SITE_BASE } from './config';
import { fetchCardNumbersForSet, fetchPromoProductSlugs, fetchSetSlugs } from './enumerate';
import { PoliteHttpClient } from './httpClient';
import { downloadImage, ensureImagesDir, type ImageResult } from './imageDownloader';
import { parseCardPage } from './parseCardPage';
import { emptyProgress, ensureOutputDir, loadProgress, saveProgress, type Progress } from './progress';
import {
  buildLimitlessCard,
  ensureCardsDir,
  imageUrl,
  setCodeOf,
  variantIdFromImageUrl,
  writeIndex,
  writeLimitlessCard,
  type IndexEntry,
  type PrintInput,
} from './scrapeOutput';
import type { ParsedCardPage } from './types';

interface Flags {
  refresh: boolean;
  refreshPromos: boolean;
  force: boolean;
  limit: number | null;
  set: string | null;
  delayMs: number | null;
  jitterMs: number | null;
  concurrency: number;
  images: boolean;
  variants: boolean;
}

function parseFlags(argv: string[]): Flags {
  const f: Flags = {
    refresh: false,
    refreshPromos: false,
    force: false,
    limit: null,
    set: null,
    delayMs: null,
    jitterMs: null,
    concurrency: DEFAULTS.concurrency,
    images: true,
    variants: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--refresh') f.refresh = true;
    else if (a === '--refresh-promos') f.refreshPromos = true;
    else if (a === '--force') f.force = true;
    else if (a === '--no-images') f.images = false;
    else if (a === '--images') f.images = true;
    else if (a === '--no-variants') f.variants = false;
    else if (a === '--variants') f.variants = true;
    else if (a === '--limit') f.limit = Number(argv[++i]);
    else if (a === '--set') f.set = (argv[++i] ?? '').toUpperCase();
    else if (a === '--delay') f.delayMs = Number(argv[++i]);
    else if (a === '--jitter') f.jitterMs = Number(argv[++i]);
    else if (a === '--concurrency') f.concurrency = Math.max(1, Number(argv[++i]) || DEFAULTS.concurrency);
  }
  return f;
}

let stopping = false;

async function enumerate(client: PoliteHttpClient, progress: Progress): Promise<void> {
  console.log('[limitless] enumerating products from /cards + /cards/promos …');
  progress.setSlugs = await fetchSetSlugs(client);
  console.log(`[limitless] ${progress.setSlugs.length} products found. Enumerating card numbers per product…`);
  const all = new Set<string>();
  for (const slug of progress.setSlugs) {
    if (stopping) break;
    const { cardNumbers, warning } = await fetchCardNumbersForSet(client, slug);
    if (warning) console.warn(`[limitless] ${warning}`);
    for (const n of cardNumbers) all.add(n);
    console.log(`[limitless]   ${slug}: ${cardNumbers.length} cards (running total ${all.size})`);
  }
  progress.cardNumbers = [...all].sort();
  await saveProgress(progress);
  const promoCount = progress.cardNumbers.filter((n) => n.startsWith('P-')).length;
  console.log(
    `[limitless] enumeration done: ${progress.cardNumbers.length} unique card numbers` +
      ` (${promoCount} promotional P-*).`,
  );
}

/** Merge `/cards/promos` products into an existing worklist without re-walking boosters. */
async function enumeratePromosOnly(client: PoliteHttpClient, progress: Progress): Promise<void> {
  console.log('[limitless] enumerating promo products from /cards/promos …');
  const promoSlugs = await fetchPromoProductSlugs(client);
  const slugSet = new Set(progress.setSlugs);
  for (const s of promoSlugs) slugSet.add(s);
  progress.setSlugs = [...slugSet].sort();

  const all = new Set(progress.cardNumbers);
  const before = all.size;
  let promoCardHits = 0;
  for (const slug of promoSlugs) {
    if (stopping) break;
    const { cardNumbers, warning } = await fetchCardNumbersForSet(client, slug);
    if (warning) console.warn(`[limitless] ${warning}`);
    let addedHere = 0;
    for (const n of cardNumbers) {
      if (!all.has(n)) {
        all.add(n);
        addedHere++;
      }
      if (n.startsWith('P-')) promoCardHits++;
    }
    console.log(`[limitless]   ${slug}: ${cardNumbers.length} cards (+${addedHere} new, running total ${all.size})`);
  }
  progress.cardNumbers = [...all].sort();
  await saveProgress(progress);
  const promoCount = progress.cardNumbers.filter((n) => n.startsWith('P-')).length;
  console.log(
    `[limitless] promo merge done: +${all.size - before} new card numbers` +
      ` (${promoCount} promotional P-* in worklist; ${promoCardHits} P-* links seen on promo pages).`,
  );
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const client = new PoliteHttpClient({
    ...(flags.delayMs !== null ? { delayMs: flags.delayMs } : {}),
    ...(flags.jitterMs !== null ? { jitterMs: flags.jitterMs } : {}),
  });
  // Separate, faster client for the image CDN (not the site's VPS).
  const cdnClient = new PoliteHttpClient({ delayMs: DEFAULTS.cdnDelayMs, jitterMs: DEFAULTS.cdnJitterMs }, 'image/webp');
  const fetchedAt = new Date().toISOString();

  await ensureOutputDir();
  await ensureCardsDir();
  if (flags.images) await ensureImagesDir();
  console.log(`[limitless] images: ${flags.images ? 'ON (EN + JP)' : 'off (--no-images)'}`);
  console.log(`[limitless] alternate arts: ${flags.variants ? 'ON (base + every ?v=N print)' : 'off (--no-variants, base print only)'}`);

  let progress = (await loadProgress()) ?? emptyProgress();
  const resumed = progress.completed.length > 0 || progress.cardNumbers.length > 0;
  if (resumed) {
    const altPending = flags.variants ? progress.completed.filter((n) => !progress.printsCompleted.includes(n)).length : 0;
    console.log(
      `[limitless] resuming: ${progress.completed.length}/${progress.cardNumbers.length} cards base-scraped, ` +
        `${progress.printsCompleted.length} with alt arts` +
        `${altPending > 0 ? ` (${altPending} base-done card(s) still need alt arts)` : ''}.`,
    );
  }

  if (flags.refresh || progress.cardNumbers.length === 0) {
    await enumerate(client, progress);
  } else if (flags.refreshPromos) {
    await enumeratePromosOnly(client, progress);
  }

  // Graceful shutdown: first Ctrl+C stops after the current card; second forces exit.
  const completedSet = new Set(progress.completed);
  const printsDoneSet = new Set(progress.printsCompleted);
  const indexEntries = new Map<string, IndexEntry>();
  process.on('SIGINT', () => {
    if (stopping) {
      console.log('\n[limitless] second interrupt — exiting now.');
      process.exit(130);
    }
    stopping = true;
    console.log('\n[limitless] interrupt received — finishing current card, then saving progress…');
  });

  let targets = progress.cardNumbers;
  if (flags.set) targets = targets.filter((n) => setCodeOf(n) === flags.set);
  if (!flags.force) {
    // With alt arts ON, "done" means alt arts captured — so base-only cards from
    // an earlier crawl are re-visited to backfill their alternate arts (base
    // images on disk are skipped). With --no-variants, fall back to base-done.
    const doneSet = flags.variants ? printsDoneSet : completedSet;
    targets = targets.filter((n) => !doneSet.has(n));
  }
  if (flags.limit !== null) targets = targets.slice(0, flags.limit);

  const concurrency = Math.min(flags.concurrency, Math.max(1, targets.length));
  console.log(`[limitless] ${targets.length} card(s) to scrape this run @ concurrency ${concurrency}.`);
  let processed = 0;
  let failedThisRun = 0;
  let imagesDownloaded = 0;

  // Single-writer guard so parallel workers never write progress.json at once.
  let saving = false;
  async function maybeSaveProgress(): Promise<void> {
    if (saving) return;
    saving = true;
    try {
      progress.completed = [...completedSet].sort();
      progress.printsCompleted = [...printsDoneSet].sort();
      await saveProgress(progress);
    } finally {
      saving = false;
    }
  }

  /** Fetches+parses one language's print page (base = param 0, alt art = param N). */
  async function fetchPrintPage(cardNumber: string, lang: 'en' | 'jp', variantParam: number): Promise<ParsedCardPage | null> {
    const q = variantParam > 0 ? `?v=${variantParam}` : '';
    const res = await client.getHtml(`${SITE_BASE}/cards/${lang}/${cardNumber}${q}`);
    return res.ok ? parseCardPage(res.html, cardNumber) : null;
  }

  /** Downloads one print's art for one language, preferring the exact og:image URL over a constructed one. */
  async function downloadPrintImage(
    setCode: string,
    cardNumber: string,
    lang: 'en' | 'jp',
    parse: ParsedCardPage | null,
    variantId: string,
  ): Promise<ImageResult | undefined> {
    if (!flags.images || !parse) return undefined;
    const url = parse.ogImage ?? imageUrl(setCode, cardNumber, lang, variantId);
    const result = await downloadImage(cdnClient, url, setCode, cardNumber, lang, variantId);
    if (result.status === 'downloaded') imagesDownloaded++;
    return result;
  }

  async function processCard(cardNumber: string): Promise<void> {
    const setCode = setCodeOf(cardNumber);
    // Base print first — it lists which alternate arts (?v=N) exist.
    const enParse = await fetchPrintPage(cardNumber, 'en', 0);
    const jpParse = await fetchPrintPage(cardNumber, 'jp', 0);
    const structural = enParse ?? jpParse;

    if (!structural) {
      const reason = `en/jp base pages unreachable`;
      progress.failed[cardNumber] = reason;
      failedThisRun++;
      console.warn(`[limitless] FAIL ${cardNumber} (${reason})`);
      return;
    }

    try {
      // Alternate-art ?v params come straight from the base page's prints table.
      const altParams = flags.variants ? (structural.variantParams ?? []).filter((n) => n > 0) : [];
      const allParams = [0, ...altParams];

      const printInputs: PrintInput[] = [];
      for (const variantParam of allParams) {
        const ep = variantParam === 0 ? enParse : await fetchPrintPage(cardNumber, 'en', variantParam);
        const jp = variantParam === 0 ? jpParse : await fetchPrintPage(cardNumber, 'jp', variantParam);
        // variantId from the real CDN filename; fall back to p{param} only if no og:image.
        const variantId =
          variantIdFromImageUrl(ep?.ogImage ?? null, cardNumber) ??
          variantIdFromImageUrl(jp?.ogImage ?? null, cardNumber) ??
          (variantParam > 0 ? `p${variantParam}` : '');
        const enImage = await downloadPrintImage(setCode, cardNumber, 'en', ep, variantId);
        const jpImage = await downloadPrintImage(setCode, cardNumber, 'jp', jp, variantId);
        printInputs.push({ variantParam, enParse: ep, jpParse: jp, enImage, jpImage });
      }

      const card = buildLimitlessCard(cardNumber, structural, enParse, jpParse, fetchedAt, printInputs);
      const entry = await writeLimitlessCard(card);
      indexEntries.set(cardNumber, entry);
      completedSet.add(cardNumber);
      // Only mark alt arts done when we actually crawled them, so a later default
      // run still backfills cards scraped under --no-variants.
      if (flags.variants) printsDoneSet.add(cardNumber);
      delete progress.failed[cardNumber];
      const imgTag = flags.images ? `img ${card.en.imageStatus[0]}/${card.jp.imageStatus[0]}` : null; // e.g. "img d/d"
      const altTag = entry.altArtCount > 0 ? `+${entry.altArtCount}aa` : null;
      const flags2 = [card.jp.missing ? 'no-jp' : null, card.effectParse.needsReview ? 'review' : null, altTag, imgTag]
        .filter(Boolean)
        .join(',');
      console.log(`[limitless] ok   ${cardNumber} ${card.en.name ?? card.jp.name ?? ''}${flags2 ? ` [${flags2}]` : ''}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      progress.failed[cardNumber] = `write: ${reason}`;
      failedThisRun++;
      console.warn(`[limitless] FAIL ${cardNumber} (write: ${reason})`);
    }
  }

  // Worker pool: `concurrency` workers each pull the next card off a shared cursor.
  let cursor = 0;
  async function worker(): Promise<void> {
    while (!stopping) {
      const i = cursor++;
      if (i >= targets.length) break;
      await processCard(targets[i]);
      processed++;
      if (processed % DEFAULTS.saveEvery === 0) await maybeSaveProgress();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Persist final progress (wait out any in-flight save first).
  while (saving) await new Promise((r) => setTimeout(r, 10));
  progress.completed = [...completedSet].sort();
  progress.printsCompleted = [...printsDoneSet].sort();
  await saveProgress(progress);

  // Merge this run's index entries with any from prior runs and write the manifest.
  await mergeAndWriteIndex(indexEntries);

  console.log(
    `[limitless] ${stopping ? 'stopped' : 'done'}: ${processed} processed this run, ` +
      `${failedThisRun} failed, ${completedSet.size}/${progress.cardNumbers.length} total complete` +
      `${flags.images ? `, ${imagesDownloaded} images downloaded this run` : ''}.`,
  );
  console.log('[limitless] output: scrape/limitless/index.json + scrape/limitless/cards/<set>/<cardNumber>.json');
  if (stopping) process.exit(0);
}

/** Loads the existing index (if any), upserts this run's entries, writes it back. */
async function mergeAndWriteIndex(runEntries: Map<string, IndexEntry>): Promise<void> {
  const merged = new Map<string, IndexEntry>();
  try {
    const { readFile } = await import('node:fs/promises');
    const { INDEX_FILE } = await import('./config');
    const raw = await readFile(INDEX_FILE, 'utf8');
    const existing = JSON.parse(raw) as { cards?: IndexEntry[] };
    for (const e of existing.cards ?? []) merged.set(e.cardNumber, e);
  } catch {
    /* no existing index */
  }
  for (const [k, v] of runEntries) merged.set(k, v);
  await writeIndex([...merged.values()]);
}

main().catch((err) => {
  console.error('[limitless] FATAL:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
