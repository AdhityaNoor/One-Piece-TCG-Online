import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { CanvasMenuButton, DeckListSummary, GameCanvasScreen, OpSelect } from '../components';
import { useLastUsedDeckStore } from '../store/lastUsedDeckStore';
import { useNavigationStore } from '../store/navigationStore';
import { useOnlineStore } from '../store/onlineStore';
import { useRankedStore } from '../store/rankedStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

/** Drives the single inline status box: idle deck-pick state, the queue
 *  spinner, or the "match found, entering" hand-off — see QueuePanel. */
type QueuePhase = 'idle' | 'searching' | 'entering';

export function RankedScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);
  const ranked = useRankedStore();
  const joinAssignedRoom = useOnlineStore((state) => state.joinById);
  const lastUsedDeckId = useLastUsedDeckStore((state) => state.lastUsedDeckId);
  const setLastUsedDeckId = useLastUsedDeckStore((state) => state.setLastUsedDeckId);
  const backendConfigured = isBackendConfigured();
  const [entering, setEntering] = useState(false);
  const autoEnteredMatchId = useRef<string | null>(null);

  useEffect(() => {
    if (backendConfigured) void ranked.refresh();
  }, [backendConfigured]);

  useEffect(() => {
    if (!backendConfigured) return undefined;
    if (ranked.queue?.state !== 'queued') return undefined;
    const id = window.setInterval(() => void ranked.refreshQueue(), 2500);
    return () => window.clearInterval(id);
  }, [backendConfigured, ranked.queue?.state, ranked.refreshQueue]);

  const rows = useMemo(() => {
    return entries
      .map((entry) => ({ entry, deck: load(entry.deckId) }))
      .filter(({ deck }) => deck.ok && evaluateSavedDeckFormatStatus(deck.deck).status === 'legal');
  }, [entries, load]);

  // Default to the last deck actually played, the first time this screen sees
  // a deck list and nothing is selected yet — never overrides an explicit pick.
  useEffect(() => {
    if (ranked.selectedDeckId !== null || !lastUsedDeckId) return;
    if (rows.some(({ entry }) => entry.deckId === lastUsedDeckId)) ranked.selectDeck(lastUsedDeckId);
  }, [rows, lastUsedDeckId, ranked.selectedDeckId, ranked.selectDeck]);

  const selectedDeck = ranked.selectedDeckId ? load(ranked.selectedDeckId) : null;
  const selectedDeckAllowed = selectedDeck?.ok ? rows.some(({ entry }) => entry.deckId === ranked.selectedDeckId) : ranked.selectedDeckId === null;
  const activeDeck = selectedDeckAllowed ? selectedDeck : null;

  const canQueue = Boolean(
    backendConfigured &&
      ranked.enabled &&
      activeDeck?.ok &&
      ranked.queueAction === 'idle' &&
      (ranked.queue?.state ?? 'idle') === 'idle',
  );
  const searching = ranked.queueAction === 'joining' || ranked.queue?.state === 'queued';
  const matchFound = ranked.queue?.state === 'matched';
  const phase: QueuePhase = matchFound || entering ? 'entering' : searching ? 'searching' : 'idle';

  // Step 3 -> 4 of the flow: the instant the queue reports a match, enter the
  // assigned room automatically — no separate "Enter Match" click. Guarded by
  // matchId so it fires exactly once per match even as refreshQueue() keeps
  // polling and re-delivering the same 'matched' status.
  useEffect(() => {
    const queue = ranked.queue;
    if (!queue || queue.state !== 'matched' || !queue.roomId) return;
    const matchId = queue.matchId ?? queue.roomId;
    if (autoEnteredMatchId.current === matchId) return;
    if (!activeDeck?.ok) return;
    autoEnteredMatchId.current = matchId;
    setEntering(true);
    setLastUsedDeckId(activeDeck.deck.deckId);
    void joinAssignedRoom(queue.roomId, activeDeck.deck).finally(() => setEntering(false));
  }, [ranked.queue, activeDeck, joinAssignedRoom, setLastUsedDeckId]);

  return (
    <GameCanvasScreen onBack={goBack} dense>
      <div className="grid h-full min-h-0 gap-4 overflow-y-auto px-3 py-2 lg:grid-cols-[minmax(18rem,0.95fr)_minmax(0,1.35fr)] lg:overflow-hidden">
        <section className="min-h-0 border border-gold/30 bg-black/45 p-4 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{ranked.season?.name ?? 'Voyage'}</p>
          <RankCard />
          <DeckPicker rows={rows} selectedDeckId={selectedDeckAllowed ? ranked.selectedDeckId : null} onSelect={ranked.selectDeck} />
          <QueuePanel
            backendConfigured={backendConfigured}
            enabled={ranked.enabled}
            phase={phase}
            cancelling={ranked.queueAction === 'leaving'}
            message={ranked.queue?.estimatedMessage ?? 'Choose a legal deck to find a match.'}
            error={ranked.error}
            canQueue={canQueue}
            opponentName={ranked.queue?.opponentName ?? null}
            onFindMatch={() => {
              if (!activeDeck?.ok) return;
              setLastUsedDeckId(activeDeck.deck.deckId);
              void ranked.joinQueue(activeDeck.deck);
            }}
            onCancel={() => void ranked.leaveQueue()}
          />
        </section>

        <section className="grid min-h-0 gap-4 lg:grid-rows-[minmax(12rem,0.9fr)_minmax(12rem,1fr)]">
          <LeaderboardPanel />
          <HistoryPanel />
        </section>
      </div>
    </GameCanvasScreen>
  );
}

function RankCard() {
  const profile = useRankedStore((state) => state.profile);
  if (!profile) {
    return (
      <div className="border border-cyan-200/20 bg-[#08101f] p-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Loading ranked profile</p>
      </div>
    );
  }
  return (
    <div className="border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.84),_rgba(3,9,24,0.94))] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Current Bounty</p>
      <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[0.1em] text-white">{profile.rankName}</h2>
      <p className="mt-1 text-sm font-bold uppercase tracking-[0.12em] text-cyan-100/70">
        {profile.inPlacement ? `${profile.placementMatchesCompleted} / ${profile.placementMatchesRequired} placements` : profile.division ? `Division ${profile.division}` : 'Elite rank'}
      </p>
      {!profile.inPlacement && (
        <div className="mt-4">
          <div className="h-3 border border-white/15 bg-black/40">
            <div className="h-full bg-gold" style={{ width: `${Math.max(0, Math.min(100, profile.rankedPoints))}%` }} />
          </div>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-white/55">{profile.rankedPoints} / 100 Bounty Points</p>
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold uppercase tracking-[0.1em] text-white/60">
        <span>{profile.wins} W</span>
        <span>{profile.losses} L</span>
        <span>{profile.winRate}%</span>
      </div>
    </div>
  );
}

function DeckPicker({
  rows,
  selectedDeckId,
  onSelect,
}: {
  rows: { entry: DeckStoreListEntry; deck: DeckLoadResult }[];
  selectedDeckId: string | null;
  onSelect: (deckId: string | null) => void;
}) {
  const selectedRow = rows.find(({ entry }) => entry.deckId === selectedDeckId) ?? null;
  return (
    <div className="mt-4">
      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-gold">Ranked Deck</label>
      <OpSelect
        value={selectedDeckId ?? ''}
        disabled={rows.length === 0}
        leadingOptions={[{ value: '', label: rows.length === 0 ? 'No Legal decks' : 'Choose deck' }]}
        options={rows.map(({ entry, deck }) => ({
          value: entry.deckId,
          label: deck.ok ? `${deck.deck.name} - ${deck.deck.leader.definition.name}` : `${entry.name} - load error`,
        }))}
        onChange={(value) => onSelect(value.length > 0 ? value : null)}
        buttonClassName="min-h-12 text-base"
        listClassName="max-h-72"
      />
      <div className="mt-3 min-h-[5.5rem]">
        {selectedRow ? (
          <DeckListSummary
            name={selectedRow.deck.ok ? selectedRow.deck.deck.name : selectedRow.entry.name}
            updatedAt={selectedRow.deck.ok ? selectedRow.deck.deck.updatedAt : selectedRow.entry.updatedAt}
            leaderName={selectedRow.deck.ok ? selectedRow.deck.deck.leader.definition.name : undefined}
            leaderImageUrl={selectedRow.deck.ok ? selectedRow.deck.deck.leader.imageUrl : undefined}
            colors={selectedRow.deck.ok ? selectedRow.deck.deck.leader.definition.colors : undefined}
            cardCount={selectedRow.deck.ok ? selectedRow.deck.deck.cards.reduce((sum, card) => sum + card.quantity, 0) : undefined}
            formatStatus={selectedRow.deck.ok ? evaluateSavedDeckFormatStatus(selectedRow.deck.deck).status : undefined}
            selected
          />
        ) : (
          <div className="flex h-full min-h-[5.5rem] items-center justify-center border border-dashed border-white/15 bg-black/20 text-xs font-bold uppercase tracking-[0.12em] text-white/45">
            Choose a Legal saved deck
          </div>
        )}
      </div>
    </div>
  );
}

function QueuePanel({
  backendConfigured,
  enabled,
  phase,
  cancelling,
  message,
  error,
  canQueue,
  opponentName,
  onFindMatch,
  onCancel,
}: {
  backendConfigured: boolean;
  enabled: boolean;
  phase: 'idle' | 'searching' | 'entering';
  cancelling: boolean;
  message: string;
  error: string | null;
  canQueue: boolean;
  opponentName: string | null;
  onFindMatch: () => void;
  onCancel: () => void;
}) {
  const blocked = !backendConfigured || !enabled;

  if (phase === 'idle') {
    return (
      <div className="mt-4 border border-cyan-200/20 bg-[#08101f] p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Ranked Match</p>
        <p className="mt-2 text-sm leading-6 text-slate-200/72">
          {!backendConfigured ? 'Online backend is not configured for this build.' : !enabled ? 'Ranked mode is disabled on this backend.' : message}
        </p>
        {error && <p className="mt-3 text-xs font-bold text-red-200">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <CanvasMenuButton label={blocked ? 'Unavailable' : 'Find Match'} size="sm" prominence="primary" disabled={!canQueue} onClick={onFindMatch} />
        </div>
      </div>
    );
  }

  // 'searching' and 'entering' both render the same inline status box — the
  // exact 3-step flow requested: Find Match -> "Queueing for a ranked
  // match..." spinner -> "Match found, entering the room..." with no manual
  // click in between.
  const searching = phase === 'searching';
  return (
    <div role="status" aria-live="polite" className="mt-4 border border-gold/50 bg-[#0c0f08] p-4 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{searching ? 'Queueing' : 'Match Found'}</p>
      <p className="mt-2 flex items-center justify-center gap-2 text-sm font-bold leading-6 text-slate-100">
        <QueueSpinner />
        {searching ? 'Queueing for a ranked match...' : 'Match found, entering the room...'}
      </p>
      {opponentName && !searching && (
        <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-white/55">Opponent: {opponentName}</p>
      )}
      {error && <p className="mt-3 text-xs font-bold text-red-200">{error}</p>}
      {searching && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <CanvasMenuButton label={cancelling ? 'Cancelling...' : 'Cancel'} size="sm" prominence="danger" disabled={cancelling} onClick={onCancel} />
        </div>
      )}
    </div>
  );
}

function QueueSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 flex-none animate-spin rounded-full border-2 border-white/25 border-t-gold"
    />
  );
}

function LeaderboardPanel() {
  const entries = useRankedStore((state) => state.leaderboard);
  return (
    <div className="min-h-0 overflow-hidden border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.84),_rgba(3,9,24,0.94))] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">World Rankings</p>
      <div className="mt-3 max-h-full overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-200/60">No ranked standings yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.playerId} className="grid grid-cols-[3rem_minmax(0,1fr)_5rem] gap-2 border border-white/10 bg-black/25 px-3 py-2 text-sm">
                <span className="font-black text-gold">#{entry.position}</span>
                <span className="truncate font-bold text-white">{entry.displayName}</span>
                <span className="text-right text-white/65">{entry.winRate}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPanel() {
  const history = useRankedStore((state) => state.history);
  return (
    <div className="min-h-0 overflow-hidden border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.84),_rgba(3,9,24,0.94))] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Voyage Log</p>
      <div className="mt-3 max-h-full overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-sm text-slate-200/60">No ranked matches recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.matchId} className="border border-white/10 bg-black/25 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-white">{entry.result === 'win' ? 'Victory' : entry.result === 'loss' ? 'Defeat' : 'Draw'}</span>
                  <span className={entry.rankedPointDelta >= 0 ? 'text-gold' : 'text-red-200'}>{entry.rankedPointDelta >= 0 ? '+' : ''}{entry.rankedPointDelta} BP</span>
                </div>
                <p className="mt-1 truncate text-xs text-white/55">vs {entry.opponentName}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

