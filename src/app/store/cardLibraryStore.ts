/**
 * Card Library / Deck Builder "Browse" data layer. Owns every live call to
 * optcgapi.com made while browsing — Card Library screen (Task 9) and the
 * Deck Builder's Browse + Search-by-ID tabs (Task 10) both read this same
 * store so a set fetched once for one screen is never re-fetched for the
 * other.
 *
 * Deliberately does NOT eagerly fetch "all cards" on load. optcgapi.com's
 * "all*" endpoints return entire unpaginated tables and the API owner asks
 * consumers to keep call volume low (see api/endpoints.ts module doc) — so
 * browsing is scoped to "pick a set, then fetch just that set" rather than
 * "fetch everything, then filter." `fetchAllSets` is the one exception:
 * it's the cheap (~21 rows) index needed to populate the set picker itself.
 */
import { create } from 'zustand';
import {
  fetchAllSets,
  fetchCardPrintings,
  optcgEndpoints,
  resolveCardPrintingsById,
  withCache,
  type CardApiError,
  type CardPrintingDto,
  type SetSummaryDto,
} from '../../cards/api';
import {
  buildCardLibraryEntry,
  filterCardLibraryEntries,
  groupPrintingsByCardNumber,
  type CardLibraryEntry,
  type CardLibraryFilter,
} from '../../cards/library';
import { browserFetch, cardLibraryCache, CARD_LIBRARY_CACHE_TTL_MS } from '../lib/runtime';

export const CARD_LIBRARY_PAGE_SIZE = 30;

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

type SearchByIdStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error';

interface CardLibraryState {
  sets: SetSummaryDto[];
  setsStatus: LoadStatus;
  setsError?: CardApiError;

  selectedSetId: string | null;
  entriesBySetId: Record<string, CardLibraryEntry[]>;
  setStatusById: Record<string, LoadStatus>;
  setErrorById: Record<string, CardApiError>;

  filter: CardLibraryFilter;
  visibleCount: number;

  selectedCardNumber: string | null;

  searchById: {
    queryId: string;
    status: SearchByIdStatus;
    result: CardLibraryEntry | null;
    error?: CardApiError;
  };

  loadSets(): Promise<void>;
  selectSet(setId: string): void;
  loadSetCards(setId: string): Promise<void>;
  setFilter(filter: CardLibraryFilter): void;
  loadMore(): void;
  selectCard(cardNumber: string | null): void;
  searchByCardId(cardId: string): Promise<void>;
}

export const useCardLibraryStore = create<CardLibraryState>((set, get) => ({
  sets: [],
  setsStatus: 'idle',

  selectedSetId: null,
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

    const result = await withCache<SetSummaryDto[]>(
      cardLibraryCache,
      'allSets',
      () => fetchAllSets(browserFetch, optcgEndpoints.allSets()),
      { ttlMs: CARD_LIBRARY_CACHE_TTL_MS },
    );

    if (result.ok) {
      set({ sets: result.data, setsStatus: 'loaded' });
    } else {
      set({ setsStatus: 'error', setsError: result.error as CardApiError });
    }
  },

  selectSet: (setId) => {
    set({ selectedSetId: setId, visibleCount: CARD_LIBRARY_PAGE_SIZE });
    const status = get().setStatusById[setId];
    if (status !== 'loading' && status !== 'loaded') {
      void get().loadSetCards(setId);
    }
  },

  loadSetCards: async (setId) => {
    set((state) => ({ setStatusById: { ...state.setStatusById, [setId]: 'loading' } }));

    // `fetchCardPrintings`'s shape-guard only checks the fields every CardPrintingDto
    // row shares (card_set_id/card_name/card_type/card_text/card_image_id) — those are
    // identical regardless of whether the endpoint scoped the response to one card
    // number (/sets/card/{id}/) or one whole set (/sets/{setId}/, used here), so reusing
    // it for the set-level endpoint is safe. TODO: re-verify against a live response if
    // optcgapi.com ever diverges the two shapes.
    const result = await withCache<CardPrintingDto[]>(
      cardLibraryCache,
      `setCards:${setId}`,
      () => fetchCardPrintings(browserFetch, optcgEndpoints.setCards(setId)),
      { ttlMs: CARD_LIBRARY_CACHE_TTL_MS },
    );

    if (result.ok) {
      const entries = groupPrintingsByCardNumber(result.data).map(buildCardLibraryEntry);
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

    const entry = buildCardLibraryEntry(result.printings);
    set({ searchById: { queryId: normalized, status: 'found', result: entry } });
  },
}));

/** Selector: the filtered + paginated entries for whichever set is currently selected. */
export function useVisibleCardLibraryEntries(): CardLibraryEntry[] {
  return useCardLibraryStore((state) => {
    const all = state.selectedSetId ? state.entriesBySetId[state.selectedSetId] ?? [] : [];
    return filterCardLibraryEntries(all, state.filter).slice(0, state.visibleCount);
  });
}

/** Selector: total filtered count for the current set, so "Load more" can know when to stop showing itself. */
export function useFilteredCardLibraryCount(): number {
  return useCardLibraryStore((state) => {
    const all = state.selectedSetId ? state.entriesBySetId[state.selectedSetId] ?? [] : [];
    return filterCardLibraryEntries(all, state.filter).length;
  });
}
