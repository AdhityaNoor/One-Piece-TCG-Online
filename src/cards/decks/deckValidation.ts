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
import { CURATED_EFFECT_PROGRAMS } from '../effectTemplates/curatedPrograms';
import { hasUnlimitedCopies } from './unlimitedCopyCards';

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
 * The per-card-number copy cap (5-1-2-3). Normally 4, but card numbers listed in
 * the UNLIMITED_COPY_CARD_NUMBERS config ("you may have any number of this card
 * in your deck", e.g. Pacifista) have no cap. Shared so the interactive deck
 * builder and this validator agree on the limit.
 */
export function copyLimitForCard(definition: CardDefinition): number {
  return hasUnlimitedCopies(definition.cardNumber) ? Infinity : MAX_COPIES_PER_CARD_NUMBER;
}

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
  // Card numbers in UNLIMITED_COPY_CARD_NUMBERS (Pacifista and friends) are exempt from the cap.
  const countsByCardNumber = new Map<string, number>();
  const definitionByCardNumber = new Map<string, CardDefinition>();
  for (const entry of mainDeck) {
    countsByCardNumber.set(entry.definition.cardNumber, (countsByCardNumber.get(entry.definition.cardNumber) ?? 0) + entry.quantity);
    definitionByCardNumber.set(entry.definition.cardNumber, entry.definition);
  }

  for (const [cardNumber, count] of countsByCardNumber) {
    const limit = copyLimitForCard(definitionByCardNumber.get(cardNumber)!);
    if (count > limit) {
      reasons.push(`Card number ${cardNumber} appears ${count} times; deck construction allows at most ${limit} (5-1-2-3).`);
    }
  }

  for (const entry of mainDeck) {
    if (!isColorLegalForLeader(entry.definition.colors, leader.colors)) {
      reasons.push(
        `"${entry.definition.name}" (${entry.definition.colors.join('/')}) is not a legal color for Leader colors (${leader.colors.join('/')}) (5-1-2-2).`,
      );
    }
  }

  const leaderRestriction = CURATED_EFFECT_PROGRAMS[leader.cardNumber]?.cannotIncludeCategoryCostOrMore;
  if (leaderRestriction) {
    for (const entry of mainDeck) {
      const def = entry.definition;
      if (def.category !== leaderRestriction.category) continue;
      const cost = def.baseCost ?? -1;
      if (cost >= leaderRestriction.minCost) {
        reasons.push(
          `"${def.name}" is a ${def.category} with cost ${cost}; under this Leader's rules you cannot include ${leaderRestriction.category} cards with a cost of ${leaderRestriction.minCost} or more.`,
        );
      }
    }
  }

  const mustHaveType = CURATED_EFFECT_PROGRAMS[leader.cardNumber]?.mustHaveType;
  if (mustHaveType) {
    const needle = mustHaveType.toLowerCase();
    for (const entry of mainDeck) {
      const def = entry.definition;
      const hasType = (def.types ?? []).some((t) =>
        t
          .split(/[\/,]+/)
          .map((p) => p.trim().toLowerCase())
          .some((p) => p.includes(needle)),
      );
      if (!hasType) {
        reasons.push(
          `"${def.name}" does not have {${mustHaveType}} type; under this Leader's rules you can only include {${mustHaveType}} type cards in your deck.`,
        );
      }
    }
  }

  return { legal: reasons.length === 0, reasons };
}
