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

describe('resolveCardPrintingsById', () => {
  it('returns found:true from the sets family when it has rows', async () => {
    const row = makeRow();
    const fetchImpl: FetchLike = async (url) => {
      if (url.includes('/sets/card/')) return jsonResponse([row]);
      throw new Error(`unexpected url ${url}`);
    };

    const result = await resolveCardPrintingsById(fetchImpl, 'OP01-001');
    expect(result).toEqual({ ok: true, found: true, family: 'sets', printings: [row] });
  });

  it('falls through to decks when sets is empty', async () => {
    const row = makeRow({ card_set_id: 'ST01-001' });
    const calledUrls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calledUrls.push(url);
      if (url.includes('/sets/card/')) return jsonResponse([]);
      if (url.includes('/decks/card/')) return jsonResponse([row]);
      throw new Error(`unexpected url ${url}`);
    };

    const result = await resolveCardPrintingsById(fetchImpl, 'ST01-001');
    expect(result).toEqual({ ok: true, found: true, family: 'decks', printings: [row] });
    expect(calledUrls).toHaveLength(2);
  });

  it('falls through to promos when sets and decks are both empty', async () => {
    const row = makeRow({ card_set_id: 'P-001' });
    const fetchImpl: FetchLike = async (url) => {
      if (url.includes('/promos/card/')) return jsonResponse([row]);
      return jsonResponse([]);
    };

    const result = await resolveCardPrintingsById(fetchImpl, 'P-001');
    expect(result).toEqual({ ok: true, found: true, family: 'promos', printings: [row] });
  });

  it('returns found:false when every family answers cleanly with zero rows', async () => {
    const fetchImpl: FetchLike = async () => jsonResponse([]);

    const result = await resolveCardPrintingsById(fetchImpl, 'NOT-A-REAL-ID');
    expect(result).toEqual({ ok: true, found: false });
  });

  it('keeps trying remaining families after one errors, and still finds a match', async () => {
    const row = makeRow({ card_set_id: 'P-002' });
    const fetchImpl: FetchLike = async (url) => {
      if (url.includes('/sets/card/')) return { ok: false, status: 500, json: async () => ({}) };
      if (url.includes('/decks/card/')) return jsonResponse([]);
      if (url.includes('/promos/card/')) return jsonResponse([row]);
      throw new Error(`unexpected url ${url}`);
    };

    const result = await resolveCardPrintingsById(fetchImpl, 'P-002');
    expect(result).toEqual({ ok: true, found: true, family: 'promos', printings: [row] });
  });

  it('returns ok:false when every family fails outright (never silently reports not-found)', async () => {
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
