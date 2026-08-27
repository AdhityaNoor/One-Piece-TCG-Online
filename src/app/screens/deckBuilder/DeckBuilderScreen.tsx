import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { Button, CanvasMenuButton, CardDetailModal, CardImage, Modal } from '../../components';
import { useCardLibraryStore, useVisibleCardLibraryEntries } from '../../store/cardLibraryStore';
import { useDeckBuilderLegality, useDeckBuilderStore } from '../../store/deckBuilderStore';
import { useCurrentScreen, useNavigationStore } from '../../store/navigationStore';
import { useSavedDecksStore } from '../../store/savedDecksStore';
import { CardSetBrowserControls, CardSetBrowserResults } from '../shared';
import { ClipboardImportTab } from './ClipboardImportTab';
import { DECK_BUILDER_CARD_DRAG_MIME, DeckBuilderResultTile, type DeckBuilderCardDragPayload } from './DeckBuilderResultTile';
import { PrintingPickerButton, PrintingPickerModal } from './PrintingPickerModal';
import { copyLimitForCard } from '../../../cards/decks';
import { useHexDriftDelay } from '../../hooks/useHexDriftDelay';
import { DECK_BUILDER_WIDE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';

type DeckBuilderTab = 'browse' | 'clipboard';
/** Which single pane the phone layout is showing. Desktop shows all of them at once. */
type MobilePane = 'deck' | 'cards';

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
  const editingDeckId = useDeckBuilderStore((state) => state.editingDeckId);
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
  const isWide = useMediaQuery(DECK_BUILDER_WIDE_QUERY);
  const [tab, setTab] = useState<DeckBuilderTab>('browse');
  const [mobilePane, setMobilePane] = useState<MobilePane>('deck');
  const [previewPrintingId, setPreviewPrintingId] = useState<string | null>(null);
  const [deckDropActive, setDeckDropActive] = useState(false);
  const [leaderArtOpen, setLeaderArtOpen] = useState(false);
  /** chosenPrintingImageId of the deck card whose art picker is open, if any. */
  const [artPickerFor, setArtPickerFor] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

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
  const artPickerSelection = selectedCards.find((selection) => selection.chosenPrintingImageId === artPickerFor) ?? null;
  const saveTitle = legality.legal
    ? 'Save deck'
    : [`Deck is not legal yet. Main deck: ${mainDeckCount}/50.`, ...legality.reasons].join('\n');

  function openSaveDialog() {
    setNameDraft(name.trim() || 'Untitled Deck');
    setSaveDialogOpen(true);
  }

  /**
   * Saving LEAVES the builder for the deck list (the deck is done; staying put invited
   * the "did that work?" double-save the old inline "Saved." banner was there to answer).
   * Only navigate when the save actually succeeded — a rejected save keeps you here with
   * `lastSaveResult`'s reasons on screen.
   */
  function confirmSave() {
    setName(nameDraft);
    const result = save();
    if (!result.ok) return;
    setSaveDialogOpen(false);
    navigateTo({ screen: 'saved-decks' });
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

  const saveErrors = lastSaveResult && !lastSaveResult.ok ? lastSaveResult.reasons : null;

  // ---- shared pane bodies -------------------------------------------------
  // Same markup at both sizes; only the CONTAINER differs (tabbed single pane on a
  // phone, three simultaneous panels on desktop), which is why this is a media query
  // rather than `xl:` utilities.

  /**
   * The leader showcase. `aspect-[63/88]` is what makes this work: the well takes the row's
   * full height and DERIVES its width from that, so the card is exactly as tall as the
   * Selected Cards well beside it and never wider than its own art.
   *
   * The previous shape gave CardImage `h-full !w-auto max-w-none` inside a chain with no
   * definite height, so `h-full` resolved to `auto` — the image rendered at its NATURAL
   * size and `overflow-hidden` simply cropped whatever stuck out. Any fix here has to keep
   * a real height on every ancestor down to the image.
   */
  const leaderWell = (
    <div className="op-card-well group relative flex h-full w-full items-center justify-center overflow-hidden">
      <CardImage
        src={leaderImageUrl}
        alt={leaderSelection?.libraryEntry.definition.name ?? 'Select a leader'}
        placeholderLabel="No Leader Selected Yet"
        className="h-full w-full rounded-none border-0"
      />
      {leaderSelection && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/70 p-2 xl:bg-black/0 xl:opacity-0 xl:transition xl:group-hover:bg-black/60 xl:group-hover:opacity-100">
          <PrintingPickerButton count={leaderSelection.libraryEntry.printings.length} onClick={() => setLeaderArtOpen(true)} />
          <button
            type="button"
            onClick={removeLeader}
            className="flex h-8 items-center border border-red-200/70 bg-red-600 px-3 font-heading text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_4px_0_rgba(80,7,13,0.9)] transition hover:bg-red-500 active:translate-y-[2px]"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );

  const selectedCardsGrid =
    selectedCards.length === 0 ? (
      <p className="border border-[rgb(var(--op-gold-rgb)/0.15)] bg-black/30 p-3 text-sm text-slate-200/60">
        {isWide ? 'No cards selected yet. Drag a result here to add it.' : 'No cards yet. Switch to Cards to add some.'}
      </p>
    ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] content-start gap-x-2 gap-y-3 sm:grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] sm:gap-x-3 sm:gap-y-4 xl:grid-cols-[repeat(auto-fill,8.5rem)]">
        {selectedCards.map((selection) => {
          const selectedPrinting = getSelectedPrinting(selection);

          return (
            <div key={selection.chosenPrintingImageId} className="w-full">
              <div className="group relative block w-full transition hover:-translate-y-0.5">
                <CardImage src={selectedPrinting?.imageUrl ?? null} alt={selection.libraryEntry.definition.name} className="rounded-none" />
                <span className="absolute bottom-1 right-1 border border-[rgb(var(--op-gold-rgb)/0.4)] bg-black/80 px-1.5 py-0.5 font-heading text-[10px] font-bold text-white">{selection.quantity}x</span>
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-100 transition xl:bg-black/0 xl:opacity-0 xl:group-hover:bg-black/55 xl:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setPreviewPrintingId(selection.chosenPrintingImageId)}
                    className="flex h-8 items-center border border-[rgb(var(--op-gold-rgb)/0.5)] bg-white px-2.5 font-heading text-[10px] font-black uppercase tracking-[0.08em] text-navy-950 shadow-[0_4px_0_rgba(0,0,0,0.45)] transition hover:bg-[rgb(var(--op-gold-rgb))] active:translate-y-[2px]"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainDeckQuantity(selection.chosenPrintingImageId, selection.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center border border-red-200/60 bg-red-600 font-heading text-sm font-black text-white shadow-[0_4px_0_rgba(80,7,13,0.9)] transition hover:bg-red-500 active:translate-y-[2px]"
                    title="Remove one copy"
                  >
                    -
                  </button>
                </div>
                <div className="pointer-events-none absolute inset-x-1 bottom-1 z-20 flex justify-center">
                  <div className="pointer-events-auto">
                    <PrintingPickerButton
                      count={selection.libraryEntry.printings.length}
                      onClick={() => setArtPickerFor(selection.chosenPrintingImageId)}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-1 text-center font-heading text-sm font-black leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{selection.quantity}x</p>
            </div>
          );
        })}
      </div>
    );

  const browseControls =
    tab === 'browse' ? (
      <CardSetBrowserControls
        lockedColors={leaderSelection?.libraryEntry.definition.colors}
        lockedColorReason={leaderSelection ? `Locked to ${leaderSelection.libraryEntry.definition.colors.join(' / ')} leader colors.` : undefined}
        lockedCategories={leaderSelection ? undefined : ['leader']}
        lockedCategoryReason={leaderSelection ? undefined : 'Select a leader first. Showing leaders from all sets.'}
      />
    ) : (
      <ClipboardImportTab />
    );

  const browseResults =
    tab === 'browse' ? (
      <CardSetBrowserResults
        gridClassName="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] content-start gap-x-2 gap-y-3 sm:grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] sm:gap-x-3 sm:gap-y-4 xl:grid-cols-[repeat(auto-fill,8.5rem)]"
        renderEntry={(entry) => <DeckBuilderResultTile key={entry.cardNumber} entry={entry} />}
      />
    ) : null;

  const tabButtons = (
    <div className="flex gap-1.5">
      <Button variant={tab === 'browse' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('browse')} fullWidth>
        Browse
      </Button>
      <Button variant={tab === 'clipboard' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('clipboard')} fullWidth>
        Import
      </Button>
    </div>
  );

  const accessoriesButton = (
    <Button
      variant="secondary"
      title={editingDeckId ? 'Customize sleeves and DON!! art for this deck.' : 'Save the deck first to customize its accessories.'}
      disabled={!editingDeckId}
      onClick={() => editingDeckId && navigateTo({ screen: 'accessories', deckIdToEdit: editingDeckId })}
      fullWidth
    >
      Accessories
    </Button>
  );

  const saveButton = (
    <Button variant={legality.legal ? 'danger' : 'secondary'} title={saveTitle} disabled={!legality.legal} onClick={openSaveDialog} fullWidth>
      Save Deck
    </Button>
  );

  const errorList = saveErrors ? (
    <ul className="list-disc border border-red-400/40 bg-red-950/50 p-2 pl-6 text-xs text-red-100">
      {saveErrors.map((reason, index) => (
        <li key={index}>{reason}</li>
      ))}
    </ul>
  ) : null;

  return (
    <DeckBuilderGameShell
      onBack={goBack}
      title={name.trim() || 'Untitled Deck'}
      subtitle={`${mainDeckCount}/50 cards${leaderSelection ? '' : ' · no leader'}`}
    >
      {isWide ? (
        <div className="grid h-full min-h-0 grid-cols-[420px_minmax(0,1fr)] gap-3 overflow-hidden">
          <aside className="min-h-0 overflow-hidden">
            <section className="op-panel op-panel-plain flex h-full min-h-0 flex-col overflow-hidden p-3">
              <p className="op-section-title">Browser Controls</p>
              <div className="mt-2 flex flex-col gap-1.5">{tabButtons}</div>
              <div className="mt-2 min-h-0 flex-1 overflow-auto">{browseControls}</div>
              <div className="mt-2 flex flex-col gap-1.5">
                {errorList}
                {saveButton}
                {accessoriesButton}
              </div>
            </section>
          </aside>

          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
            <section className="op-panel op-panel-plain flex min-h-0 flex-col overflow-hidden p-2">
              <p className="op-section-title">Deck Gallery</p>
              {/* flex, not grid: an `auto` grid track whose width comes from an
                  aspect-ratio'd child is circular to size. A flex item with a definite
                  height + aspect-ratio + flex-shrink-0 resolves deterministically. */}
              <div className="mt-1.5 flex min-h-0 flex-1 gap-2 overflow-hidden">
                <div className="aspect-[63/88] h-full flex-shrink-0">{leaderWell}</div>
                <div
                  className={[
                    'op-card-well flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 transition',
                    deckDropActive ? 'border-[rgb(var(--op-gold-rgb))] bg-[rgb(var(--op-gold-rgb)/0.1)] shadow-[0_0_0_2px_rgb(var(--op-gold-rgb)/0.22)]' : '',
                  ].join(' ')}
                  onDragEnter={(event) => {
                    if (hasDeckBuilderDragData(event)) setDeckDropActive(true);
                  }}
                  onDragOver={handleDeckListDragOver}
                  onDragLeave={() => setDeckDropActive(false)}
                  onDrop={handleDeckListDrop}
                >
                  <div className="flex flex-shrink-0 items-center justify-between">
                    <p className="font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--op-gold-rgb))]">Selected Cards</p>
                    <p className="text-xs text-slate-200/55">{mainDeckCount} selected</p>
                  </div>
                  <div className="mt-1.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{selectedCardsGrid}</div>
                </div>
              </div>
            </section>

            <section className="op-panel op-panel-plain flex min-h-0 flex-col overflow-hidden p-3">
              <p className="op-section-title">Browsing Results</p>
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                {browseResults}
                {tab === 'clipboard' && <ClipboardImportTab />}
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* Phone/tablet: ONE pane at a time, each owning the only scroll region on the
           screen. The old layout stacked three fixed-height panels (26rem + 30rem) inside
           a page scroll, so the deck grid was a cramped ~8rem box that scrolled INSIDE a
           scrolling page — two nested scrollers fighting each other on touch. */
        <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
          <div className="flex flex-shrink-0 gap-1.5 px-1">
            <Button variant={mobilePane === 'deck' ? 'primary' : 'secondary'} size="sm" onClick={() => setMobilePane('deck')} fullWidth>
              Deck ({mainDeckCount})
            </Button>
            <Button variant={mobilePane === 'cards' ? 'primary' : 'secondary'} size="sm" onClick={() => setMobilePane('cards')} fullWidth>
              Cards
            </Button>
          </div>

          {mobilePane === 'deck' ? (
            <section className="op-panel op-panel-plain flex min-h-0 flex-1 flex-col overflow-hidden p-2">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <p className="op-section-title">Leader</p>
                {/* Scales with the pane: ~44% of a 390px phone is a ~170px card, and it
                    shrinks with the viewport instead of overflowing it. aspect-ratio here
                    (not a fixed height) keeps the well matched to the art. */}
                <div className="mx-auto mt-1.5 aspect-[63/88] w-[44%] max-w-[11rem]">{leaderWell}</div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--op-gold-rgb))]">Selected Cards</p>
                  <p className="text-xs text-slate-200/55">{mainDeckCount} selected</p>
                </div>
                <div className="mt-1.5">{selectedCardsGrid}</div>
              </div>

              <div className="mt-2 flex flex-shrink-0 flex-col gap-1.5">
                {errorList}
                {saveButton}
                {accessoriesButton}
              </div>
            </section>
          ) : (
            <section className="op-panel op-panel-plain flex min-h-0 flex-1 flex-col overflow-hidden p-2">
              <div className="flex-shrink-0">{tabButtons}</div>
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                {tab === 'browse' ? (
                  <>
                    <div className="mb-2">{browseControls}</div>
                    {browseResults}
                  </>
                ) : (
                  <ClipboardImportTab />
                )}
              </div>
            </section>
          )}
        </div>
      )}

      <CardDetailModal
        open={previewSelection !== null}
        onClose={() => setPreviewPrintingId(null)}
        definition={previewSelection?.libraryEntry.definition ?? null}
        imageUrl={previewPrinting?.imageUrl ?? null}
        setName={previewPrinting?.setName}
        accentClassName="op-theme-blue"
      />

      {leaderSelection && (
        <PrintingPickerModal
          open={leaderArtOpen}
          onClose={() => setLeaderArtOpen(false)}
          cardName={leaderSelection.libraryEntry.definition.name}
          cardNumber={leaderSelection.libraryEntry.cardNumber}
          printings={leaderSelection.libraryEntry.printings}
          selectedPrintingImageId={leaderSelection.chosenPrintingImageId}
          onSelect={(printingImageId) => setLeader(leaderSelection.libraryEntry, printingImageId)}
        />
      )}

      {artPickerSelection && (
        <PrintingPickerModal
          open={artPickerFor !== null}
          onClose={() => setArtPickerFor(null)}
          cardName={artPickerSelection.libraryEntry.definition.name}
          cardNumber={artPickerSelection.libraryEntry.cardNumber}
          printings={artPickerSelection.libraryEntry.printings}
          selectedPrintingImageId={artPickerSelection.chosenPrintingImageId}
          onSelect={(printingImageId) => changeMainDeckPrinting(artPickerSelection.chosenPrintingImageId, printingImageId)}
        />
      )}

      <Modal open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} title="Save Deck" maxWidthClassName="max-w-md" bodyClassName="p-4">
        <label className="block font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-slate-200/70" htmlFor="deck-name-input">
          Deck name
        </label>
        <input
          id="deck-name-input"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') confirmSave();
          }}
          autoFocus
          maxLength={60}
          className="mt-2 w-full border border-[rgb(var(--op-gold-rgb)/0.4)] bg-black/50 px-3 py-2 font-body text-base text-white outline-none focus:border-[rgb(var(--op-gold-rgb))]"
          placeholder="Untitled Deck"
        />
        {errorList && <div className="mt-3">{errorList}</div>}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => setSaveDialogOpen(false)} fullWidth>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmSave} fullWidth>
            Save
          </Button>
        </div>
      </Modal>
    </DeckBuilderGameShell>
  );
}

function DeckBuilderGameShell({
  onBack,
  title,
  subtitle,
  headerRight,
  children,
}: {
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const hexDriftDelay = useHexDriftDelay();
  return (
    // overflow-hidden at EVERY size now: each pane owns its own scroll region, so the
    // page itself must never scroll (a scrolling page under a scrolling pane is what
    // made the mobile deck gallery so awkward to drag through).
    <main className="op-theme-blue relative flex h-full w-full flex-col overflow-hidden bg-[#13329a] font-body text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('/ui/bg.png')] bg-cover bg-center op-bg-tint opacity-80" />
      {/* Animated honeycomb as its own layer rather than `op-hex-bg` on <main>:
          as an element background it painted UNDERNEATH the photo wash above,
          which muddied it. Sits above the photo, below the z-10 content. */}
      <div aria-hidden="true" style={hexDriftDelay} className="op-hex-bg pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between gap-3 px-3 py-3">
        {onBack && <CanvasMenuButton label="Back" onClick={onBack} size="sm" className="max-w-[7rem]" />}
        {title && (
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-heading text-sm font-black uppercase tracking-[0.1em] text-white">{title}</p>
            {subtitle && <p className="truncate text-[11px] text-slate-200/60">{subtitle}</p>}
          </div>
        )}
        {headerRight ? <div className="flex flex-shrink-0 items-center gap-2">{headerRight}</div> : <div className="w-[7rem] flex-shrink-0" aria-hidden="true" />}
      </div>
      <section className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-3 pt-1">{children}</section>
    </main>
  );
}
