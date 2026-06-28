/**
 * Limitless One Piece scraper — entry point.
 *
 *   npm run scrape:limitless              # full crawl (resumable)
 *   npm run scrape:limitless -- --refresh # re-enumerate sets/cards first
 *   npm run scrape:limitless -- --set OP01
 *   npm run scrape:limitless -- --limit 20 --delay 2000
 *   npm run scrape:limitless -- --force   # re-scrape even completed cards
 *
 * Behavior:
 * - Enumerates sets from /cards, then card numbers per set (cached in
 *   progress.json; only re-enumerated with --refresh).
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
import { fetchCardNumbersForSet, fetchSetSlugs } from './enumerate';
import { PoliteHttpClient } from './httpClient';
import { downloadImage, ensureImagesDir, type ImageResult } from './imageDownloader';
import { parseCardPage } from './parseCardPage';
import { emptyProgress, ensureOutputDir, loadProgress, saveProgress, type Progress } from './progress';
import {
  buildLimitlessCard,
  ensureCardsDir,
  imageUrl,
  setCodeOf,
  writeIndex,
  writeLimitlessCard,
  type IndexEntry,
} from './scrapeOutput';

interface Flags {
  refresh: boolean;
  force: boolean;
  limit: number | null;
  set: string | null;
  delayMs: number | null;
  jitterMs: number | null;
  images: boolean;
}

function parseFlags(argv: string[]): Flags {
  const f: Flags = { refresh: false, force: false, limit: null, set: null, delayMs: null, jitterMs: null, images: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--refresh') f.refresh = true;
    else if (a === '--force') f.force = true;
    else if (a === '--no-images') f.images = false;
    else if (a === '--images') f.images = true;
    else if (a === '--limit') f.limit = Number(argv[++i]);
    else if (a === '--set') f.set = (argv[++i] ?? '').toUpperCase();
    else if (a === '--delay') f.delayMs = Number(argv[++i]);
    else if (a === '--jitter') f.jitterMs = Number(argv[++i]);
  }
  return f;
}

let stopping = false;

async function enumerate(client: PoliteHttpClient, progress: Progress): Promise<void> {
  console.log('[limitless] enumerating sets from /cards …');
  progress.setSlugs = await fetchSetSlugs(client);
  console.log(`[limitless] ${progress.setSlugs.length} sets found. Enumerating card numbers per set…`);
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
  console.log(`[limitless] enumeration done: ${progress.cardNumbers.length} unique card numbers.`);
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

  let progress = (await loadProgress()) ?? emptyProgress();
  const resumed = progress.completed.length > 0 || progress.cardNumbers.length > 0;
  if (resumed) {
    console.log(
      `[limitless] resuming: ${progress.completed.length}/${progress.cardNumbers.length} cards already done.`,
    );
  }

  if (flags.refresh || progress.cardNumbers.length === 0) {
    await enumerate(client, progress);
  }

  // Graceful shutdown: first Ctrl+C stops after the current card; second forces exit.
  const completedSet = new Set(progress.completed);
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
  if (!flags.force) targets = targets.filter((n) => !completedSet.has(n));
  if (flags.limit !== null) targets = targets.slice(0, flags.limit);

  console.log(`[limitless] ${targets.length} card(s) to scrape this run.`);
  let processed = 0;
  let failedThisRun = 0;
  let imagesDownloaded = 0;

  for (const cardNumber of targets) {
    if (stopping) break;

    const enRes = await client.getHtml(`${SITE_BASE}/cards/en/${cardNumber}`);
    const jpRes = await client.getHtml(`${SITE_BASE}/cards/jp/${cardNumber}`);

    const enParse = enRes.ok ? parseCardPage(enRes.html, cardNumber) : null;
    const jpParse = jpRes.ok ? parseCardPage(jpRes.html, cardNumber) : null;
    const structural = enParse ?? jpParse;

    if (!structural) {
      const reason = `en:${enRes.ok ? 'ok' : enRes.reason} jp:${jpRes.ok ? 'ok' : jpRes.reason}`;
      progress.failed[cardNumber] = reason;
      failedThisRun++;
      console.warn(`[limitless] FAIL ${cardNumber} (${reason})`);
    } else {
      try {
        // Download both-language art (resumable: skips files already on disk).
        let images: { en?: ImageResult; jp?: ImageResult } | undefined;
        if (flags.images) {
          const setCode = setCodeOf(cardNumber);
          const en = await downloadImage(cdnClient, imageUrl(setCode, cardNumber, 'en'), setCode, cardNumber, 'en');
          const jp = await downloadImage(cdnClient, imageUrl(setCode, cardNumber, 'jp'), setCode, cardNumber, 'jp');
          if (en.status === 'downloaded') imagesDownloaded++;
          if (jp.status === 'downloaded') imagesDownloaded++;
          images = { en, jp };
        }

        const card = buildLimitlessCard(cardNumber, structural, enParse, jpParse, fetchedAt, images);
        const entry = await writeLimitlessCard(card);
        indexEntries.set(cardNumber, entry);
        completedSet.add(cardNumber);
        delete progress.failed[cardNumber];
        const imgTag = flags.images ? `img ${card.en.imageStatus[0]}/${card.jp.imageStatus[0]}` : null; // e.g. "img d/d"
        const flags2 = [card.jp.missing ? 'no-jp' : null, card.effectParse.needsReview ? 'review' : null, imgTag]
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

    processed++;
    if (processed % 10 === 0) {
      progress.completed = [...completedSet].sort();
      await saveProgress(progress);
    }
  }

  // Persist final progress.
  progress.completed = [...completedSet].sort();
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
