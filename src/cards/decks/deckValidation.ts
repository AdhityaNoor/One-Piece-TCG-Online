/**
 * Deck-construction legality (Comprehensive Rules 5-1-2 family): structural
 * checks only (counts, colors). This is intentionally separate from in-game
 * action validators under /src/engine/validation, which validate actions
 * against live GameState. Neither path reads or interprets card text as logic.
 *
 * Boundary note: this lives under /src/cards/decks because it operates on
 * CardLibraryEntry/SavedDeck shapes from the card-data layer, before a card
 * becomes a CardInstance in a running game.
 */
import type { CardDefinition, Color } from '../../engine/state/card';

export interface DeckConstructionEntry {
  definition: CardDefinition;
  quantity: number;
}

export interface DeckConstructionResult {
  legal: boolean;
  reasons: string[];
}

const MAIN_DECK_SIZE = 50; // 5-1-2
const MAX_COPIES_PER_CARD_NUMBER = 4; // 5-1-2-3

/**
 * 5-1-2-2: only cards of colors included on the Leader card can be included
 * in a deck. A card is legal when every color listed on that card is present
 * on the Leader. This supports single-color and multicolor Leaders.
 */
function isColorLegalForLeader(cardColors: Color[], leaderColors: Color[]): boolean {
  return cardColors.every((color) => leaderColors.includes(color));
}

export function validateDeckConstruction(leader: CardDefinition, mainDeck: DeckConstructionEntry[]): DeckConstructionResult {
  const reasons: string[] = [];

  if (leader.category !== 'leader') {
    reasons.push(`Leader slot must contain a Leader card; got category "${leader.category}".`);
  }

  const totalCount = mainDeck.reduce((sum, entry) => sum + entry.quantity, 0);
  if (totalCount !== MAIN_DECK_SIZE) {
    reasons.push(`Main deck must contain exactly ${MAIN_DECK_SIZE} cards (5-1-2); got ${totalCount}.`);
  }

  for (const entry of mainDeck) {
    if (entry.definition.category === 'leader' || entry.definition.category === 'don') {
      reasons.push(`"${entry.definition.name}" is a ${entry.definition.category} card and cannot be placed in the main deck (5-1-2-1).`);
    }
  }

  // 5-1-2-3: max 4 copies of the same card number, summed across every printing/art choice of that number.
  const countsByCardNumber = new Map<string, number>();
  for (const entry of mainDeck) {
    countsByCardNumber.set(entry.definition.cardNumber, (countsByCardNumber.get(entry.definition.cardNumber) ?? 0) + entry.quantity);
  }

  for (const [cardNumber, count] of countsByCardNumber) {
    if (count > MAX_COPIES_PER_CARD_NUMBER) {
      reasons.push(`Card number ${cardNumber} appears ${count} times; deck construction allows at most ${MAX_COPIES_PER_CARD_NUMBER} (5-1-2-3).`);
    }
  }

  for (const entry of mainDeck) {
    if (!isColorLegalForLeader(entry.definition.colors, leader.colors)) {
      reasons.push(
        `"${entry.definition.name}" (${entry.definition.colors.join('/')}) is not a legal color for Leader colors (${leader.colors.join('/')}) (5-1-2-2).`,
      );
    }
  }

  return { legal: reasons.length === 0, reasons };
}
