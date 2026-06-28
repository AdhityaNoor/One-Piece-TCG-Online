/**
 * Discovers what to crawl: set slugs from /cards, then card numbers from each
 * set page. Pure link extraction by regex on the page HTML (no DOM needed) —
 * the set/card pages are server-rendered and link to every card.
 */
import { SITE_BASE } from './config';
import type { PoliteHttpClient } from './httpClient';

/** Matches a card NUMBER like OP01-016, ST01-001, EB01-061, PRB01-001, P-001. */
const CARD_NUMBER_RE = /^[A-Z]{1,4}\d{0,2}-\d{1,4}$/;

/** Extracts set slugs (e.g. "op01-romance-dawn") from the /cards index HTML. */
function extractSetSlugs(html: string): string[] {
  const slugs = new Set<string>();
  const re = /\/cards\/([a-z0-9-]+)(?:["'/?#])/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const seg = m[1];
    if (/^(advanced|promos|en|jp)$/i.test(seg)) continue;
    if (CARD_NUMBER_RE.test(seg.toUpperCase())) continue; // an individual card, not a set
    if (!/-/.test(seg)) continue; // set slugs always have a dash ("op01-...")
    slugs.add(seg);
  }
  return [...slugs];
}

/** Extracts unique card numbers (uppercased) from a set page's HTML. */
function extractCardNumbers(html: string): string[] {
  const nums = new Set<string>();
  const re = /\/cards\/([A-Za-z]{1,4}\d{0,2}-\d{1,4})(?:["'/?#])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1].toUpperCase();
    if (CARD_NUMBER_RE.test(id)) nums.add(id);
  }
  return [...nums];
}

export async function fetchSetSlugs(client: PoliteHttpClient): Promise<string[]> {
  const res = await client.getHtml(`${SITE_BASE}/cards`);
  if (!res.ok) throw new Error(`failed to load set index (/cards): ${res.reason}`);
  const slugs = extractSetSlugs(res.html);
  if (slugs.length === 0) throw new Error('no set slugs found on /cards (layout changed?)');
  return slugs.sort();
}

export async function fetchCardNumbersForSet(
  client: PoliteHttpClient,
  slug: string,
): Promise<{ cardNumbers: string[]; warning?: string }> {
  const res = await client.getHtml(`${SITE_BASE}/cards/${slug}`);
  if (!res.ok) return { cardNumbers: [], warning: `set ${slug}: ${res.reason}` };
  return { cardNumbers: extractCardNumbers(res.html).sort() };
}

export const _internals = { extractSetSlugs, extractCardNumbers, CARD_NUMBER_RE };
