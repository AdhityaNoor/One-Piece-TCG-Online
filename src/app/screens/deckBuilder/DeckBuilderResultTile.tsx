import type { CardLibraryEntry } from '../../../cards/library';
import { copyLimitForCard } from '../../../cards/decks';
import { CardDetailModal, CardImage } from '../../components';
import { useDeckBuilderStore } from '../../store/deckBuilderStore';
import { useState } from 'react';
import { PrintingVariantPicker } from './PrintingVariantPicker';

export interface DeckBuilderResultTileProps {
  entry: CardLibraryEntry;
}

export function DeckBuilderResultTile({ entry }: DeckBuilderResultTileProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [selectedPrintingImageId, setSelectedPrintingImageId] = useState(entry.printings[0]?.printingImageId ?? entry.cardNumber);
  const leaderSelection = useDeckBuilderStore((state) => state.leaderSelection);
  const mainDeckSelections = useDeckBuilderStore((state) => state.mainDeckSelections);
  const setLeader = useDeckBuilderStore((state) => state.setLeader);
  const addMainDeckCard = useDeckBuilderStore((state) => state.addMainDeckCard);

  const isLeaderCard = entry.definition.category === 'leader';
  const isCurrentLeader = isLeaderCard && leaderSelection?.libraryEntry.cardNumber === entry.cardNumber;
  const currentLeaderPrintingId = isCurrentLeader ? leaderSelection.chosenPrintingImageId : selectedPrintingImageId;
  const activePrintingImageId = isCurrentLeader ? currentLeaderPrintingId : selectedPrintingImageId;
  const selectedPrinting = entry.printings.find((printing) => printing.printingImageId === activePrintingImageId) ?? entry.printings[0] ?? null;
  const mainDeckMatch = mainDeckSelections.find((s) => s.chosenPrintingImageId === selectedPrintingImageId);
  const quantity = mainDeckMatch?.quantity ?? 0;
  const totalQuantityForCardNumber = mainDeckSelections
    .filter((s) => s.libraryEntry.cardNumber === entry.cardNumber)
    .reduce((sum, selection) => sum + selection.quantity, 0);
  const hasLeader = leaderSelection !== null;
  const imageUrl = selectedPrinting?.imageUrl ?? null;
  // 5-1-2-3: normally 4, but Infinity for "any number of this card" cards (e.g. Pacifista).
  const copyLimit = copyLimitForCard(entry.definition);
  const atCopyLimit = totalQuantityForCardNumber >= copyLimit;

  function handleSelect() {
    if (isLeaderCard) {
      setLeader(entry, selectedPrintingImageId);
      return;
    }
    if (hasLeader && !atCopyLimit) addMainDeckCard(entry, selectedPrintingImageId, 1);
  }

  return (
    <>
      <div className="w-[8.5rem]">
        <div
          onContextMenu={(event) => {
            event.preventDefault();
            setZoomOpen(true);
          }}
          className={['group relative block w-full text-left', !isLeaderCard && (!hasLeader || atCopyLimit) ? 'opacity-55' : ''].join(' ')}
          title={isLeaderCard ? (isCurrentLeader ? 'Current leader' : 'Set leader') : hasLeader ? 'Add to deck' : 'Pick a leader first'}
        >
          <CardImage src={imageUrl} alt={entry.definition.name} className="rounded-none" />
          {totalQuantityForCardNumber > 0 && (
            <span className="absolute bottom-1 right-1 border border-gold/40 bg-black/80 px-1.5 py-0.5 font-heading text-[10px] font-bold text-white">
              {totalQuantityForCardNumber}x
            </span>
          )}
          {isLeaderCard && (
            <span className="absolute left-1 top-1 border border-black/40 bg-gold px-1.5 py-0.5 font-heading text-[9px] font-black uppercase tracking-[0.08em] text-black shadow-[2px_2px_0_rgba(0,0,0,0.45)]">
              {isCurrentLeader ? 'Leader' : 'Set'}
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/55 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="border border-gold/50 bg-white px-2.5 py-1 font-heading text-[10px] font-black uppercase tracking-[0.08em] text-navy-950 shadow-[0_5px_0_rgba(0,0,0,0.45)] transition hover:bg-gold active:translate-y-[2px]"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => {
                if (isLeaderCard) {
                  handleSelect();
                  return;
                }
                handleSelect();
              }}
              disabled={isLeaderCard ? isCurrentLeader && leaderSelection?.chosenPrintingImageId === selectedPrintingImageId : !hasLeader || atCopyLimit}
              className="flex h-7 min-w-7 items-center justify-center border border-gold/70 bg-gold px-2 font-heading text-sm font-black text-black shadow-[0_5px_0_rgba(68,39,0,0.75)] transition hover:bg-yellow-200 active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-45"
              title={isLeaderCard ? (isCurrentLeader ? 'Current leader' : 'Set leader') : 'Add one copy'}
            >
              {isLeaderCard ? 'Set' : '+'}
            </button>
          </div>
          <div className="opacity-0 transition group-hover:opacity-100">
            <PrintingVariantPicker
              cardNumber={entry.cardNumber}
              printings={entry.printings}
              selectedPrintingImageId={activePrintingImageId}
              onSelect={(printingImageId) => {
                setSelectedPrintingImageId(printingImageId);
                if (isCurrentLeader) setLeader(entry, printingImageId);
              }}
            />
          </div>
          <span className="pointer-events-none absolute inset-0 ring-0 ring-gold transition group-hover:ring-2" />
        </div>
      </div>
      <CardDetailModal open={zoomOpen} onClose={() => setZoomOpen(false)} definition={entry.definition} imageUrl={imageUrl} setName={selectedPrinting?.setName} />
    </>
  );
}
