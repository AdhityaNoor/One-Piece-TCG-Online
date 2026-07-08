import type { CSSProperties, ReactNode } from 'react';
import { useEffect } from 'react';
import type { CardLibraryEntry } from '../../../cards/library';
import { COST_FILTER_MIN, COST_FILTER_MAX, POWER_FILTER_MIN, POWER_FILTER_MAX, POWER_FILTER_STEP } from '../../../cards/library';
import type { CardCategory, Color } from '../../../engine/state/card';
import { Button, OpSelect, SetLibrarySelect } from '../../components';
import { ALL_CARD_COLORS } from '../../lib/cardColors';
import { formatCardApiError } from '../../lib/formatCardApiError';
import { useCardLibraryStore, useFilteredCardLibraryCount, useKnownCardLibraryTypes, useVisibleCardLibraryEntries } from '../../store/cardLibraryStore';
import { CARD_COLOR_TOKENS } from '../../lib/cardColors';

export interface CardSetBrowserProps {
  renderEntry: (entry: CardLibraryEntry) => ReactNode;
  categories?: CardCategory[];
}

export interface CardSetBrowserControlsProps {
  categories?: CardCategory[];
  lockedColors?: Color[];
  lockedColorReason?: string;
  lockedCategories?: CardCategory[];
  lockedCategoryReason?: string;
  lockSetSelection?: boolean;
}

export interface CardSetBrowserResultsProps {
  renderEntry: (entry: CardLibraryEntry) => ReactNode;
  gridClassName?: string;
  gridStyle?: CSSProperties;
}

const DEFAULT_CATEGORIES: CardCategory[] = ['leader', 'character', 'event', 'stage'];

export function CardSetBrowser({ renderEntry, categories = DEFAULT_CATEGORIES }: CardSetBrowserProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
      <CardSetBrowserControls categories={categories} />
      <CardSetBrowserResults renderEntry={renderEntry} />
    </div>
  );
}

const TRIGGER_FILTER_OPTIONS = [
  { value: 'any', label: 'All' },
  { value: 'lifeTrigger', label: 'Yes' },
  { value: 'no-lifeTrigger', label: 'No' },
] as const;

const FORMAT_LEGALITY_FILTER_OPTIONS = [
  { value: 'any', label: 'All cards' },
  { value: 'legal', label: 'Legal' },
  { value: 'extraLegal', label: 'Extra Legal' },
  { value: 'banned', label: 'Banned' },
] as const;

export function CardSetBrowserControls({ categories = DEFAULT_CATEGORIES, lockedColors, lockedColorReason, lockedCategories, lockedCategoryReason, lockSetSelection }: CardSetBrowserControlsProps) {
  const sets = useCardLibraryStore((state) => state.sets);
  const setsStatus = useCardLibraryStore((state) => state.setsStatus);
  const setsError = useCardLibraryStore((state) => state.setsError);
  const selectedSetId = useCardLibraryStore((state) => state.selectedSetId);
  const filter = useCardLibraryStore((state) => state.filter);
  const loadSets = useCardLibraryStore((state) => state.loadSets);
  const selectSet = useCardLibraryStore((state) => state.selectSet);
  const setFilter = useCardLibraryStore((state) => state.setFilter);
  const knownTypes = useKnownCardLibraryTypes();

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  const categoryFilterIsLocked = Boolean(lockedCategories?.length);
  const colorFilterIsLocked = Boolean(lockedColors?.length);
  const visibleColors = colorFilterIsLocked ? lockedColors! : ALL_CARD_COLORS;
  const unlockedColorFilterIsActive = !colorFilterIsLocked && (filter.colors?.length ?? 0) > 0;
  const unlockedCategoryFilterIsActive = !categoryFilterIsLocked && (filter.categories?.length ?? 0) > 0;
  const timingFilterIsActive = Boolean(filter.timing && filter.timing !== 'any');
  const formatLegalityFilterIsActive = Boolean(filter.formatLegality && filter.formatLegality !== 'any');

  const costMin = filter.costMin ?? COST_FILTER_MIN;
  const costMax = filter.costMax ?? COST_FILTER_MAX;
  const costFilterIsActive = costMin > COST_FILTER_MIN || costMax < COST_FILTER_MAX;
  const powerMin = filter.powerMin ?? POWER_FILTER_MIN;
  const powerMax = filter.powerMax ?? POWER_FILTER_MAX;
  const powerFilterIsActive = powerMin > POWER_FILTER_MIN || powerMax < POWER_FILTER_MAX;

  const hasActiveFilter =
    Boolean(filter.query) ||
    Boolean(filter.type) ||
    Boolean(filter.typeQuery) ||
    timingFilterIsActive ||
    formatLegalityFilterIsActive ||
    unlockedColorFilterIsActive ||
    unlockedCategoryFilterIsActive ||
    costFilterIsActive ||
    powerFilterIsActive;

  function setCostRange(min: number, max: number) {
    setFilter({ ...filter, costMin: min, costMax: max });
  }
  function setPowerRange(min: number, max: number) {
    setFilter({ ...filter, powerMin: min, powerMax: max });
  }

  function toggleColor(color: Color) {
    if (colorFilterIsLocked) return;
    const current = filter.colors ?? [];
    setFilter({ ...filter, colors: current.includes(color) ? current.filter((c) => c !== color) : [...current, color] });
  }

  function toggleCategory(category: CardCategory) {
    if (categoryFilterIsLocked) return;
    const current = filter.categories ?? [];
    setFilter({ ...filter, categories: current.includes(category) ? current.filter((c) => c !== category) : [...current, category] });
  }

  function clearUnlockedFilters() {
    setFilter({
      ...(colorFilterIsLocked ? { colors: lockedColors } : {}),
      ...(categoryFilterIsLocked ? { categories: lockedCategories } : {}),
    });
  }

  return (
    <aside className="flex flex-col gap-3">
      <div>
        <label className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Set Library</label>
        {setsStatus === 'loading' && <p className="mt-1 text-xs text-slate-200/60">Loading sets...</p>}
        {setsStatus === 'error' && (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-red-200">{setsError ? formatCardApiError(setsError) : 'Failed to load sets.'}</p>
            <Button variant="secondary" size="sm" onClick={() => loadSets()}>
              Retry
            </Button>
          </div>
        )}
        {sets.length > 0 && (
          <SetLibrarySelect
            sets={sets}
            value={selectedSetId}
            disabled={lockSetSelection}
            title={lockSetSelection ? lockedCategoryReason : undefined}
            onChange={selectSet}
          />
        )}
      </div>

      <div>
        <label className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Search</label>
        <input
          type="search"
          value={filter.query ?? ''}
          onChange={(event) => setFilter({ ...filter, query: event.target.value })}
          placeholder="Search by name or card number..."
          className="op-input mt-1.5 w-full px-3 py-2 text-sm placeholder:text-slate-300/35"
        />
      </div>

      <div>
        <label className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Type / Crew</label>
        <OpSelect
          value={filter.type ?? ''}
          options={[{ value: '', label: 'All types' }, ...knownTypes.map((type) => ({ value: type, label: type }))]}
          onChange={(nextValue) => setFilter({ ...filter, type: nextValue || undefined, typeQuery: undefined })}
        />
        {knownTypes.length === 0 && <p className="mt-1.5 text-xs leading-5 text-slate-200/50">Load a set to populate known types.</p>}
      </div>

      <div>
        <label className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Has Trigger</label>
        <OpSelect
          value={filter.timing ?? 'any'}
          options={[...TRIGGER_FILTER_OPTIONS]}
          onChange={(nextValue) => {
            const value = nextValue as (typeof TRIGGER_FILTER_OPTIONS)[number]['value'];
            setFilter({ ...filter, timing: value === 'any' ? undefined : value });
          }}
        />
      </div>

      <div>
        <label className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Format Legality</label>
        <OpSelect
          value={filter.formatLegality ?? 'any'}
          options={[...FORMAT_LEGALITY_FILTER_OPTIONS]}
          onChange={(nextValue) => {
            const value = nextValue as (typeof FORMAT_LEGALITY_FILTER_OPTIONS)[number]['value'];
            setFilter({ ...filter, formatLegality: value === 'any' ? undefined : value });
          }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Cost</p>
          <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
            {costFilterIsActive ? `${costMin}–${costMax}` : 'Any'}
          </p>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          <input
            type="range"
            aria-label="Minimum cost"
            min={COST_FILTER_MIN}
            max={COST_FILTER_MAX}
            step={1}
            value={costMin}
            onChange={(event) => setCostRange(Math.min(Number(event.target.value), costMax), costMax)}
            className="op-range w-full accent-red-600"
          />
          <input
            type="range"
            aria-label="Maximum cost"
            min={COST_FILTER_MIN}
            max={COST_FILTER_MAX}
            step={1}
            value={costMax}
            onChange={(event) => setCostRange(costMin, Math.max(Number(event.target.value), costMin))}
            className="op-range w-full accent-red-600"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Power</p>
          <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
            {powerFilterIsActive ? `${powerMin}–${powerMax}` : 'Any'}
          </p>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          <input
            type="range"
            aria-label="Minimum power"
            min={POWER_FILTER_MIN}
            max={POWER_FILTER_MAX}
            step={POWER_FILTER_STEP}
            value={powerMin}
            onChange={(event) => setPowerRange(Math.min(Number(event.target.value), powerMax), powerMax)}
            className="op-range w-full accent-red-600"
          />
          <input
            type="range"
            aria-label="Maximum power"
            min={POWER_FILTER_MIN}
            max={POWER_FILTER_MAX}
            step={POWER_FILTER_STEP}
            value={powerMax}
            onChange={(event) => setPowerRange(powerMin, Math.max(Number(event.target.value), powerMin))}
            className="op-range w-full accent-red-600"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Color</p>
          {colorFilterIsLocked && <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.12em] text-gold/65">Locked</p>}
        </div>
        <div className="mt-1.5 grid grid-cols-6 gap-1.5">
          {visibleColors.map((color) => {
            const token = CARD_COLOR_TOKENS[color];
            const selected = filter.colors?.includes(color) ?? false;
            return (
              <button
                key={color}
                type="button"
                aria-pressed={selected}
                disabled={colorFilterIsLocked}
                title={colorFilterIsLocked ? lockedColorReason : token.label}
                onClick={() => toggleColor(color)}
                className={[
                  'flex h-8 items-center justify-center border transition',
                  selected ? 'border-gold bg-gold/18 shadow-[0_0_0_2px_rgba(255,211,74,0.12)]' : 'border-gold/15 bg-black/35 hover:bg-white/10',
                  colorFilterIsLocked ? 'cursor-not-allowed opacity-80' : '',
                ].join(' ')}
              >
                <span className={['h-4 w-4 ring-2 ring-white/50', token.dotClassName].join(' ')} />
              </button>
            );
          })}
        </div>
        {colorFilterIsLocked && lockedColorReason && <p className="mt-1.5 text-xs leading-5 text-slate-200/50">{lockedColorReason}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Card Type</p>
          {categoryFilterIsLocked && <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.12em] text-gold/65">Locked</p>}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {categories.map((category) => {
            const selected = filter.categories?.includes(category) ?? false;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selected}
                disabled={categoryFilterIsLocked}
                title={categoryFilterIsLocked ? lockedCategoryReason : undefined}
                onClick={() => toggleCategory(category)}
                className={[
                  'h-8 border px-2 font-heading text-[11px] font-black uppercase tracking-[0.08em] transition',
                  selected ? 'border-gold bg-gold text-black shadow-[0_4px_0_rgba(68,39,0,0.75)]' : 'border-gold/15 bg-black/35 text-slate-100/80 hover:bg-white/10',
                  categoryFilterIsLocked ? 'cursor-not-allowed opacity-70' : '',
                ].join(' ')}
              >
                {category}
              </button>
            );
          })}
        </div>
        {categoryFilterIsLocked && lockedCategoryReason && <p className="mt-1.5 text-xs leading-5 text-slate-200/50">{lockedCategoryReason}</p>}
      </div>

      {hasActiveFilter && (
        <Button variant="ghost" size="sm" onClick={clearUnlockedFilters}>
          Clear filters
        </Button>
      )}
    </aside>
  );
}

export function CardSetBrowserResults({ renderEntry, gridClassName, gridStyle }: CardSetBrowserResultsProps) {
  const selectedSetId = useCardLibraryStore((state) => state.selectedSetId);
  const setStatusById = useCardLibraryStore((state) => state.setStatusById);
  const setErrorById = useCardLibraryStore((state) => state.setErrorById);
  const loadSetCards = useCardLibraryStore((state) => state.loadSetCards);
  const visibleCount = useCardLibraryStore((state) => state.visibleCount);
  const loadMore = useCardLibraryStore((state) => state.loadMore);

  const visibleEntries = useVisibleCardLibraryEntries();
  const filteredCount = useFilteredCardLibraryCount();

  useEffect(() => {
    if (selectedSetId && (setStatusById[selectedSetId] === undefined || setStatusById[selectedSetId] === 'idle')) {
      void loadSetCards(selectedSetId);
    }
  }, [loadSetCards, selectedSetId, setStatusById]);

  const selectedSetStatus = selectedSetId ? setStatusById[selectedSetId] : undefined;
  const selectedSetError = selectedSetId ? setErrorById[selectedSetId] : undefined;

  return (
    <section className="op-card-well min-h-0 min-w-0 p-3">
      {selectedSetId === null ? (
        <p className="border border-gold/15 bg-black/30 p-3 text-center text-sm text-slate-200/60">Choose a set above to browse its cards.</p>
      ) : selectedSetStatus === 'loading' ? (
        <p className="border border-gold/15 bg-black/30 p-3 text-center text-sm text-slate-200/60">Loading cards...</p>
      ) : selectedSetStatus === 'error' ? (
        <div className="flex flex-col items-center gap-2 border border-red-400/35 bg-red-950/40 p-3 text-center">
          <p className="text-sm text-red-200">{selectedSetError ? formatCardApiError(selectedSetError) : 'Failed to load this set.'}</p>
          <Button variant="secondary" size="sm" onClick={() => loadSetCards(selectedSetId)}>
            Retry
          </Button>
        </div>
      ) : visibleEntries.length === 0 ? (
        <p className="border border-gold/15 bg-black/30 p-3 text-center text-sm text-slate-200/60">No cards match your filters.</p>
      ) : (
        <>
          <div className="pr-1">
            <div className={gridClassName ?? 'grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'} style={gridStyle}>{visibleEntries.map(renderEntry)}</div>
          </div>
          {visibleCount < filteredCount && (
            <div className="mt-3 flex justify-center">
              <Button variant="secondary" size="sm" onClick={loadMore}>
                Load more ({filteredCount - visibleCount} left)
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
