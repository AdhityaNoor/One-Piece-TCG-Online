/**
 * Card gallery — reuses the SAME client-side card catalog store the player-facing
 * deck builder/card library already use (useCardLibraryStore, reading the
 * bundled local catalog, not a live API — see project memory on the card
 * data source pivot). No new backend needed for browsing; this is purely a
 * read-only admin view over data that already exists.
 */
import { useEffect } from 'react';
import { useCardLibraryStore, useVisibleCardLibraryEntries, useFilteredCardLibraryCount, ALL_SETS_ID } from '../../../app/store/cardLibraryStore';
import { CardImage } from '../../../app/components/CardImage';
import { AdminInput, AdminSelect } from '../../components/ui';

export function CardGalleryTab() {
  const sets = useCardLibraryStore((s) => s.sets);
  const selectedSetId = useCardLibraryStore((s) => s.selectedSetId);
  const setsStatus = useCardLibraryStore((s) => s.setsStatus);
  const loadSets = useCardLibraryStore((s) => s.loadSets);
  const selectSet = useCardLibraryStore((s) => s.selectSet);
  const setFilter = useCardLibraryStore((s) => s.filter);
  const applyFilter = useCardLibraryStore((s) => s.setFilter);
  const loadMore = useCardLibraryStore((s) => s.loadMore);
  const entries = useVisibleCardLibraryEntries();
  const total = useFilteredCardLibraryCount();

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  useEffect(() => {
    if (setsStatus === 'loaded' && selectedSetId === ALL_SETS_ID) selectSet(ALL_SETS_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setsStatus]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <AdminSelect value={selectedSetId} onChange={(e) => selectSet(e.target.value)}>
          {sets.map((set) => (
            <option key={set.set_id} value={set.set_id}>
              {set.set_name}
            </option>
          ))}
        </AdminSelect>
        <AdminInput
          placeholder="Search name or number…"
          defaultValue={setFilter.query ?? ''}
          onChange={(e) => applyFilter({ ...setFilter, query: e.target.value })}
          className="w-64"
        />
      </div>

      <p className="mb-3 text-sm text-white/40">{total} cards</p>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))' }}>
        {entries.map((entry) => (
          <div key={entry.cardNumber}>
            <CardImage src={entry.printings[0]?.imageUrl ?? null} alt={entry.definition.name} />
            <p className="mt-1 truncate text-center text-xs text-white/75">{entry.definition.name}</p>
            <p className="text-center text-[10px] text-white/40">{entry.cardNumber}</p>
          </div>
        ))}
      </div>

      {entries.length < total && (
        <div className="mt-4 text-center">
          <button type="button" onClick={loadMore} className="rounded border border-[rgb(var(--op-gold-rgb)/0.3)] px-4 py-1.5 text-sm text-white/75 hover:bg-[rgb(var(--op-gold-rgb)/0.12)]">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
