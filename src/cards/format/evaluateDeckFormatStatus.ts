/**
 * Tournament format legality for saved decks (Standard / Extra / Banned).
 *
 * Separate from deck-construction legality in deckValidation.ts — this module
 * only checks whether each card number is legal in the current Standard or
 * Extra format according to the Limitless-sourced catalog registry.
 */
import type { SavedDeck } from '../decks/savedDeck';
import { CARD_FORMAT_BY_NUMBER, type CardFormatKind } from './generatedRegistry';

export type DeckFormatStatus = 'legal' | 'extraLegal' | 'banned';

export interface DeckFormatCardIssue {
  cardNumber: string;
  name: string;
  kind: CardFormatKind;
}

export interface DeckFormatStatusResult {
  status: DeckFormatStatus;
  /** Cards that are banned in both Standard and Extra. */
  bannedCards: DeckFormatCardIssue[];
  /** Cards legal in Extra but not Standard (rotation / block restriction). */
  extraOnlyCards: DeckFormatCardIssue[];
  /** Card numbers missing from the format registry — treated as Extra-only for deck status. */
  unknownCards: DeckFormatCardIssue[];
}

export function formatKindForCardNumber(cardNumber: string): CardFormatKind {
  return CARD_FORMAT_BY_NUMBER[cardNumber] ?? 'unknown';
}

/** Card-library / deck-builder facet values — mirrors deck format badge categories. */
export type FormatLegalityFilter = 'legal' | 'extraLegal' | 'banned';

export function cardMatchesFormatLegalityFilter(cardNumber: string, filter: FormatLegalityFilter | undefined): boolean {
  if (!filter) return true;
  const kind = formatKindForCardNumber(cardNumber);
  switch (filter) {
    case 'legal':
      return kind === 'standardLegal';
    case 'extraLegal':
      return kind === 'standardNotLegal' || kind === 'unknown';
    case 'banned':
      return kind === 'banned';
  }
}

function uniqueCardNumbers(deck: SavedDeck): Array<{ cardNumber: string; name: string }> {
  const seen = new Map<string, string>();
  seen.set(deck.leader.cardNumber, deck.leader.definition.name);
  for (const card of deck.cards) {
    if (!seen.has(card.cardNumber)) {
      seen.set(card.cardNumber, card.definition.name);
    }
  }
  return [...seen.entries()].map(([cardNumber, name]) => ({ cardNumber, name }));
}

/** Evaluates tournament format status for a saved deck snapshot. */
export function evaluateSavedDeckFormatStatus(deck: SavedDeck): DeckFormatStatusResult {
  return evaluateDeckFormatStatusFromCards(uniqueCardNumbers(deck));
}

/** Evaluates tournament format status from distinct card numbers (leader + main deck). */
export function evaluateDeckFormatStatusFromCards(
  cards: Array<{ cardNumber: string; name: string }>,
): DeckFormatStatusResult {
  const bannedCards: DeckFormatCardIssue[] = [];
  const extraOnlyCards: DeckFormatCardIssue[] = [];
  const unknownCards: DeckFormatCardIssue[] = [];

  for (const { cardNumber, name } of cards) {
    const kind = formatKindForCardNumber(cardNumber);
    const issue = { cardNumber, name, kind };
    if (kind === 'banned') bannedCards.push(issue);
    else if (kind === 'standardNotLegal') extraOnlyCards.push(issue);
    else if (kind === 'unknown') unknownCards.push(issue);
  }

  // Unknown cards cannot be confirmed Standard-legal — bucket with Extra-only cards.
  const nonStandardCards = [...extraOnlyCards, ...unknownCards];

  let status: DeckFormatStatus;
  if (bannedCards.length > 0) status = 'banned';
  else if (nonStandardCards.length > 0) status = 'extraLegal';
  else status = 'legal';

  return { status, bannedCards, extraOnlyCards, unknownCards };
}
