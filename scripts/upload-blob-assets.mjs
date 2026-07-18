/**
 * Uploads public/card-images/ to Vercel Blob for production serving.
 *
 * By default this is **incremental**: lists existing blobs under `card-images/`
 * and only uploads files that are missing or whose size changed. Use `--force`
 * to re-upload everything.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=<token> node scripts/upload-blob-assets.mjs
 *   BLOB_READ_WRITE_TOKEN=<token> node scripts/upload-blob-assets.mjs --dry-run
 *   BLOB_READ_WRITE_TOKEN=<token> node scripts/upload-blob-assets.mjs --set P
 *   BLOB_READ_WRITE_TOKEN=<token> node scripts/upload-blob-assets.mjs --force
 *
 * See docs/07-backend-deployment.md (or project deploy notes) for workflow context.
 *
 * After upload, set VITE_ASSET_BASE_URL on the Vercel project (production +
 * preview environments) to the printed base URL, then redeploy.
 *
 * Concurrency: 6 parallel uploads, max 1 per ~70ms ≈ ~8 ops/sec — well
 * under Vercel Blob's 15 ops/sec Hobby cap.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { list, put } from '@vercel/blob';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES_DIR = resolve(ROOT, 'public', 'card-images');
const PUBLIC_DIR = resolve(ROOT, 'public');
const BLOB_PREFIX = 'card-images/';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const SET_FLAG_IDX = process.argv.indexOf('--set');
const SET_FILTER = SET_FLAG_IDX >= 0 ? (process.argv[SET_FLAG_IDX + 1] ?? '').toUpperCase() : null;

const CONCURRENCY = 6;
const DELAY_MS = 70; // ~8 ops/sec per slot → well under 15 ops/sec total
const LIST_LIMIT = 1000;

if (!DRY_RUN && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Error: BLOB_READ_WRITE_TOKEN is not set.');
  console.error('Set it before running: BLOB_READ_WRITE_TOKEN=<token> npm run upload:blob-assets');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

/** pathname → size (bytes) for every blob under card-images/. */
async function listExistingBlobSizes(token) {
  /** @type {Map<string, number>} */
  const sizes = new Map();
  let cursor;
  let pages = 0;
  do {
    const page = await list({
      prefix: BLOB_PREFIX,
      limit: LIST_LIMIT,
      cursor,
      token,
    });
    for (const blob of page.blobs) {
      sizes.set(blob.pathname, blob.size);
    }
    cursor = page.hasMore ? page.cursor : undefined;
    pages += 1;
    if (pages % 5 === 0) {
      console.log(`  listed ${sizes.size} remote blob(s)…`);
    }
  } while (cursor);
  return sizes;
}

// ---------------------------------------------------------------------------
// Upload with throttled concurrency pool
// ---------------------------------------------------------------------------

async function uploadFile(absolutePath, blobPath) {
  const content = await readFile(absolutePath);
  const ext = absolutePath.split('.').pop() ?? '';
  const contentType = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'application/octet-stream';
  const result = await put(blobPath, content, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return result.url;
}

async function runPool(tasks, concurrency, delayMs) {
  let index = 0;
  let done = 0;
  let firstUrl = null;
  const errors = [];

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      const { absolutePath, blobPath } = tasks[i];
      try {
        await new Promise((r) => setTimeout(r, delayMs));
        const url = await uploadFile(absolutePath, blobPath);
        if (!firstUrl) firstUrl = url;
      } catch (err) {
        errors.push({ blobPath, message: err instanceof Error ? err.message : String(err) });
        if (errors.length <= 10) {
          console.error(`  FAIL  ${blobPath}: ${errors.at(-1).message}`);
        }
      }
      done++;
      if (done % 100 === 0) {
        console.log(`  ${done}/${tasks.length} uploaded…`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return { firstUrl, errors };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const scanRoot = SET_FILTER ? resolve(IMAGES_DIR, SET_FILTER) : IMAGES_DIR;
try {
  await stat(scanRoot);
} catch {
  console.error(`Error: no local images at ${relative(ROOT, scanRoot).replace(/\\/g, '/')}`);
  process.exit(1);
}

const allFiles = await collectFiles(scanRoot);
const localTasks = [];
for (const absolutePath of allFiles) {
  const blobPath = relative(PUBLIC_DIR, absolutePath).replace(/\\/g, '/');
  const { size } = await stat(absolutePath);
  localTasks.push({ absolutePath, blobPath, size });
}

console.log(
  `Found ${localTasks.length} local file(s) in ${relative(ROOT, scanRoot).replace(/\\/g, '/')}` +
    `${SET_FILTER ? ` (--set ${SET_FILTER})` : ''}.`,
);

let tasks = localTasks;
let skipped = 0;

if (!FORCE) {
  if (DRY_RUN && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('Dry run without BLOB_READ_WRITE_TOKEN — cannot list remote; would upload all local files.');
  } else {
    console.log('Listing existing blobs (skip unchanged)…');
    const remote = await listExistingBlobSizes(process.env.BLOB_READ_WRITE_TOKEN);
    console.log(`  remote: ${remote.size} blob(s) under ${BLOB_PREFIX}`);
    tasks = [];
    for (const t of localTasks) {
      const remoteSize = remote.get(t.blobPath);
      if (remoteSize !== undefined && remoteSize === t.size) {
        skipped++;
        continue;
      }
      tasks.push(t);
    }
  }
} else {
  console.log('--force: uploading all local files (overwrite).');
}

console.log(`To upload: ${tasks.length}  |  skip (already present, same size): ${skipped}`);

if (DRY_RUN) {
  console.log('Dry run — no uploads performed. First 5 pending blob paths:');
  tasks.slice(0, 5).forEach((t) => console.log(' ', t.blobPath));
  process.exit(0);
}

if (tasks.length === 0) {
  console.log('\nNothing new to upload.');
  process.exit(0);
}

console.log(`Uploading with concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms/slot…`);
const { firstUrl, errors } = await runPool(tasks, CONCURRENCY, DELAY_MS);

if (errors.length > 0) {
  console.error(`\n${errors.length} upload(s) failed. Re-run to retry (only missing/changed files are uploaded by default).`);
  process.exit(1);
}

// Prefer a URL from this run; otherwise derive from any known blob path shape.
const blobBase = firstUrl
  ? new URL(firstUrl).origin
  : '<could-not-derive — set VITE_ASSET_BASE_URL from a prior upload>';

console.log(`\nDone. Uploaded ${tasks.length}, skipped ${skipped}.`);
console.log(`VITE_ASSET_BASE_URL (if not already set):`);
console.log(`  ${blobBase}`);
console.log(`\nThen redeploy: vercel --prod`);
