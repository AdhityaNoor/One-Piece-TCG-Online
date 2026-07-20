/**
 * Remembers the saved deck the player most recently took into a match, across
 * every play surface (Ranked, Casual, VS Self, VS CPU). Pure UI-flow
 * preference — never GameState, never read by the engine — persisted the same
 * way as settingsStore: zustand's `persist` middleware over the injected
 * `StorageLike` (see app/lib/runtime.ts), so there is exactly one place that
 * knows about the real browser storage API.
 *
 * Each play screen pre-selects this id as its default the first time it sees
 * a deck list with nothing already chosen, and updates it whenever the player
 * actually queues/hosts/joins/starts a match with a given deck (see call
 * sites in RankedScreen, CasualLobbyScreen, DeckSelectScreen,
 * CpuDeckSelectScreen). A deck that no longer exists (renamed id, deleted)
 * simply fails the "is this id still in my deck list" check at each call
 * site and is ignored — this store never validates the id itself.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { browserStorage } from '../lib/runtime';

interface LastUsedDeckState {
  lastUsedDeckId: string | null;
  setLastUsedDeckId(deckId: string): void;
}

export const useLastUsedDeckStore = create<LastUsedDeckState>()(
  persist(
    (set) => ({
      lastUsedDeckId: null,
      setLastUsedDeckId: (deckId) => set({ lastUsedDeckId: deckId }),
    }),
    {
      name: 'optcg.lastUsedDeck',
      storage: createJSONStorage(() => browserStorage),
    },
  ),
);
