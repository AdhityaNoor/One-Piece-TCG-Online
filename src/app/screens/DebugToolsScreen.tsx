/**
 * Developer/diagnostics screen — distinct from Settings (which holds
 * user-facing display preferences). Storage diagnostics and dev tools live here.
 */
import { useState } from 'react';
import { Button, CanvasMenuButton, DeckListSummary, GameCanvasScreen, Modal } from '../components';
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
    <GameCanvasScreen kicker="Developer" status="Local diagnostics" title="Debug" onBack={goBack}>
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto pb-2">
        <section className="op-panel p-4">
          <p className="op-section-title">Effect Curation</p>
          <p className="mt-2 text-sm leading-6 text-slate-200/70">
            Monitor curated effect coverage, triage backlog, and curation-audit flags against the local card catalog.
          </p>
          <div className="mt-4 flex justify-center">
            <CanvasMenuButton
              label="Coverage Monitor"
              prominence="primary"
              size="sm"
              onClick={() => navigateTo({ screen: 'coverage-monitor' })}
            />
          </div>
        </section>

        <section className="op-panel p-4">
          <p className="op-section-title">Play Test</p>
          <p className="mt-2 text-sm leading-6 text-slate-200/70">
            Start a generated sandbox match, inject catalog cards into either hand, force turns, and adjust DON!! while the normal match rules still resolve.
          </p>
          <div className="mt-4 flex justify-center">
            <CanvasMenuButton label="Open Play Test" prominence="primary" size="sm" onClick={() => navigateTo({ screen: 'play-test' })} />
          </div>
        </section>

        <section className="op-panel p-4">
          <p className="op-section-title">Display Preferences</p>
          <p className="mt-2 text-sm leading-6 text-slate-200/70">Show-both-hands, animations, and 3D toggles.</p>
          <div className="mt-4 flex justify-center">
            <CanvasMenuButton label="Open Settings" size="sm" onClick={() => navigateTo({ screen: 'settings' })} />
          </div>
        </section>

        <section className="op-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="op-section-title">Saved Deck Storage</p>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{entries.length}</span>
          </div>
          {entries.length === 0 ? (
            <p className="mt-3 text-sm text-white/40">No saved decks in this browser.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {entries.map((entry) => (
                <DeckListSummary key={entry.deckId} name={entry.name} updatedAt={entry.updatedAt} />
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <CanvasMenuButton
              label="Clear All Decks"
              prominence="danger"
              size="sm"
              disabled={entries.length === 0}
              onClick={() => setConfirmingClear(true)}
            />
          </div>
        </section>
      </div>

      <Modal open={confirmingClear} onClose={() => setConfirmingClear(false)} title="Clear all saved decks?">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-slate-200/75">
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
    </GameCanvasScreen>
  );
}
