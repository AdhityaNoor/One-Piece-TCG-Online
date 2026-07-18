/**
 * Parses a Limitless card detail page (HTML) into structured fields.
 *
 * Uses jsdom (already a project devDependency) against the real selectors
 * observed on the live site:
 *   .card-text                  - the card-info block
 *     .card-text-title          - holds .card-text-name + .card-text-id
 *     .card-text-type           - "Category - Color - N Cost" line
 *     .card-text-section (p)    - "N Power - Attribute - +N Counter" stats line
 *     .card-text-section (div)  - effect text
 *     .card-text-section (div)  - tribal type names
 *     .card-text-section (div)  - illustrator credit
 *
 * Failsafe: every field is best-effort. A missing field becomes undefined/[]
 * plus a warning string. The parser never throws, so one malformed page cannot
 * abort a multi-thousand-card crawl. Structural attributes are language-neutral
 * (English on both pages); only name / effect / types are localized.
 */
import { JSDOM } from 'jsdom';
import type { LimitlessCard, ParsedCardPage } from './types';

const COLORS = ['red', 'green', 'blue', 'purple', 'black', 'yellow'];
const ATTRIBUTES = ['slash', 'strike', 'special', 'wisdom', 'ranged'];
const CATEGORIES: Record<string, LimitlessCard['category']> = {
  leader: 'leader',
  character: 'character',
  event: 'event',
  stage: 'stage',
};

const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

function text(el: Element | null): string {
  return clean(el?.textContent ?? '');
}

/** Direct-child `.card-text-section` elements of `.card-text`, in document order. */
function sectionChildren(cardText: Element): Element[] {
  return [...cardText.children].filter((c) => c.classList.contains('card-text-section'));
}

function isIllustrationSection(value: string): boolean {
  return /^illustrated\s+by\b/i.test(value);
}

function isTypeCandidateText(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 120 &&
    !isIllustrationSection(value) &&
    !/^block\s+\d+$/i.test(value) &&
    !/^tournament\s+status$/i.test(value) &&
    !/^(legal|not legal)$/i.test(value) &&
    !/\b(power|counter|cost|life)\b/i.test(value) &&
    !/[\[\]]/.test(value) &&
    !/[{}]/.test(value)
  );
}

function typeTextFromSection(section: Element): string[] {
  const anchors = [...section.querySelectorAll('a')]
    .filter((a) => /[?&]q=type/i.test(a.getAttribute('href') ?? ''))
    .map((a) => clean(a.textContent))
    .filter(Boolean);
  if (anchors.length > 0) return anchors;

  const value = text(section);
  if (!isTypeCandidateText(value)) return [];
  return value.split('/').map((type) => type.trim()).filter(Boolean);
}

/** The authoritative per-print image URL from the page's Open Graph / Twitter meta. */
function ogImageUrl(doc: Document): string | null {
  const meta =
    doc.querySelector('meta[property="og:image"]') ??
    doc.querySelector('meta[name="og:image"]') ??
    doc.querySelector('meta[name="twitter:image"]');
  const content = meta?.getAttribute('content');
  return content && content.trim() ? content.trim() : null;
}

/**
 * Collects the `?v=N` params of the OTHER printings linked from the prints
 * table. Base print rows link with `?v=1`, `?v=2`, …; the row for the print
 * you're currently viewing is not a link, so its own param never appears here.
 */
function extractVariantParams(doc: Document): number[] {
  const params = new Set<number>();
  for (const a of doc.querySelectorAll('a[href*="v="]')) {
    const href = a.getAttribute('href') ?? '';
    if (!/\/cards\//i.test(href)) continue;
    const m = href.match(/[?&]v=(\d+)/);
    if (m) params.add(Number(m[1]));
  }
  return [...params].sort((a, b) => a - b);
}

/** Strips the "SetName (SETID) " prefix off a print label, leaving the kind ("Alternate Art"/"Rare"/…). */
function printKindFromLabel(label: string | null): string | null {
  if (!label) return null;
  const afterParen = label.match(/\)\s*(.+)$/);
  const kind = clean(afterParen ? afterParen[1] : label);
  return kind || null;
}

/** Finds an "Illustrated by X" section and returns X (or null). */
function extractIllustrator(cardText: Element): string | null {
  for (const section of sectionChildren(cardText)) {
    const value = text(section);
    const m = value.match(/^illustrated\s+by\s+(.+)$/i);
    if (m) return clean(m[1]) || null;
  }
  return null;
}

export function parseCardPage(html: string, expectedCardNumber: string): ParsedCardPage {
  const warnings: string[] = [];
  const result: ParsedCardPage = {
    cardNumber: expectedCardNumber || null,
    name: null,
    category: 'unknown',
    colors: [],
    attributes: [],
    legality: {},
    effectText: '',
    types: [],
    ogImage: null,
    printLabel: null,
    printKind: null,
    illustrator: null,
    variantParams: [],
    warnings,
  };

  let doc: Document;
  try {
    doc = new JSDOM(html).window.document;
  } catch (e) {
    warnings.push(`jsdom-parse-failed: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  // og:image is the authoritative per-print CDN image URL (differs per ?v=N).
  result.ogImage = ogImageUrl(doc);

  // Prints table: which other printings (?v=N) exist, linked from THIS page.
  result.variantParams = extractVariantParams(doc);

  const cardText = doc.querySelector('.card-text');
  if (!cardText) {
    warnings.push('no .card-text block found (page layout changed or non-card page)');
    return result;
  }

  // Current-print label, e.g. "Romance Dawn (OP01) Alternate Art". The trailing
  // descriptor after the "(SETID)" is the print kind ("Alternate Art"/"Rare"/…).
  const printLabel = text(doc.querySelector('.card-prints-current')) || null;
  result.printLabel = printLabel;
  result.printKind = printKindFromLabel(printLabel);

  // Illustrator credit, if the page shows one ("Illustrated by …").
  result.illustrator = extractIllustrator(cardText);

  result.name = text(cardText.querySelector('.card-text-name')) || null;
  const idText = text(cardText.querySelector('.card-text-id'));
  if (idText) result.cardNumber = idText;
  if (!result.name) warnings.push('missing card name');

  const typeLine = text(cardText.querySelector('.card-text-type'));
  for (const tokenRaw of typeLine.split('•')) {
    const token = clean(tokenRaw);
    const lower = token.toLowerCase();
    if (CATEGORIES[lower]) {
      result.category = CATEGORIES[lower];
      continue;
    }
    const costM = token.match(/(\d+)\s*cost/i);
    if (costM) {
      result.cost = Number(costM[1]);
      continue;
    }
    const lifeM = token.match(/(\d+)\s*life/i);
    if (lifeM) {
      result.life = Number(lifeM[1]);
      continue;
    }
    for (const part of lower.split(/[\/,]/).map((p) => p.trim())) {
      if (COLORS.includes(part) && !result.colors.includes(part)) result.colors.push(part);
    }
  }
  if (result.category === 'unknown') warnings.push(`could not classify category from "${typeLine}"`);
  if (result.colors.length === 0) warnings.push(`no color parsed from "${typeLine}"`);

  const sections = sectionChildren(cardText);
  const titleSection = sections.find((s) => s.querySelector('.card-text-title')) ?? sections[0];
  const nonTitle = sections.filter((s) => s !== titleSection);

  const statsSection =
    nonTitle.find((s) => /\b(power|counter)\b/i.test(text(s)) && text(s).length < 120) ?? null;
  if (statsSection) {
    const stats = text(statsSection);
    const powerM = stats.match(/(\d+)\s*power/i);
    if (powerM) result.power = Number(powerM[1]);
    const counterM = stats.match(/\+?(\d+)\s*counter/i);
    if (counterM) result.counter = Number(counterM[1]);
    const lifeM = stats.match(/(\d+)\s*life/i);
    if (lifeM && result.life === undefined) result.life = Number(lifeM[1]);
    for (const attr of ATTRIBUTES) {
      if (new RegExp(`\\b${attr}\\b`, 'i').test(stats) && !result.attributes.includes(attr)) {
        result.attributes.push(attr);
      }
    }
  }

  const typeCandidates = nonTitle.filter((s) => s !== statsSection && typeTextFromSection(s).length > 0);
  const typesSection = typeCandidates.length > 0 ? typeCandidates[typeCandidates.length - 1] : null;
  if (typesSection) result.types = typeTextFromSection(typesSection);

  const effectCandidates = nonTitle.filter((s) => s !== statsSection && s !== typesSection && !isIllustrationSection(text(s)));
  if (effectCandidates.length > 0) {
    const longest = effectCandidates.reduce((a, b) => (text(a).length >= text(b).length ? a : b));
    result.effectText = text(longest);
  }

  for (const badge of doc.querySelectorAll('.card-legality-badge')) {
    const t = text(badge).toLowerCase();
    if (t.includes('standard')) result.legality.standard = clean(badge.textContent);
    else if (t.includes('extra')) result.legality.extra = clean(badge.textContent);
  }

  const blockM = text(cardText).match(/block\s*\d+/i) || text(doc.querySelector('.card-legality')).match(/block\s*\d+/i);
  if (blockM) result.block = clean(blockM[0]);

  const printsText = text(doc.querySelector('.card-prints-current')) || text(doc.querySelector('.card-prints'));
  const rarityM = printsText.match(
    /\b(Secret Rare|Super Rare|Treasure Rare|Special Card|Uncommon|Common|Leader|Promo|Promotion|Rare)\b/i,
  );
  if (rarityM) {
    const label = rarityM[1];
    // "Promotion Pack …" / "Promotion" → normalize to Promo for catalog consistency.
    result.rarity = /^promotion$/i.test(label) ? 'Promo' : label;
  } else if (/\bpromo/i.test(printsText)) {
    result.rarity = 'Promo';
  }

  return result;
}

export const _internals = { ogImageUrl, extractVariantParams, printKindFromLabel, extractIllustrator };
