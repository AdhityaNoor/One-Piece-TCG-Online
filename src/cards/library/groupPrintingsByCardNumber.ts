/**
 * `/api/sets/{setId}/` (and the decks/promos set-level equivalents) return
 * every printing in that set as one flat array — multiple card NUMBERS
 * interleaved, each appearing once per art variant. `buildCardLibraryEntry`
 * (cardPrintingSummary.ts) expects all printings of a SINGLE card number at
 * once, so this groups the flat response before that call — pure
 * data-reshaping, no normalization decisions made here.
 */
import type { CardPrintingDto } from '../api/types';

/** Groups rows by `card_set_id`, preserving first-seen order of both groups and rows within a group. */
export function groupPrintingsByCardNumber(rows: CardPrintingDto[]): CardPrintingDto[][] {
  const order: string[] = [];
  const groups = new Map<string, CardPrintingDto[]>();

  for (const row of rows) {
    const key = row.card_set_id;
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
      order.push(key);
    }
    group.push(row);
  }

  return order.map((key) => groups.get(key)!);
}
