/**
 * Thin reactive wrapper around `deckStore` (the pure `/src/cards/decks`
 * DeckStore — see deckStorage.ts). All the actual persistence/migration
 * logic lives there; this store's only job is to keep a React-subscribable
 * list in sync after every save/remove so the Saved Decks screen re-renders
 * without manually re-querying localStorage.
 */
import { create } from 'zustand';
import { deckStore } from '../lib/runtime';
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
  },
  remove: (deckId) => {
    deckStore.remove(deckId);
    get().refresh();
  },
}));
