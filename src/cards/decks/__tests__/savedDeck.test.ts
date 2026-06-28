import { describe, expect, it } from 'vitest';
import { migrateSavedDeck, SAVED_DECK_SCHEMA_VERSION, type SavedDeckCardSnapshot } from '../savedDeck';

/** A v1-shaped snapshot — predates variant/cachedImagePath/sourceImportLines. */
function v1Snapshot(cardNumber: string): Omit<SavedDeckCardSnapshot, 'variant' | 'cachedImagePath' | 'sourceImportLines'> {
  return {
    cardNumber,
    printingImageId: cardNumber,
    imageUrl: `https://optcgapi.com/media/static/Card_Images/${cardNumber}.jpg`,
    definition: {
      cardDefinitionId: cardNumber,
      name: cardNumber,
      category: 'character',
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
    rawPrinting: {} as any, // shape irrelevant to migration — passed through untouched
    quantity: 4,
    warnings: [],
  };
}

function v1Deck() {
  return {
    schemaVersion: 1,
    deckId: 'deck-1',
    name: 'Old Deck',
    leader: v1Snapshot('OP01-001'),
    cards: [v1Snapshot('C-1'), v1Snapshot('C-2')],
    donDeckSize: 10 as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: { provider: 'optcgapi' as const, fetchedAt: '2026-01-01T00:00:00.000Z' },
  };
}

describe('migrateSavedDeck', () => {
  it('backfills variant/cachedImagePath/sourceImportLines as null on every v1 snapshot and bumps schemaVersion', () => {
    const migrated = migrateSavedDeck(v1Deck());
    expect(migrated).not.toBeNull();
    expect(migrated!.schemaVersion).toBe(SAVED_DECK_SCHEMA_VERSION);
    expect(migrated!.leader.variant).toBeNull();
    expect(migrated!.leader.cachedImagePath).toBeNull();
    expect(migrated!.leader.sourceImportLines).toBeNull();
    for (const card of migrated!.cards) {
      expect(card.variant).toBeNull();
      expect(card.cachedImagePath).toBeNull();
      expect(card.sourceImportLines).toBeNull();
    }
  });

  it('treats a deck with no schemaVersion field at all as v1 (pre-versioning saves, if any existed)', () => {
    const noVersion = v1Deck() as any;
    delete noVersion.schemaVersion;
    const migrated = migrateSavedDeck(noVersion);
    expect(migrated).not.toBeNull();
    expect(migrated!.schemaVersion).toBe(SAVED_DECK_SCHEMA_VERSION);
  });

  it('passes a current-version deck through unchanged', () => {
    const current = {
      ...v1Deck(),
      schemaVersion: SAVED_DECK_SCHEMA_VERSION,
      leader: { ...v1Snapshot('OP01-001'), variant: null, cachedImagePath: null, sourceImportLines: null },
      cards: [{ ...v1Snapshot('C-1'), variant: 'p1', cachedImagePath: null, sourceImportLines: ['4xC-1'] }],
    };
    const migrated = migrateSavedDeck(current);
    expect(migrated).toEqual(current);
  });

  it('returns null for input that does not look like a SavedDeck at all', () => {
    expect(migrateSavedDeck(null)).toBeNull();
    expect(migrateSavedDeck(undefined)).toBeNull();
    expect(migrateSavedDeck('not a deck')).toBeNull();
    expect(migrateSavedDeck({ foo: 'bar' })).toBeNull();
  });

  it('refuses to guess at a schemaVersion newer than this code knows about, rather than silently mangling it', () => {
    const fromTheFuture = { ...v1Deck(), schemaVersion: SAVED_DECK_SCHEMA_VERSION + 1 };
    expect(migrateSavedDeck(fromTheFuture)).toBeNull();
  });
});
