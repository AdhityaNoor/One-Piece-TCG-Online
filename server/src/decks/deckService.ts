/**
 * Business logic for the account-backed deck library. Deliberately does NOT
 * enforce deck-construction legality (5-1-2) or format legality here — a
 * player must be able to save a work-in-progress/illegal deck from the deck
 * builder, same as the localStorage-only version always allowed. Legality is
 * only enforced where it actually matters: RankedDeckValidationService at
 * queue-join time (see ranked/deckValidationService.ts). This service only
 * guards that the payload IS a well-formed SavedDeck (via parseClientDeck /
 * migrateSavedDeck — never trust a client-owned blob further than that).
 */
import { savedDecks } from '../db/mongo';
import { parseClientDeck } from '../game/matchEngine';
import type { SavedDeck } from '../../../src/cards/decks/savedDeck';
import { DeckServiceError } from './errors';

export class DeckService {
  /** Full decks (not just summaries) — the client uses this to merge/refresh its local offline cache, not to render a picker list directly. */
  async list(userId: string): Promise<SavedDeck[]> {
    const docs = await savedDecks()
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
    return docs.map((doc) => doc.deck);
  }

  async get(userId: string, deckId: string): Promise<SavedDeck> {
    const doc = await savedDecks().findOne({ userId, deckId });
    if (!doc) throw new DeckServiceError(404, 'NOT_FOUND', `No saved deck "${deckId}" for this account.`);
    return doc.deck;
  }

  /** Upsert — the deckId in the URL is the authority; the body's deck.deckId must match it (project rule: every action validated before execution). */
  async save(userId: string, deckId: string, rawDeck: unknown): Promise<SavedDeck> {
    const deck = parseClientDeck(rawDeck);
    if (!deck) {
      throw new DeckServiceError(400, 'VALIDATION', 'Deck payload could not be read as a saved deck.');
    }
    if (deck.deckId !== deckId) {
      throw new DeckServiceError(400, 'VALIDATION', 'Deck id in the request body does not match the URL.');
    }

    const now = new Date().toISOString();
    await savedDecks().updateOne(
      { userId, deckId },
      {
        $set: { userId, deckId, deck, updatedAt: deck.updatedAt || now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    return deck;
  }

  async remove(userId: string, deckId: string): Promise<void> {
    await savedDecks().deleteOne({ userId, deckId });
  }
}
