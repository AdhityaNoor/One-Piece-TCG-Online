/**
 * Polite, failsafe HTTP client for the Limitless crawl (HTML pages + image CDN).
 *
 * Guarantees:
 * - One request at a time per client instance, with a delay + jitter enforced
 *   BETWEEN requests so we never burst a host. (Pages and the image CDN use
 *   separate client instances with separate pacing — see run.ts.)
 * - Identifying User-Agent (config.USER_AGENT).
 * - Per-request timeout via AbortController.
 * - Retry with exponential backoff on network errors and 429/5xx, honoring a
 *   `Retry-After` header when present.
 * - Never throws across its boundary: returns a discriminated result so the
 *   orchestrator can record a failure and keep going (failsafe).
 */
import { DEFAULTS, USER_AGENT } from './config';

export type FetchOptions = {
  delayMs: number;
  jitterMs: number;
  timeoutMs: number;
  maxAttempts: number;
  backoffBaseMs: number;
  backoffCapMs: number;
};

export type HtmlResult =
  | { ok: true; status: number; html: string; finalUrl: string }
  | { ok: false; status: number | null; reason: string };

export type BufferResult =
  | { ok: true; status: number; bytes: Uint8Array; contentType: string | null }
  | { ok: false; status: number | null; reason: string };

type ResponseResult = { ok: true; res: Response } | { ok: false; status: number | null; reason: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PoliteHttpClient {
  private lastRequestAt = 0;
  private opts: FetchOptions;
  private accept: string;

  constructor(opts?: Partial<FetchOptions>, accept = 'text/html') {
    this.opts = {
      delayMs: opts?.delayMs ?? DEFAULTS.delayMs,
      jitterMs: opts?.jitterMs ?? DEFAULTS.jitterMs,
      timeoutMs: opts?.timeoutMs ?? DEFAULTS.timeoutMs,
      maxAttempts: opts?.maxAttempts ?? DEFAULTS.maxAttempts,
      backoffBaseMs: opts?.backoffBaseMs ?? DEFAULTS.backoffBaseMs,
      backoffCapMs: opts?.backoffCapMs ?? DEFAULTS.backoffCapMs,
    };
    this.accept = accept;
  }

  private async pace(): Promise<void> {
    const wait = this.opts.delayMs + Math.floor(Math.random() * this.opts.jitterMs);
    const since = Date.now() - this.lastRequestAt;
    if (since < wait) await sleep(wait - since);
    this.lastRequestAt = Date.now();
  }

  private backoff(attempt: number, retryAfterSec?: number): number {
    if (retryAfterSec && Number.isFinite(retryAfterSec)) return Math.min(retryAfterSec * 1000, this.opts.backoffCapMs * 3);
    return Math.min(this.opts.backoffBaseMs * 2 ** (attempt - 1), this.opts.backoffCapMs);
  }

  /** Shared core: paced + retried fetch, returning the successful Response (body unread). */
  private async getResponse(url: string): Promise<ResponseResult> {
    let lastReason = 'unknown';
    let lastStatus: number | null = null;

    for (let attempt = 1; attempt <= this.opts.maxAttempts; attempt++) {
      await this.pace();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs);
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, Accept: this.accept },
          redirect: 'follow',
          signal: controller.signal,
        });
        clearTimeout(timer);
        lastStatus = res.status;

        if (res.status === 404) return { ok: false, status: 404, reason: 'not-found' };
        if (res.status === 429 || res.status >= 500) {
          const ra = Number(res.headers.get('retry-after'));
          lastReason = `http ${res.status}`;
          if (attempt < this.opts.maxAttempts) {
            await sleep(this.backoff(attempt, Number.isFinite(ra) ? ra : undefined));
            continue;
          }
          return { ok: false, status: res.status, reason: lastReason };
        }
        if (!res.ok) return { ok: false, status: res.status, reason: `http ${res.status}` };
        return { ok: true, res };
      } catch (err) {
        clearTimeout(timer);
        lastReason = err instanceof Error ? (err.name === 'AbortError' ? 'timeout' : err.message) : String(err);
        if (attempt < this.opts.maxAttempts) {
          await sleep(this.backoff(attempt));
          continue;
        }
      }
    }
    return { ok: false, status: lastStatus, reason: lastReason };
  }

  /** Fetches one URL's HTML. 404 -> non-ok 'not-found' (a real "no such page"), not retried. */
  async getHtml(url: string): Promise<HtmlResult> {
    const r = await this.getResponse(url);
    if (!r.ok) return r;
    try {
      const html = await r.res.text();
      return { ok: true, status: r.res.status, html, finalUrl: r.res.url };
    } catch (e) {
      return { ok: false, status: r.res.status, reason: `body-read: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  /** Fetches one URL's bytes (for images). 404 -> non-ok 'not-found'. */
  async getBuffer(url: string): Promise<BufferResult> {
    const r = await this.getResponse(url);
    if (!r.ok) return r;
    try {
      const ab = await r.res.arrayBuffer();
      return { ok: true, status: r.res.status, bytes: new Uint8Array(ab), contentType: r.res.headers.get('content-type') };
    } catch (e) {
      return { ok: false, status: r.res.status, reason: `body-read: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
}
