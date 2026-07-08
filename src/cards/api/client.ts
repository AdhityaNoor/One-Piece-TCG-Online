/**
 * Local card catalog loader.
 *
 * This replaces the previous optcgapi.com client with reads from
 * /public/cards/*.json. The shape remains intentionally forgiving:
 * malformed rows are filtered out so the catalog can degrade gracefully if
 * a file is incomplete.
 */
import type { CardPrintingDto, DonCardDto, SetSummaryDto } from './types';
import { resolveSetDisplayName } from '../catalog/setDisplayNames';
import { cardCatalogPaths } from './endpoints';

export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type CardApiError =
  | { kind: 'network'; message: string }
  | { kind: 'http'; status: number; url: string }
  | { kind: 'parse'; url: string; message: string }
  | { kind: 'shape-mismatch'; url: string; message: string };

export type CardApiResult<T> = { ok: true; data: T } | { ok: false; error: CardApiError };

interface LocalCatalogSet {
  code: string;
  name: string;
}

interface LocalCatalogCard {
  cardNumber: string;
  setCode: string;
  setName: string;
  category: 'leader' | 'character' | 'event' | 'stage';
  colors: string[];
  cost?: number;
  power?: number;
  life?: number;
  counter?: number;
  attributes?: string[];
  rarity: string;
  en: {
    name: string;
    effectText: string;
    types: string[];
    image: string | null;
  };
  /**
   * Every printing's art (base first, then alternate arts), emitted by
   * build:assets from the scrape's prints[]. Optional for back-compat: an older
   * public/cards file without it falls back to the single `en.image` base print.
   */
  prints?: LocalCatalogPrint[];
}

interface LocalCatalogPrint {
  /** '' for the base print, 'p1'/'p2'/… for alternate arts. */
  variantId: string;
  isAlternateArt: boolean;
  /** Print descriptor from Limitless, e.g. "Alternate Art" / "Rare". */
  printKind: string | null;
  /** Web path to this print's EN art under /card-images, or null if unavailable. */
  image: string | null;
}

async function getJson(url: string, fetchImpl: FetchLike): Promise<CardApiResult<unknown>> {
  let response: { ok: boolean; status: number; json: () => Promise<unknown> };
  try {
    response = await fetchImpl(url);
  } catch (e) {
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  }

  if (!response.ok) {
    return { ok: false, error: { kind: 'http', status: response.status, url } };
  }

  try {
    return { ok: true, data: await response.json() };
  } catch (e) {
    return { ok: false, error: { kind: 'parse', url, message: e instanceof Error ? e.message : String(e) } };
  }
}

function isCardPrintingDtoShape(row: unknown): row is CardPrintingDto {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.card_set_id === 'string' && typeof r.card_name === 'string' && typeof r.card_type === 'string' && typeof r.card_image_id === 'string';
}

function isLocalCatalogCardShape(row: unknown): row is LocalCatalogCard {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  const en = r.en as Record<string, unknown> | undefined;
  return (
    typeof r.cardNumber === 'string' &&
    typeof r.setCode === 'string' &&
    typeof r.setName === 'string' &&
    typeof r.category === 'string' &&
    Array.isArray(r.colors) &&
    typeof r.rarity === 'string' &&
    typeof en === 'object' &&
    en !== null &&
    typeof en.name === 'string' &&
    typeof en.effectText === 'string' &&
    Array.isArray(en.types)
  );
}

function categoryToCardType(category: LocalCatalogCard['category']): CardPrintingDto['card_type'] {
  switch (category) {
    case 'leader':
      return 'Leader';
    case 'character':
      return 'Character';
    case 'event':
      return 'Event';
    case 'stage':
      return 'Stage';
  }
}

function optionalNumberToString(value: number | undefined): string | null {
  return typeof value === 'number' ? String(value) : null;
}

/** Fields shared by every printing of a card (art/rarity differ per print). */
function localCardCommonFields(card: LocalCatalogCard) {
  return {
    inventory_price: null,
    market_price: null,
    card_name: card.en.name,
    set_name: resolveSetDisplayName(card.setCode, card.setName),
    card_text: card.en.effectText,
    set_id: card.setCode,
    card_set_id: card.cardNumber,
    card_color: card.colors.join(' '),
    card_type: categoryToCardType(card.category),
    life: optionalNumberToString(card.life),
    card_cost: optionalNumberToString(card.cost),
    card_power: optionalNumberToString(card.power),
    sub_types: card.en.types.join(' / ') || null,
    counter_amount: card.counter ?? null,
    attribute: card.attributes?.[0] ?? null,
    date_scraped: '',
  } satisfies Partial<CardPrintingDto>;
}

/**
 * Expands one local card into one CardPrintingDto per printing (base +
 * alternate arts), so the library/deck-builder art picker can offer every art.
 * `card_image_id` stays unique per printing ("OP01-016" base, "OP01-016_p1"
 * alt), which is exactly the identity the printing grouping/asset cache expect.
 * Falls back to a single base printing when a card carries no prints[].
 */
function localCardToPrintingDtos(card: LocalCatalogCard): CardPrintingDto[] {
  const common = localCardCommonFields(card);
  const prints = card.prints?.length ? card.prints : null;
  if (!prints) {
    return [{ ...common, rarity: card.rarity, card_image_id: card.cardNumber, card_image: card.en.image }];
  }
  return prints.map((print) => ({
    ...common,
    // Alternate arts surface their print kind (e.g. "Alternate Art") as rarity;
    // the base print keeps the card's real rarity.
    rarity: print.isAlternateArt ? print.printKind ?? card.rarity : card.rarity,
    card_image_id: print.variantId ? `${card.cardNumber}_${print.variantId}` : card.cardNumber,
    card_image: print.image,
  }));
}

function isDonCardDtoShape(row: unknown): row is DonCardDto {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.card_name === 'string' && typeof r.card_image_id === 'string';
}

function isSetSummaryDtoShape(row: unknown): row is SetSummaryDto {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.set_id === 'string' && typeof r.set_name === 'string';
}

function isLocalCatalogSetShape(row: unknown): row is LocalCatalogSet {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.code === 'string' && typeof r.name === 'string';
}

function filterValidRows<T>(url: string, data: unknown, guard: (row: unknown) => row is T): CardApiResult<T[]> {
  if (!Array.isArray(data)) {
    return { ok: false, error: { kind: 'shape-mismatch', url, message: 'expected a JSON array at top level' } };
  }
  return { ok: true, data: data.filter(guard) };
}

export async function fetchAllSets(fetchImpl: FetchLike, url = cardCatalogPaths.index()): Promise<CardApiResult<SetSummaryDto[]>> {
  const result = await getJson(url, fetchImpl);
  if (!result.ok) return result;
  const normalizeSets = (rows: unknown): CardApiResult<SetSummaryDto[]> => {
    if (!Array.isArray(rows)) {
      return { ok: false, error: { kind: 'shape-mismatch', url, message: 'expected a sets array' } };
    }
    const sets = rows
      .map((row): SetSummaryDto | null => {
        if (isSetSummaryDtoShape(row)) return row;
        if (isLocalCatalogSetShape(row)) return { set_id: row.code, set_name: resolveSetDisplayName(row.code, row.name) };
        return null;
      })
      .filter((row): row is SetSummaryDto => row !== null);
    return { ok: true, data: sets };
  };

  if (Array.isArray(result.data)) {
    return normalizeSets(result.data);
  }
  if (typeof result.data === 'object' && result.data !== null && 'sets' in result.data) {
    return normalizeSets((result.data as { sets?: unknown }).sets);
  }
  return { ok: false, error: { kind: 'shape-mismatch', url, message: 'expected a catalog index or sets array' } };
}

export async function fetchSetCards(fetchImpl: FetchLike, setCode: string): Promise<CardApiResult<CardPrintingDto[]>> {
  const url = cardCatalogPaths.set(setCode);
  const result = await getJson(url, fetchImpl);
  if (!result.ok) return result;
  if (!Array.isArray(result.data)) {
    return { ok: false, error: { kind: 'shape-mismatch', url, message: 'expected a JSON array at top level' } };
  }
  const rows = result.data.flatMap((row): CardPrintingDto[] => {
    if (isCardPrintingDtoShape(row)) return [row];
    if (isLocalCatalogCardShape(row)) return localCardToPrintingDtos(row);
    return [];
  });
  return { ok: true, data: rows };
}

export async function fetchAllPlayableCardPrintings(fetchImpl: FetchLike): Promise<CardApiResult<CardPrintingDto[]>> {
  const setsResult = await fetchAllSets(fetchImpl);
  if (!setsResult.ok) return setsResult;

  const collected: CardPrintingDto[] = [];
  const errors: CardApiError[] = [];
  for (const set of setsResult.data) {
    const setResult = await fetchSetCards(fetchImpl, set.set_id);
    if (!setResult.ok) {
      errors.push(setResult.error);
      continue;
    }
    collected.push(...setResult.data);
  }
  if (collected.length > 0) {
    return { ok: true, data: collected };
  }
  return errors[0] ? { ok: false, error: errors[0] } : { ok: true, data: collected };
}

export async function fetchDonCards(fetchImpl: FetchLike, url: string): Promise<CardApiResult<DonCardDto[]>> {
  const result = await getJson(url, fetchImpl);
  if (!result.ok) return result;
  return filterValidRows(url, result.data, isDonCardDtoShape);
}
