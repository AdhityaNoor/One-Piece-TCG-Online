import { describe, expect, it } from 'vitest';
import { groupPrintingsByCardNumber } from '../groupPrintingsByCardNumber';
import type { CardPrintingDto } from '../../api/types';

function makeRow(cardSetId: string, imageId: string): CardPrintingDto {
  return {
    inventory_price: null,
    market_price: null,
    card_name: `Card ${cardSetId}`,
    set_name: 'Test Set',
    card_text: '',
    set_id: 'OP-01',
    rarity: 'C',
    card_set_id: cardSetId,
    card_color: 'Red',
    card_type: 'Character',
    life: null,
    card_cost: '1',
    card_power: '1000',
    sub_types: '',
    counter_amount: null,
    attribute: 'Slash',
    date_scraped: '2026-06-28',
    card_image_id: imageId,
    card_image: null,
  };
}

describe('groupPrintingsByCardNumber', () => {
  it('groups interleaved rows by card_set_id', () => {
    const a1 = makeRow('OP01-001', 'OP01-001');
    const b1 = makeRow('OP01-002', 'OP01-002');
    const a2 = makeRow('OP01-001', 'OP01-001_p1');

    const groups = groupPrintingsByCardNumber([a1, b1, a2]);

    expect(groups).toEqual([[a1, a2], [b1]]);
  });

  it('preserves first-seen group order', () => {
    const rows = [makeRow('OP01-003', 'OP01-003'), makeRow('OP01-001', 'OP01-001'), makeRow('OP01-002', 'OP01-002')];
    const groups = groupPrintingsByCardNumber(rows);
    expect(groups.map((g) => g[0].card_set_id)).toEqual(['OP01-003', 'OP01-001', 'OP01-002']);
  });

  it('returns an empty array for empty input', () => {
    expect(groupPrintingsByCardNumber([])).toEqual([]);
  });
});
