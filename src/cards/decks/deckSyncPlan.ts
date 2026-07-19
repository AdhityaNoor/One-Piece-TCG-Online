/**
 * Pure reconciliation logic for syncing the local (localStorage) deck list
 * against the account-backed copy on the server
 * (server/src/decks/routes.ts). No I/O here — src/app/lib/deckSync.ts is the
 * effectful caller that actually reads/writes the local DeckStore and calls
 * the network client; this module only decides WHAT should move which way.
 *
 * Strategy is last-write-wins by `updatedAt` (ISO 8601 strings compare
 * correctly with plain string comparison), same conflict rule the rest of
 * this codebase already uses for profile caches (see profile.ts's
 * statisticsCache/achievementsCache "recompute when stale" comment) rather
 * than a merge UI — decks are edited on one device at a time in practice, so
 * a full CRDT/3-way-merge is not worth the complexity yet.
 *
 * Known limitation (documented per project rule "document every known
 * limitation"): a deck deleted on one device while another device has it
 * only locally will reappear on next sync — there is no tombstone/delete
 * propagation across devices yet. Only explicit in-session removes push a
 * delete to the server (see deckSync.ts).
 */
import type { SavedDeck } from './savedDeck';

export interface DeckSyncPlan {
  /** Remote decks that are missing locally or newer than the local copy — write these into the local DeckStore. */
  toWriteLocal: SavedDeck[];
  /** Local decks that are missing remotely or newer than the remote copy — push these to the server. */
  toPushRemote: SavedDeck[];
}

export function planDeckSync(localDecks: SavedDeck[], remoteDecks: SavedDeck[]): DeckSyncPlan {
  const localById = new Map(localDecks.map((deck) => [deck.deckId, deck]));
  const remoteById = new Map(remoteDecks.map((deck) => [deck.deckId, deck]));

  const toWriteLocal: SavedDeck[] = [];
  const toPushRemote: SavedDeck[] = [];

  const allIds = new Set([...localById.keys(), ...remoteById.keys()]);
  for (const deckId of allIds) {
    const local = localById.get(deckId);
    const remote = remoteById.get(deckId);

    if (local && !remote) {
      toPushRemote.push(local);
    } else if (remote && !local) {
      toWriteLocal.push(remote);
    } else if (local && remote) {
      if (remote.updatedAt > local.updatedAt) {
        toWriteLocal.push(remote);
      } else if (local.updatedAt > remote.updatedAt) {
        toPushRemote.push(local);
      }
      // equal timestamps: already in sync, nothing to do.
    }
  }

  return { toWriteLocal, toPushRemote };
}
