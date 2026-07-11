/**
 * Online lobby: pick one saved deck, then host or join through the live
 * Colyseus backend. There is intentionally no seeded/local room fallback here;
 * VS Self and VS CPU cover local play from the Play menu.
 */
import { useMemo } from 'react';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { CanvasMenuButton, DeckListSummary, GameCanvasScreen } from '../components';
import { useCasualStore } from '../store/casualStore';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';
import { OnlineMatchPanel } from './online/OnlineMatchPanel';

export function CasualLobbyScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);
  const selectedDeckId = useCasualStore((state) => state.selectedDeckId);
  const selectDeck = useCasualStore((state) => state.selectDeck);
  const backendConfigured = isBackendConfigured();

  const rows = useMemo(() => entries.map((entry) => ({ entry, deck: load(entry.deckId) })), [entries, load]);
  const selectedDeck = selectedDeckId ? load(selectedDeckId) : null;

  return (
    <GameCanvasScreen kicker="Online" status="Live multiplayer" headerTitle="Online Match" onBack={goBack} dense>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto sm:gap-4 xl:grid xl:grid-cols-[22rem_minmax(0,1fr)] xl:overflow-hidden">
        <DeckColumn rows={rows} selectedDeckId={selectedDeckId} onSelect={selectDeck} />
        <section className="min-h-[16rem] flex-shrink-0 overflow-y-auto border border-white/10 bg-[#08101f] p-3 sm:min-h-0 sm:border-2 sm:border-cyan-200/20 sm:bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] sm:p-4 sm:shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] xl:flex-shrink xl:pr-4">
          {backendConfigured ? <OnlineMatchPanel selectedDeck={selectedDeck} /> : <OnlineUnavailablePanel />}
        </section>
      </div>
    </GameCanvasScreen>
  );
}

function DeckColumn({
  rows,
  selectedDeckId,
  onSelect,
}: {
  rows: { entry: DeckStoreListEntry; deck: DeckLoadResult }[];
  selectedDeckId: string | null;
  onSelect: (deckId: string) => void;
}) {
  return (
    <section className="flex min-h-[14rem] flex-shrink-0 flex-col border border-gold/25 bg-black/45 p-3 backdrop-blur-sm sm:min-h-0 sm:border-2 sm:border-gold/35 sm:bg-black/26 sm:p-4 sm:shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Your Deck</p>
      <p className="mt-2 text-xs leading-5 text-slate-200/72 sm:text-sm sm:leading-6">Pick the deck you will bring to the online room.</p>
      <div className="mt-3 flex min-h-0 flex-col gap-2 overflow-y-auto pr-0 sm:mt-4 sm:pr-1">
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
