/**
 * Seeds the cosmetic-accessory MASTER DATA:
 *   - Card sleeves: image downloaded from TCGplayer's product image CDN
 *     (source list = ../../../src/cards/accessories/sleeveProducts.json).
 *   - DON!! card arts: image files read from a local folder on the operator's
 *     machine (default the one below; override with --don-dir).
 * Every image is uploaded to Vercel Blob; the row metadata (name, kind,
 * source, Blob URLs, sort order) is upserted into MongoDB via
 * AccessoryService. The player app then reads it at GET /accessories.
 *
 * Usage (run from server/):
 *   MONGODB_URI=... BLOB_READ_WRITE_TOKEN=... npm run seed:accessories
 *   npm run seed:accessories -- --don-dir "C:\\Users\\Adhitya Noor Muslim\\Pictures\\Scrapes\\Don Cards"
 *   npm run seed:accessories -- --sleeves-only
 *   npm run seed:accessories -- --dons-only
 *   npm run seed:accessories -- --dry-run     # download/read + log only; no Blob upload, no Mongo write
 *
 * Idempotent: Blob uploads overwrite in place (addRandomSuffix:false,
 * allowOverwrite:true) and Mongo writes upsert by optionId, so re-running
 * refreshes rather than duplicating. optionId matches the app's own scheme
 * (`sleeve-tcg-<id>` / `don-art-<slug>`) so decks that already stored a pick
 * keep resolving to the same row.
 *
 * Requires: MONGODB_URI (same as the server) and BLOB_READ_WRITE_TOKEN
 * (a Vercel Blob read-write token). Neither is needed with --dry-run.
 */
import { readFile, readdir } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { put } from '@vercel/blob';
import { connectMongo, closeMongo } from '../db/mongo';
import { AccessoryService } from './accessoryService';

const DEFAULT_DON_DIR = 'C:\\Users\\Adhitya Noor Muslim\\Pictures\\Scrapes\\Don Cards';
const SLEEVE_PRODUCTS_JSON = resolve(process.cwd(), '..', 'src', 'cards', 'accessories', 'sleeveProducts.json');
const TCG_IMAGE_BASE = 'https://product-images.tcgplayer.com/fit-in';
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

const DRY_RUN = hasFlag('dry-run');
const SLEEVES_ONLY = hasFlag('sleeves-only');
const DONS_ONLY = hasFlag('dons-only');

interface RawSleeveProduct {
  productId: number;
  name: string;
  packSize?: number;
}

/** "One Piece Card Game Official Sleeves - Buggy (10-Pack)" -> "Buggy". Mirrors src/cards/accessories/normalize.ts cleanSleeveName. */
function cleanSleeveName(rawName: string): string {
  let name = rawName.trim();
  name = name.replace(/^One Piece Card Game Official (Limited )?Sleeves\s*[:\-]?\s*/i, '');
  name = name.replace(/\s*\(\d+[\s-]?pack\)\s*$/i, '');
  return name.trim() || rawName.trim();
}

/** "Boa_Hancock-art.png" -> "Boa Hancock Art". Best-effort display name from a filename. */
function prettifyFileName(file: string): string {
  const stem = basename(file, extname(file));
  return stem
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function contentTypeFor(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required to upload images (or pass --dry-run to skip uploads).');
  }
  return token;
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Uploads to Blob (or, in dry-run, returns the source URL unchanged) and returns the public URL. */
async function uploadToBlob(pathname: string, body: Buffer, contentType: string, token: string, dryRunSourceUrl: string): Promise<string> {
  if (DRY_RUN) return dryRunSourceUrl;
  const { url } = await put(pathname, body, {
    access: 'public',
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
  return url;
}

interface SeedTally {
  ok: number;
  skipped: number;
}

async function seedSleeves(service: AccessoryService, token: string, tally: SeedTally): Promise<void> {
  const parsed = JSON.parse(await readFile(SLEEVE_PRODUCTS_JSON, 'utf8')) as { products: RawSleeveProduct[] };
  const products = parsed.products ?? [];
  console.log(`[seed:accessories] ${products.length} sleeve products from sleeveProducts.json`);

  let order = 0;
  const seen = new Set<number>();
  for (const product of products) {
    if (seen.has(product.productId)) continue;
    seen.add(product.productId);

    const optionId = `sleeve-tcg-${product.productId}`;
    const name = cleanSleeveName(product.name);
    const fullSrc = `${TCG_IMAGE_BASE}/1000x1000/${product.productId}.jpg`;
    const thumbSrc = `${TCG_IMAGE_BASE}/437x437/${product.productId}.jpg`;

    try {
      const [fullBuf, thumbBuf] = await Promise.all([downloadBuffer(fullSrc), downloadBuffer(thumbSrc)]);
      const imageUrl = await uploadToBlob(`accessories/sleeves/${product.productId}.jpg`, fullBuf, 'image/jpeg', token, fullSrc);
      const thumbnailUrl = await uploadToBlob(`accessories/sleeves/${product.productId}_thumb.jpg`, thumbBuf, 'image/jpeg', token, thumbSrc);

      if (!DRY_RUN) {
        const outcome = await service.upsert({
          optionId,
          kind: 'sleeve',
          name,
          source: 'tcgplayer',
          imageUrl,
          thumbnailUrl,
          packSize: product.packSize,
          sortOrder: order,
          active: true,
        });
        console.log(`  [sleeve] ${outcome} ${optionId} (${name})`);
      } else {
        console.log(`  [sleeve] dry-run ${optionId} (${name}) <- ${fullSrc}`);
      }
      order += 1;
      tally.ok += 1;
    } catch (err) {
      tally.skipped += 1;
      console.warn(`  [sleeve] SKIPPED ${optionId} (${name}): ${(err as Error).message}`);
    }
  }
}

async function seedDonArts(service: AccessoryService, token: string, tally: SeedTally): Promise<void> {
  const dir = argValue('don-dir') ?? DEFAULT_DON_DIR;
  let files: string[];
  try {
    files = await readdir(dir);
  } catch (err) {
    console.warn(`[seed:accessories] DON art dir not readable (${dir}): ${(err as Error).message}. Skipping DON arts.`);
    return;
  }
  const images = files.filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase())).sort();
  const skippedNonImage = files.length - images.length;
  console.log(`[seed:accessories] ${images.length} DON art image files in ${dir} (${skippedNonImage} non-image entries ignored)`);

  let order = 0;
  const usedIds = new Set<string>();
  for (const file of images) {
    const ext = extname(file).toLowerCase();
    const name = prettifyFileName(file);
    let slug = slugify(basename(file, extname(file))) || `art-${order}`;
    while (usedIds.has(slug)) slug = `${slug}-${order}`;
    usedIds.add(slug);
    const optionId = `don-art-${slug}`;

    try {
      const buf = await readFile(resolve(dir, file));
      const imageUrl = await uploadToBlob(`accessories/don-arts/${slug}${ext}`, buf, contentTypeFor(ext), token, resolve(dir, file));

      if (!DRY_RUN) {
        const outcome = await service.upsert({
          optionId,
          kind: 'donArt',
          name,
          source: 'local-upload',
          imageUrl,
          thumbnailUrl: imageUrl,
          sortOrder: order,
          active: true,
        });
        console.log(`  [donArt] ${outcome} ${optionId} (${name})`);
      } else {
        console.log(`  [donArt] dry-run ${optionId} (${name}) <- ${file}`);
      }
      order += 1;
      tally.ok += 1;
    } catch (err) {
      tally.skipped += 1;
      console.warn(`  [donArt] SKIPPED ${optionId} (${name}): ${(err as Error).message}`);
    }
  }
}

async function main(): Promise<void> {
  const token = DRY_RUN ? '' : requireBlobToken();

  const service = new AccessoryService();
  if (!DRY_RUN) await connectMongo();

  const sleeveTally: SeedTally = { ok: 0, skipped: 0 };
  const donTally: SeedTally = { ok: 0, skipped: 0 };
  if (!DONS_ONLY) await seedSleeves(service, token, sleeveTally);
  if (!SLEEVES_ONLY) await seedDonArts(service, token, donTally);

  if (!DRY_RUN) await closeMongo();
  console.log(
    `[seed:accessories] done. Sleeves: ${sleeveTally.ok} ok / ${sleeveTally.skipped} skipped. ` +
      `DON arts: ${donTally.ok} ok / ${donTally.skipped} skipped.${DRY_RUN ? ' (dry-run: nothing written)' : ''}`,
  );
}

main().catch((err) => {
  console.error('[seed:accessories] failed:', err);
  process.exitCode = 1;
});
