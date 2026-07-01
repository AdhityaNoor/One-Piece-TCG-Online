import { create } from 'zustand';
import {
  withCache,
  type CardApiError,
  type CardPrintingDto,
  type SetSummaryDto,
} from '../../cards/api';
import { fetchAllSets, fetchAllPlayableCardPrintings, fetchSetCards, resolveCardPrintingsById } from '../lib/cardCatalog';
import {
  buildCardLibraryEntry,
  filterCardLibraryEntries,
  groupPrintingsByCardNumber,
  groupPrintingsIntoLibraryEntries,
  normalizeTypeTags,
  type CardLibraryEntry,
  type CardLibraryFilter,
} from '../../cards/library';
import { browserFetch, cardLibraryCache, CARD_LIBRARY_CACHE_TTL_MS } from '../lib/runtime';

export const CARD_LIBRARY_PAGE_SIZE = 30;
export const ALL_SETS_ID = 'all';

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
type SearchByIdStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error';

interface CardLibraryState {
  sets: SetSummaryDto[];
  setsStatus: LoadStatus;
  setsError?: CardApiError;
  selectedSetId: string;
  entriesBySetId: Record<string, CardLibraryEntry[]>;
  setStatusById: Record<string, LoadStatus>;
  setErrorById: Record<string, CardApiError>;
  filter: CardLibraryFilter;
  visibleCount: number;
  selectedCardNumber: string | null;
  searchById: { queryId: string; status: SearchByIdStatus; result: CardLibraryEntry | null; error?: CardApiError };
  loadSets(): Promise<void>;
  selectSet(setId: string): void;
  loadSetCards(setId: string): Promise<void>;
  setFilter(filter: CardLibraryFilter): void;
  loadMore(): void;
  selectCard(cardNumber: string | null): void;
  searchByCardId(cardId: string): Promise<void>;
}

const ALL_SETS_ENTRY: SetSummaryDto = { set_id: ALL_SETS_ID, set_name: 'All Sets' };

export const useCardLibraryStore = create<CardLibraryState>((set, get) => ({
  sets: [],
  setsStatus: 'idle',
  selectedSetId: ALL_SETS_ID,
  entriesBySetId: {},
  setStatusById: {},
  setErrorById: {},
  filter: {},
  visibleCount: CARD_LIBRARY_PAGE_SIZE,
  selectedCardNumber: null,
  searchById: { queryId: '', status: 'idle', result: null },

  loadSets: async () => {
    if (get().setsStatus === 'loading' || get().setsStatus === 'loaded') return;
    set({ setsStatus: 'loading', setsError: undefined });
    const result = await withCache<SetSummaryDto[]>(cardLibraryCache, 'allSets', () => fetchAllSets(browserFetch), {
      ttlMs: CARD_LIBRARY_CACHE_TTL_MS,
    });
    if (result.ok) set({ sets: [ALL_SETS_ENTRY, ...[...result.data].reverse()], setsStatus: 'loaded' });
    else set({ setsStatus: 'error', setsError: result.error as CardApiError });
  },

  selectSet: (setId) => {
    set({ selectedSetId: setId, visibleCount: CARD_LIBRARY_PAGE_SIZE });
    const status = get().setStatusById[setId];
    if (status !== 'loading' && status !== 'loaded') void get().loadSetCards(setId);
  },

  loadSetCards: async (setId) => {
    set((state) => ({ setStatusById: { ...state.setStatusById, [setId]: 'loading' } }));
    const result =
      setId === ALL_SETS_ID
        ? await withCache<CardPrintingDto[]>(cardLibraryCache, 'allPlayableCardPrintings', () => fetchAllPlayableCardPrintings(browserFetch), {
            ttlMs: CARD_LIBRARY_CACHE_TTL_MS,
          })
        : await withCache<CardPrintingDto[]>(cardLibraryCache, `setCards:${setId}`, () => fetchSetCards(browserFetch, setId), {
            ttlMs: CARD_LIBRARY_CACHE_TTL_MS,
          });
    if (result.ok) {
      const entries = setId === ALL_SETS_ID ? groupPrintingsIntoLibraryEntries(result.data) : groupPrintingsByCardNumber(result.data).map(buildCardLibraryEntry);
      set((state) => ({
        entriesBySetId: { ...state.entriesBySetId, [setId]: entries },
        setStatusById: { ...state.setStatusById, [setId]: 'loaded' },
      }));
    } else {
      set((state) => ({
        setStatusById: { ...state.setStatusById, [setId]: 'error' },
        setErrorById: { ...state.setErrorById, [setId]: result.error as CardApiError },
      }));
    }
  },

  setFilter: (filter) => set({ filter, visibleCount: CARD_LIBRARY_PAGE_SIZE }),
  loadMore: () => set((state) => ({ visibleCount: state.visibleCount + CARD_LIBRARY_PAGE_SIZE })),
  selectCard: (cardNumber) => set({ selectedCardNumber: cardNumber }),
  searchByCardId: async (cardId) => {
    const normalized = cardId.trim().toUpperCase();
    set({ searchById: { queryId: normalized, status: 'loading', result: null } });
    if (normalized.length === 0) {
      set({ searchById: { queryId: normalized, status: 'idle', result: null } });
      return;
    }
    const result = await resolveCardPrintingsById(browserFetch, normalized);
    if (!result.ok) {
      set({ searchById: { queryId: normalized, status: 'error', result: null, error: result.error } });
      return;
    }
    if (!result.found) {
      set({ searchById: { queryId: normalized, status: 'not-found', result: null } });
      return;
    }
    set({ searchById: { queryId: normalized, status: 'found', result: buildCardLibraryEntry(result.printings) } });
  },
}));

export function useVisibleCardLibraryEntries(): CardLibraryEntry[] {
  return useCardLibraryStore((state) => {
    const all = state.entriesBySetId[state.selectedSetId] ?? [];
    return filterCardLibraryEntries(all, state.filter).slice(0, state.visibleCount);
  });
}

export function useFilteredCardLibraryCount(): number {
  return useCardLibraryStore((state) => {
    const all = state.entriesBySetId[state.selectedSetId] ?? [];
    return filterCardLibraryEntries(all, state.filter).length;
  });
}

export function useKnownCardLibraryTypes(): string[] {
  return useCardLibraryStore((state) => {
    const all = state.entriesBySetId[state.selectedSetId] ?? [];
    const byLower = new Map<string, string>();
    for (const entry of all) {
      for (const type of normalizeTypeTags(entry.definition.types)) {
        const key = type.toLowerCase();
        if (!byLower.has(key)) byLower.set(key, type);
      }
    }
    return [...byLower.values()].sort((a, b) => a.localeCompare(b));
  });
}
