import { useMemo } from 'react';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { CanvasMenuButton, DeckListSummary, GameCanvasScreen, OpSelect } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useIsMatchSetupReady, useMatchSetupStore } from '../store/matchSetupStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

interface DeckSelectSeatProps {
  label: string;
  rows: { entry: DeckStoreListEntry; deck: DeckLoadResult }[];
  selectedDeckId: string | null;
  onSelect: (deckId: string | null) => void;
}

function deckSummaryProps(entry: DeckStoreListEntry, deck: DeckLoadResult) {
  if (!deck.ok) return { name: entry.name, updatedAt: entry.updatedAt };

  return {
    name: deck.deck.name,
    updatedAt: deck.deck.updatedAt,
    leaderName: deck.deck.leader.definition.name,
    leaderImageUrl: deck.deck.leader.imageUrl,
    colors: deck.deck.leader.definition.colors,
    cardCount: deck.deck.cards.reduce((sum, card) => sum + card.quantity, 0),
    formatStatus: evaluateSavedDeckFormatStatus(deck.deck).status,
  };
}

function DeckSelectSeat({ label, rows, selectedDeckId, onSelect }: DeckSelectSeatProps) {
  const selectedRow = rows.find(({ entry }) => entry.deckId === selectedDeckId) ?? null;

  return (
    <section className="min-w-0 border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.92))] p-3 shadow-[0_14px_0_rgba(1,5,16,0.5),_0_24px_38px_rgba(0,0,0,0.28)] sm:p-4">
      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-gold sm:text-xs">{label}</label>
      <OpSelect
        value={selectedDeckId ?? ''}
        disabled={rows.length === 0}
        leadingOptions={[{ value: '', label: rows.length === 0 ? 'No saved decks' : 'Choose deck' }]}
        options={rows.map(({ entry, deck }) => ({
          value: entry.deckId,
          label: deck.ok ? `${deck.deck.name} - ${deck.deck.leader.definition.name}` : `${entry.name} - load error`,
        }))}
        onChange={(value) => onSelect(value.length > 0 ? value : null)}
        buttonClassName="min-h-12 text-base"
        listClassName="max-h-80"
      />

      <div className="mt-3 min-h-[5.75rem]">
        {selectedRow ? (
          <DeckListSummary {...deckSummaryProps(selectedRow.entry, selectedRow.deck)} selected />
        ) : (
          <div className="flex h-full min-h-[5.75rem] items-center justify-center border border-dashed border-white/15 bg-black/20 px-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-white/45">
            Choose deck
          </div>
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
    <GameCanvasScreen onBack={goBack} dense>
      <div className="flex h-full min-h-0 flex-col justify-center gap-3 overflow-y-auto px-3 py-2 sm:gap-5 sm:px-0">
        <section className="border border-gold/30 bg-black/45 p-4 text-center shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">vs Self - Local Hotseat</p>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-slate-200/72 sm:text-sm sm:leading-6">Pick both seats from saved decks, then start the local hotseat match.</p>

          <div className="mt-4 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-5">
            <DeckSelectSeat label="Player 1" rows={rows} selectedDeckId={deckIdA} onSelect={setDeckA} />
            <div className="flex flex-col items-center justify-center gap-2 self-stretch py-1">
              <div className="font-display text-6xl font-black uppercase leading-none tracking-[0.08em] text-white drop-shadow-[0_7px_0_rgba(0,0,0,0.7)] sm:text-7xl lg:text-8xl">
                VS
              </div>
              <button
                type="button"
                aria-label="Swap sides"
                title="Swap sides"
                disabled={!deckIdA && !deckIdB}
                onClick={swapSides}
                className="flex h-12 w-12 items-center justify-center border border-white/25 bg-transparent p-2 transition hover:border-gold/65 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:w-14"
              >
                <img src="/ui/swap.png" alt="" className="h-full w-full object-contain" />
              </button>
            </div>
            <DeckSelectSeat label="Player 2" rows={rows} selectedDeckId={deckIdB} onSelect={setDeckB} />
          </div>

          <div className="mx-auto mt-4 flex max-w-sm flex-col items-stretch gap-2">
            <CanvasMenuButton
              label="Start Match"
              prominence="primary"
              disabled={!isReady}
              expandOnHover={false}
              className="h-11 max-w-none sm:h-14"
              onClick={() => {
                if (deckIdA && deckIdB) navigateTo({ screen: 'match', deckIdA, deckIdB });
              }}
            />
          </div>
        </section>
      </div>
    </GameCanvasScreen>
  );
}
