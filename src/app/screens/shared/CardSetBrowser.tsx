/**
 * Shared "pick a set → filter → paginated grid" browsing surface, backed by
 * cardLibraryStore (the one live-API store both the Card Library screen,
 * Task 9, and the Deck Builder's Browse tab, Task 10, read from — see that
 * store's module doc). Owns set selection, text/color/category filters, and
 * pagination; delegates how each result RENDERS to the caller via
 * `renderEntry`, since Card Library (tap opens a zoom modal) and Deck
 * Builder Browse (tap opens zoom, a separate button adds/removes/sets
 * leader) need different per-tile behavior over identical underlying data.
 *
 * Extracted during Task 10 specifically to avoid a second ~100-line copy of
 * this set-picker/filter/pagination block living in BrowseTab.tsx — see
 * project "single source of truth, derive don't duplicate".
 */
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { CardLibraryEntry } from '../../../cards/library';
import type { CardCategory, Color } from '../../../engine/state/card';
import { Button, CategoryChip, ColorChip, SetChip } from '../../components';
import { ALL_CARD_COLORS } from '../../lib/cardColors';
import { formatCardApiError } from '../../lib/formatCardApiError';
import { useCardLibraryStore, useFilteredCardLibraryCount, useVisibleCardLibraryEntries } from '../../store/cardLibraryStore';

export interface CardSetBrowserProps {
  /** Renders one result tile — caller decides what tapping/adding/zooming does. Must include its own `key`. */
  renderEntry: (entry: CardLibraryEntry) => ReactNode;
  /** Category filter chips to offer. Defaults to every category cardLibraryStore can actually return (no 'don' — see CardLibraryScreen's prior note: DON!! cards are a separate API family this store never fetches). */
  categories?: CardCategory[];
}

const DEFAULT_CATEGORIES: CardCategory[] = ['leader', 'character', 'event', 'stage'];

export function CardSetBrowser({ renderEntry, categories = DEFAULT_CATEGORIES }: CardSetBrowserProps) {
  const sets = useCardLibraryStore((state) => state.sets);
  const setsStatus = useCardLibraryStore((state) => state.setsStatus);
  const setsError = useCardLibraryStore((state) => state.setsError);
  const selectedSetId = useCardLibraryStore((state) => state.selectedSetId);
  const setStatusById = useCardLibraryStore((state) => state.setStatusById);
  const setErrorById = useCardLibraryStore((state) => state.setErrorById);
  const filter = useCardLibraryStore((state) => state.filter);
  const visibleCount = useCardLibraryStore((state) => state.visibleCount);
  const loadSets = useCardLibraryStore((state) => state.loadSets);
  const selectSet = useCardLibraryStore((state) => state.selectSet);
  const loadSetCards = useCardLibraryStore((state) => state.loadSetCards);
  const setFilter = useCardLibraryStore((state) => state.setFilter);
  const loadMore = useCardLibraryStore((state) => state.loadMore);

  const visibleEntries = useVisibleCardLibraryEntries();
  const filteredCount = useFilteredCardLibraryCount();

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  const selectedSetStatus = selectedSetId ? setStatusById[selectedSetId] : undefined;
  const selectedSetError = selectedSetId ? setErrorById[selectedSetId] : undefined;
  const hasActiveFilter = Boolean(filter.query) || (filter.colors?.length ?? 0) > 0 || (filter.categories?.length ?? 0) > 0;

  function toggleColor(color: Color) {
    const current = filter.colors ?? [];
    setFilter({ ...filter, colors: current.includes(color) ? current.filter((c) => c !== color) : [...current, color] });
  }

  function toggleCategory(category: CardCategory) {
    const current = filter.categories ?? [];
    setFilter({ ...filter, categories: current.includes(category) ? current.filter((c) => c !== category) : [...current, category] });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        {setsStatus === 'loading' && <p className="text-xs text-navy-900/40">Loading sets…</p>}
        {setsStatus === 'error' && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-red-600">{setsError ? formatCardApiError(setsError) : 'Failed to load sets.'}</p>
            <Button variant="secondary" size="sm" onClick={() => loadSets()}>
              Retry
            </Button>
          </div>
        )}
        {sets.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {sets.map((s) => (
              <SetChip key={s.set_id} setName={s.set_name} selected={selectedSetId === s.set_id} onSelect={() => selectSet(s.set_id)} />
            ))}
          </div>
        )}
      </section>

      <input
        type="search"
        value={filter.query ?? ''}
        onChange={(event) => setFilter({ ...filter, query: event.target.value })}
        placeholder="Search by name or card number…"
        className="w-full rounded-full border border-navy-900/15 bg-white px-4 py-2 text-sm text-navy-900 placeholder:text-navy-900/40 focus:border-navy-900/40 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        {ALL_CARD_COLORS.map((color) => (
          <ColorChip key={color} color={color} selected={filter.colors?.includes(color) ?? false} onToggle={toggleColor} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {categories.map((category) => (
          <CategoryChip key={category} category={category} selected={filter.categories?.includes(category) ?? false} onToggle={toggleCategory} />
        ))}
        {hasActiveFilter && (
          <Button variant="ghost" size="sm" onClick={() => setFilter({})}>
            Clear filters
          </Button>
        )}
      </div>

      {selectedSetId === null ? (
        <p className="rounded-2xl bg-surface-panel p-4 text-center text-sm text-navy-900/50">Choose a set above to browse its cards.</p>
      ) : selectedSetStatus === 'loading' ? (
        <p className="rounded-2xl bg-surface-panel p-4 text-center text-sm text-navy-900/50">Loading cards…</p>
      ) : selectedSetStatus === 'error' ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-panel p-4 text-center">
          <p className="text-sm text-red-600">{selectedSetError ? formatCardApiError(selectedSetError) : 'Failed to load this set.'}</p>
          <Button variant="secondary" size="sm" onClick={() => loadSetCards(selectedSetId)}>
            Retry
          </Button>
        </div>
      ) : visibleEntries.length === 0 ? (
        <p className="rounded-2xl bg-surface-panel p-4 text-center text-sm text-navy-900/50">No cards match your filters.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">{visibleEntries.map(renderEntry)}</div>
          {visibleCount < filteredCount && (
            <div className="flex justify-center">
              <Button variant="secondary" size="sm" onClick={loadMore}>
                Load more ({filteredCount - visibleCount} left)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
