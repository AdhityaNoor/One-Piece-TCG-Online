import { useEffect, useMemo, useState } from 'react';
import { Button, CardDetailModal, CardImage, ScreenShell } from '../../components';
import { useCardLibraryStore } from '../../store/cardLibraryStore';
import { useDeckBuilderLegality, useDeckBuilderStore } from '../../store/deckBuilderStore';
import { useCurrentScreen, useNavigationStore } from '../../store/navigationStore';
import { useSavedDecksStore } from '../../store/savedDecksStore';
import { CardSetBrowserControls, CardSetBrowserResults } from '../shared';
import { ClipboardImportTab } from './ClipboardImportTab';
import { DeckBuilderResultTile } from './DeckBuilderResultTile';
import { SearchByIdTab } from './SearchByIdTab';

type DeckBuilderTab = 'browse' | 'search' | 'clipboard';

function sameColors(left: string[] | undefined, right: string[]) {
  if (!left || left.length !== right.length) return false;
  return right.every((color) => left.includes(color));
}

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
  const startNewDeck = useDeckBuilderStore((state) => state.startNewDeck);
  const startEditingDeck = useDeckBuilderStore((state) => state.startEditingDeck);
  const save = useDeckBuilderStore((state) => state.save);
  const removeLeader = useDeckBuilderStore((state) => state.removeLeader);
  const setMainDeckQuantity = useDeckBuilderStore((state) => state.setMainDeckQuantity);
  const cardLibraryFilter = useCardLibraryStore((state) => state.filter);
  const setCardLibraryFilter = useCardLibraryStore((state) => state.setFilter);

  const legality = useDeckBuilderLegality();
  const [tab, setTab] = useState<DeckBuilderTab>('browse');
  const [previewPrintingId, setPreviewPrintingId] = useState<string | null>(null);

  useEffect(() => {
    if (deckIdToEdit) {
      const result = load(deckIdToEdit);
      if (result.ok) {
        startEditingDeck(result.deck);
        return;
      }
    }
    startNewDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIdToEdit]);

  useEffect(() => {
    if (leaderSelection) {
      const leaderColors = leaderSelection.libraryEntry.definition.colors;
      if (!sameColors(cardLibraryFilter.colors, leaderColors)) {
        setCardLibraryFilter({
          ...cardLibraryFilter,
          categories: cardLibraryFilter.categories?.length === 1 && cardLibraryFilter.categories[0] === 'leader' ? undefined : cardLibraryFilter.categories,
          colors: leaderColors,
        });
      }
      return;
    }
    if (cardLibraryFilter.query || (cardLibraryFilter.colors?.length ?? 0) > 0 || cardLibraryFilter.categories?.length !== 1 || cardLibraryFilter.categories[0] !== 'leader') {
      setCardLibraryFilter({ categories: ['leader'] });
    }
  }, [cardLibraryFilter, leaderSelection, setCardLibraryFilter]);

  const mainDeckCount = mainDeckSelections.reduce((sum, s) => sum + s.quantity, 0);
  const leaderImageUrl = leaderSelection?.libraryEntry.printings[0]?.imageUrl ?? null;
  const selectedCards = useMemo(() => [...mainDeckSelections].sort((a, b) => b.quantity - a.quantity), [mainDeckSelections]);
  const previewSelection = selectedCards.find((selection) => selection.chosenPrintingImageId === previewPrintingId) ?? null;
  const saveTitle = legality.legal
    ? 'Save deck'
    : [`Deck is not legal yet. Main deck: ${mainDeckCount}/50.`, ...legality.reasons].join('\n');

  function handleSaveDeck() {
    const nextName = window.prompt('Deck name', name.trim() || 'Untitled Deck');
    if (nextName === null) return;
    setName(nextName);
    save();
  }

  return (
    <ScreenShell
      title={deckIdToEdit ? 'Edit Deck' : 'New Deck'}
      onBack={goBack}
      bodyClassName="overflow-hidden px-2 py-2 sm:px-3"
      headerRight={
        <span title={saveTitle}>
          <Button variant="primary" size="sm" disabled={!legality.legal} onClick={handleSaveDeck}>
            Save Deck
          </Button>
        </span>
      }
    >
      <div className="grid h-full min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="h-full min-h-0 overflow-hidden">
          <section className="op-panel flex h-full min-h-0 flex-col overflow-hidden p-3">
            <p className="op-section-title">Browser Controls</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <Button variant={tab === 'browse' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('browse')} fullWidth>
                Browse
              </Button>
              <Button variant={tab === 'search' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('search')} fullWidth>
                Search
              </Button>
              <Button variant={tab === 'clipboard' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('clipboard')} fullWidth>
                Import
              </Button>
            </div>

            <div className="mt-2 min-h-0 flex-1 overflow-auto">
              {tab === 'browse' && (
                <CardSetBrowserControls
                  lockedColors={leaderSelection?.libraryEntry.definition.colors}
                  lockedColorReason={leaderSelection ? `Locked to ${leaderSelection.libraryEntry.definition.colors.join(' / ')} leader colors.` : undefined}
                  lockedCategories={leaderSelection ? undefined : ['leader']}
                  lockedCategoryReason={leaderSelection ? undefined : 'Select a leader first. Showing leaders from all sets.'}
                />
              )}
              {tab === 'search' && <SearchByIdTab />}
              {tab === 'clipboard' && <ClipboardImportTab />}
            </div>

            <div className="mt-2 flex flex-col gap-1.5">
              {lastSaveResult && !lastSaveResult.ok && (
                <ul className="list-disc border border-red-400/40 bg-red-950/50 p-2 pl-6 text-xs text-red-100">
                  {lastSaveResult.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              )}
              {lastSaveResult?.ok && <p className="border border-emerald-300/40 bg-emerald-950/45 p-2 text-center font-heading text-sm font-bold uppercase tracking-[0.08em] text-emerald-100">Saved.</p>}
              {lastSaveResult?.ok && (
                <Button variant="secondary" onClick={() => navigateTo({ screen: 'saved-decks' })} fullWidth>
                  View Saved Decks
                </Button>
              )}
            </div>
          </section>
        </aside>

        <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
          <section className="op-panel flex min-h-0 flex-col overflow-hidden p-2">
            <p className="op-section-title">Deck Gallery</p>
            <div className="mt-1.5 grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)] gap-2 overflow-hidden">
              <div className="op-card-well group relative flex min-h-0 w-fit overflow-hidden">
                <div className="flex min-h-0 items-center justify-center">
                  <CardImage
                    src={leaderImageUrl}
                    alt={leaderSelection?.libraryEntry.definition.name ?? 'Select a leader'}
                    className="h-full max-h-full !w-auto max-w-none flex-shrink-0 rounded-none border-0"
                  />
                </div>
                {leaderSelection && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/60 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={removeLeader}
                      className="border border-red-200/70 bg-red-600 px-3 py-1.5 font-heading text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_6px_0_rgba(80,7,13,0.9)] transition hover:bg-red-500 active:translate-y-[2px]"
                    >
                      Unselect
                    </button>
                  </div>
                )}
              </div>

              <div className="op-card-well min-h-0 overflow-hidden p-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Selected Cards</p>
                  <p className="text-xs text-slate-200/55">{mainDeckCount} selected</p>
                </div>
                <div className="mt-1.5 h-[calc(100%-1.25rem)] min-h-0 overflow-y-auto overflow-x-hidden">
                  {selectedCards.length === 0 ? (
                    <p className="border border-gold/15 bg-black/30 p-2 text-sm text-slate-200/60">No cards selected yet.</p>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,8.5rem)] content-start gap-x-3 gap-y-5">
                      {selectedCards.map((selection) => (
                        <div key={selection.chosenPrintingImageId} className="w-[8.5rem]">
                          <div className="group relative block w-full transition hover:-translate-y-0.5">
                            <CardImage src={selection.libraryEntry.printings[0]?.imageUrl ?? null} alt={selection.libraryEntry.definition.name} className="rounded-none" />
                            <span className="absolute bottom-1 right-1 border border-gold/40 bg-black/80 px-1.5 py-0.5 font-heading text-[10px] font-bold text-white">{selection.quantity}x</span>
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/55 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => setPreviewPrintingId(selection.chosenPrintingImageId)}
                                className="border border-gold/50 bg-white px-2.5 py-1 font-heading text-[10px] font-black uppercase tracking-[0.08em] text-navy-950 shadow-[0_5px_0_rgba(0,0,0,0.45)] transition hover:bg-gold active:translate-y-[2px]"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => setMainDeckQuantity(selection.chosenPrintingImageId, selection.quantity - 1)}
                                className="flex h-7 w-7 items-center justify-center border border-red-200/60 bg-red-600 font-heading text-sm font-black text-white shadow-[0_5px_0_rgba(80,7,13,0.9)] transition hover:bg-red-500 active:translate-y-[2px]"
                                title="Remove one copy"
                              >
                                -
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-center font-heading text-base font-black leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{selection.quantity}x</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="op-panel flex min-h-0 flex-col overflow-hidden p-3">
            <p className="op-section-title">Browsing Results</p>
            <p className="mt-1 text-sm leading-6 text-slate-200/70">Browse, search, or paste a decklist below.</p>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {tab === 'browse' && (
                <CardSetBrowserResults
                  gridClassName="grid grid-cols-[repeat(auto-fill,8.5rem)] content-start gap-x-3 gap-y-4"
                  renderEntry={(entry) => <DeckBuilderResultTile key={entry.cardNumber} entry={entry} />}
                />
              )}
              {tab === 'search' && <SearchByIdTab />}
              {tab === 'clipboard' && <ClipboardImportTab />}
            </div>
          </section>
        </div>
      </div>
      <CardDetailModal
        open={previewSelection !== null}
        onClose={() => setPreviewPrintingId(null)}
        definition={previewSelection?.libraryEntry.definition ?? null}
        imageUrl={previewSelection?.libraryEntry.printings[0]?.imageUrl ?? null}
        setName={previewSelection?.libraryEntry.printings[0]?.setName}
      />
    </ScreenShell>
  );
}
