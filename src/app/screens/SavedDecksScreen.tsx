/**
 * Saved Decks screen (Task 11) — list, edit, delete every locally-saved
 * deck. `savedDecksStore.entries` only carries the cheap index
 * {deckId, name, updatedAt} (see deckStorage.ts doc: listing never parses
 * every full deck), so this screen calls `load(deckId)` per row to get the
 * leader name/art/colors/card-count DeckListSummary can display — load() is
 * synchronous local JSON parsing, not a network call, so doing it once per
 * row on every render is cheap at any realistic saved-deck count.
 */
import { useMemo, useState } from 'react';
import { Button, DeckListSummary, Modal, ScreenShell } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

export function SavedDecksScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);
  const remove = useSavedDecksStore((state) => state.remove);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => entries.map((entry) => ({ entry, deck: load(entry.deckId) })), [entries, load]);
  const pendingDeleteName = pendingDeleteId ? entries.find((e) => e.deckId === pendingDeleteId)?.name ?? 'this deck' : null;

  return (
    <ScreenShell
      title="Saved Decks"
      onBack={goBack}
      headerRight={
        <Button variant="secondary" size="sm" onClick={() => navigateTo({ screen: 'deck-builder' })}>
          New Deck
        </Button>
      }
    >
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-panel p-6 text-center">
          <p className="text-sm text-navy-900/50">No saved decks yet.</p>
          <Button variant="primary" size="sm" onClick={() => navigateTo({ screen: 'deck-builder' })}>
            Build your first deck
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ entry, deck }) =>
            deck.ok ? (
              <DeckListSummary
                key={entry.deckId}
                name={deck.deck.name}
                updatedAt={deck.deck.updatedAt}
                leaderName={deck.deck.leader.definition.name}
                leaderImageUrl={deck.deck.leader.imageUrl}
                colors={deck.deck.leader.definition.colors}
                cardCount={deck.deck.cards.reduce((sum, card) => sum + card.quantity, 0)}
                actions={
                  <>
                    <Button variant="secondary" size="sm" onClick={() => navigateTo({ screen: 'deck-builder', deckIdToEdit: entry.deckId })}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setPendingDeleteId(entry.deckId)}>
                      Delete
                    </Button>
                  </>
                }
              />
            ) : (
              <DeckListSummary
                key={entry.deckId}
                name={entry.name}
                updatedAt={entry.updatedAt}
                actions={
                  <Button variant="danger" size="sm" onClick={() => setPendingDeleteId(entry.deckId)}>
                    Delete
                  </Button>
                }
              />
            ),
          )}
        </div>
      )}

      <Modal open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)} title="Delete deck?">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-navy-900/70">This permanently deletes "{pendingDeleteName}" from this browser's local storage. This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (pendingDeleteId) remove(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </ScreenShell>
  );
}
