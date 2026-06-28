/**
 * Parses a Limitless card detail page (HTML) into structured fields.
 *
 * Uses jsdom (already a project devDependency) against the real selectors
 * observed on the live site:
 *   .card-text                  - the card-info block
 *     .card-text-title          - holds .card-text-name + .card-text-id
 *     .card-text-type           - "Category • Color • N Cost" line
 *     .card-text-section (p)    - "N Power • Attribute • +N Counter" stats line
 *     .card-text-section (div)  - effect text (may contain [..]/【..】 tags)
 *     .card-text-section (div)  - tribal type names (linked)
 *   .card-legality-badge        - "Standard legal" / "Extra legal"
 *
 * Failsafe: every field is best-effort. A missing field becomes undefined/[]
 * plus a warning string — the parser never throws, so one malformed page can't
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
    warnings,
  };

  let doc: Document;
  try {
    doc = new JSDOM(html).window.document;
  } catch (e) {
    warnings.push(`jsdom-parse-failed: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  const cardText = doc.querySelector('.card-text');
  if (!cardText) {
    warnings.push('no .card-text block found (page layout changed or non-card page)');
    return result;
  }

  // --- name + id ---
  result.name = text(cardText.querySelector('.card-text-name')) || null;
  const idText = text(cardText.querySelector('.card-text-id'));
  if (idText) result.cardNumber = idText;
  if (!result.name) warnings.push('missing card name');

  // --- type line: "Category • Color • N Cost" (also Life for some) ---
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
    // Otherwise treat as color(s): may be "Red" or "Blue/Purple".
    for (const part of lower.split(/[\/,]/).map((p) => p.trim())) {
      if (COLORS.includes(part) && !result.colors.includes(part)) result.colors.push(part);
    }
  }
  if (result.category === 'unknown') warnings.push(`could not classify category from "${typeLine}"`);
  if (result.colors.length === 0) warnings.push(`no color parsed from "${typeLine}"`);

  // --- locate sections ---
  const sections = sectionChildren(cardText);
  const titleSection = sections.find((s) => s.querySelector('.card-text-title')) ?? sections[0];
  const nonTitle = sections.filter((s) => s !== titleSection);

  // stats line: "N Power • Attribute • +N Counter" (+ Life for leaders)
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

  // types section: the trailing section whose anchors link to a type search,
  // or the last short section that isn't the stats line.
  const typesSection =
    nonTitle
      .filter((s) => s !== statsSection)
      .reverse()
      .find((s) => {
        const anchors = [...s.querySelectorAll('a')];
        if (anchors.some((a) => /q=type/i.test(a.getAttribute('href') ?? ''))) return true;
        const t = text(s);
        return t.length > 0 && t.length <= 80 && !/[[\]【】]/.test(t);
      }) ?? null;
  if (typesSection) {
    const anchors = [...typesSection.querySelectorAll('a')].map((a) => clean(a.textContent)).filter(Boolean);
    result.types = anchors.length > 0 ? anchors : (text(typesSection) ? [text(typesSection)] : []);
  }

  // effect: the longest remaining section (excludes title/stats/types). '' if none (vanilla card).
  const effectCandidates = nonTitle.filter((s) => s !== statsSection && s !== typesSection);
  if (effectCandidates.length > 0) {
    const longest = effectCandidates.reduce((a, b) => (text(a).length >= text(b).length ? a : b));
    result.effectText = text(longest);
  }

  // --- legality badges ---
  for (const badge of doc.querySelectorAll('.card-legality-badge')) {
    const t = text(badge).toLowerCase();
    if (t.includes('standard')) result.legality.standard = clean(badge.textContent);
    else if (t.includes('extra')) result.legality.extra = clean(badge.textContent);
  }

  // --- block / regulation mark (best-effort) ---
  const blockM = text(cardText).match(/block\s*\d+/i) || text(doc.querySelector('.card-legality')).match(/block\s*\d+/i);
  if (blockM) result.block = clean(blockM[0]);

  // --- rarity (best-effort, from the prints/set line) ---
  const printsText = text(doc.querySelector('.card-prints-current')) || text(doc.querySelector('.card-prints'));
  const rarityM = printsText.match(/\b(Secret Rare|Super Rare|Treasure Rare|Special Card|Uncommon|Common|Leader|Promo|Rare)\b/);
  if (rarityM) result.rarity = rarityM[1];

  return result;
}
