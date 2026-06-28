/**
 * Resumable progress store.
 *
 * Persists the enumerated work list and which cards are done, so a crawl that
 * is interrupted (Ctrl+C, crash, network drop, machine sleep) can be resumed
 * with `npm run scrape:limitless` and pick up exactly where it left off —
 * already-scraped cards are skipped, not re-fetched.
 *
 * Writes are atomic (temp file + rename) so a crash mid-write can never corrupt
 * progress.json.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { OUTPUT_DIR, PROGRESS_FILE, SCRAPE_SCHEMA_VERSION } from './config';

export interface Progress {
  schemaVersion: number;
  startedAt: string;
  updatedAt: string;
  /** Enumerated set slugs (cached so re-runs don't re-enumerate unless --refresh). */
  setSlugs: string[];
  /** Every enumerated card number (deduped, sorted). */
  cardNumbers: string[];
  /** Card numbers fully written. */
  completed: string[];
  /** Card numbers that failed, with the last reason. */
  failed: Record<string, string>;
}

export function emptyProgress(): Progress {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCRAPE_SCHEMA_VERSION,
    startedAt: now,
    updatedAt: now,
    setSlugs: [],
    cardNumbers: [],
    completed: [],
    failed: {},
  };
}

export async function loadProgress(): Promise<Progress | null> {
  try {
    const raw = await readFile(PROGRESS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Progress;
    if (parsed.schemaVersion !== SCRAPE_SCHEMA_VERSION) return null; // stale schema -> start fresh
    return parsed;
  } catch {
    return null; // no file yet, or unreadable
  }
}

export async function saveProgress(progress: Progress): Promise<void> {
  progress.updatedAt = new Date().toISOString();
  await mkdir(dirname(PROGRESS_FILE), { recursive: true });
  const tmp = `${PROGRESS_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(progress, null, 2), 'utf8');
  await rename(tmp, PROGRESS_FILE); // atomic on the same filesystem
}

export async function ensureOutputDir(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
}
