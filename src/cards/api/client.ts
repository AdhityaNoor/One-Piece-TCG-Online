/**
 * Minimal, environment-agnostic HTTP client for the OPTCG API.
 *
 * Project ground rule extended to this layer: just as the rules engine never
 * touches the DOM, this adapter never assumes a global `fetch`/`Response`.
 * Callers (the future React app) inject a FetchLike implementation — in the
 * browser that's `window.fetch.bind(window)`; in tests it's a hand-rolled
 * stub. This keeps /src/cards/api testable under plain Node/Vitest without
 * pulling in DOM lib types, and keeps the same code path usable from a
 * future server-side cache-warmer with zero changes.
 *
 * Error handling strategy: never throw across this module's public
 * boundary. Every function returns a CardApiResult so the deck builder UI
 * can always render a "stale cache" or "API unavailable" state instead of
 * crashing — consistent with the project rule that the API is data-only and
 * must never be able to break the app if it changes or goes down.
 */
import type { CardPrintingDto, DonCardDto, SetSummaryDto } from './types';

/** Subset of the real `fetch` signature this module needs — deliberately not `typeof fetch`, see module doc. */
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
    const data = await response.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: { kind: 'parse', url, message: e instanceof Error ? e.message : String(e) } };
  }
}

/**
 * Required-field guards. These intentionally check only the fields the
 * normalization layer actually depends on — not full schema validation —
 * because the API has no contract guarantee and we'd rather degrade one row
 * (drop + warn) than reject an entire response over an unrelated new/missing
 * field. This is what makes the adapter resilient to the API "changing
 * later" per project requirement #4.
 */
function isCardPrintingDtoShape(row: unknown): row is CardPrintingDto {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.card_set_id === 'string' &&
    typeof r.card_name === 'string' &&
    typeof r.card_type === 'string' &&
    typeof r.card_text === 'string' &&
    typeof r.card_image_id === 'string'
  );
}

function isDonCardDtoShape(row: unknown): row is DonCardDto {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.card_name === 'string' && typeof r.card_text === 'string' && typeof r.card_image_id === 'string';
}

function isSetSummaryDtoShape(row: unknown): row is SetSummaryDto {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.set_id === 'string' && typeof r.set_name === 'string';
}

/** Filters `data` down to rows passing `guard`, never throwing on a malformed individual row. */
function filterValidRows<T>(url: string, data: unknown, guard: (row: unknown) => row is T): CardApiResult<T[]> {
  if (!Array.isArray(data)) {
    return { ok: false, error: { kind: 'shape-mismatch', url, message: 'expected a JSON array at top level' } };
  }
  const rows = data.filter(guard);
  return { ok: true, data: rows };
}

/** GET /api/allSets/ */
export async function fetchAllSets(fetchImpl: FetchLike, url: string): Promise<CardApiResult<SetSummaryDto[]>> {
  const result = await getJson(url, fetchImpl);
  if (!result.ok) return result;
  return filterValidRows(url, result.data, isSetSummaryDtoShape);
}

/**
 * GET one of: /api/sets/card/{id}/, /api/decks/card/{id}/, /api/promos/card/{id}/.
 * All three return the same CardPrintingDto[] shape (every printing of one card number).
 */
export async function fetchCardPrintings(fetchImpl: FetchLike, url: string): Promise<CardApiResult<CardPrintingDto[]>> {
  const result = await getJson(url, fetchImpl);
  if (!result.ok) return result;
  return filterValidRows(url, result.data, isCardPrintingDtoShape);
}

/** GET /api/allDonCards/ (or /api/don/filtered/). */
export async function fetchDonCards(fetchImpl: FetchLike, url: string): Promise<CardApiResult<DonCardDto[]>> {
  const result = await getJson(url, fetchImpl);
  if (!result.ok) return result;
  return filterValidRows(url, result.data, isDonCardDtoShape);
}
