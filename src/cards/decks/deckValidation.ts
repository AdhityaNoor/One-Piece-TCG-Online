/**
 * Deck-CONSTRUCTION legality (Comprehensive Rules 5-1-2 family) — structural
 * checks only (counts, colors). This is intentionally NOT the same thing as
 * the in-game action validators that will live under /src/engine/validation
 * (not yet built, per docs/01-rules-engine-blueprint.md's Next Recommended
 * Task) — those validate IN-GAME actions against live GameState; this
 * validates a deck LIST before it's ever saved or played. Neither one reads
 * or interprets card_text — both are purely structural, per project ground
 * rule that card text never becomes executable logic by accident.
 *
 * Boundary note: this lives under /src/cards/decks (not /src/engine)
 * because it operates on CardLibraryEntry/SavedDeck shapes from the API
 * layer, before a card ever becomes a CardInstance in a running game. If a
 * future rule requires re-checking deck legality mid-game (no such rule is
 * known today), that would belong in /src/engine instead.
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
 * 5-1-2-2: "Only cards of a color included on the Leader card can be
 * included in a deck." This is unambiguous for a single-color candidate
 * card. For a MULTICOLOR candidate card, the rule text doesn't explicitly
 * state whether EVERY listed color must be on the Leader (subset) or just
 * ONE matching color is enough (intersect) — TODO, needs ruling
 * confirmation. This function takes the stricter (subset) reading, which
 * never wrongly legalizes an illegal deck, but may wrongly reject some
 * legal multicolor-card decks until confirmed. Flagged in reasons[] when it
 * is the subset check (not the unambiguous single-color case) doing the
 * rejecting, so callers can distinguish "TODO-confirmed reject" from one a
 * ruling might later overturn.
 */
function isColorLegalForLeader(cardColors: Color[], leaderColors: Color[]): boolean {
  return cardColors.every((c) => leaderColors.includes(c));
}

export function validateDeckConstruction(leader: CardDefinition, mainDeck: DeckConstructionEntry[]): DeckConstructionResult {
  const reasons: string[] = [];

  if (leader.category !== 'leader') {
    reasons.push(`Leader slot must contain a Leader card; got category "${leader.category}".`);
  }

  if (leader.colors.length > 1) {
    reasons.push(
      `Multicolor Leader legality is not supported yet; color matching for multicolor leaders needs a separate ruling-confirmed rule path.`,
    );
    return { legal: false, reasons };
  }

  const totalCount = mainDeck.reduce((sum, e) => sum + e.quantity, 0);
  if (totalCount !== MAIN_DECK_SIZE) {
    reasons.push(`Main deck must contain exactly ${MAIN_DECK_SIZE} cards (5-1-2); got ${totalCount}.`);
  }

  for (const entry of mainDeck) {
    if (entry.definition.category === 'leader' || entry.definition.category === 'don') {
      reasons.push(`"${entry.definition.name}" is a ${entry.definition.category} card and cannot be placed in the main deck (5-1-2-1).`);
    }
  }

  // 5-1-2-3: max 4 copies of the same CARD NUMBER, summed across every printing/art choice of that number.
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
      const isMulticolorCase = entry.definition.colors.length > 1;
      reasons.push(
        `"${entry.definition.name}" (${entry.definition.colors.join('/')}) is not a legal color for Leader colors (${leader.colors.join('/')}) (5-1-2-2)` +
          (isMulticolorCase ? ' [multicolor subset rule — TODO ruling confirmation, see deckValidation.ts module doc]' : '.'),
      );
    }
  }

  return { legal: reasons.length === 0, reasons };
}
