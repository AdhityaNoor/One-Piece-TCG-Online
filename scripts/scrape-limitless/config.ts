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
/**
 * Left at 1 on purpose. Alternate-art (prints[]) capture is ADDITIVE, so
 * existing progress.json / card files stay valid and a re-run RESUMES the
 * earlier crawl rather than starting over. Which cards still need their
 * alternate arts is tracked separately in progress.printsCompleted (see
 * progress.ts + run.ts), so the base scrape is never redone and images already
 * on disk are skipped.
 */
export const SCRAPE_SCHEMA_VERSION = 1;

/** All output lives under scrape/limitless/ (sibling to the optcgapi scraper's scrape/ output). */
export const OUTPUT_DIR = resolve(REPO_ROOT, 'scrape', 'limitless');
export const CARDS_DIR = resolve(OUTPUT_DIR, 'cards');
/** Downloaded card art: images/<setCode>/<cardNumber>_<LANG>.webp */
export const IMAGES_DIR = resolve(OUTPUT_DIR, 'images');
export const INDEX_FILE = resolve(OUTPUT_DIR, 'index.json');
export const PROGRESS_FILE = resolve(OUTPUT_DIR, 'progress.json');

/**
 * Speed / robustness defaults (overridable via CLI flags).
 *
 * Pacing delays default to 0 (no artificial throttle) and the crawl runs many
 * cards in parallel (`concurrency`) for speed. Retry/backoff + Retry-After are
 * KEPT regardless of speed — that's not a throttle, it's what prevents an IP
 * ban if the site pushes back, so it's in your interest to leave it on.
 * Re-add throttling any time with `--delay <ms>` / `--concurrency <n>`.
 */
export const DEFAULTS = {
  /** Base delay between requests, ms (0 = no throttle). Jitter is added on top. */
  delayMs: 0,
  /** Random extra delay 0..jitterMs added to each request. */
  jitterMs: 0,
  /** How many cards to fetch in parallel. */
  concurrency: 12,
  /** Per-request timeout, ms. */
  timeoutMs: 20000,
  /** Max attempts per URL (1 try + retries). */
  maxAttempts: 4,
  /** Backoff base, ms (attempt n waits backoffBaseMs * 2^(n-1), capped). */
  backoffBaseMs: 1000,
  backoffCapMs: 15000,
  /** Save progress to disk every N cards. */
  saveEvery: 25,
  /** Image CDN pacing (also 0 by default). */
  cdnDelayMs: 0,
  cdnJitterMs: 0,
} as const;

/** Identifying, honest User-Agent so the site owner can see/contact about the crawl. */
export const USER_AGENT =
  'OPTCG-Simulator-Scraper/1.0 (personal, non-commercial game-engine project; respectful low-rate crawl)';

export const LANGUAGES = ['en', 'jp'] as const;
export type Language = (typeof LANGUAGES)[number];
