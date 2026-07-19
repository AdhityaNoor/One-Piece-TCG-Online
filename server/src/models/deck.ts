/**
 * Account-backed saved-deck persistence. This is the server-side half of
 * "deck list is not saved to the database for each user" — until this file,
 * SavedDeck snapshots only ever lived in the browser's localStorage
 * (src/cards/decks/deckStorage.ts), so a deck never survived a cleared
 * profile, a new device, or a reinstall.
 *
 * Reuses `SavedDeck` (the client's own fully self-contained snapshot type)
 * as the stored shape verbatim, rather than inventing a parallel server
 * schema — this is the SAME precedent already established by
 * models/ranked.ts's `RankedMatchParticipantDocument.deckSnapshot: SavedDeck`
 * and game/matchEngine.ts's `parseClientDeck`. Per savedDeck.ts's own doc
 * comment, SavedDeck is already plain JSON (no functions/Map/Set/class
 * instances) and schema-versioned/self-migrating, so it is Mongo-safe as-is.
 *
 * One document per (userId, deckId) pair — never a single "all my decks"
 * blob — so concurrent saves from two tabs/devices can't lost-update each
 * other's unrelated decks (same reasoning as profile.ts splitting into
 * several small collections).
 */
import type { ObjectId } from 'mongodb';
import type { SavedDeck } from '../../../src/cards/decks/savedDeck';

export interface SavedDeckDocument {
  _id?: ObjectId;
  userId: string; // = users()._id.toHexString()
  deckId: string; // = deck.deckId, unique per userId
  deck: SavedDeck;
  createdAt: string; // ISO 8601 — first time this deckId was saved for this user
  updatedAt: string; // ISO 8601 — mirrors deck.updatedAt, kept as its own field for the index/sort
}
