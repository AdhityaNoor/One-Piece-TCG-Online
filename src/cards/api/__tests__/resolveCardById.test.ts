import { describe, expect, it } from 'vitest';
import { resolveCardPrintingsById } from '../resolveCardById';
import type { FetchLike } from '../client';
import type { CardPrintingDto } from '../types';

function makeRow(overrides: Partial<CardPrintingDto> = {}): CardPrintingDto {
  return {
    inventory_price: null,
    market_price: null,
    card_name: 'Test Card',
    set_name: 'Test Set',
    card_text: '',
    set_id: 'OP-01',
    rarity: 'C',
    card_set_id: 'OP01-001',
    card_color: 'Red',
    card_type: 'Character',
    life: null,
    card_cost: '1',
    card_power: '1000',
    sub_types: '',
    counter_amount: null,
    attribute: 'Slash',
    date_scraped: '2026-06-28',
    card_image_id: 'OP01-001',
    card_image: null,
    ...overrides,
  };
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

/**
 * resolveCardPrintingsById resolves against the LOCAL catalog via
 * fetchAllPlayableCardPrintings: it reads the set index (/cards/index.json),
 * then each set file (/cards/sets/<code>.json), concatenates the rows, and
 * filters by card number. This helper mocks those two endpoint shapes so a test
 * can seed each set independently.
 */
function catalogFetch(setCodes: string[], cardsBySet: Record<string, CardPrintingDto[]>): FetchLike {
  return async (url: string) => {
    if (url.includes('/index.json')) return jsonResponse(setCodes.map((code) => ({ set_id: code, set_name: code })));
    const match = url.match(/\/sets\/([^/]+)\.json/);
    if (match) return jsonResponse(cardsBySet[decodeURIComponent(match[1])] ?? []);
    throw new Error(`unexpected url ${url}`);
  };
}

describe('resolveCardPrintingsById (local catalog)', () => {
  it('finds a card in a set', async () => {
    const row = makeRow();
    const result = await resolveCardPrintingsById(catalogFetch(['OP01'], { OP01: [row] }), 'OP01-001');
    expect(result).toEqual({ ok: true, found: true, printings: [row] });
  });

  it('finds a card across multiple sets', async () => {
    const stCard = makeRow({ card_set_id: 'ST01-001' });
    const fetchImpl = catalogFetch(['OP01', 'ST01'], { OP01: [makeRow()], ST01: [stCard] });
    const result = await resolveCardPrintingsById(fetchImpl, 'ST01-001');
    expect(result).toEqual({ ok: true, found: true, printings: [stCard] });
  });

  it('returns found:false when no row matches the id', async () => {
    const result = await resolveCardPrintingsById(catalogFetch(['OP01'], { OP01: [makeRow()] }), 'NOT-A-REAL-ID');
    expect(result).toEqual({ ok: true, found: false });
  });

  it('tolerates a per-set fetch error as long as another set has the card', async () => {
    const stCard = makeRow({ card_set_id: 'ST01-001' });
    const fetchImpl: FetchLike = async (url) => {
      if (url.includes('/index.json')) return jsonResponse([{ set_id: 'OP01', set_name: 'a' }, { set_id: 'ST01', set_name: 'b' }]);
      if (url.includes('/sets/OP01.json')) return { ok: false, status: 500, json: async () => ({}) };
      if (url.includes('/sets/ST01.json')) return jsonResponse([stCard]);
      throw new Error(`unexpected url ${url}`);
    };
    const result = await resolveCardPrintingsById(fetchImpl, 'ST01-001');
    expect(result).toEqual({ ok: true, found: true, printings: [stCard] });
  });

  it('returns ok:false when the catalog index fails (never silently not-found)', async () => {
    const fetchImpl: FetchLike = async (url) => (url.includes('/index.json') ? { ok: false, status: 500, json: async () => ({}) } : jsonResponse([]));
    const result = await resolveCardPrintingsById(fetchImpl, 'OP01-001');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false on a network error', async () => {
    const fetchImpl: FetchLike = async () => {
      throw new Error('network down');
    };
    const result = await resolveCardPrintingsById(fetchImpl, 'OP01-001');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: 'network', message: 'network down' });
    }
  });
});
