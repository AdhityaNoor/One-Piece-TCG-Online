/**
 * Discovers what to crawl: set slugs from /cards, promo product slugs from
 * /cards/promos, then card numbers from each product page. Pure link
 * extraction by regex on the page HTML (no DOM needed) — the set/card pages
 * are server-rendered and link to every card.
 *
 * Limitless moved promotional products off the main /cards index onto
 * /cards/promos (banner: "Promotional products are now listed on their own
 * page"). Without crawling that index, P-* promo cards never enter the worklist.
 */
import { SITE_BASE } from './config';
import type { PoliteHttpClient } from './httpClient';

/** Matches a card NUMBER like OP01-016, ST01-001, EB01-061, PRB01-001, P-001. */
const CARD_NUMBER_RE = /^[A-Z]{1,4}\d{0,2}-\d{1,4}$/;

/** Paths under /cards/ that are nav/filter pages, never product indexes. */
const RESERVED_CARD_SEGMENTS = /^(advanced|promos|en|jp)$/i;

/**
 * Extracts product/set slugs from a Limitless cards-index HTML page.
 * Accepts both booster slugs ("op01-romance-dawn") and promo product slugs
 * ("tournament-pack-12", "misc-promos", "prize-cards") — anything with a dash
 * that is not a reserved segment or a bare card number.
 */
function extractSetSlugs(html: string): string[] {
  const slugs = new Set<string>();
  const re = /\/cards\/([a-z0-9-]+)(?:["'/?#])/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const seg = m[1];
    if (RESERVED_CARD_SEGMENTS.test(seg)) continue;
    if (CARD_NUMBER_RE.test(seg.toUpperCase())) continue; // an individual card, not a set
    if (!/-/.test(seg)) continue; // product/set slugs always have a dash
    slugs.add(seg);
  }
  return [...slugs];
}

/** Extracts unique card numbers (uppercased) from a set/product page's HTML. */
function extractCardNumbers(html: string): string[] {
  const nums = new Set<string>();
  // Direct `/cards/P-001` and language-prefixed `/cards/en/P-001` / `/cards/jp/…`.
  const re = /\/cards\/(?:en\/|jp\/)?([A-Za-z]{1,4}\d{0,2}-\d{1,4})(?:["'/?#])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1].toUpperCase();
    if (CARD_NUMBER_RE.test(id)) nums.add(id);
  }
  return [...nums];
}

/** Promo product slugs from `/cards/promos` only (Limitless's dedicated promo index). */
export async function fetchPromoProductSlugs(client: PoliteHttpClient): Promise<string[]> {
  const promos = await client.getHtml(`${SITE_BASE}/cards/promos`);
  if (!promos.ok) throw new Error(`failed to load promo index (/cards/promos): ${promos.reason}`);
  const slugs = extractSetSlugs(promos.html);
  if (slugs.length === 0) throw new Error('no promo product slugs found on /cards/promos (layout changed?)');
  return slugs.sort();
}

/**
 * Enumerates product slugs from the main Products index AND the Promos index.
 * Dedupes + sorts. Promo products live only under /cards/promos now.
 */
export async function fetchSetSlugs(client: PoliteHttpClient): Promise<string[]> {
  const slugs = new Set<string>();

  const products = await client.getHtml(`${SITE_BASE}/cards`);
  if (!products.ok) throw new Error(`failed to load set index (/cards): ${products.reason}`);
  for (const s of extractSetSlugs(products.html)) slugs.add(s);

  try {
    const promoSlugs = await fetchPromoProductSlugs(client);
    for (const s of promoSlugs) slugs.add(s);
    console.log(`[limitless] /cards/promos: ${promoSlugs.length} promo product(s)`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[limitless] warning: ${reason}`);
  }

  if (slugs.size === 0) throw new Error('no set slugs found on /cards or /cards/promos (layout changed?)');
  return [...slugs].sort();
}

export async function fetchCardNumbersForSet(
  client: PoliteHttpClient,
  slug: string,
): Promise<{ cardNumbers: string[]; warning?: string }> {
  const res = await client.getHtml(`${SITE_BASE}/cards/${slug}`);
  if (!res.ok) return { cardNumbers: [], warning: `set ${slug}: ${res.reason}` };
  return { cardNumbers: extractCardNumbers(res.html).sort() };
}

export const _internals = { extractSetSlugs, extractCardNumbers, CARD_NUMBER_RE, RESERVED_CARD_SEGMENTS };
