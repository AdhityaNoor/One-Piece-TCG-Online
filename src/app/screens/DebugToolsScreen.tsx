/**
 * Developer/diagnostics screen — distinct from Settings (which holds
 * user-facing display preferences). This is where storage diagnostics and
 * destructive dev actions live. Once the rules engine exists, gameplay debug
 * aids (raw GameState inspector, action log viewer, force-skip-phase) belong
 * here too — explicitly out of scope for this milestone (no engine yet).
 */
import { useState } from 'react';
import { Button, DeckListSummary, MenuRow, Modal, ScreenShell } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

export function DebugToolsScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const entries = useSavedDecksStore((state) => state.entries);
  const remove = useSavedDecksStore((state) => state.remove);
  const [confirmingClear, setConfirmingClear] = useState(false);

  function clearAllDecks() {
    for (const entry of entries) remove(entry.deckId);
    setConfirmingClear(false);
  }

  return (
    <ScreenShell title="Debug Tools" onBack={goBack}>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-navy-900/40">Engine status</h2>
          <p className="rounded-2xl bg-surface-panel p-3 text-sm text-navy-900/70">
            Rules engine not implemented yet — this milestone covers app shell and deck/card UI only. No phases, no action dispatch, no GameState. See
            project docs for the implementation roadmap.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-navy-900/40">Display preferences</h2>
          <MenuRow title="Open Settings" description="Show-both-hands, animations, 3D toggles live there" onClick={() => navigateTo({ screen: 'settings' })} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-navy-900/40">Saved deck storage ({entries.length})</h2>
          {entries.length === 0 ? (
            <p className="rounded-2xl bg-surface-panel p-3 text-sm text-navy-900/50">No saved decks.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map((entry) => (
                <DeckListSummary key={entry.deckId} name={entry.name} updatedAt={entry.updatedAt} />
              ))}
            </div>
          )}
          <div className="mt-1">
            <Button variant="danger" size="sm" disabled={entries.length === 0} onClick={() => setConfirmingClear(true)}>
              Clear all saved decks
            </Button>
          </div>
        </section>
      </div>

      <Modal open={confirmingClear} onClose={() => setConfirmingClear(false)} title="Clear all saved decks?">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-navy-900/70">
            This permanently deletes all {entries.length} saved deck{entries.length === 1 ? '' : 's'} from this browser's local storage. This cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmingClear(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={clearAllDecks}>
              Delete all
            </Button>
          </div>
        </div>
      </Modal>
    </ScreenShell>
  );
}
