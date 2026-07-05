/**
 * Downloads card art from the Limitless image CDN.
 *
 * Saved to: scrape/limitless/images/<setCode>/<cardNumber>_<LANG>.webp
 *
 * - Resumable: if the file already exists and is non-empty, it's left alone
 *   (status 'exists') — re-runs never re-download.
 * - Failsafe: a 404 is a real "no art for this language/printing" (status
 *   'missing'); a network/timeout failure is 'failed' (recorded, crawl
 *   continues). Never throws.
 * - Atomic: writes to a temp file then renames, so an interrupted download
 *   can't leave a half-written image behind.
 */
import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { IMAGES_DIR, OUTPUT_DIR } from './config';
import type { PoliteHttpClient } from './httpClient';

export type ImageStatus = 'downloaded' | 'exists' | 'missing' | 'failed' | 'skipped';

export interface ImageResult {
  status: ImageStatus;
  /** Path relative to scrape/limitless/, POSIX separators. null when missing/failed/skipped. */
  file: string | null;
  reason?: string;
}

const safe = (s: string): string => s.replace(/[^A-Za-z0-9._-]/g, '_');

/**
 * Relative-to-output path for a card image. `variantId` is '' for the base
 * print and 'p1'/'p2'/… for alternate arts, producing filenames that mirror
 * the CDN: `OP01-016_EN.webp` (base) / `OP01-016_p1_EN.webp` (alternate art).
 */
export function imageRelativePath(setCode: string, cardNumber: string, lang: 'en' | 'jp', variantId = ''): string {
  const infix = variantId ? `_${safe(variantId)}` : '';
  return join('images', safe(setCode), `${safe(cardNumber)}${infix}_${lang.toUpperCase()}.webp`).split('\\').join('/');
}

export async function downloadImage(
  cdnClient: PoliteHttpClient,
  url: string,
  setCode: string,
  cardNumber: string,
  lang: 'en' | 'jp',
  variantId = '',
): Promise<ImageResult> {
  const rel = imageRelativePath(setCode, cardNumber, lang, variantId);
  const abs = resolve(OUTPUT_DIR, rel);

  // Resume: already downloaded?
  try {
    const st = await stat(abs);
    if (st.size > 0) return { status: 'exists', file: rel };
  } catch {
    /* not present yet */
  }

  const res = await cdnClient.getBuffer(url);
  if (!res.ok) {
    if (res.reason === 'not-found') return { status: 'missing', file: null, reason: '404' };
    return { status: 'failed', file: null, reason: res.reason };
  }
  if (res.bytes.byteLength === 0) return { status: 'missing', file: null, reason: 'empty body' };

  try {
    await mkdir(dirname(abs), { recursive: true });
    const tmp = `${abs}.tmp`;
    await writeFile(tmp, res.bytes);
    await rename(tmp, abs);
    return { status: 'downloaded', file: rel };
  } catch (e) {
    return { status: 'failed', file: null, reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function ensureImagesDir(): Promise<void> {
  await mkdir(IMAGES_DIR, { recursive: true });
}
