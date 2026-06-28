/**
 * Input shape for game setup.
 * Source of truth: Comprehensive Rules 5-1-2 (deck/Leader/DON!! deck
 * requirements).
 *
 * Deliberately accepts engine-owned `CardDefinition` objects (defined in
 * ../state/card.ts), never anything from /src/cards. Per the project ground
 * rule "nothing in /src/engine imports anything from /src/cards", the app
 * layer is responsible for unwrapping a `SavedDeck` (src/cards/decks) into
 * plain `CardDefinition[]` before calling into setup — that conversion is
 * the future /src/app integration glue, not this module's job.
 *
 * Full deck-construction LEGALITY (5-1-2-2 color restrictions, 5-1-2-3 max-4
 * copies) is already enforced once, at save time, by
 * src/cards/decks/deckValidation.ts. This module does not re-derive that
 * logic — it only defends against structurally malformed input (wrong
 * counts, wrong categories) so a setup bug fails loudly here rather than
 * producing a corrupt GameState.
 */
import type { CardDefinition } from '../state/card';

export interface PlayerSetupInput {
  playerId: string;
  /** Must have category 'leader' and a defined `life` (2-9). */
  leader: CardDefinition;
  /** Exactly 50 entries (5-1-2), already expanded one-element-per-physical-card by quantity. Order is irrelevant — createPreGameState shuffles it (5-2-1-2). */
  deck: CardDefinition[];
  /** The single generic DON!! card definition (category 'don') — repeated to fill the DON!! deck. There is no per-deck DON!! selection in the rules (see SavedDeck.donDeckSize comment). */
  donCard: CardDefinition;
  /** Defaults to 10 (5-1-2). Overridable only for test fixtures — real play must use 10. */
  donDeckSize?: number;
}

const REQUIRED_DECK_SIZE = 50;
const DEFAULT_DON_DECK_SIZE = 10;

export function resolveDonDeckSize(input: PlayerSetupInput): number {
  return input.donDeckSize ?? DEFAULT_DON_DECK_SIZE;
}

/** Structural validation only — see file header for what this deliberately does NOT re-check. */
export function validatePlayerSetupInput(input: PlayerSetupInput): string[] {
  const reasons: string[] = [];
  const who = input.playerId || '(missing playerId)';

  if (!input.playerId) {
    reasons.push('PlayerSetupInput.playerId is required.');
  }
  if (input.leader.category !== 'leader') {
    reasons.push(`${who}: leader CardDefinition must have category 'leader', got '${input.leader.category}' (2-2-2).`);
  }
  if (typeof input.leader.life !== 'number' || input.leader.life <= 0) {
    reasons.push(`${who}: leader CardDefinition must have a positive 'life' value (2-9) to deal Life cards at setup (5-2-1-7); got ${String(input.leader.life)}.`);
  }
  if (input.deck.length !== REQUIRED_DECK_SIZE) {
    reasons.push(`${who}: deck must contain exactly ${REQUIRED_DECK_SIZE} cards (5-1-2), got ${input.deck.length}.`);
  }
  for (const card of input.deck) {
    if (card.category !== 'character' && card.category !== 'event' && card.category !== 'stage') {
      reasons.push(`${who}: deck card '${card.cardDefinitionId}' has category '${card.category}'; a deck may only contain Character, Event, and Stage cards (5-1-2-1).`);
    }
  }
  if (input.donCard.category !== 'don') {
    reasons.push(`${who}: donCard must have category 'don', got '${input.donCard.category}'.`);
  }
  const donDeckSize = resolveDonDeckSize(input);
  if (!Number.isInteger(donDeckSize) || donDeckSize <= 0) {
    reasons.push(`${who}: donDeckSize must be a positive integer, got ${donDeckSize}.`);
  }

  return reasons;
}
