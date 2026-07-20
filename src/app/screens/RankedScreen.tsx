import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { CanvasMenuButton, DeckListSummary, GameCanvasScreen, OpSelect } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useOnlineStore } from '../store/onlineStore';
import type { RankedQueueAction } from '../store/rankedStore';
import { useRankedStore } from '../store/rankedStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

export function RankedScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);
  const ranked = useRankedStore();
  const joinAssignedRoom = useOnlineStore((state) => state.joinById);
  const connectionStatus = useOnlineStore((state) => state.status);
  const backendConfigured = isBackendConfigured();
  const [entering, setEntering] = useState(false);
  const [showMatchToast, setShowMatchToast] = useState(false);
  const previousQueueState = useRef<string | undefined>(ranked.queue?.state);

  useEffect(() => {
    if (backendConfigured) void ranked.refresh();
  }, [backendConfigured]);

  useEffect(() => {
    if (!backendConfigured) return undefined;
    if (ranked.queue?.state !== 'queued') return undefined;
    const id = window.setInterval(() => void ranked.refreshQueue(), 2500);
    return () => window.clearInterval(id);
  }, [backendConfigured, ranked.queue?.state, ranked.refreshQueue]);

  // Fire a "match found" notification the moment the queue transitions into
  // 'matched', regardless of what triggered the poll. Dismissed automatically
  // once the player enters the match or leaves/loses the matched state.
  useEffect(() => {
    const current = ranked.queue?.state;
    if (current === 'matched' && previousQueueState.current !== 'matched') {
      setShowMatchToast(true);
    }
    if (current !== 'matched') {
      setShowMatchToast(false);
    }
    previousQueueState.current = current;
  }, [ranked.queue?.state]);

  const rows = useMemo(() => {
    return entries
      .map((entry) => ({ entry, deck: load(entry.deckId) }))
      .filter(({ deck }) => deck.ok && evaluateSavedDeckFormatStatus(deck.deck).status === 'legal');
  }, [entries, load]);
  const selectedDeck = ranked.selectedDeckId ? load(ranked.selectedDeckId) : null;
  const selectedDeckAllowed = selectedDeck?.ok ? rows.some(({ entry }) => entry.deckId === ranked.selectedDeckId) : ranked.selectedDeckId === null;
  const activeDeck = selectedDeckAllowed ? selectedDeck : null;

  const canQueue = Boolean(
    backendConfigured &&
      ranked.enabled &&
      activeDeck?.ok &&
      ranked.queueAction === 'idle' &&
      ranked.queue?.state !== 'queued' &&
      ranked.queue?.state !== 'matched',
  );
  const canEnterMatch = Boolean(
    !entering && connectionStatus !== 'connecting' && activeDeck?.ok && ranked.queue?.state === 'matched' && ranked.queue.roomId,
  );

  async function enterMatch(): Promise<void> {
    // Guard against double-clicking "Enter Match" firing a second concurrent
    // joinById call while the first connection attempt is still in flight.
    if (entering || !activeDeck?.ok || !ranked.queue?.roomId) return;
    setEntering(true);
    setShowMatchToast(false);
    try {
      await joinAssignedRoom(ranked.queue.roomId, activeDeck.deck);
    } finally {
      setEntering(false);
    }
  }

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
            queueState={ranked.queue?.state ?? 'idle'}
            queueAction={ranked.queueAction}
            entering={entering}
            message={ranked.queue?.estimatedMessage ?? 'Choose a legal deck to set sail.'}
            error={ranked.error}
            canQueue={canQueue}
            canEnterMatch={canEnterMatch}
            opponentName={ranked.queue?.opponentName ?? null}
            onJoin={() => activeDeck?.ok && void ranked.joinQueue(activeDeck.deck)}
            onLeave={() => void ranked.leaveQueue()}
            onEnter={() => void enterMatch()}
          />
          {showMatchToast && (
            <MatchFoundToast opponentName={ranked.queue?.opponentName ?? null} onEnter={() => void enterMatch()} entering={entering} />
          )}
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
  queueState,
  queueAction,
  entering,
  message,
  error,
  canQueue,
  canEnterMatch,
  opponentName,
  onJoin,
  onLeave,
  onEnter,
}: {
  backendConfigured: boolean;
  enabled: boolean;
  queueState: string;
  queueAction: RankedQueueAction;
  entering: boolean;
  message: string;
  error: string | null;
  canQueue: boolean;
  canEnterMatch: boolean;
  opponentName: string | null;
  onJoin: () => void;
  onLeave: () => void;
  onEnter: () => void;
}) {
  const blocked = !backendConfigured || !enabled;
  const searching = queueState === 'queued' || queueAction === 'joining';
  return (
    <div className="mt-4 border border-cyan-200/20 bg-[#08101f] p-4 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Set Sail</p>
      <p className="mt-2 flex items-center justify-center gap-2 text-sm leading-6 text-slate-200/72">
        {searching && <QueueSpinner />}
        {!backendConfigured
          ? 'Online backend is not configured for this build.'
          : !enabled
            ? 'Ranked mode is disabled on this backend.'
            : queueAction === 'joining'
              ? 'Finding a match...'
              : queueAction === 'leaving'
                ? 'Leaving queue...'
                : message}
      </p>
      {opponentName && <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-white/55">Opponent: {opponentName}</p>}
      {error && <p className="mt-3 text-xs font-bold text-red-200">{error}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {queueState === 'queued' ? (
          <CanvasMenuButton
            label={queueAction === 'leaving' ? 'Leaving...' : 'Leave Queue'}
            size="sm"
            prominence="danger"
            disabled={queueAction === 'leaving'}
            onClick={onLeave}
          />
        ) : canEnterMatch || queueState === 'matched' ? (
          <CanvasMenuButton
            label={entering ? 'Entering...' : 'Enter Match'}
            size="sm"
            prominence="primary"
            disabled={!canEnterMatch}
            onClick={onEnter}
          />
        ) : (
          <CanvasMenuButton
            label={blocked ? 'Unavailable' : queueAction === 'joining' ? 'Finding a match...' : 'Set Sail'}
            size="sm"
            prominence="primary"
            disabled={!canQueue}
            onClick={onJoin}
          />
        )}
      </div>
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

function MatchFoundToast({
  opponentName,
  onEnter,
  entering,
}: {
  opponentName: string | null;
  onEnter: () => void;
  entering: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className="mt-4 flex items-center justify-between gap-3 border border-gold/60 bg-[linear-gradient(180deg,_rgba(58,38,4,0.92),_rgba(10,7,1,0.96))] px-4 py-3 shadow-[0_0_0_1px_rgba(212,175,55,0.25),_0_10px_30px_rgba(0,0,0,0.45)] animate-[pulse_1.8s_ease-in-out_infinite]"
    >
      <div className="text-left">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Match Found</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-white/80">
          {opponentName ? `Opponent: ${opponentName}` : 'An opponent is ready.'}
        </p>
      </div>
      <CanvasMenuButton label={entering ? 'Entering...' : 'Enter Match'} size="sm" prominence="primary" disabled={entering} onClick={onEnter} />
    </div>
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

