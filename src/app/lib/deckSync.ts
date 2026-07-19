/**
 * Effectful glue between the local DeckStore (src/cards/decks/deckStorage.ts,
 * synchronous, localStorage-backed) and the account-backed deck REST surface
 * (server/src/decks/routes.ts, via src/multiplayer/net/deckClient.ts). The
 * reconciliation DECISION is pure (planDeckSync, src/cards/decks/deckSyncPlan.ts)
 * — this file only supplies the I/O planDeckSync doesn't have: reading every
 * local deck, calling the network client, and writing results back.
 *
 * Design choice (documented per project rule "document every known
 * limitation" + "prepare for network but don't force a rewrite"): every
 * screen and store in this app reads decks through the EXISTING synchronous
 * DeckStore interface (list/load/save/remove all return immediately from
 * localStorage). Making deck reads/writes async everywhere they're used
 * (DeckBuilderScreen, SavedDecksScreen, CpuDeckSelectScreen, DeckSelectScreen,
 * useDeckEligibility, the Casual lobby's mock RoomService...) would be a much
 * larger, riskier change for what is fundamentally a sync/backup problem, not
 * a UI problem. Instead: local storage stays the fast source of truth the UI
 * always reads; this module keeps it caught up with the account in the
 * background —
 *   - on sign-in (authStore.init/login/signup): pull every remote deck,
 *     merge into local storage, and push up any local-only/newer decks.
 *   - on every local save()/remove() (savedDecksStore.ts): best-effort push
 *     of that one change to the server, fire-and-forget.
 * A user who is offline, or has no backend configured at all, keeps full
 * local read/write exactly as before (requirement #10, local/offline
 * loading) — sync is additive, never a dependency for local play.
 *
 * Known limitation: sync failures (network blip, expired token) are logged
 * and swallowed rather than surfaced in the UI — the deck is always safely on
 * disk locally either way, so a failed background sync degrades to "not yet
 * backed up," never to data loss. A future revision could surface a small
 * "not synced" badge per deck using the rejected pushes this module already
 * knows about.
 */
import { deckStore } from './runtime';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { deleteRemoteDeck, listRemoteDecks, saveRemoteDeck } from '../../multiplayer/net/deckClient';
import { planDeckSync } from '../../cards/decks/deckSyncPlan';
import type { SavedDeck } from '../../cards/decks/savedDeck';

function loadAllLocalDecks(): SavedDeck[] {
  const decks: SavedDeck[] = [];
  for (const entry of deckStore.list()) {
    const result = deckStore.load(entry.deckId);
    if (result.ok) decks.push(result.deck);
  }
  return decks;
}

/**
 * Full two-way sync: pulls every deck on the account, merges it against
 * whatever's in local storage (last-write-wins by updatedAt — see
 * deckSyncPlan.ts), writes the newer remote decks locally, and pushes up any
 * local decks that are newer or don't exist on the server yet. Call after a
 * successful sign-in / session restore.
 */
export async function syncDecksWithAccount(token: string): Promise<void> {
  if (!isBackendConfigured()) return;

  let remoteDecks: SavedDeck[];
  try {
    remoteDecks = await listRemoteDecks(token);
  } catch (cause) {
    console.warn('[deckSync] could not fetch account decks, staying local-only for now:', cause);
    return;
  }

  const localDecks = loadAllLocalDecks();
  const plan = planDeckSync(localDecks, remoteDecks);

  for (const deck of plan.toWriteLocal) {
    deckStore.save(deck);
  }

  for (const deck of plan.toPushRemote) {
    try {
      await saveRemoteDeck(token, deck);
    } catch (cause) {
      console.warn(`[deckSync] failed to push local deck "${deck.deckId}" to account:`, cause);
    }
  }
}

/** Best-effort push of a single just-saved deck. Never throws — the local save already succeeded and is what the UI reflects. */
export async function pushDeckSave(token: string | null, deck: SavedDeck): Promise<void> {
  if (!token || !isBackendConfigured()) return;
  try {
    await saveRemoteDeck(token, deck);
  } catch (cause) {
    console.warn(`[deckSync] failed to sync saved deck "${deck.deckId}" to account:`, cause);
  }
}

/** Best-effort push of a single just-removed deck. Never throws — the local removal already succeeded. */
export async function pushDeckRemove(token: string | null, deckId: string): Promise<void> {
  if (!token || !isBackendConfigured()) return;
  try {
    await deleteRemoteDeck(token, deckId);
  } catch (cause) {
    console.warn(`[deckSync] failed to sync removal of deck "${deckId}" to account:`, cause);
  }
}
