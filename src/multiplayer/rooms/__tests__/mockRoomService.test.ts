import { describe, expect, it } from 'vitest';
import { SAVED_DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckCardSnapshot } from '../../../cards/decks/savedDeck';
import type { DeckLoadResult, DeckStoreListEntry } from '../../../cards/decks/deckStorage';
import { createMockRoomService } from '../mockRoomService';

/** Minimal loadable snapshot — mirrors deckStorage.test.ts's fixture, trimmed to what the room service reads (leader.definition + imageUrl). */
function snapshot(cardNumber: string, category: 'leader' | 'character', imageUrl: string | null): SavedDeckCardSnapshot {
  return {
    cardNumber,
    variant: null,
    printingImageId: cardNumber,
    imageUrl,
    cachedImagePath: null,
    definition: {
      cardDefinitionId: cardNumber,
      name: `Leader ${cardNumber}`,
      category,
      colors: ['red'],
      types: [],
      text: '',
      hasTrigger: false,
      hasRush: false,
      hasBlocker: false,
      hasDoubleAttack: false,
      isUnblockable: false,
      cardNumber,
    },
    rawPrinting: {} as never,
    quantity: 1,
    warnings: [],
    sourceImportLines: null,
  };
}

function makeDeck(deckId: string): SavedDeck {
  return {
    schemaVersion: SAVED_DECK_SCHEMA_VERSION,
    deckId,
    name: `Deck ${deckId}`,
    leader: snapshot(`OP01-${deckId}`, 'leader', `https://img/${deckId}.png`),
    cards: [snapshot('C-1', 'character', null)],
    donDeckSize: 10,
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z',
    source: { provider: 'local-catalog', fetchedAt: '2026-06-28T00:00:00.000Z' },
  };
}

function fakeDeckStore(deckIds: string[]): { listDecks(): DeckStoreListEntry[]; loadDeck(id: string): DeckLoadResult } {
  const decks = new Map(deckIds.map((id) => [id, makeDeck(id)] as const));
  return {
    listDecks: () => deckIds.map((deckId) => ({ deckId, name: `Deck ${deckId}`, updatedAt: '2026-06-28T00:00:00.000Z' })),
    loadDeck: (id) => {
      const deck = decks.get(id);
      return deck ? { ok: true, deck } : { ok: false, deckId: id, reason: 'not found' };
    },
  };
}

describe('createMockRoomService', () => {
  it('generates rooms carrying a leader preview from local decks', async () => {
    const service = createMockRoomService({ ...fakeDeckStore(['a', 'b', 'c']), seed: 'fixed', latencyMs: 0, roomCount: 4 });
    const rooms = await service.listRooms();

    expect(rooms.length).toBe(4);
    for (const room of rooms) {
      expect(room.status).toBe('open');
      expect(room.leader.imageUrl).toMatch(/^https:\/\/img\//);
      expect(room.leader.colors).toEqual(['red']);
      expect(['a', 'b', 'c']).toContain(room.hostDeckId);
    }
  });

  it('is deterministic for a fixed seed', async () => {
    const first = await createMockRoomService({ ...fakeDeckStore(['a', 'b', 'c']), seed: 'seed-1', latencyMs: 0 }).listRooms();
    const second = await createMockRoomService({ ...fakeDeckStore(['a', 'b', 'c']), seed: 'seed-1', latencyMs: 0 }).listRooms();
    expect(first.map((r) => r.hostName)).toEqual(second.map((r) => r.hostName));
  });

  it('returns an empty list when there are no saved decks', async () => {
    const service = createMockRoomService({ ...fakeDeckStore([]), seed: 'x', latencyMs: 0 });
    expect(await service.listRooms()).toEqual([]);
  });

  it('createRoom prepends a room the lobby can then see', async () => {
    const service = createMockRoomService({ ...fakeDeckStore(['a']), seed: 'x', latencyMs: 0, roomCount: 1 });
    await service.listRooms();
    const created = await service.createRoom({
      hostName: 'Me',
      deckId: 'a',
      leader: { definitionId: 'OP01-a', name: 'Mine', imageUrl: null, colors: ['red'] },
    });
    const rooms = await service.listRooms();
    expect(rooms[0].roomId).toBe(created.roomId);
    expect(rooms[0].hostName).toBe('Me');
  });

  it('joinRoom succeeds once then reports the room busy', async () => {
    const service = createMockRoomService({ ...fakeDeckStore(['a']), seed: 'x', latencyMs: 0, roomCount: 1 });
    const [room] = await service.listRooms();

    const first = await service.joinRoom(room.roomId);
    expect(first.ok).toBe(true);

    const second = await service.joinRoom(room.roomId);
    expect(second.ok).toBe(false);
  });

  it('joinRoom fails for an unknown room id', async () => {
    const service = createMockRoomService({ ...fakeDeckStore(['a']), seed: 'x', latencyMs: 0 });
    const result = await service.joinRoom('nope');
    expect(result.ok).toBe(false);
  });
});
