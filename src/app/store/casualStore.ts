/**
 * Casual-lobby UI-flow state (deck pick + room list) between the Play menu
 * and a Casual match. Like matchSetupStore, this holds UI-navigation state
 * ONLY — never GameState — and references decks/rooms by id, never by value.
 *
 * All room data comes through a RoomService (see /src/multiplayer/rooms):
 * today a local mock, later a network adapter, with this store unchanged.
 * Every mutation here is already an async request against that interface, so
 * the lobby is written to the network shape from day one (project rule:
 * "design local hotseat as if every click will later become a network
 * request").
 */
import { create } from 'zustand';
import { createRoomService } from '../lib/runtime';
import type { Room, RoomService } from '../../multiplayer/rooms';

/** The confirmed pairing handed to the match screen once a room is joined/created. */
export interface CasualMatchTicket {
  roomId: string;
  /** Local player's saved deck (seat A / bottom of the board). */
  localDeckId: string;
  /** Opponent host's deck (seat B). Mock reuses a local deck; a server would ship a snapshot. */
  opponentDeckId: string;
  localName: string;
  opponentName: string;
}

interface CasualState {
  /** Live service instance; recreated on refresh to re-seed the mock room list. */
  service: RoomService;
  rooms: Room[];
  loadingRooms: boolean;
  /** Last lobby error (list/create/join), for the screen to surface. */
  error: string | null;
  /** Which local saved deck the player will bring. Required before joining/hosting. */
  selectedDeckId: string | null;
  /** Set while a join/create request is in flight so the UI can disable buttons. */
  busy: boolean;

  selectDeck(deckId: string | null): void;
  refreshRooms(): Promise<void>;
  /** Join an existing room. Returns a ticket on success, or null (error set) on failure. */
  join(room: Room, localName: string): Promise<CasualMatchTicket | null>;
  reset(): void;
}

export const useCasualStore = create<CasualState>((set, get) => ({
  service: createRoomService(),
  rooms: [],
  loadingRooms: false,
  error: null,
  selectedDeckId: null,
  busy: false,

  selectDeck: (deckId) => set({ selectedDeckId: deckId }),

  async refreshRooms() {
    // Fresh service each refresh so newly-saved decks appear and the mock
    // re-rolls its handles; a real backend would just re-query the same
    // instance, which is equally valid against this interface.
    const service = createRoomService();
    set({ service, loadingRooms: true, error: null });
    try {
      const rooms = await service.listRooms();
      set({ rooms, loadingRooms: false });
    } catch (cause) {
      set({ loadingRooms: false, error: cause instanceof Error ? cause.message : 'Could not load rooms.' });
    }
  },

  async join(room, localName) {
    const { service, selectedDeckId } = get();
    if (!selectedDeckId) {
      set({ error: 'Choose your deck before joining a room.' });
      return null;
    }
    set({ busy: true, error: null });
    try {
      const result = await service.joinRoom(room.roomId);
      set({ busy: false });
      if (!result.ok) {
        set({ error: result.reason });
        return null;
      }
      return {
        roomId: result.room.roomId,
        localDeckId: selectedDeckId,
        opponentDeckId: result.room.hostDeckId,
        localName,
        opponentName: result.room.hostName,
      };
    } catch (cause) {
      set({ busy: false, error: cause instanceof Error ? cause.message : 'Could not join the room.' });
      return null;
    }
  },

  reset: () => set({ rooms: [], loadingRooms: false, error: null, selectedDeckId: null, busy: false }),
}));
