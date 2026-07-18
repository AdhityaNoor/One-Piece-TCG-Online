import { describe, expect, it } from 'vitest';
import { fetchSetCards } from '../client';

describe('fetchSetCards promo rarity', () => {
  it('keeps P cards that omit rarity (Limitless promo pages)', async () => {
    const localCard = {
      cardNumber: 'P-001',
      setCode: 'P',
      setName: 'Promotional Cards',
      category: 'character',
      colors: ['red'],
      cost: 6,
      power: 7000,
      en: {
        name: 'Monkey.D.Luffy',
        effectText: '[DON!! x2] This Character gains [Rush].',
        types: ['Straw Hat Crew'],
        image: '/card-images/P/P-001_EN.webp',
      },
      prints: [{ variantId: '', isAlternateArt: false, printKind: null, image: '/card-images/P/P-001_EN.webp' }],
    };

    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => [localCard],
      }) as Response;

    const result = await fetchSetCards(fetchImpl, 'P');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].card_set_id).toBe('P-001');
    expect(result.data[0].rarity).toBe('Promo');
  });
});
