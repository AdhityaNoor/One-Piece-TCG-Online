/**
 * Casual lobby: pick your deck (left) and a room from the list (right), then
 * join into a Casual match. This is the online-shaped entry point — every
 * room action already goes through the async RoomService (casualStore), so
 * the only thing that changes when a real backend lands is which service the
 * store builds.
 *
 * Local player convention: the client always occupies seat A (PLAYER_A_ID),
 * i.e. the bottom of the board, and the joined room's host occupies seat B.
 * The chosen usernames are handed to the Match screen as a
 * CasualMatchPresentation so the board stays pinned to the local seat and
 * logs/labels read names instead of p1/p2.
 */
import { useEffect, useMemo } from 'react';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import type { Room } from '../../multiplayer/rooms';
import { CanvasMenuButton, DeckListSummary, GameCanvasScreen } from '../components';
import { useCasualStore } from '../store/casualStore';
import { PLAYER_A_ID, PLAYER_B_ID } from '../store/matchStore';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';
import { useSettingsStore } from '../store/settingsStore';
import { OnlineMatchPanel } from './online/OnlineMatchPanel';

export function CasualLobbyScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  const username = useSettingsStore((state) => state.username);

  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);
  const online = isBackendConfigured();

  const rooms = useCasualStore((state) => state.rooms);
  const loadingRooms = useCasualStore((state) => state.loadingRooms);
  const busy = useCasualStore((state) => state.busy);
  const error = useCasualStore((state) => state.error);
  const selectedDeckId = useCasualStore((state) => state.selectedDeckId);
  const selectDeck = useCasualStore((state) => state.selectDeck);
  const refreshRooms = useCasualStore((state) => state.refreshRooms);
  const join = useCasualStore((state) => state.join);

  // Load the room list once on entry.
  useEffect(() => {
    if (!online) void refreshRooms();
  }, [online, refreshRooms]);

  const rows = useMemo(() => entries.map((entry) => ({ entry, deck: load(entry.deckId) })), [entries, load]);

  async function handleJoin(room: Room): Promise<void> {
    const ticket = await join(room, username);
    if (!ticket) return;
    navigateTo({
      screen: 'match',
      deckIdA: ticket.localDeckId,
      deckIdB: ticket.opponentDeckId,
      presentation: {
        mode: 'casual',
        localPlayerId: PLAYER_A_ID,
        playerNames: {
          [PLAYER_A_ID]: ticket.localName,
          [PLAYER_B_ID]: ticket.opponentName,
        },
      },
    });
  }

  return (
    <GameCanvasScreen kicker="Casual" status={`Playing as ${username}`} headerTitle="Lobby" onBack={goBack} dense>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto sm:gap-4 xl:grid xl:grid-cols-[22rem_minmax(0,1fr)] xl:overflow-hidden">
        <DeckColumn rows={rows} selectedDeckId={selectedDeckId} onSelect={selectDeck} />
        {online ? (
          <div className="min-h-[16rem] flex-shrink-0 overflow-y-auto pr-0 sm:pr-1 xl:flex-shrink">
            <OnlineMatchPanel selectedDeck={selectedDeckId ? load(selectedDeckId) : null} />
          </div>
        ) : (
          <RoomColumn
            rooms={rooms}
            loading={loadingRooms}
            busy={busy}
            error={error}
            canJoin={selectedDeckId !== null}
            onRefresh={() => void refreshRooms()}
            onJoin={(room) => void handleJoin(room)}
          />
        )}
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
      <p className="mt-2 text-xs leading-5 text-slate-200/72 sm:text-sm sm:leading-6">Pick the deck you'll bring, then join an open room.</p>
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

function RoomColumn({
  rooms,
  loading,
  busy,
  error,
  canJoin,
  onRefresh,
  onJoin,
}: {
  rooms: Room[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  canJoin: boolean;
  onRefresh: () => void;
  onJoin: (room: Room) => void;
}) {
  return (
    <section className="flex min-h-[16rem] flex-shrink-0 flex-col border border-white/10 bg-[#08101f] p-3 sm:min-h-0 sm:border-2 sm:border-cyan-200/20 sm:bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] sm:p-4 sm:shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] xl:flex-shrink">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gold">Open Rooms</h2>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
            {loading ? 'Searching…' : `${rooms.length} room${rooms.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <CanvasMenuButton label={loading ? 'Refreshing…' : 'Refresh'} size="sm" disabled={loading} onClick={onRefresh} />
      </div>

      {error && (
        <p className="mt-3 border border-red-400/20 bg-red-500/10 p-2 text-xs text-red-100">{error}</p>
      )}
      {!canJoin && (
        <p className="mt-3 border border-gold/20 bg-gold/5 p-2 text-xs text-amber-100/80">Choose your deck on the left to enable joining.</p>
      )}

      <div className="mt-3 flex min-h-0 flex-col gap-2 overflow-y-auto pr-0 sm:pr-1">
        {rooms.length === 0 && !loading ? (
          <p className="border border-dashed border-white/10 px-3 py-8 text-center text-sm text-white/40">
            No open rooms right now. Hit Refresh to look again.
          </p>
        ) : (
          rooms.map((room) => (
            <DeckListSummary
              key={room.roomId}
              name={room.hostName}
              updatedAt={new Date(room.createdAt).toISOString()}
              leaderName={room.leader.name}
              leaderImageUrl={room.leader.imageUrl}
              colors={room.leader.colors}
              actions={
                <CanvasMenuButton
                  label={room.status === 'open' ? 'Join' : 'In Match'}
                  prominence="primary"
                  size="sm"
                  disabled={!canJoin || busy || room.status !== 'open'}
                  expandOnHover={false}
                  className="h-10 w-[6rem] max-w-none px-2 text-[11px] sm:h-11"
                  onClick={() => onJoin(room)}
                />
              }
            />
          ))
        )}
      </div>
    </section>
  );
}
