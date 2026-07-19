import { describe, expect, it } from 'vitest';
import { SAVED_DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckCardSnapshot } from '../savedDeck';
import { planDeckSync } from '../deckSyncPlan';

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
      text: '',
      hasTrigger: false,
      hasRush: false,
      hasBlocker: false,
      hasDoubleAttack: false,
      isUnblockable: false,
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
    source: { provider: 'local-catalog', fetchedAt: updatedAt },
  };
}

describe('planDeckSync', () => {
  it('pushes a local-only deck to remote and leaves nothing to write locally', () => {
    const local = makeDeck('deck-1', 'Local Only', '2026-06-01T00:00:00.000Z');
    const plan = planDeckSync([local], []);
    expect(plan.toPushRemote).toEqual([local]);
    expect(plan.toWriteLocal).toEqual([]);
  });

  it('writes a remote-only deck locally and pushes nothing', () => {
    const remote = makeDeck('deck-1', 'Remote Only', '2026-06-01T00:00:00.000Z');
    const plan = planDeckSync([], [remote]);
    expect(plan.toWriteLocal).toEqual([remote]);
    expect(plan.toPushRemote).toEqual([]);
  });

  it('prefers the remote copy when it is newer', () => {
    const local = makeDeck('deck-1', 'Stale Local', '2026-06-01T00:00:00.000Z');
    const remote = makeDeck('deck-1', 'Fresh Remote', '2026-06-20T00:00:00.000Z');
    const plan = planDeckSync([local], [remote]);
    expect(plan.toWriteLocal).toEqual([remote]);
    expect(plan.toPushRemote).toEqual([]);
  });

  it('prefers the local copy when it is newer', () => {
    const local = makeDeck('deck-1', 'Fresh Local', '2026-06-20T00:00:00.000Z');
    const remote = makeDeck('deck-1', 'Stale Remote', '2026-06-01T00:00:00.000Z');
    const plan = planDeckSync([local], [remote]);
    expect(plan.toPushRemote).toEqual([local]);
    expect(plan.toWriteLocal).toEqual([]);
  });

  it('does nothing for a deck already in sync (equal updatedAt)', () => {
    const local = makeDeck('deck-1', 'Same', '2026-06-01T00:00:00.000Z');
    const remote = makeDeck('deck-1', 'Same', '2026-06-01T00:00:00.000Z');
    const plan = planDeckSync([local], [remote]);
    expect(plan.toWriteLocal).toEqual([]);
    expect(plan.toPushRemote).toEqual([]);
  });

  it('handles a mix of local-only, remote-only, and conflicting decks independently', () => {
    const localOnly = makeDeck('local-only', 'Local Only', '2026-06-01T00:00:00.000Z');
    const remoteOnly = makeDeck('remote-only', 'Remote Only', '2026-06-01T00:00:00.000Z');
    const localWinsLocal = makeDeck('conflict-local-wins', 'Local Wins', '2026-06-20T00:00:00.000Z');
    const localWinsRemote = makeDeck('conflict-local-wins', 'Remote Loses', '2026-06-01T00:00:00.000Z');
    const remoteWinsLocal = makeDeck('conflict-remote-wins', 'Local Loses', '2026-06-01T00:00:00.000Z');
    const remoteWinsRemote = makeDeck('conflict-remote-wins', 'Remote Wins', '2026-06-20T00:00:00.000Z');

    const plan = planDeckSync(
      [localOnly, localWinsLocal, remoteWinsLocal],
      [remoteOnly, localWinsRemote, remoteWinsRemote],
    );

    expect(plan.toPushRemote.map((d) => d.deckId).sort()).toEqual(['conflict-local-wins', 'local-only']);
    expect(plan.toWriteLocal.map((d) => d.deckId).sort()).toEqual(['conflict-remote-wins', 'remote-only']);
  });
});
