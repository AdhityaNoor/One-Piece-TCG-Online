/**
 * Helpers to build CatalogCard rows from API DTOs or raw set JSON.
 */
import type { CardPrintingDto } from '../api/types';
import type { CatalogCard } from './types';

/** One row per unique card number from printing DTOs (base print fields). */
export function catalogCardsFromPrintings(printings: CardPrintingDto[]): CatalogCard[] {
  const byId = new Map<string, CatalogCard>();
  for (const p of printings) {
    if (byId.has(p.card_set_id)) continue;
    byId.set(p.card_set_id, {
      cardNumber: p.card_set_id,
      setCode: p.set_id,
      category: p.card_type.toLowerCase(),
      en: {
        name: p.card_name,
        effectText: p.card_text ?? '',
      },
    });
  }
  return [...byId.values()].sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));
}
