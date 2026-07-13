/**
 * Online lobby: pick one saved deck, then host or join through the live
 * Colyseus backend. There is intentionally no seeded/local room fallback here;
 * VS Self and VS CPU cover local play from the Play menu.
 */
import { useEffect, useMemo } from 'react';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { CanvasMenuButton, DeckListSummary, GameCanvasScreen, OpSelect } from '../components';
import { useCasualStore } from '../store/casualStore';
import { useCurrentScreen, useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';
import { OnlineMatchPanel } from './online/OnlineMatchPanel';

export function CasualLobbyScreen() {
  const current = useCurrentScreen();
  const goBack = useNavigationStore((state) => state.goBack);
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);
  const selectedDeckId = useCasualStore((state) => state.selectedDeckId);
  const selectDeck = useCasualStore((state) => state.selectDeck);
  const backendConfigured = isBackendConfigured();

  const regulation = current.screen === 'casual-lobby' ? (current.regulation ?? 'casualStandard') : 'casualStandard';
  const rows = useMemo(() => {
    const loadedRows = entries.map((entry) => ({ entry, deck: load(entry.deckId) }));
    return loadedRows.filter(({ deck }) => {
      if (!deck.ok) return false;
      const status = evaluateSavedDeckFormatStatus(deck.deck).status;
      if (regulation === 'casualStandard' || regulation === 'rankedStandard') return status === 'legal';
      return status === 'legal' || status === 'extraLegal';
    });
  }, [entries, load, regulation]);
  const selectedDeck = selectedDeckId ? load(selectedDeckId) : null;
  const selectedDeckAllowed = selectedDeck?.ok
    ? rows.some(({ entry }) => entry.deckId === selectedDeckId)
    : selectedDeckId === null;

  useEffect(() => {
    if (!selectedDeckAllowed) selectDeck(null);
  }, [selectDeck, selectedDeckAllowed]);

  return (
    <GameCanvasScreen onBack={goBack} dense>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-3 py-2 sm:gap-4 sm:px-0">
        <OnlineDeckRow rows={rows} selectedDeckId={selectedDeckAllowed ? selectedDeckId : null} onSelect={selectDeck} regulation={regulation} />
        <section className="min-h-[22rem] flex-1 overflow-y-auto border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.92))] p-3 shadow-[0_14px_0_rgba(1,5,16,0.5),_0_24px_38px_rgba(0,0,0,0.28)] sm:p-4">
          {backendConfigured ? <OnlineMatchPanel selectedDeck={selectedDeckAllowed ? selectedDeck : null} /> : <OnlineUnavailablePanel />}
        </section>
      </div>
    </GameCanvasScreen>
  );
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

function OnlineDeckRow({
  rows,
  selectedDeckId,
  onSelect,
  regulation,
}: {
  rows: { entry: DeckStoreListEntry; deck: DeckLoadResult }[];
  selectedDeckId: string | null;
  onSelect: (deckId: string | null) => void;
  regulation: 'casualStandard' | 'casualExtra' | 'rankedStandard';
}) {
  const selectedRow = rows.find(({ entry }) => entry.deckId === selectedDeckId) ?? null;

  return (
    <section className="border border-gold/30 bg-black/45 p-4 text-center shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Your Online Deck</p>
      <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-slate-200/72 sm:text-sm sm:leading-6">
        {regulation === 'casualExtra'
          ? 'Choose a Legal or Extra Legal saved deck before creating or joining a casual room.'
          : regulation === 'rankedStandard'
            ? 'Choose a Legal saved deck before creating or joining a ranked room.'
            : 'Choose a Legal saved deck before creating or joining a casual room.'}
      </p>

      <div className="mx-auto mt-4 grid max-w-5xl items-start gap-3 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.25fr)] lg:gap-5">
        <div className="min-w-0 border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.92))] p-3 text-left shadow-[0_10px_0_rgba(1,5,16,0.45)] sm:p-4">
          <label className="text-[11px] font-black uppercase tracking-[0.18em] text-gold sm:text-xs">Choose Deck</label>
          <OpSelect
            value={selectedDeckId ?? ''}
            disabled={rows.length === 0}
            leadingOptions={[{ value: '', label: rows.length === 0 ? 'No eligible decks' : 'Choose deck' }]}
            options={rows.map(({ entry, deck }) => ({
              value: entry.deckId,
              label: deck.ok ? `${deck.deck.name} - ${deck.deck.leader.definition.name}` : `${entry.name} - load error`,
            }))}
            onChange={(value) => onSelect(value.length > 0 ? value : null)}
            buttonClassName="min-h-12 text-base"
            listClassName="max-h-80"
          />
        </div>

        <div className="min-h-[5.75rem] text-left">
          {selectedRow ? (
            <DeckListSummary {...deckSummaryProps(selectedRow.entry, selectedRow.deck)} selected />
          ) : (
            <div className="flex h-full min-h-[5.75rem] items-center justify-center border border-dashed border-white/15 bg-black/20 px-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-white/45">
              Choose deck
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function OnlineUnavailablePanel() {
  return (
    <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-4 text-center">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gold">Backend missing</p>
        <h2 className="mt-2 font-display text-xl font-black uppercase tracking-[0.12em] text-white">Online is not configured</h2>
      </div>
      <p className="max-w-lg text-sm leading-6 text-slate-200/70">
        Set <code>VITE_API_BASE_URL</code> and <code>VITE_COLYSEUS_URL</code> for this frontend build, then redeploy.
        Local play is still available from VS Self and VS CPU.
      </p>
      <CanvasMenuButton label="Backend Required" size="sm" disabled onClick={() => undefined} />
    </div>
  );
}
