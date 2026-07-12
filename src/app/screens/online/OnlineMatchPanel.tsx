/**
 * Online multiplayer control surface. The parent screen owns deck selection;
 * this panel owns room creation, room joining, ready state, and live-match
 * status from the Colyseus backend.
 */
import { useEffect, useState } from 'react';
import type { DeckLoadResult } from '../../../cards/decks';
import { Button, CanvasMenuButton } from '../../components';
import { useOnlineStore } from '../../store/onlineStore';

export function OnlineMatchPanel({ selectedDeck }: { selectedDeck: DeckLoadResult | null }) {
  const status = useOnlineStore((s) => s.status);
  const roomCode = useOnlineStore((s) => s.roomCode);
  const phase = useOnlineStore((s) => s.phase);
  const seats = useOnlineStore((s) => s.seats);
  const localSeatId = useOnlineStore((s) => s.localSeatId);
  const gameState = useOnlineStore((s) => s.gameState);
  const endResult = useOnlineStore((s) => s.endResult);
  const error = useOnlineStore((s) => s.error);
  const rooms = useOnlineStore((s) => s.rooms);
  const loadingRooms = useOnlineStore((s) => s.loadingRooms);
  const refreshRooms = useOnlineStore((s) => s.refreshRooms);
  const hostRoom = useOnlineStore((s) => s.hostRoom);
  const joinById = useOnlineStore((s) => s.joinById);
  const joinByCode = useOnlineStore((s) => s.joinByCode);
  const ready = useOnlineStore((s) => s.ready);
  const unready = useOnlineStore((s) => s.unready);
  const leave = useOnlineStore((s) => s.leave);

  const [joinCode, setJoinCode] = useState('');

  const deckReady = selectedDeck?.ok ? selectedDeck.deck : null;
  const connected = status === 'connected' || status === 'connecting';
  const localSeat = seats.find((seat) => seat.seatId === localSeatId);

  useEffect(() => {
    if (status === 'idle') void refreshRooms();
  }, [status, refreshRooms]);

  return (
    <section className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gold">Online Match</h2>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
            <StatusDot status={status} /> {connectionLabel(status, phase)}
          </p>
        </div>
        <div className="flex gap-2">
          {!connected && (
            <CanvasMenuButton
              label={loadingRooms ? 'Refreshing...' : 'Refresh'}
              size="sm"
              disabled={loadingRooms}
              onClick={() => void refreshRooms()}
            />
          )}
          {connected && (
            <Button variant="danger" size="sm" onClick={() => leave()}>
              Leave
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 border border-red-400/25 bg-red-500/10 p-2 text-xs text-red-100">{error}</p>}
      {!deckReady && !connected && (
        <p className="mt-3 border border-gold/20 bg-gold/5 p-2 text-xs text-amber-100/80">
          Pick your deck above to host or join.
        </p>
      )}

      {!connected ? (
        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col gap-3 border border-white/10 bg-black/20 p-3 sm:p-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gold">Start Room</p>
              <p className="mt-1 text-xs leading-5 text-white/50">Host a new table, or enter a room code from another player.</p>
            </div>

            <Button variant="primary" size="sm" disabled={!deckReady} onClick={() => deckReady && void hostRoom(deckReady)}>
              Create room
            </Button>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Room code</span>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  placeholder="ABC123"
                  className="h-10 w-full border border-white/25 bg-black/30 px-3 text-sm tracking-[0.2em] text-white outline-none focus:border-gold/70"
                />
              </label>
              <Button
                variant="secondary"
                size="sm"
                disabled={!deckReady || joinCode.trim().length < 4}
                onClick={() => deckReady && void joinByCode(joinCode, deckReady)}
              >
                Join
              </Button>
            </div>
          </div>

          <div className="min-h-0 border border-white/10 bg-black/20 p-3 sm:p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
              {loadingRooms ? 'Searching...' : `${rooms.length} open room${rooms.length === 1 ? '' : 's'}`}
            </p>
            <div className="mt-2 flex max-h-[min(36vh,22rem)] flex-col gap-2 overflow-y-auto pr-1">
              {rooms.length === 0 && !loadingRooms ? (
                <p className="border border-dashed border-white/10 px-3 py-6 text-center text-sm text-white/40">
                  No open rooms right now. Create one, or refresh.
                </p>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="flex items-center justify-between gap-3 border border-white/15 bg-black/25 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{room.hostName}</p>
                      <p className="text-[11px] text-white/45">
                        Code {room.roomCode} - {room.players}/{room.maxPlayers}
                      </p>
                    </div>
                    <CanvasMenuButton
                      label="Join"
                      prominence="primary"
                      size="sm"
                      disabled={!deckReady}
                      onClick={() => deckReady && void joinById(room.roomId, deckReady)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {roomCode && (
            <div className="flex flex-wrap items-center gap-3 border border-gold/25 bg-black/25 p-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Share this code:</span>
              <span className="select-all border border-gold/40 bg-black/40 px-3 py-1 font-heading text-lg font-black tracking-[0.3em] text-gold">
                {roomCode}
              </span>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {seats.length === 0 ? (
              <p className="text-xs text-white/45">Waiting for players to join...</p>
            ) : (
              seats.map((seat) => (
                <span
                  key={seat.seatId}
                  className={[
                    'border bg-black/20 px-3 py-2 text-xs',
                    seat.ready ? 'border-emerald-300/40 text-emerald-200' : 'border-white/20 text-white/60',
                  ].join(' ')}
                >
                  {seat.username}
                  {seat.seatId === localSeatId ? ' (you)' : ''} - {seat.ready ? 'ready' : 'not ready'}
                  {seat.connected ? '' : ' - disconnected'}
                </span>
              ))
            )}
          </div>

          {phase === 'lobby' && (
            <div className="flex flex-wrap items-center gap-2">
              {localSeat?.ready ? (
                <Button variant="secondary" size="sm" onClick={() => unready()}>
                  Unready
                </Button>
              ) : (
                <Button variant="primary" size="sm" disabled={!deckReady} onClick={() => deckReady && ready(deckReady)}>
                  Ready
                </Button>
              )}
              {!deckReady && <span className="text-xs text-amber-100/70">Pick a valid deck before readying.</span>}
            </div>
          )}

          {phase === 'in-game' && gameState && (
            <p className="border border-emerald-300/25 bg-emerald-500/10 p-2 text-xs text-emerald-100">
              Match live - turn {gameState.turnNumber} - active seat {gameState.activePlayerId}. State is streaming from
              the server, redacted for your seat.
            </p>
          )}

          {phase === 'lobby' && (
            <p className="text-xs text-white/45">
              Both players must be ready with a valid deck; the server starts the match automatically.
            </p>
          )}

          {endResult && (
            <p className="border border-gold/30 bg-gold/10 p-2 text-xs text-amber-100">
              Match ended - {endResult.winnerId ? `winner: ${endResult.winnerId}` : 'draw'} ({endResult.reason}).
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function connectionLabel(status: string, phase: string | null): string {
  if (status === 'idle') return 'Not connected';
  if (status === 'connecting') return 'Connecting...';
  if (status === 'error') return 'Connection error';
  if (status === 'connected') return phase === 'in-game' ? 'In match' : 'In room';
  return status;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'connected'
      ? 'bg-emerald-400'
      : status === 'connecting'
        ? 'bg-amber-400'
        : status === 'error'
          ? 'bg-red-400'
          : 'bg-white/30';
  return <span className={`mr-1 inline-block h-2 w-2 rounded-full ${color}`} aria-hidden="true" />;
}
