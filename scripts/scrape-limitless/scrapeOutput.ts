/**
 * Builds LimitlessCard records and writes them to disk.
 *
 * Layout (under the gitignored scrape/ dir):
 *   scrape/limitless/cards/<setCode>/<cardNumber>.json
 *   scrape/limitless/index.json
 *
 * Also derives the engine-facing CardDefinition from the English structural
 * data, so this scraper's output is directly usable by the game engine — the
 * same shape the optcgapi scraper produces. Keyword flags are substring checks
 * of the EN effect text (the same inert detection used elsewhere), never an
 * interpretation of behavior.
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Attribute, CardCategory, CardDefinition, Color } from '../../src/engine/state/card';
import { parseEffect } from '../../src/cards/effectParser';
import { CARDS_DIR, IMAGE_CDN, INDEX_FILE, OUTPUT_DIR, PROVIDER, SCRAPE_SCHEMA_VERSION } from './config';
import type { ImageResult } from './imageDownloader';
import type { LimitlessCard, LimitlessLangData, ParsedCardPage } from './types';

const SKIPPED_IMAGE: ImageResult = { status: 'skipped', file: null };

export function setCodeOf(cardNumber: string): string {
  return cardNumber.split('-')[0].toUpperCase();
}

export function imageUrl(setCode: string, cardNumber: string, lang: 'en' | 'jp'): string {
  return `${IMAGE_CDN}/${setCode}/${cardNumber}_${lang.toUpperCase()}.webp`;
}

const CATEGORY_TO_ENGINE: Record<ParsedCardPage['category'], CardCategory | undefined> = {
  leader: 'leader',
  character: 'character',
  event: 'event',
  stage: 'stage',
  unknown: undefined,
};

function buildDefinition(cardNumber: string, en: ParsedCardPage, enName: string | null): CardDefinition {
  const text = en.effectText;
  return {
    cardDefinitionId: cardNumber,
    name: enName ?? cardNumber,
    category: CATEGORY_TO_ENGINE[en.category] ?? 'character',
    colors: en.colors as Color[],
    types: en.types,
    attributes: en.attributes.length ? (en.attributes as Attribute[]) : undefined,
    basePower: en.power,
    baseCost: en.cost,
    text,
    life: en.life,
    counter: en.counter,
    hasTrigger: text.includes('[Trigger]'),
    hasRush: text.includes('[Rush]') || text.includes('[Rush: Character]'),
    hasBlocker: text.includes('[Blocker]'),
    hasDoubleAttack: text.includes('[Double Attack]'),
    hasBanish: text.includes('[Banish]'),
    isUnblockable: text.includes('[Unblockable]'),
    cardNumber,
    rarity: en.rarity,
  };
}

/**
 * Assembles the final LimitlessCard.
 *
 * `structural` is whichever language page was available (category/colors/stats
 * carry English labels on BOTH pages, so either works). `enParse`/`jpParse` are
 * null when that specific language page was missing.
 */
export function buildLimitlessCard(
  cardNumber: string,
  structural: ParsedCardPage,
  enParse: ParsedCardPage | null,
  jpParse: ParsedCardPage | null,
  fetchedAt: string,
  images?: { en?: ImageResult; jp?: ImageResult },
): LimitlessCard {
  const setCode = setCodeOf(cardNumber);
  const warnings = [...structural.warnings.map((w) => `struct: ${w}`)];
  const enImg = images?.en ?? SKIPPED_IMAGE;
  const jpImg = images?.jp ?? SKIPPED_IMAGE;

  let en: LimitlessLangData;
  if (enParse) {
    en = {
      language: 'en',
      name: enParse.name,
      effectText: enParse.effectText ?? '',
      types: enParse.types,
      imageUrl: imageUrl(setCode, cardNumber, 'en'),
      imageStatus: enImg.status,
      imageFile: enImg.file,
      pageUrl: `https://onepiece.limitlesstcg.com/cards/en/${cardNumber}`,
      missing: false,
    };
  } else {
    en = {
      language: 'en',
      name: null,
      effectText: null,
      types: [],
      imageUrl: imageUrl(setCode, cardNumber, 'en'),
      imageStatus: enImg.status,
      imageFile: enImg.file,
      pageUrl: `https://onepiece.limitlesstcg.com/cards/en/${cardNumber}`,
      missing: true,
    };
    warnings.push('en: language page missing (Japan-only card, or fetch failed)');
  }

  let jp: LimitlessLangData;
  if (jpParse) {
    jp = {
      language: 'jp',
      name: jpParse.name,
      effectText: jpParse.effectText ?? '',
      types: jpParse.types,
      imageUrl: imageUrl(setCode, cardNumber, 'jp'),
      imageStatus: jpImg.status,
      imageFile: jpImg.file,
      pageUrl: `https://onepiece.limitlesstcg.com/cards/jp/${cardNumber}`,
      missing: false,
    };
    warnings.push(...jpParse.warnings.map((w) => `jp: ${w}`));
  } else {
    jp = {
      language: 'jp',
      name: null,
      effectText: null,
      types: [],
      imageUrl: imageUrl(setCode, cardNumber, 'jp'),
      imageStatus: jpImg.status,
      imageFile: jpImg.file,
      pageUrl: `https://onepiece.limitlesstcg.com/cards/jp/${cardNumber}`,
      missing: true,
    };
    warnings.push('jp: language page missing (no Japanese printing, or fetch failed)');
  }

  // Definition/effect parse come from the EN effect text when present, but the
  // structural attributes (power/cost/etc.) come from whichever page was found.
  const enEffectText = en.effectText ?? '';
  const definition = buildDefinition(cardNumber, { ...structural, effectText: enEffectText }, en.name ?? structural.name);
  const effectParse = parseEffect(cardNumber, enEffectText);

  return {
    schemaVersion: SCRAPE_SCHEMA_VERSION,
    cardNumber,
    setCode,
    category: structural.category,
    colors: structural.colors,
    cost: structural.cost,
    power: structural.power,
    life: structural.life,
    counter: structural.counter,
    attributes: structural.attributes,
    block: structural.block,
    rarity: structural.rarity,
    legality: structural.legality,
    en,
    jp,
    definition,
    effectParse,
    warnings,
    source: { provider: PROVIDER, fetchedAt },
  };
}

export interface IndexEntry {
  cardNumber: string;
  setCode: string;
  enName: string | null;
  jpName: string | null;
  file: string;
  needsReview: boolean;
  jpMissing: boolean;
  enImage: LimitlessCard['en']['imageStatus'];
  jpImage: LimitlessCard['jp']['imageStatus'];
}

const IMAGE_PRESENT = new Set(['downloaded', 'exists']);

function safe(seg: string): string {
  return seg.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function cardRelativePath(setCode: string, cardNumber: string): string {
  return join('cards', safe(setCode), `${safe(cardNumber)}.json`);
}

/** Atomic per-card write. */
export async function writeLimitlessCard(card: LimitlessCard): Promise<IndexEntry> {
  const rel = cardRelativePath(card.setCode, card.cardNumber);
  const abs = resolve(OUTPUT_DIR, rel);
  await mkdir(dirname(abs), { recursive: true });
  const tmp = `${abs}.tmp`;
  await writeFile(tmp, JSON.stringify(card, null, 2), 'utf8');
  await rename(tmp, abs);
  return {
    cardNumber: card.cardNumber,
    setCode: card.setCode,
    enName: card.en.name,
    jpName: card.jp.name,
    file: rel.split('\\').join('/'),
    needsReview: card.effectParse.needsReview,
    jpMissing: card.jp.missing,
    enImage: card.en.imageStatus,
    jpImage: card.jp.imageStatus,
  };
}

export async function writeIndex(entries: IndexEntry[]): Promise<void> {
  const bySet: Record<string, number> = {};
  let needsReview = 0;
  let jpMissing = 0;
  let enImages = 0;
  let jpImages = 0;
  for (const e of entries) {
    bySet[e.setCode] = (bySet[e.setCode] ?? 0) + 1;
    if (e.needsReview) needsReview++;
    if (e.jpMissing) jpMissing++;
    if (IMAGE_PRESENT.has(e.enImage)) enImages++;
    if (IMAGE_PRESENT.has(e.jpImage)) jpImages++;
  }
  const index = {
    schemaVersion: SCRAPE_SCHEMA_VERSION,
    provider: PROVIDER,
    generatedAt: new Date().toISOString(),
    counts: { total: entries.length, needsReview, jpMissing, images: { en: enImages, jp: jpImages }, bySet },
    cards: [...entries].sort((a, b) => a.cardNumber.localeCompare(b.cardNumber)),
  };
  await mkdir(OUTPUT_DIR, { recursive: true });
  const tmp = `${INDEX_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(index, null, 2), 'utf8');
  await rename(tmp, INDEX_FILE);
}

export async function ensureCardsDir(): Promise<void> {
  await mkdir(CARDS_DIR, { recursive: true });
}
