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
    <section className="rounded-[1.8rem] border border-white/10 bg-white/8 p-4">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-100/70">{label}</h2>
      <div className="mt-3 flex flex-col gap-2">
        {rows.length === 0 ? (
          <p className="rounded-[1.4rem] border border-white/10 bg-white/8 p-3 text-sm text-slate-200/60">No saved decks yet.</p>
        ) : (
          rows.map(({ entry, deck }) =>
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
          )
        )}
      </div>
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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.12),_rgba(255,255,255,0.06))] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100/70">Match Setup</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Assign a deck to each seat</h2>
          <p className="mt-2 text-sm leading-6 text-slate-200/70">Local hotseat. The same deck can be used on both sides for mirror matches and testing.</p>

          <div className="mt-4 flex flex-col gap-3">
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
        </section>

        <div className="grid gap-4">
          <SeatPicker label="Player 1" rows={rows} selectedDeckId={deckIdA} onSelect={setDeckA} />
          <SeatPicker label="Player 2" rows={rows} selectedDeckId={deckIdB} onSelect={setDeckB} />
        </div>
      </div>
    </ScreenShell>
  );
}
