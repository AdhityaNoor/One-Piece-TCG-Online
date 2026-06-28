/**
 * Deck Builder screen (Task 10). All 3 creation methods (Browse,
 * Search-by-ID, Clipboard Import) write into the SAME deckBuilderStore
 * (leaderSelection / mainDeckSelections), so switching methods mid-build
 * never loses prior picks — EXCEPT Clipboard Import, which deliberately
 * REPLACES the main deck on import (see deckBuilderStore.importFromClipboard
 * doc and ClipboardImportTab's banner text).
 *
 * Live legality feedback (project requirement) is `useDeckBuilderLegality()`
 * — the exact same pure validator `save()` calls internally, never a
 * parallel UI-only rule check (single source of truth for legality).
 *
 * Mount-once seeding: this component fully unmounts whenever the user
 * navigates away (App.tsx renders one screen at a time off the nav stack),
 * so a mount-only effect here is correct — there is no scenario where a
 * stale draft from a previous visit could leak into a fresh one without an
 * unmount/remount happening first.
 */
import { useEffect, useState } from 'react';
import { Button, CardImage, ScreenShell } from '../../components';
import { useDeckBuilderLegality, useDeckBuilderStore } from '../../store/deckBuilderStore';
import { useCurrentScreen, useNavigationStore } from '../../store/navigationStore';
import { useSavedDecksStore } from '../../store/savedDecksStore';
import { BrowseTab } from './BrowseTab';
import { ClipboardImportTab } from './ClipboardImportTab';
import { SearchByIdTab } from './SearchByIdTab';

type DeckBuilderTab = 'browse' | 'search' | 'clipboard';

export function DeckBuilderScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const current = useCurrentScreen();
  const deckIdToEdit = current.screen === 'deck-builder' ? current.deckIdToEdit : undefined;

  const load = useSavedDecksStore((state) => state.load);

  const name = useDeckBuilderStore((state) => state.name);
  const leaderSelection = useDeckBuilderStore((state) => state.leaderSelection);
  const mainDeckSelections = useDeckBuilderStore((state) => state.mainDeckSelections);
  const lastSaveResult = useDeckBuilderStore((state) => state.lastSaveResult);
  const setName = useDeckBuilderStore((state) => state.setName);
  const removeLeader = useDeckBuilderStore((state) => state.removeLeader);
  const startNewDeck = useDeckBuilderStore((state) => state.startNewDeck);
  const startEditingDeck = useDeckBuilderStore((state) => state.startEditingDeck);
  const save = useDeckBuilderStore((state) => state.save);

  const legality = useDeckBuilderLegality();
  const [tab, setTab] = useState<DeckBuilderTab>('browse');

  useEffect(() => {
    if (deckIdToEdit) {
      const result = load(deckIdToEdit);
      if (result.ok) {
        startEditingDeck(result.deck);
        return;
      }
    }
    startNewDeck();
    // Mount-only by design — see module doc above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIdToEdit]);

  const mainDeckCount = mainDeckSelections.reduce((sum, s) => sum + s.quantity, 0);
  const leaderImageUrl = leaderSelection?.libraryEntry.printings[0]?.imageUrl ?? null;

  return (
    <ScreenShell title={deckIdToEdit ? 'Edit Deck' : 'New Deck'} onBack={goBack}>
      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Deck name"
          className="w-full rounded-full border border-navy-900/15 bg-white px-4 py-2 text-sm font-semibold text-navy-900 placeholder:text-navy-900/40 focus:border-navy-900/40 focus:outline-none"
        />

        <section className="flex items-center gap-3 rounded-2xl bg-surface-card p-3">
          <div className="w-14 flex-shrink-0">
            <CardImage src={leaderImageUrl} alt={leaderSelection?.libraryEntry.definition.name ?? 'No leader selected'} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-navy-900/40">Leader</p>
            {leaderSelection ? (
              <>
                <p className="truncate text-sm font-bold text-navy-900">{leaderSelection.libraryEntry.definition.name}</p>
                <p className="text-[11px] text-navy-900/50">{leaderSelection.libraryEntry.cardNumber}</p>
              </>
            ) : (
              <p className="text-sm text-navy-900/50">None selected — pick one from Browse or Search below.</p>
            )}
          </div>
          {leaderSelection && (
            <Button variant="ghost" size="sm" onClick={removeLeader}>
              Remove
            </Button>
          )}
        </section>

        <section className={['rounded-2xl p-3 text-sm', legality.legal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'].join(' ')}>
          <p className="font-semibold">
            {legality.legal ? 'Deck is legal.' : 'Deck is not legal yet.'} Main deck: {mainDeckCount}/50.
          </p>
          {!legality.legal && (
            <ul className="mt-1 list-disc pl-4 text-xs">
              {legality.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex gap-2">
          <Button variant={tab === 'browse' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('browse')}>
            Browse
          </Button>
          <Button variant={tab === 'search' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('search')}>
            Search by ID
          </Button>
          <Button variant={tab === 'clipboard' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('clipboard')}>
            Import
          </Button>
        </div>

        {tab === 'browse' && <BrowseTab />}
        {tab === 'search' && <SearchByIdTab />}
        {tab === 'clipboard' && <ClipboardImportTab />}

        <div className="sticky bottom-0 flex flex-col gap-2 bg-white pt-2">
          {lastSaveResult && !lastSaveResult.ok && (
            <ul className="list-disc rounded-xl bg-red-50 p-3 pl-7 text-xs text-red-700">
              {lastSaveResult.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          )}
          {lastSaveResult?.ok && <p className="text-center text-sm font-semibold text-emerald-700">Saved.</p>}
          <div className="flex gap-2">
            <Button variant="primary" fullWidth disabled={!legality.legal} onClick={() => save()}>
              Save Deck
            </Button>
            {lastSaveResult?.ok && (
              <Button variant="secondary" onClick={() => navigateTo({ screen: 'saved-decks' })}>
                View Saved Decks
              </Button>
            )}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
