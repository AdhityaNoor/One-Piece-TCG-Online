import { useMemo } from 'react';
import type { CpuDifficulty } from '../../ai';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { Button, CanvasMenuButton, DeckListSummary, GameCanvasScreen, OpSelect } from '../components';
import { PLAYER_A_ID, PLAYER_B_ID } from '../store/matchStore';
import { useNavigationStore } from '../store/navigationStore';
import { useMatchSetupStore } from '../store/matchSetupStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

const DIFFICULTIES: { id: CpuDifficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'Simpler heuristics, occasional suboptimal picks.' },
  { id: 'normal', label: 'Normal', hint: 'Full heuristic evaluation.' },
  { id: 'hard', label: 'Hard', hint: 'Always picks the top-ranked action.' },
];

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

export function CpuDeckSelectScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);

  const deckIdA = useMatchSetupStore((state) => state.deckIdA);
  const deckIdB = useMatchSetupStore((state) => state.deckIdB);
  const setDeckA = useMatchSetupStore((state) => state.setDeckA);
  const setDeckB = useMatchSetupStore((state) => state.setDeckB);
  const swapSides = useMatchSetupStore((state) => state.swapSides);
  const cpuDifficulty = useMatchSetupStore((state) => state.cpuDifficulty);
  const setCpuDifficulty = useMatchSetupStore((state) => state.setCpuDifficulty);

  const rows = useMemo(() => entries.map((entry) => ({ entry, deck: load(entry.deckId) })), [entries, load]);
  const ready = deckIdA !== null && deckIdB !== null;

  return (
    <GameCanvasScreen kicker="Play" status="VS CPU setup" headerTitle="VS CPU" onBack={goBack} dense>
      <div className="flex h-full min-h-0 flex-col justify-center gap-3 overflow-y-auto px-3 py-2 sm:gap-5 sm:px-0">
        <section className="border border-gold/30 bg-black/45 p-4 text-center shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">vs CPU</p>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-slate-200/72 sm:text-sm sm:leading-6">Pick your deck, pick the CPU deck, then start the match through the same engine dispatch path.</p>

          <div className="mt-4 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-5">
            <DeckSelectSeat label="Your Deck" rows={rows} selectedDeckId={deckIdA} onSelect={setDeckA} />
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
              <Button variant="ghost" size="sm" disabled={!deckIdA} onClick={() => deckIdA && setDeckB(deckIdA)} className="min-w-40">
                Mirror Deck
              </Button>
            </div>
            <DeckSelectSeat label="CPU Deck" rows={rows} selectedDeckId={deckIdB} onSelect={setDeckB} />
          </div>

          <div className="mx-auto mt-4 max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Difficulty</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setCpuDifficulty(d.id)}
                  className={`min-h-12 border px-2 py-2 text-center transition sm:px-3 ${cpuDifficulty === d.id ? 'border-gold bg-gold/15 text-white' : 'border-white/15 bg-black/20 text-slate-200/80 hover:border-white/30'}`}
                >
                  <span className="text-xs font-bold sm:text-sm">{d.label}</span>
                  <span className="mt-0.5 hidden text-xs text-white/55 sm:block">{d.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-4 flex max-w-sm flex-col items-stretch gap-2">
            <CanvasMenuButton
              label="Start Match"
              prominence="primary"
              disabled={!ready}
              expandOnHover={false}
              className="h-11 max-w-none sm:h-14"
              onClick={() => {
                if (!deckIdA || !deckIdB) return;
                navigateTo({
                  screen: 'match',
                  deckIdA,
                  deckIdB,
                  presentation: {
                    mode: 'cpu',
                    localPlayerId: PLAYER_A_ID,
                    cpuPlayerIds: [PLAYER_B_ID],
                    difficulty: cpuDifficulty,
                    playerNames: { [PLAYER_A_ID]: 'You', [PLAYER_B_ID]: 'CPU' },
                  },
                });
              }}
            />
          </div>
        </section>
      </div>
    </GameCanvasScreen>
  );
}
