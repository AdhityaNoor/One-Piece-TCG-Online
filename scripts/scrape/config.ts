/**
 * Scraper configuration: where output goes, and shared constants.
 *
 * Output lives OUTSIDE /src so it is never compiled into the app bundle, and
 * the whole `scrape/` data directory is gitignored (see .gitignore). The tool
 * itself (this `scripts/scrape/` folder) stays committed.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

/** Repo root = two levels up from scripts/scrape/. */
export const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');

/** Gitignored output root for all scraped data. */
export const OUTPUT_DIR = resolve(REPO_ROOT, 'scrape');

/** Per-card JSON files live under scrape/cards/<setId>/<cardNumber>.json. */
export const CARDS_DIR = resolve(OUTPUT_DIR, 'cards');

/** Top-level manifest. */
export const INDEX_FILE = resolve(OUTPUT_DIR, 'index.json');

export const PROVIDER = 'optcgapi' as const;

/** Bumped if the ScrapedCard / index JSON shape changes (lets a loader migrate old dumps). */
export const SCRAPE_SCHEMA_VERSION = 1;

/** Folder name for DON!! cards, which have no set_id in the API. */
export const DON_SET_FOLDER = 'DON';
