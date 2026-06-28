/**
 * Search-by-ID creation method — resolves one EXACT card number across every
 * endpoint family (cardLibraryStore.searchByCardId -> resolveCardPrintingsById),
 * for "I already know the card number" entry, as opposed to browsing a whole
 * set. Search runs on submit (Enter / button), never on every keystroke, to
 * keep API call volume low (see cardLibraryStore's own module doc).
 */
import { useState } from 'react';
import { Button } from '../../components';
import { formatCardApiError } from '../../lib/formatCardApiError';
import { useCardLibraryStore } from '../../store/cardLibraryStore';
import { DeckBuilderResultTile } from './DeckBuilderResultTile';

export function SearchByIdTab() {
  const [query, setQuery] = useState('');
  const searchById = useCardLibraryStore((state) => state.searchById);
  const searchByCardId = useCardLibraryStore((state) => state.searchByCardId);

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void searchByCardId(query);
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Exact card number, e.g. OP01-016"
          className="flex-1 border border-navy-900/15 bg-white px-4 py-2 text-sm text-navy-900 placeholder:text-navy-900/40 focus:border-navy-900/40 focus:outline-none"
        />
        <Button type="submit" size="md">
          Search
        </Button>
      </form>

      {searchById.status === 'idle' && (
        <p className="bg-surface-panel p-4 text-center text-sm text-navy-900/50">Enter an exact card number above to look it up.</p>
      )}
      {searchById.status === 'loading' && <p className="text-sm text-navy-900/50">Searching…</p>}
      {searchById.status === 'not-found' && (
        <p className="bg-surface-panel p-4 text-center text-sm text-navy-900/50">No card found for "{searchById.queryId}".</p>
      )}
      {searchById.status === 'error' && (
        <p className="bg-surface-panel p-4 text-center text-sm text-red-600">
          {searchById.error ? formatCardApiError(searchById.error) : 'Search failed.'}
        </p>
      )}
      {searchById.status === 'found' && searchById.result && (
        <div className="grid justify-items-start">
          <div className="w-[8.5rem]">
            <DeckBuilderResultTile entry={searchById.result} />
          </div>
        </div>
      )}
    </div>
  );
}
