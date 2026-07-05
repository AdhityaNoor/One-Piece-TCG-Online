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
import type { LimitlessCard, LimitlessLangData, LimitlessPrint, LimitlessPrintImage, ParsedCardPage } from './types';

const SKIPPED_IMAGE: ImageResult = { status: 'skipped', file: null };

export function setCodeOf(cardNumber: string): string {
  return cardNumber.split('-')[0].toUpperCase();
}

/**
 * Constructed CDN image URL — the deterministic fallback used only when a
 * print page had no og:image to read. `variantId` is '' for the base print,
 * 'p1'/'p2'/… for alternate arts.
 */
export function imageUrl(setCode: string, cardNumber: string, lang: 'en' | 'jp', variantId = ''): string {
  const infix = variantId ? `_${variantId}` : '';
  return `${IMAGE_CDN}/${setCode}/${cardNumber}${infix}_${lang.toUpperCase()}.webp`;
}

/**
 * Recovers the variant infix ('' | 'p1' | 'p2' | …) from a real CDN image URL,
 * e.g. ".../OP01/OP01-016_p1_EN.webp" -> "p1", ".../OP01-016_EN.webp" -> "".
 * This is how a print's `variantId` is determined — from the ACTUAL filename,
 * not assumed from the ?v param.
 */
export function variantIdFromImageUrl(url: string | null, cardNumber: string): string | null {
  if (!url) return null;
  const base = url.split('/').pop() ?? '';
  const m = base.match(/^(.+?)(?:_(p\d+|pr\d+|[a-z]\d+))?_(EN|JP)\.[a-z0-9]+$/i);
  if (!m) return null;
  // m[1] should equal the card number; m[2] is the variant infix (or undefined for base).
  return m[2] ? m[2].toLowerCase() : '';
}

/**
 * One print's parsed pages + downloaded images, as gathered by run.ts. `enParse`
 * / `jpParse` are null when that language's print page was missing.
 */
export interface PrintInput {
  variantParam: number;
  enParse: ParsedCardPage | null;
  jpParse: ParsedCardPage | null;
  enImage?: ImageResult;
  jpImage?: ImageResult;
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

/** Canonical print page URL for a language + ?v param (param 0 = base, no query). */
function variantPageUrl(cardNumber: string, lang: 'en' | 'jp', variantParam: number): string {
  const q = variantParam > 0 ? `?v=${variantParam}` : '';
  return `https://onepiece.limitlesstcg.com/cards/${lang}/${cardNumber}${q}`;
}

/** Builds one print's per-language image block. */
function buildPrintImage(
  lang: 'en' | 'jp',
  parse: ParsedCardPage | null,
  image: ImageResult,
  setCode: string,
  cardNumber: string,
  variantId: string,
  variantParam: number,
): LimitlessPrintImage {
  return {
    language: lang,
    imageUrl: parse?.ogImage ?? (parse ? imageUrl(setCode, cardNumber, lang, variantId) : null),
    imageStatus: image.status,
    imageFile: image.file,
    pageUrl: variantPageUrl(cardNumber, lang, variantParam),
    missing: parse === null,
  };
}

/** Builds one LimitlessPrint (base or alternate art) from a gathered PrintInput. */
export function buildPrint(cardNumber: string, setCode: string, input: PrintInput): LimitlessPrint {
  const enImg = input.enImage ?? SKIPPED_IMAGE;
  const jpImg = input.jpImage ?? SKIPPED_IMAGE;
  // variantId comes from the REAL image filename (EN preferred, then JP); only
  // if neither page had an og:image do we fall back to the ?v param.
  const derived = variantIdFromImageUrl(input.enParse?.ogImage ?? null, cardNumber) ?? variantIdFromImageUrl(input.jpParse?.ogImage ?? null, cardNumber);
  const variantId = derived ?? (input.variantParam > 0 ? `p${input.variantParam}` : '');
  const meta = input.enParse ?? input.jpParse;
  return {
    variantParam: input.variantParam,
    variantId,
    isAlternateArt: input.variantParam > 0,
    printLabel: meta?.printLabel ?? null,
    printKind: meta?.printKind ?? null,
    illustrator: input.enParse?.illustrator ?? input.jpParse?.illustrator ?? null,
    en: buildPrintImage('en', input.enParse, enImg, setCode, cardNumber, variantId, input.variantParam),
    jp: buildPrintImage('jp', input.jpParse, jpImg, setCode, cardNumber, variantId, input.variantParam),
  };
}

/**
 * Assembles the final LimitlessCard.
 *
 * `structural` is whichever language page was available (category/colors/stats
 * carry English labels on BOTH pages, so either works). `enParse`/`jpParse` are
 * the BASE print's parses (null when that language page was missing) and back
 * the localized name/effect/types. `printInputs` is every print gathered by the
 * crawler (base first); its param-0 entry supplies the base `en`/`jp` images.
 */
export function buildLimitlessCard(
  cardNumber: string,
  structural: ParsedCardPage,
  enParse: ParsedCardPage | null,
  jpParse: ParsedCardPage | null,
  fetchedAt: string,
  printInputs: PrintInput[],
): LimitlessCard {
  const setCode = setCodeOf(cardNumber);
  const warnings = [...structural.warnings.map((w) => `struct: ${w}`)];

  const prints = [...printInputs]
    .sort((a, b) => a.variantParam - b.variantParam)
    .map((input) => buildPrint(cardNumber, setCode, input));
  const basePrint = prints.find((p) => p.variantParam === 0) ?? prints[0];
  const altCount = prints.filter((p) => p.isAlternateArt).length;
  if (altCount > 0) warnings.push(`prints: ${altCount} alternate art${altCount === 1 ? '' : 's'} captured`);

  const enImg: ImageResult = { status: basePrint?.en.imageStatus ?? 'skipped', file: basePrint?.en.imageFile ?? null };
  const jpImg: ImageResult = { status: basePrint?.jp.imageStatus ?? 'skipped', file: basePrint?.jp.imageFile ?? null };

  let en: LimitlessLangData;
  if (enParse) {
    en = {
      language: 'en',
      name: enParse.name,
      effectText: enParse.effectText ?? '',
      types: enParse.types,
      imageUrl: basePrint?.en.imageUrl ?? imageUrl(setCode, cardNumber, 'en'),
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
      imageUrl: basePrint?.en.imageUrl ?? imageUrl(setCode, cardNumber, 'en'),
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
      imageUrl: basePrint?.jp.imageUrl ?? imageUrl(setCode, cardNumber, 'jp'),
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
      imageUrl: basePrint?.jp.imageUrl ?? imageUrl(setCode, cardNumber, 'jp'),
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
    prints,
    en,
    jp,
    definition,
    effectParse,
    warnings,
    source: { provider: PROVIDER, fetchedAt },
  };
}

/** Compact per-print record carried in the index so the manifest reflects alt arts without loading each card file. */
export interface IndexPrint {
  variantId: string; // '' = base, 'p1'/'p2'/… = alternate art
  isAlternateArt: boolean;
  printKind: string | null; // "Alternate Art" / "Rare" / … (from the print page)
  enImage: LimitlessPrintImage['imageStatus'];
  jpImage: LimitlessPrintImage['imageStatus'];
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
  /** Total printings (base + alternate arts). */
  printCount: number;
  /** How many of `printCount` are alternate arts (non-base). */
  altArtCount: number;
  /** Every printing, base first — so the manifest alone can drive an art picker. */
  prints: IndexPrint[];
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
    printCount: card.prints.length,
    altArtCount: card.prints.filter((p) => p.isAlternateArt).length,
    prints: card.prints.map((p) => ({
      variantId: p.variantId,
      isAlternateArt: p.isAlternateArt,
      printKind: p.printKind,
      enImage: p.en.imageStatus,
      jpImage: p.jp.imageStatus,
    })),
  };
}

export async function writeIndex(entries: IndexEntry[]): Promise<void> {
  const bySet: Record<string, number> = {};
  let needsReview = 0;
  let jpMissing = 0;
  let enImages = 0;
  let jpImages = 0;
  let totalPrints = 0;
  let altArts = 0;
  let cardsWithAltArt = 0;
  for (const e of entries) {
    bySet[e.setCode] = (bySet[e.setCode] ?? 0) + 1;
    if (e.needsReview) needsReview++;
    if (e.jpMissing) jpMissing++;
    if (IMAGE_PRESENT.has(e.enImage)) enImages++;
    if (IMAGE_PRESENT.has(e.jpImage)) jpImages++;
    totalPrints += e.printCount ?? 1;
    altArts += e.altArtCount ?? 0;
    if ((e.altArtCount ?? 0) > 0) cardsWithAltArt++;
  }
  const index = {
    schemaVersion: SCRAPE_SCHEMA_VERSION,
    provider: PROVIDER,
    generatedAt: new Date().toISOString(),
    counts: {
      total: entries.length,
      needsReview,
      jpMissing,
      prints: totalPrints,
      altArts,
      cardsWithAltArt,
      images: { en: enImages, jp: jpImages },
      bySet,
    },
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
