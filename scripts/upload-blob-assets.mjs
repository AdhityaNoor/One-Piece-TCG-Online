/**
 * Uploads public/card-images/ to Vercel Blob for production serving.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=<token> node scripts/upload-blob-assets.mjs
 *   BLOB_READ_WRITE_TOKEN=<token> node scripts/upload-blob-assets.mjs --dry-run
 *
 * See docs/04-deployment.md for the full deployment workflow.
 *
 * After upload, set VITE_ASSET_BASE_URL on the Vercel project (production +
 * preview environments) to the printed base URL, then redeploy.
 *
 * Concurrency: 6 parallel uploads, max 1 per ~70ms ≈ ~8 ops/sec — well
 * under Vercel Blob's 15 ops/sec Hobby cap. Previously ran at 8 concurrent
 * with no rate limit and tripped the cap ("Your store is blocked").
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { dirname, fileURLToPath } from 'node:url';
import { put } from '@vercel/blob';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES_DIR = resolve(ROOT, 'public', 'card-images');

const DRY_RUN = process.argv.includes('--dry-run');
const CONCURRENCY = 6;
const DELAY_MS = 70; // ~8 ops/sec per slot → well under 15 ops/sec total

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

const allFiles = await collectFiles(IMAGES_DIR);
const tasks = allFiles.map((absolutePath) => ({
  absolutePath,
  // Strip the "public/" prefix so the blob path mirrors the web-serving path:
  // public/card-images/OP01/OP01-001_EN.webp → card-images/OP01/OP01-001_EN.webp
  blobPath: relative(resolve(ROOT, 'public'), absolutePath).replace(/\\/g, '/'),
}));

console.log(`Found ${tasks.length} files in public/card-images/.`);

if (DRY_RUN) {
  console.log('Dry run — no uploads performed. First 5 blob paths:');
  tasks.slice(0, 5).forEach((t) => console.log(' ', t.blobPath));
  process.exit(0);
}

console.log(`Uploading with concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms/slot…`);
const { firstUrl, errors } = await runPool(tasks, CONCURRENCY, DELAY_MS);

if (errors.length > 0) {
  console.error(`\n${errors.length} upload(s) failed. Re-run to retry (put() with addRandomSuffix:false overwrites in place).`);
  process.exit(1);
}

// Derive the base origin from the first uploaded URL.
// URL shape: https://<store-id>.public.blob.vercel-storage.com/card-images/OP01/...
const blobBase = firstUrl ? new URL(firstUrl).origin : '<could-not-derive>';

console.log(`\nDone. Set this as VITE_ASSET_BASE_URL in the Vercel project's env vars:`);
console.log(`  ${blobBase}`);
console.log(`\nThen redeploy: vercel --prod`);
