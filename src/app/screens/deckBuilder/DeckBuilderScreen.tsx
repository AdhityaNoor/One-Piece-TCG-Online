import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { Button, CanvasMenuButton, CardDetailModal, CardImage } from '../../components';
import { useCardLibraryStore, useVisibleCardLibraryEntries } from '../../store/cardLibraryStore';
import { useDeckBuilderLegality, useDeckBuilderStore } from '../../store/deckBuilderStore';
import { useCurrentScreen, useNavigationStore } from '../../store/navigationStore';
import { useSavedDecksStore } from '../../store/savedDecksStore';
import { CardSetBrowserControls, CardSetBrowserResults } from '../shared';
import { ClipboardImportTab } from './ClipboardImportTab';
import { DECK_BUILDER_CARD_DRAG_MIME, DeckBuilderResultTile, type DeckBuilderCardDragPayload } from './DeckBuilderResultTile';
import { PrintingVariantPicker } from './PrintingVariantPicker';
import { copyLimitForCard } from '../../../cards/decks';

type DeckBuilderTab = 'browse' | 'clipboard';

function sameColors(left: string[] | undefined, right: string[]) {
  if (!left || left.length !== right.length) return false;
  return right.every((color) => left.includes(color));
}

function getSelectedPrinting(selection: { chosenPrintingImageId: string; libraryEntry: { printings: { printingImageId: string; imageUrl: string | null; setName?: string }[] } }) {
  return selection.libraryEntry.printings.find((printing) => printing.printingImageId === selection.chosenPrintingImageId) ?? selection.libraryEntry.printings[0] ?? null;
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
  const setLeader = useDeckBuilderStore((state) => state.setLeader);
  const addMainDeckCard = useDeckBuilderStore((state) => state.addMainDeckCard);
  const setMainDeckQuantity = useDeckBuilderStore((state) => state.setMainDeckQuantity);
  const changeMainDeckPrinting = useDeckBuilderStore((state) => state.changeMainDeckPrinting);
  const cardLibraryFilter = useCardLibraryStore((state) => state.filter);
  const setCardLibraryFilter = useCardLibraryStore((state) => state.setFilter);
  const visibleEntries = useVisibleCardLibraryEntries();

  const legality = useDeckBuilderLegality();
  const [tab, setTab] = useState<DeckBuilderTab>('browse');
  const [previewPrintingId, setPreviewPrintingId] = useState<string | null>(null);
  const [deckDropActive, setDeckDropActive] = useState(false);

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
    // No leader yet: restrict browsing to leaders, but preserve the search
    // query so the field stays usable (don't reset on every keystroke).
    const categoriesNeedReset = cardLibraryFilter.categories?.length !== 1 || cardLibraryFilter.categories[0] !== 'leader';
    const colorsNeedReset = (cardLibraryFilter.colors?.length ?? 0) > 0;
    if (categoriesNeedReset || colorsNeedReset) {
      setCardLibraryFilter({ query: cardLibraryFilter.query, categories: ['leader'] });
    }
  }, [cardLibraryFilter, leaderSelection, setCardLibraryFilter]);

  const mainDeckCount = mainDeckSelections.reduce((sum, s) => sum + s.quantity, 0);
  const leaderPrinting = leaderSelection ? getSelectedPrinting(leaderSelection) : null;
  const leaderImageUrl = leaderPrinting?.imageUrl ?? null;
  const selectedCards = useMemo(() => [...mainDeckSelections].sort((a, b) => b.quantity - a.quantity), [mainDeckSelections]);
  const previewSelection = selectedCards.find((selection) => selection.chosenPrintingImageId === previewPrintingId) ?? null;
  const previewPrinting = previewSelection ? getSelectedPrinting(previewSelection) : null;
  const saveTitle = legality.legal
    ? 'Save deck'
    : [`Deck is not legal yet. Main deck: ${mainDeckCount}/50.`, ...legality.reasons].join('\n');

  function handleSaveDeck() {
    const nextName = window.prompt('Deck name', name.trim() || 'Untitled Deck');
    if (nextName === null) return;
    setName(nextName);
    save();
  }

  function hasDeckBuilderDragData(event: DragEvent<HTMLElement>) {
    return Array.from(event.dataTransfer.types).includes(DECK_BUILDER_CARD_DRAG_MIME);
  }

  function addDraggedCardToDeck(payload: DeckBuilderCardDragPayload) {
    const entry = visibleEntries.find((candidate) => candidate.cardNumber === payload.cardNumber);
    if (!entry) return;

    const printing = entry.printings.find((candidate) => candidate.printingImageId === payload.printingImageId) ?? entry.printings[0];
    if (!printing) return;

    if (entry.definition.category === 'leader') {
      setLeader(entry, printing.printingImageId);
      return;
    }

    if (!leaderSelection) return;

    const copyLimit = copyLimitForCard(entry.definition);
    const currentQuantity = mainDeckSelections
      .filter((selection) => selection.libraryEntry.cardNumber === entry.cardNumber)
      .reduce((sum, selection) => sum + selection.quantity, 0);
    if (currentQuantity >= copyLimit) return;

    addMainDeckCard(entry, printing.printingImageId, 1);
  }

  function handleDeckListDragOver(event: DragEvent<HTMLElement>) {
    if (!hasDeckBuilderDragData(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDeckDropActive(true);
  }

  function handleDeckListDrop(event: DragEvent<HTMLElement>) {
    if (!hasDeckBuilderDragData(event)) return;
    event.preventDefault();
    setDeckDropActive(false);

    const rawPayload = event.dataTransfer.getData(DECK_BUILDER_CARD_DRAG_MIME);
    if (!rawPayload) return;

    try {
      addDraggedCardToDeck(JSON.parse(rawPayload) as DeckBuilderCardDragPayload);
    } catch {
      // Ignore stale or malformed drag data from outside this deck builder.
    }
  }

  return (
    <DeckBuilderGameShell onBack={goBack}>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-visible xl:grid xl:h-full xl:overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="min-h-0 flex-shrink-0 xl:h-full xl:shrink xl:overflow-hidden">
          <section className="op-panel op-panel-plain flex min-h-0 flex-col overflow-hidden p-3 xl:h-full">
            <p className="op-section-title">Browser Controls</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <Button variant={tab === 'browse' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('browse')} fullWidth>
                Browse
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
              <Button
                variant={legality.legal ? 'danger' : 'secondary'}
                title={saveTitle}
                disabled={!legality.legal}
                onClick={handleSaveDeck}
                fullWidth
              >
                Save Deck
              </Button>
            </div>
          </section>
        </aside>

        <div className="flex min-h-0 flex-col gap-3 overflow-visible xl:grid xl:h-full xl:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] xl:overflow-hidden">
          <section className="op-panel op-panel-plain flex min-h-[26rem] flex-shrink-0 flex-col overflow-hidden p-2 xl:min-h-0 xl:shrink">
            <p className="op-section-title">Deck Gallery</p>
            <div className="mt-1.5 grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden sm:grid-cols-[auto_minmax(0,1fr)]">
              <div className="op-card-well group relative flex min-h-[10rem] justify-center overflow-hidden sm:min-h-0 sm:w-fit">
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
                    <PrintingVariantPicker
                      cardNumber={leaderSelection.libraryEntry.cardNumber}
                      printings={leaderSelection.libraryEntry.printings}
                      selectedPrintingImageId={leaderSelection.chosenPrintingImageId}
                      onSelect={(printingImageId) => setLeader(leaderSelection.libraryEntry, printingImageId)}
                    />
                  </div>
                )}
              </div>

              <div
                className={[
                  'op-card-well min-h-0 overflow-hidden p-1.5 transition',
                  deckDropActive ? 'border-[rgb(var(--op-gold-rgb))] bg-[rgb(var(--op-gold-rgb)/0.1)] shadow-[0_0_0_2px_rgb(var(--op-gold-rgb)/0.22)]' : '',
                ].join(' ')}
                onDragEnter={(event) => {
                  if (hasDeckBuilderDragData(event)) setDeckDropActive(true);
                }}
                onDragOver={handleDeckListDragOver}
                onDragLeave={() => setDeckDropActive(false)}
                onDrop={handleDeckListDrop}
              >
                <div className="flex items-center justify-between">
                  <p className="font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--op-gold-rgb))]">Selected Cards</p>
                  <p className="text-xs text-slate-200/55">{mainDeckCount} selected</p>
                </div>
                <div className="mt-1.5 h-[calc(100%-1.25rem)] min-h-0 overflow-y-auto overflow-x-hidden">
                  {selectedCards.length === 0 ? (
                    <p className="border border-[rgb(var(--op-gold-rgb)/0.15)] bg-black/30 p-2 text-sm text-slate-200/60">No cards selected yet. Drag a result here to add it.</p>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] content-start gap-x-2.5 gap-y-4 sm:grid-cols-[repeat(auto-fill,8.5rem)] sm:gap-x-3 sm:gap-y-5">
                      {selectedCards.map((selection) => {
                        const selectedPrinting = getSelectedPrinting(selection);

                        return (
                          <div key={selection.chosenPrintingImageId} className="w-full sm:w-[8.5rem]">
                            <div className="group relative block w-full transition hover:-translate-y-0.5">
                              <CardImage src={selectedPrinting?.imageUrl ?? null} alt={selection.libraryEntry.definition.name} className="rounded-none" />
                              <span className="absolute bottom-1 right-1 border border-[rgb(var(--op-gold-rgb)/0.4)] bg-black/80 px-1.5 py-0.5 font-heading text-[10px] font-bold text-white">{selection.quantity}x</span>
                              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-100 transition sm:bg-black/0 sm:opacity-0 sm:group-hover:bg-black/55 sm:group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => setPreviewPrintingId(selection.chosenPrintingImageId)}
                                  className="border border-[rgb(var(--op-gold-rgb)/0.5)] bg-white px-2.5 py-1 font-heading text-[10px] font-black uppercase tracking-[0.08em] text-navy-950 shadow-[0_5px_0_rgba(0,0,0,0.45)] transition hover:bg-[rgb(var(--op-gold-rgb))] active:translate-y-[2px]"
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
                              <div className="opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                                <PrintingVariantPicker
                                  cardNumber={selection.libraryEntry.cardNumber}
                                  printings={selection.libraryEntry.printings}
                                  selectedPrintingImageId={selection.chosenPrintingImageId}
                                  onSelect={(printingImageId) => changeMainDeckPrinting(selection.chosenPrintingImageId, printingImageId)}
                                />
                              </div>
                            </div>
                            <p className="mt-1 text-center font-heading text-base font-black leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{selection.quantity}x</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="op-panel op-panel-plain flex min-h-[30rem] flex-shrink-0 flex-col overflow-hidden p-3 xl:min-h-0 xl:shrink">
            <p className="op-section-title">Browsing Results</p>
            <p className="mt-1 text-sm leading-6 text-slate-200/70">Browse, search, or paste a decklist below.</p>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {tab === 'browse' && (
                <CardSetBrowserResults
                  gridClassName="grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] content-start gap-x-2.5 gap-y-4 sm:grid-cols-[repeat(auto-fill,8.5rem)] sm:gap-x-3"
                  renderEntry={(entry) => <DeckBuilderResultTile key={entry.cardNumber} entry={entry} />}
                />
              )}
              {tab === 'clipboard' && <ClipboardImportTab />}
            </div>
          </section>
        </div>
      </div>
      <CardDetailModal
        open={previewSelection !== null}
        onClose={() => setPreviewPrintingId(null)}
        definition={previewSelection?.libraryEntry.definition ?? null}
        imageUrl={previewPrinting?.imageUrl ?? null}
        setName={previewPrinting?.setName}
        accentClassName="op-theme-blue"
      />
    </DeckBuilderGameShell>
  );
}

function DeckBuilderGameShell({
  onBack,
  headerRight,
  children,
}: {
  onBack?: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="op-theme-blue relative flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#071126] font-body text-white xl:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-24 grayscale" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,_rgb(var(--op-gold-rgb)/0.14),_transparent_24%),linear-gradient(180deg,_rgba(5,9,20,0.36)_0%,_rgba(5,10,24,0.92)_72%,_#030713_100%)]" />
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between gap-3 px-3 py-3">
        {onBack && <CanvasMenuButton label="Back" onClick={onBack} size="sm" className="max-w-[7rem]" />}
        {headerRight && <div className="flex flex-shrink-0 items-center gap-2">{headerRight}</div>}
      </div>
      <section className="relative z-10 flex min-h-0 flex-1 flex-col overflow-visible pb-4 pt-2 xl:overflow-hidden xl:pb-2">{children}</section>
    </main>
  );
}
