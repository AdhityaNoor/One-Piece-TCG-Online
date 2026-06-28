import { beforeEach, describe, expect, it } from 'vitest';
import { SAVED_DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckCardSnapshot } from '../savedDeck';
import { createLocalStorageDeckStore, type StorageLike } from '../deckStorage';

/** In-memory StorageLike fake — same role as FetchLike/CacheStore fakes used elsewhere in /src/cards's tests. No jsdom/localStorage polyfill needed. */
function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function minimalSnapshot(cardNumber: string): SavedDeckCardSnapshot {
  return {
    cardNumber,
    variant: null,
    printingImageId: cardNumber,
    imageUrl: null,
    cachedImagePath: null,
    definition: {
      cardDefinitionId: cardNumber,
      name: cardNumber,
      category: 'character',
      colors: [],
      types: [],
      hasTrigger: false,
      cardNumber,
    },
    rawPrinting: {} as any,
    quantity: 1,
    warnings: [],
    sourceImportLines: null,
  };
}

function makeDeck(deckId: string, name: string, updatedAt: string): SavedDeck {
  return {
    schemaVersion: SAVED_DECK_SCHEMA_VERSION,
    deckId,
    name,
    leader: { ...minimalSnapshot('OP01-001'), definition: { ...minimalSnapshot('OP01-001').definition, category: 'leader' } },
    cards: [minimalSnapshot('C-1')],
    donDeckSize: 10,
    createdAt: updatedAt,
    updatedAt,
    source: { provider: 'optcgapi', fetchedAt: updatedAt },
  };
}

describe('createLocalStorageDeckStore', () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('round-trips a saved deck through save() and load()', () => {
    const store = createLocalStorageDeckStore(storage);
    const deck = makeDeck('deck-1', 'My Deck', '2026-06-28T00:00:00.000Z');

    store.save(deck);
    const result = store.load('deck-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deck).toEqual(deck);
  });

  it('lists saved decks as cheap summaries, most-recently-updated first', () => {
    const store = createLocalStorageDeckStore(storage);
    store.save(makeDeck('deck-1', 'Older', '2026-06-01T00:00:00.000Z'));
    store.save(makeDeck('deck-2', 'Newer', '2026-06-20T00:00:00.000Z'));

    expect(store.list()).toEqual([
      { deckId: 'deck-2', name: 'Newer', updatedAt: '2026-06-20T00:00:00.000Z' },
      { deckId: 'deck-1', name: 'Older', updatedAt: '2026-06-01T00:00:00.000Z' },
    ]);
  });

  it('returns ok:false with a reason when loading an id that was never saved', () => {
    const store = createLocalStorageDeckStore(storage);
    const result = store.load('does-not-exist');
    expect(result).toEqual({ ok: false, deckId: 'does-not-exist', reason: 'No saved deck found for id "does-not-exist".' });
  });

  it('returns ok:false rather than throwing when the stored value is not valid JSON', () => {
    storage.setItem('optcg.deck.deck-1', '{not valid json');
    const store = createLocalStorageDeckStore(storage);
    const result = store.load('deck-1');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/corrupted/);
  });

  it('transparently migrates a v1-shaped deck on load, via migrateSavedDeck', () => {
    const v1Raw = JSON.stringify({
      schemaVersion: 1,
      deckId: 'deck-1',
      name: 'Old Deck',
      leader: { cardNumber: 'OP01-001', printingImageId: 'OP01-001', imageUrl: null, definition: minimalSnapshot('OP01-001').definition, rawPrinting: {}, quantity: 1, warnings: [] },
      cards: [{ cardNumber: 'C-1', printingImageId: 'C-1', imageUrl: null, definition: minimalSnapshot('C-1').definition, rawPrinting: {}, quantity: 1, warnings: [] }],
      donDeckSize: 10,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      source: { provider: 'optcgapi', fetchedAt: '2026-01-01T00:00:00.000Z' },
    });
    storage.setItem('optcg.deck.deck-1', v1Raw);

    const store = createLocalStorageDeckStore(storage);
    const result = store.load('deck-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deck.schemaVersion).toBe(SAVED_DECK_SCHEMA_VERSION);
    expect(result.deck.leader.variant).toBeNull();
    expect(result.deck.cards[0].sourceImportLines).toBeNull();
  });

  it('removes both the deck and its index entry', () => {
    const store = createLocalStorageDeckStore(storage);
    store.save(makeDeck('deck-1', 'My Deck', '2026-06-28T00:00:00.000Z'));

    store.remove('deck-1');

    expect(store.list()).toEqual([]);
    expect(store.load('deck-1').ok).toBe(false);
  });

  it('overwrites in place on a second save() with the same deckId, without duplicating the index entry', () => {
    const store = createLocalStorageDeckStore(storage);
    store.save(makeDeck('deck-1', 'First Name', '2026-06-01T00:00:00.000Z'));
    store.save(makeDeck('deck-1', 'Renamed', '2026-06-20T00:00:00.000Z'));

    expect(store.list()).toEqual([{ deckId: 'deck-1', name: 'Renamed', updatedAt: '2026-06-20T00:00:00.000Z' }]);
  });

  it('degrades to an empty list rather than throwing when the index itself is corrupted', () => {
    storage.setItem('optcg.deckIndex', '{not valid json');
    const store = createLocalStorageDeckStore(storage);
    expect(store.list()).toEqual([]);
  });

  it('filters out malformed entries from the index defensively', () => {
    storage.setItem('optcg.deckIndex', JSON.stringify([{ deckId: 'deck-1' /* missing name/updatedAt */ }, { deckId: 'deck-2', name: 'Valid', updatedAt: '2026-06-01T00:00:00.000Z' }]));
    const store = createLocalStorageDeckStore(storage);
    expect(store.list()).toEqual([{ deckId: 'deck-2', name: 'Valid', updatedAt: '2026-06-01T00:00:00.000Z' }]);
  });
});
