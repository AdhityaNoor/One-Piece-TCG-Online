/**
 * Thin reactive wrapper around `deckStore` (the pure `/src/cards/decks`
 * DeckStore — see deckStorage.ts). All the actual persistence/migration
 * logic lives there; this store's only job is to keep a React-subscribable
 * list in sync after every save/remove so the Saved Decks screen re-renders
 * without manually re-querying localStorage.
 *
 * Also fires a best-effort background push to the account-backed deck
 * library (src/app/lib/deckSync.ts) after every local save/remove, when
 * signed in — see that file's doc comment for why this is fire-and-forget
 * rather than making save()/remove() async everywhere they're called.
 */
import { create } from 'zustand';
import { deckStore } from '../lib/runtime';
import { pushDeckRemove, pushDeckSave } from '../lib/deckSync';
import { useAuthStore } from './authStore';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks/deckStorage';
import type { SavedDeck } from '../../cards/decks/savedDeck';

interface SavedDecksState {
  entries: DeckStoreListEntry[];
  refresh(): void;
  load(deckId: string): DeckLoadResult;
  save(deck: SavedDeck): void;
  remove(deckId: string): void;
}

export const useSavedDecksStore = create<SavedDecksState>((set, get) => ({
  entries: deckStore.list(),
  refresh: () => set({ entries: deckStore.list() }),
  load: (deckId) => deckStore.load(deckId),
  save: (deck) => {
    deckStore.save(deck);
    get().refresh();
    void pushDeckSave(useAuthStore.getState().token, deck);
  },
  remove: (deckId) => {
    deckStore.remove(deckId);
    get().refresh();
    void pushDeckRemove(useAuthStore.getState().token, deckId);
  },
}));
