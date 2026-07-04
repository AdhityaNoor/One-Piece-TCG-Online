/**
 * Local, no-backend implementation of RoomService. Stands in for the future
 * authoritative server so the whole Casual lobby (deck pick -> room list ->
 * join -> match) is clickable today.
 *
 * The cheat: since there is no remote opponent, every mock room is "hosted"
 * by a fake handle but backed by one of the LOCAL player's own saved decks
 * (via the injected deck store). Joining that room hands its `hostDeckId`
 * straight to the match store as the opponent seat, so a real GameState can
 * be built. A real server would instead deliver the opponent's own
 * normalized deck snapshot; nothing in the UI/store layer changes when that
 * swap happens because both talk only to the RoomService interface.
 *
 * Determinism: room generation draws from the injected SeededRng, so a given
 * seed always yields the same handles/leaders (tests rely on this). The
 * default seed is time-based so the lobby feels fresh between visits.
 */
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks/deckStorage';
import { createSeededRng, type RngState } from '../../engine/rng';
import type { CreateRoomInput, JoinRoomResult, Room, RoomLeaderPreview, RoomService } from './roomTypes';

/** Injected so the mock stays pure/testable — never reaches for a global deck store. */
export interface MockRoomServiceDeps {
  listDecks(): DeckStoreListEntry[];
  loadDeck(deckId: string): DeckLoadResult;
  /** Fixed seed for reproducible rooms (tests). Omit for a time-based seed. */
  seed?: string;
  /** Simulated network latency per call, ms. Defaults to a small value; pass 0 in tests. */
  latencyMs?: number;
  /** How many rooms to synthesize (capped by how many decks exist). Default 6. */
  roomCount?: number;
}

/** Pirate-flavoured handles for synthetic opponents. Purely cosmetic. */
const MOCK_HANDLES = [
  'StrawHatLuffy', 'RoronoaZoro', 'BlackLegSanji', 'NamiNavigator', 'UsoppKing',
  'ChopperMD', 'NicoRobin', 'CyborgFranky', 'SoulKingBrook', 'RedHairShanks',
  'TrafalgarLaw', 'FireFistAce', 'BoaHancock', 'DraculeMihawk', 'PortgasCrew',
  'GrandLineGamer', 'DevilFruitFan', 'MerryVoyager', 'ThousandSunny', 'YonkoSlayer',
];

function idFor(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function leaderPreviewFromDeck(load: DeckLoadResult): RoomLeaderPreview | null {
  if (!load.ok) return null;
  const leader = load.deck.leader;
  return {
    definitionId: leader.definition.cardNumber,
    name: leader.definition.name,
    imageUrl: leader.imageUrl,
    colors: leader.definition.colors,
  };
}

export function createMockRoomService(deps: MockRoomServiceDeps): RoomService {
  const latency = deps.latencyMs ?? 250;
  const roomCount = deps.roomCount ?? 6;
  const rng = createSeededRng(deps.seed ?? `lobby-${Date.now()}`);
  let rngState: RngState = rng.getState();

  // Rooms live in memory for the lifetime of this service instance. Generated
  // lazily on first list() so we read the deck store at call time, not
  // construction time (decks may be saved after the service is created).
  let rooms: Room[] | null = null;

  const delay = (): Promise<void> => (latency > 0 ? new Promise((resolve) => setTimeout(resolve, latency)) : Promise.resolve());

  function pick<T>(items: T[]): T {
    const draw = rng.nextInt(rngState, items.length);
    rngState = draw.nextState;
    return items[draw.value];
  }

  function generateRooms(): Room[] {
    const decks = deps.listDecks();
    if (decks.length === 0) return [];

    // Shuffle a working copy of the deck list, then take up to roomCount,
    // cycling if there are fewer decks than requested rooms so the lobby
    // still looks populated with a single saved deck.
    const shuffled = rng.shuffle(rngState, [...decks]);
    rngState = shuffled.nextState;
    const source = shuffled.result;

    const usedHandles = new Set<string>();
    const nextHandle = (): string => {
      for (let attempt = 0; attempt < MOCK_HANDLES.length; attempt += 1) {
        const handle = pick(MOCK_HANDLES);
        if (!usedHandles.has(handle)) {
          usedHandles.add(handle);
          return handle;
        }
      }
      return `Rookie${Math.floor(rng.nextInt(rngState, 9000).value) + 1000}`;
    };

    const out: Room[] = [];
    for (let index = 0; index < roomCount; index += 1) {
      const entry = source[index % source.length];
      const leader = leaderPreviewFromDeck(deps.loadDeck(entry.deckId));
      if (!leader) continue; // skip unloadable/corrupt decks rather than crash the lobby
      out.push({
        roomId: idFor('room'),
        hostName: nextHandle(),
        status: 'open',
        leader,
        hostDeckId: entry.deckId,
        createdAt: Date.now() - index * 60_000,
      });
    }
    return out;
  }

  function ensureRooms(): Room[] {
    if (rooms === null) rooms = generateRooms();
    return rooms;
  }

  return {
    async listRooms() {
      await delay();
      const list = ensureRooms();
      return [...list].sort((a, b) => b.createdAt - a.createdAt);
    },

    async createRoom(input: CreateRoomInput) {
      await delay();
      const room: Room = {
        roomId: idFor('room'),
        hostName: input.hostName,
        status: 'open',
        leader: input.leader,
        hostDeckId: input.deckId,
        createdAt: Date.now(),
      };
      ensureRooms().unshift(room);
      return room;
    },

    async joinRoom(roomId: string): Promise<JoinRoomResult> {
      await delay();
      const list = ensureRooms();
      const room = list.find((candidate) => candidate.roomId === roomId);
      if (!room) return { ok: false, reason: 'That room no longer exists.' };
      if (room.status !== 'open') return { ok: false, reason: 'That room is no longer open.' };
      room.status = 'in-progress';
      return { ok: true, room };
    },

    async leaveRoom(roomId: string) {
      await delay();
      const list = ensureRooms();
      const index = list.findIndex((candidate) => candidate.roomId === roomId);
      if (index >= 0) list.splice(index, 1);
    },
  };
}
