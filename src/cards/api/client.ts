/**
 * Local card catalog loader.
 *
 * This replaces the previous optcgapi.com client with reads from
 * /public/cards/*.json. The shape remains intentionally forgiving:
 * malformed rows are filtered out so the catalog can degrade gracefully if
 * a file is incomplete.
 */
import type { CardPrintingDto, DonCardDto, SetSummaryDto } from './types';
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
}

const LOCAL_SET_DISPLAY_NAMES: Record<string, string> = {
  EB01: 'EB01 - Memorial Collection',
  EB02: 'EB02 - Anime 25th Collection',
  EB03: 'EB03 - One Piece Heroines Edition',
  EB04: "EB04 - Adventure on Kami's Island",
  OP01: 'OP01 - Romance Dawn',
  OP02: 'OP02 - Paramount War',
  OP03: 'OP03 - Pillars of Strength',
  OP04: 'OP04 - Kingdoms of Intrigue',
  OP05: 'OP05 - Awakening of the New Era',
  OP06: 'OP06 - Wings of the Captain',
  OP07: 'OP07 - 500 Years in the Future',
  OP08: 'OP08 - Two Legends',
  OP09: 'OP09 - Emperors in the New World',
  OP10: 'OP10 - Royal Blood',
  OP11: 'OP11 - A Fist of Divine Speed',
  OP12: 'OP12 - Legacy of the Master',
  OP13: 'OP13 - Carrying on His Will',
  OP14: "OP14 - The Azure Sea's Seven",
  OP15: "OP15 - Adventure on Kami's Island",
  OP16: 'OP16 - The Time of Battle',
  P: 'Promo Cards',
  PRB01: 'PRB01 - One Piece Card The Best',
  PRB02: 'PRB02 - One Piece Card The Best Vol.2',
  ST01: 'ST01 - Straw Hat Crew',
  ST02: 'ST02 - Worst Generation',
  ST03: 'ST03 - The Seven Warlords of the Sea',
  ST04: 'ST04 - Animal Kingdom Pirates',
  ST05: 'ST05 - One Piece Film Edition',
  ST06: 'ST06 - Absolute Justice',
  ST07: 'ST07 - Big Mom Pirates',
  ST08: 'ST08 - Monkey D. Luffy',
  ST09: 'ST09 - Yamato',
  ST10: 'ST10 - The Three Captains',
  ST11: 'ST11 - Uta',
  ST12: 'ST12 - Zoro and Sanji',
  ST13: 'ST13 - The Three Brothers',
  ST14: 'ST14 - 3D2Y',
  ST15: 'ST15 - Red Edward.Newgate',
  ST16: 'ST16 - Green Uta',
  ST17: 'ST17 - Blue Donquixote Doflamingo',
  ST18: 'ST18 - Purple Monkey.D.Luffy',
  ST19: 'ST19 - Black Smoker',
  ST20: 'ST20 - Yellow Charlotte Katakuri',
  ST21: 'ST21 - Gear5',
  ST22: 'ST22 - Ace & Newgate',
  ST23: 'ST23 - Red Shanks',
  ST24: 'ST24 - Green Jewelry Bonney',
  ST25: 'ST25 - Blue Buggy',
  ST26: 'ST26 - Purple/Black Monkey.D.Luffy',
  ST27: 'ST27 - Black Marshall.D.Teach',
  ST28: 'ST28 - Green/Yellow Yamato',
  ST29: 'ST29 - Egghead',
  ST30: 'ST30 - Luffy & Ace',
};

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

function localCardToPrintingDto(card: LocalCatalogCard): CardPrintingDto {
  return {
    inventory_price: null,
    market_price: null,
    card_name: card.en.name,
    set_name: LOCAL_SET_DISPLAY_NAMES[card.setCode] ?? card.setName,
    card_text: card.en.effectText,
    set_id: card.setCode,
    rarity: card.rarity,
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
    card_image_id: card.cardNumber,
    card_image: card.en.image,
  };
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
        if (isLocalCatalogSetShape(row)) return { set_id: row.code, set_name: LOCAL_SET_DISPLAY_NAMES[row.code] ?? row.name };
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
  const rows = result.data
    .map((row): CardPrintingDto | null => {
      if (isCardPrintingDtoShape(row)) return row;
      if (isLocalCatalogCardShape(row)) return localCardToPrintingDto(row);
      return null;
    })
    .filter((row): row is CardPrintingDto => row !== null);
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
