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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.10),_rgba(255,255,255,0.05))] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100/70">Roster</p>
          {rows.length === 0 ? (
            <div className="mt-3 rounded-[1.4rem] border border-white/10 bg-white/8 p-6 text-center">
              <p className="text-sm text-slate-200/60">No saved decks yet.</p>
              <Button variant="primary" size="sm" className="mt-4" onClick={() => navigateTo({ screen: 'deck-builder' })}>
                Build your first deck
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
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
        </section>

        <section className="rounded-[1.8rem] border border-white/10 bg-white/8 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100/70">Deck Rack</p>
          <p className="mt-2 text-sm leading-6 text-slate-200/70">
            Saved decks are stored locally as stable snapshots. Editing or deleting here does not affect live card data browsing.
          </p>
        </section>
      </div>

      <Modal open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)} title="Delete deck?">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-slate-200/75">This permanently deletes "{pendingDeleteName}" from this browser's local storage. This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => { if (pendingDeleteId) remove(pendingDeleteId); setPendingDeleteId(null); }}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </ScreenShell>
  );
}
