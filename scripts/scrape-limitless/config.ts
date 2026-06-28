/**
 * Limitless One Piece scraper configuration.
 *
 * Limitless (onepiece.limitlesstcg.com) has NO public JSON card API — pages
 * are server-side-rendered HTML — so this scraper fetches and parses HTML.
 * robots.txt allows crawling (`Disallow:` empty), but we still crawl politely:
 * single concurrency, a delay between requests, and retry/backoff. Output is
 * written under the already-gitignored `scrape/` directory.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');

export const SITE_BASE = 'https://onepiece.limitlesstcg.com';
/** Card art CDN: <CDN>/<setCode>/<cardNumber>_<LANG>.webp */
export const IMAGE_CDN = 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece';

export const PROVIDER = 'limitlesstcg' as const;
export const SCRAPE_SCHEMA_VERSION = 1;

/** All output lives under scrape/limitless/ (sibling to the optcgapi scraper's scrape/ output). */
export const OUTPUT_DIR = resolve(REPO_ROOT, 'scrape', 'limitless');
export const CARDS_DIR = resolve(OUTPUT_DIR, 'cards');
/** Downloaded card art: images/<setCode>/<cardNumber>_<LANG>.webp */
export const IMAGES_DIR = resolve(OUTPUT_DIR, 'images');
export const INDEX_FILE = resolve(OUTPUT_DIR, 'index.json');
export const PROGRESS_FILE = resolve(OUTPUT_DIR, 'progress.json');

/** Politeness defaults (overridable via CLI flags). */
export const DEFAULTS = {
  /** Base delay between requests, ms. Jitter is added on top. */
  delayMs: 1200,
  /** Random extra delay 0..jitterMs added to each request. */
  jitterMs: 600,
  /** Per-request timeout, ms. */
  timeoutMs: 20000,
  /** Max attempts per URL (1 try + retries). */
  maxAttempts: 4,
  /** Backoff base, ms (attempt n waits backoffBaseMs * 2^(n-1), capped). */
  backoffBaseMs: 1000,
  backoffCapMs: 15000,
  /** Save progress to disk every N cards. */
  saveEvery: 10,
  /**
   * Image CDN (DigitalOcean Spaces) pacing — faster than the site pages
   * because it's a robust CDN, not the site's self-funded VPS. Still polite.
   */
  cdnDelayMs: 350,
  cdnJitterMs: 250,
} as const;

/** Identifying, honest User-Agent so the site owner can see/contact about the crawl. */
export const USER_AGENT =
  'OPTCG-Simulator-Scraper/1.0 (personal, non-commercial game-engine project; respectful low-rate crawl)';

export const LANGUAGES = ['en', 'jp'] as const;
export type Language = (typeof LANGUAGES)[number];
