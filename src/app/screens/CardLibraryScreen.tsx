/**
 * Card Library screen (Task 9) — browse-only. Pick a set, optionally narrow
 * by text/color/category, page through results, zoom any card. All
 * fetching/caching/filtering/pagination lives in CardSetBrowser + its
 * underlying cardLibraryStore (./shared/CardSetBrowser.tsx); this component
 * only supplies the per-tile renderer (open the zoom modal) and the single
 * shared CardDetailModal instance — no fetch logic here.
 *
 * Deliberately excludes the "find one exact card number across every set"
 * flow (`searchByCardId`/`searchById` in cardLibraryStore) — that lookup
 * exists for the Deck Builder's Search-by-ID tab (Task 10), not this browse
 * screen, which is scoped to "look at one set at a time".
 */
import type { CardLibraryEntry } from '../../cards/library';
import { CardDetailModal, CardTile, ScreenShell } from '../components';
import type { CardTileData } from '../components';
import { useCardLibraryStore } from '../store/cardLibraryStore';
import { useNavigationStore } from '../store/navigationStore';
import { CardSetBrowser } from './shared';

function toTileData(entry: CardLibraryEntry): CardTileData {
  return {
    cardNumber: entry.cardNumber,
    name: entry.definition.name,
    imageUrl: entry.printings[0]?.imageUrl ?? null,
    colors: entry.definition.colors,
    category: entry.definition.category,
  };
}

export function CardLibraryScreen() {
  const goBack = useNavigationStore((state) => state.goBack);

  const sets = useCardLibraryStore((state) => state.sets);
  const selectedSetId = useCardLibraryStore((state) => state.selectedSetId);
  const entriesBySetId = useCardLibraryStore((state) => state.entriesBySetId);
  const selectedCardNumber = useCardLibraryStore((state) => state.selectedCardNumber);
  const selectCard = useCardLibraryStore((state) => state.selectCard);

  const selectedSetName = sets.find((s) => s.set_id === selectedSetId)?.set_name;
  const selectedEntry: CardLibraryEntry | null =
    selectedSetId && selectedCardNumber ? entriesBySetId[selectedSetId]?.find((entry) => entry.cardNumber === selectedCardNumber) ?? null : null;

  return (
    <ScreenShell title="Card Library" onBack={goBack}>
      <CardSetBrowser
        renderEntry={(entry) => (
          <CardTile key={entry.cardNumber} card={toTileData(entry)} onClick={() => selectCard(entry.cardNumber)} />
        )}
      />

      <CardDetailModal
        open={selectedEntry !== null}
        onClose={() => selectCard(null)}
        definition={selectedEntry?.definition ?? null}
        imageUrl={selectedEntry?.printings[0]?.imageUrl ?? null}
        setName={selectedSetName}
      />
    </ScreenShell>
  );
}
