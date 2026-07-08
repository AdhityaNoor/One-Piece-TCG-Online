import { useMemo } from 'react';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { CanvasMenuButton, DeckListSummary, GameCanvasScreen } from '../components';
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
    <section className="flex min-h-0 flex-col border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] p-4 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gold">{label}</h2>
      <div className="mt-3 flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <p className="border border-white/10 bg-black/24 p-3 text-sm text-slate-200/60">No saved decks yet.</p>
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
                formatStatus={evaluateSavedDeckFormatStatus(deck.deck).status}
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
    <GameCanvasScreen kicker="Play" status="Match setup" title="Choose Decks" onBack={goBack}>
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col justify-center border-2 border-gold/35 bg-black/26 p-4 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">vs Self · Local Hotseat</p>
          <p className="mt-2 text-sm leading-6 text-slate-200/72">Assign one saved deck to each seat. Mirror matches are allowed for testing.</p>

          <div className="mt-5 flex flex-col items-center gap-3">
            <CanvasMenuButton label="Swap Sides" size="sm" disabled={!deckIdA && !deckIdB} onClick={swapSides} />
            <CanvasMenuButton
              label="Start Match"
              prominence="primary"
              disabled={!isReady}
              onClick={() => {
                if (deckIdA && deckIdB) navigateTo({ screen: 'match', deckIdA, deckIdB });
              }}
            />
          </div>
        </section>

        <div className="grid min-h-0 gap-4 lg:grid-cols-2 xl:grid-cols-1">
          <SeatPicker label="Player 1" rows={rows} selectedDeckId={deckIdA} onSelect={setDeckA} />
          <SeatPicker label="Player 2" rows={rows} selectedDeckId={deckIdB} onSelect={setDeckB} />
        </div>
      </div>
    </GameCanvasScreen>
  );
}
