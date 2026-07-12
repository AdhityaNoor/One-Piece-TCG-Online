import { evaluateSavedDeckFormatStatus } from '../../../src/cards/format';
import { validateDeckConstruction } from '../../../src/cards/decks';
import { parseClientDeck } from '../game/matchEngine';
import type { SavedDeck } from '../../../src/cards/decks/savedDeck';
import { RankedServiceError } from './errors';

export class RankedDeckValidationService {
  validateForQueue(rawDeck: unknown): SavedDeck {
    const deck = parseClientDeck(rawDeck);
    if (!deck) throw new RankedServiceError(400, 'VALIDATION', 'Deck snapshot could not be read.');

    const construction = validateDeckConstruction(
      deck.leader.definition,
      deck.cards.map((card) => ({ definition: card.definition, quantity: card.quantity })),
    );
    const format = evaluateSavedDeckFormatStatus(deck);
    const reasons = [...construction.reasons];
    if (format.status !== 'legal') {
      reasons.push('Ranked Standard requires a Legal deck with no Extra Legal or banned cards.');
    }
    if (reasons.length > 0) {
      throw new RankedServiceError(400, 'VALIDATION', 'Deck is not legal for ranked queue.', { reasons });
    }
    return deck;
  }
}

