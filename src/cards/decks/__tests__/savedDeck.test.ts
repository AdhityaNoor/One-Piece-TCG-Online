import { describe, expect, it } from 'vitest';
import { migrateSavedDeck, SAVED_DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckCardSnapshot } from '../savedDeck';

/** A v1-shaped snapshot — predates variant/cachedImagePath/sourceImportLines. */
function v1Snapshot(cardNumber: string): Omit<SavedDeckCardSnapshot, 'variant' | 'cachedImagePath' | 'sourceImportLines'> {
  return {
    cardNumber,
    printingImageId: cardNumber,
    imageUrl: `/card-images/${cardNumber}.webp`,
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
    source: { provider: 'local-catalog' as const, fetchedAt: '2026-01-01T00:00:00.000Z' },
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

/**
 * Lock-in guard: a saved deck must only ever identify a card (cardNumber),
 * its chosen art/printing (variant/printingImageId/imageUrl/cachedImagePath),
 * its normalized stats (definition) and raw provenance (rawPrinting), plus
 * deck-construction bookkeeping (quantity/warnings/sourceImportLines) —
 * NEVER anything tied to effect CURATION (which effect template/program is
 * currently assigned to this cardNumber, a compiled effect, an effect
 * version, etc).
 *
 * Why this matters: effect curation is resolved live, by cardNumber, every
 * time a match starts (see src/app/store/matchStore.ts `startMatch` ->
 * `buildRegistryFromDefs`/`buildV2RuntimeFromDefs`, both rebuilt from
 * scratch from the CURRENT `CURATED_EFFECT_PROGRAMS` /
 * `ASSIGNMENTS_BY_CARD_V2` tables on every call — see
 * src/cards/effectTemplates/curatedPrograms.ts and
 * src/cards/effectCompiler_V2/runtimeCatalog_V2.ts). If a saved deck ever
 * embedded curation-specific data, an already-saved deck could go stale
 * (stuck with an old/missing effect) the moment curation work fixes or adds
 * an effect for that card number, instead of picking the fix up automatically.
 *
 * The compile-time check below fails to typecheck the moment
 * SavedDeckCardSnapshot grows a field not in ALLOWED_SNAPSHOT_KEYS — forcing
 * whoever adds that field to consciously update this allowlist (and re-read
 * this comment) rather than silently coupling saved decks to curation state.
 */
describe('SavedDeckCardSnapshot stays free of effect-curation data', () => {
  const ALLOWED_SNAPSHOT_KEYS = [
    'cardNumber',
    'variant',
    'printingImageId',
    'imageUrl',
    'cachedImagePath',
    'definition',
    'rawPrinting',
    'quantity',
    'warnings',
    'sourceImportLines',
  ] as const;

  type AllowedSnapshotKey = (typeof ALLOWED_SNAPSHOT_KEYS)[number];

  // If this line fails to compile ("Type 'X' is not assignable to type
  // 'never'"), SavedDeckCardSnapshot has a field ALLOWED_SNAPSHOT_KEYS
  // doesn't know about — read the doc comment above before adding it there.
  type UnexpectedSnapshotField = Exclude<keyof SavedDeckCardSnapshot, AllowedSnapshotKey>;
  const _noUnexpectedSnapshotFields: UnexpectedSnapshotField extends never ? true : never = true;
  void _noUnexpectedSnapshotFields;

  // Same guard for the deck-level shape, so a curation pointer couldn't be
  // smuggled in at the SavedDeck level instead of per-card.
  const ALLOWED_DECK_KEYS = ['schemaVersion', 'deckId', 'name', 'leader', 'cards', 'donDeckSize', 'createdAt', 'updatedAt', 'source'] as const;
  type AllowedDeckKey = (typeof ALLOWED_DECK_KEYS)[number];
  type UnexpectedDeckField = Exclude<keyof SavedDeck, AllowedDeckKey>;
  const _noUnexpectedDeckFields: UnexpectedDeckField extends never ? true : never = true;
  void _noUnexpectedDeckFields;

  it('a real snapshot only has keys from the allowlist (defense-in-depth against an `as any` bypass of the type check above)', () => {
    const snapshot = v1Snapshot('OP01-001') as unknown as SavedDeckCardSnapshot;
    for (const key of Object.keys(snapshot)) {
      expect(ALLOWED_SNAPSHOT_KEYS as readonly string[]).toContain(key);
    }
  });

  it('a real deck only has keys from the allowlist', () => {
    const deck = v1Deck();
    for (const key of Object.keys(deck)) {
      expect(ALLOWED_DECK_KEYS as readonly string[]).toContain(key);
    }
  });
});
