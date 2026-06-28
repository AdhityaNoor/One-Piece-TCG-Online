import type { CardLibraryEntry } from '../../../cards/library';
import { CardDetailModal, CardImage } from '../../components';
import { useDeckBuilderStore } from '../../store/deckBuilderStore';
import { useState } from 'react';

export interface DeckBuilderResultTileProps {
  entry: CardLibraryEntry;
}

export function DeckBuilderResultTile({ entry }: DeckBuilderResultTileProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const leaderSelection = useDeckBuilderStore((state) => state.leaderSelection);
  const mainDeckSelections = useDeckBuilderStore((state) => state.mainDeckSelections);
  const setLeader = useDeckBuilderStore((state) => state.setLeader);
  const addMainDeckCard = useDeckBuilderStore((state) => state.addMainDeckCard);

  const canonicalPrintingId = entry.rawPrintings[0]?.card_image_id ?? entry.cardNumber;
  const isLeaderCard = entry.definition.category === 'leader';
  const isCurrentLeader = isLeaderCard && leaderSelection?.libraryEntry.cardNumber === entry.cardNumber;
  const mainDeckMatch = mainDeckSelections.find((s) => s.chosenPrintingImageId === canonicalPrintingId);
  const quantity = mainDeckMatch?.quantity ?? 0;
  const hasLeader = leaderSelection !== null;
  const imageUrl = entry.printings[0]?.imageUrl ?? null;

  function handleSelect() {
    if (isLeaderCard) {
      if (!isCurrentLeader) setLeader(entry, canonicalPrintingId);
      return;
    }
    if (hasLeader && quantity < 4) addMainDeckCard(entry, canonicalPrintingId, 1);
  }

  return (
    <>
      <div className="w-[8.5rem]">
        <div
          onContextMenu={(event) => {
            event.preventDefault();
            setZoomOpen(true);
          }}
          className={['group relative block w-full text-left', !isLeaderCard && (!hasLeader || quantity >= 4) ? 'opacity-55' : ''].join(' ')}
          title={isLeaderCard ? (isCurrentLeader ? 'Current leader' : 'Set leader') : hasLeader ? 'Add to deck' : 'Pick a leader first'}
        >
          <CardImage src={imageUrl} alt={entry.definition.name} className="rounded-none" />
          {quantity > 0 && (
            <span className="absolute bottom-1 right-1 border border-gold/40 bg-black/80 px-1.5 py-0.5 font-heading text-[10px] font-bold text-white">
              {quantity}x
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
              disabled={isLeaderCard ? isCurrentLeader : !hasLeader || quantity >= 4}
              className="flex h-7 min-w-7 items-center justify-center border border-gold/70 bg-gold px-2 font-heading text-sm font-black text-black shadow-[0_5px_0_rgba(68,39,0,0.75)] transition hover:bg-yellow-200 active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-45"
              title={isLeaderCard ? (isCurrentLeader ? 'Current leader' : 'Set leader') : 'Add one copy'}
            >
              {isLeaderCard ? 'Set' : '+'}
            </button>
          </div>
          <span className="pointer-events-none absolute inset-0 ring-0 ring-gold transition group-hover:ring-2" />
        </div>
      </div>
      <CardDetailModal open={zoomOpen} onClose={() => setZoomOpen(false)} definition={entry.definition} imageUrl={imageUrl} setName={entry.printings[0]?.setName} />
    </>
  );
}
