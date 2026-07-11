/**
 * Live online-match state for the Casual → online flow. Owns the Colyseus room
 * lifecycle (via multiplayer/net/gameClient) and mirrors the authoritative
 * server state into React-friendly fields.
 *
 * Authority boundary (project rule): this store NEVER runs the engine. It only
 * (a) sends the local player's intents to the server and (b) reflects the
 * per-seat-REDACTED GameState the server sends back. The opponent's hidden
 * cards never arrive here — the server strips them before sending (see
 * server/src/game/redaction.ts) — so the board physically cannot reveal them
 * on hover and secret log lines never reach this client.
 *
 * The raw Colyseus Room is kept in a module variable, not in store state,
 * because it is not serializable.
 */
import { create } from 'zustand';
import type { Room } from '@colyseus/sdk';
import type { GameState } from '../../engine/state';
import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { SavedDeck } from '../../cards/decks/savedDeck';
import type { RoomPhase, SeatView, StatePayload } from '../../../shared/multiplayer';
import { ClientMessage, ServerMessage } from '../../../shared/multiplayer';
import {
  createRoom,
  joinRoomByCode,
  joinRoomById,
  listOpenRooms,
  type OpenRoomInfo,
} from '../../multiplayer/net/gameClient';
import { useAuthStore } from './authStore';
import { useMatchStore, PLAYER_A_ID, PLAYER_B_ID } from './matchStore';
import { useNavigationStore } from './navigationStore';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

/** Kept outside zustand — a live socket handle, not serializable state. */
let activeRoom: Room | null = null;

interface OnlineState {
  status: ConnectionStatus;
  role: 'host' | 'guest' | null;
  roomCode: string | null;
  phase: RoomPhase | null;
  seats: SeatView[];
  localSeatId: string | null;
  /** Per-seat-redacted authoritative GameState (null until match start). */
  gameState: GameState | null;
  /** Card definitions for cards THIS seat may see (keyed by cardDefinitionId). */
  defs: CardDefinitionLookup;
  logs: unknown[];
  endResult: { winnerId: string | null; reason: string } | null;
  error: string | null;

  /** Real open rooms from the backend (replaces the old mock generator). */
  rooms: OpenRoomInfo[];
  loadingRooms: boolean;

  refreshRooms(): Promise<void>;
  hostRoom(deck: SavedDeck): Promise<boolean>;
  joinById(roomId: string, deck: SavedDeck): Promise<boolean>;
  joinByCode(code: string, deck: SavedDeck): Promise<boolean>;
  ready(deck: SavedDeck): void;
  unready(): void;
  sendIntent(action: GameAction): void;
  leave(): void;
}

export const useOnlineStore = create<OnlineState>((set, get) => ({
  status: 'idle',
  role: null,
  roomCode: null,
  phase: null,
  seats: [],
  localSeatId: null,
  gameState: null,
  defs: {},
  logs: [],
  endResult: null,
  error: null,
  rooms: [],
  loadingRooms: false,

  async refreshRooms() {
    set({ loadingRooms: true, error: null });
    try {
      const rooms = await listOpenRooms();
      set({ rooms, loadingRooms: false });
    } catch (cause) {
      set({ loadingRooms: false, error: cause instanceof Error ? cause.message : 'Could not load rooms.' });
    }
  },

  async hostRoom(deck) {
    void deck;
    return connect(set, 'host', () => createRoom(requireToken()));
  },

  async joinById(roomId, deck) {
    void deck;
    return connect(set, 'guest', () => joinRoomById(requireToken(), roomId));
  },

  async joinByCode(code, deck) {
    void deck;
    return connect(set, 'guest', () => joinRoomByCode(requireToken(), code));
  },

  ready(deck) {
    if (!activeRoom) return;
    activeRoom.send(ClientMessage.Ready, { deck });
  },

  unready() {
    if (!activeRoom) return;
    activeRoom.send(ClientMessage.Unready);
  },

  sendIntent(action) {
    if (!activeRoom) return;
    activeRoom.send(ClientMessage.Intent, { action });
  },

  leave() {
    void get;
    if (activeRoom) {
      activeRoom.leave(true);
      activeRoom = null;
    }
    set({
      status: 'idle',
      role: null,
      roomCode: null,
      phase: null,
      seats: [],
      localSeatId: null,
      gameState: null,
      defs: {},
      logs: [],
      endResult: null,
      error: null,
    });
  },
}));

function requireToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('You must be signed in to play online.');
  return token;
}

type SetFn = (partial: Partial<OnlineState>) => void;

async function connect(
  set: SetFn,
  role: 'host' | 'guest',
  open: () => Promise<Room>,
): Promise<boolean> {
  set({ status: 'connecting', role, error: null, logs: [], endResult: null, gameState: null, defs: {} });
  try {
    const room = await open();
    activeRoom = room;
    wireRoom(room, set);
    set({ status: 'connected' });
    return true;
  } catch (cause) {
    activeRoom = null;
    set({ status: 'error', error: cause instanceof Error ? cause.message : 'Could not connect to the match server.' });
    return false;
  }
}

function wireRoom(room: Room, set: SetFn): void {
  // Room state = seats + lifecycle only (no secrets). GameState arrives via the
  // per-seat State message below.
  room.onStateChange((state: any) => {
    const seats: SeatView[] = [];
    state.seats?.forEach((seat: any) => {
      seats.push({
        seatId: seat.seatId,
        userId: seat.userId,
        username: seat.username,
        connected: seat.connected,
        ready: seat.ready,
      });
    });
    const localSeat = state.seats?.get(room.sessionId);
    set({
      roomCode: state.roomCode || null,
      phase: (state.phase as RoomPhase) || null,
      seats,
      localSeatId: localSeat?.seatId ?? null,
    });
  });

  room.onMessage(ServerMessage.State, (payload: StatePayload) => {
    const gameState = payload?.json ? (JSON.parse(payload.json) as GameState) : null;
    set({
      gameState,
      defs: (payload?.defs ?? {}) as CardDefinitionLookup,
    });
    if (gameState) hydrateMatchBoard(room, gameState, (payload?.defs ?? {}) as CardDefinitionLookup);
  });

  room.onMessage(ServerMessage.Log, (payload: { entries: unknown[] }) => {
    const existing = useOnlineStore.getState().logs;
    set({ logs: [...existing, ...(payload?.entries ?? [])] });
  });

  room.onMessage(ServerMessage.Rejected, (payload: { of: string; reasons: string[] }) => {
    set({ error: `${payload.of === 'ready' ? 'Deck' : 'Move'} rejected: ${payload.reasons.join('; ')}` });
  });

  room.onMessage(ServerMessage.MatchEnded, (payload: { winnerId: string | null; reason: string }) => {
    set({ endResult: { winnerId: payload.winnerId, reason: payload.reason } });
  });

  room.onMessage(ServerMessage.MatchStarted, () => {
    useNavigationStore.getState().navigateTo({ screen: 'online-match' });
  });

  room.onError(() => set({ status: 'error', error: 'Connection error.' }));
  room.onLeave(() => {
    activeRoom = null;
    set({ status: 'idle' });
  });
}

function hydrateMatchBoard(room: Room, gameState: GameState, defs: CardDefinitionLookup): void {
  const store = useOnlineStore.getState();
  const localPlayerId = store.localSeatId ?? PLAYER_A_ID;
  const playerNames: Record<string, string> = {
    [PLAYER_A_ID]: PLAYER_A_ID,
    [PLAYER_B_ID]: PLAYER_B_ID,
  };
  for (const seat of store.seats) {
    if (seat.seatId) playerNames[seat.seatId] = seat.username || seat.seatId;
  }
  useMatchStore.getState().hydrateOnlineMatch({
    state: gameState,
    defs,
    localPlayerId,
    playerNames,
    sendIntent: (action) => {
      if (activeRoom === room) activeRoom.send(ClientMessage.Intent, { action });
    },
  });
  if (useNavigationStore.getState().stack.at(-1)?.screen !== 'online-match') {
    useNavigationStore.getState().navigateTo({ screen: 'online-match' });
  }
}
