/**
 * Deck Select screen (Task 11) — local hotseat seat setup: one human, two
 * seats, pick one saved deck per seat. Deliberately allows the SAME deck for
 * both seats (a normal, legal way to test a deck — mirror match), so no
 * "can't pick the same deck twice" restriction is applied.
 *
 * Picks live in `matchSetupStore` (src/app/store/matchSetupStore.ts), not
 * local component state — that store was already scaffolded in Task 6
 * specifically to hold "which saved deck each side will use between Deck
 * Select and Match" and already provides `swapSides()` and
 * `useIsMatchSetupReady()`; duplicating that as local useState here would
 * violate the project's single-source-of-truth convention (see
 * CardSetBrowser's extraction for the same principle applied elsewhere).
 *
 * Produces exactly the `{screen:'match', deckIdA, deckIdB}` shape
 * navigationStore already defines, by id only — never passes loaded deck
 * objects through navigation params, consistent with "design every click as
 * if it will later be a network request" (a real network request could only
 * carry ids, not full deck objects already in this client's memory).
 */
import { useMemo } from 'react';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { Button, DeckListSummary, ScreenShell } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useIsMatchSetupReady, useMatchSetupStore } from '../store/matchSetupStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

interface SeatPickerProps {
  label: string;
  rows: { entry: DeckStoreListEntry; deck: DeckLoadResult }[];
  selectedDeckId: string | null;
  onSelect: (deckId: string) => void;
}

function SeatPicker({ label, rows, selectedDeckId, onSelect }: SeatPickerProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-navy-900/40">{label}</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-surface-panel p-3 text-sm text-navy-900/50">No saved decks yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ entry, deck }) =>
            deck.ok ? (
              <DeckListSummary
                key={entry.deckId}
                name={deck.deck.name}
                updatedAt={deck.deck.updatedAt}
                leaderName={deck.deck.leader.definition.name}
                leaderImageUrl={deck.deck.leader.imageUrl}
                colors={deck.deck.leader.definition.colors}
                cardCount={deck.deck.cards.reduce((sum, card) => sum + card.quantity, 0)}
                selected={selectedDeckId === entry.deckId}
                onSelect={() => onSelect(entry.deckId)}
              />
            ) : (
              <DeckListSummary key={entry.deckId} name={entry.name} updatedAt={entry.updatedAt} />
            ),
          )}
        </div>
      )}
    </section>
  );
}

export function DeckSelectScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);

  const deckIdA = useMatchSetupStore((state) => state.deckIdA);
  const deckIdB = useMatchSetupStore((state) => state.deckIdB);
  const setDeckA = useMatchSetupStore((state) => state.setDeckA);
  const setDeckB = useMatchSetupStore((state) => state.setDeckB);
  const swapSides = useMatchSetupStore((state) => state.swapSides);
  const isReady = useIsMatchSetupReady();

  const rows = useMemo(() => entries.map((entry) => ({ entry, deck: load(entry.deckId) })), [entries, load]);

  return (
    <ScreenShell title="Choose Decks" onBack={goBack}>
      <div className="flex flex-col gap-6">
        <p className="text-sm text-navy-900/60">Local hotseat — one device, two seats. Pick a deck for each seat (the same deck can be used for both).</p>

        <SeatPicker label="Player 1" rows={rows} selectedDeckId={deckIdA} onSelect={setDeckA} />
        <SeatPicker label="Player 2" rows={rows} selectedDeckId={deckIdB} onSelect={setDeckB} />

        <Button variant="secondary" fullWidth disabled={!deckIdA && !deckIdB} onClick={swapSides}>
          Swap Sides
        </Button>

        <Button
          variant="primary"
          fullWidth
          disabled={!isReady}
          onClick={() => {
            if (deckIdA && deckIdB) navigateTo({ screen: 'match', deckIdA, deckIdB });
          }}
        >
          Start Match
        </Button>
      </div>
    </ScreenShell>
  );
}
