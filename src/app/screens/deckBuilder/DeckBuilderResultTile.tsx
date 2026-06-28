/**
 * One card result inside the Deck Builder's Browse and Search-by-ID tabs.
 * Tapping the tile opens the zoom/preview modal (project requirement: card
 * zoom/preview for small screens); adding, removing, and setting-as-leader
 * are separate explicit buttons (`actionSlot`) so the two gestures never
 * collide — see CardTile.tsx's onClick/actionSlot split.
 *
 * Always adds/sets the CANONICAL printing (`rawPrintings[0]`) — there is no
 * per-printing/alternate-art picker in this milestone. Known limitation,
 * documented in the Task 10 report: the quantity badge therefore only
 * reflects copies added under that canonical printing id, not alternate-art
 * copies of the same card number added elsewhere with a different id.
 */
import { useState } from 'react';
import type { CardLibraryEntry } from '../../../cards/library';
import { Button, CardDetailModal, CardTile } from '../../components';
import type { CardTileData } from '../../components';
import { useDeckBuilderStore } from '../../store/deckBuilderStore';

function toTileData(entry: CardLibraryEntry): CardTileData {
  return {
    cardNumber: entry.cardNumber,
    name: entry.definition.name,
    imageUrl: entry.printings[0]?.imageUrl ?? null,
    colors: entry.definition.colors,
    category: entry.definition.category,
  };
}

export interface DeckBuilderResultTileProps {
  entry: CardLibraryEntry;
}

export function DeckBuilderResultTile({ entry }: DeckBuilderResultTileProps) {
  const [zoomOpen, setZoomOpen] = useState(false);

  const leaderSelection = useDeckBuilderStore((state) => state.leaderSelection);
  const mainDeckSelections = useDeckBuilderStore((state) => state.mainDeckSelections);
  const setLeader = useDeckBuilderStore((state) => state.setLeader);
  const addMainDeckCard = useDeckBuilderStore((state) => state.addMainDeckCard);
  const setMainDeckQuantity = useDeckBuilderStore((state) => state.setMainDeckQuantity);

  const canonicalPrintingId = entry.rawPrintings[0]?.card_image_id ?? entry.cardNumber;
  const isLeaderCard = entry.definition.category === 'leader';
  const isCurrentLeader = isLeaderCard && leaderSelection?.libraryEntry.cardNumber === entry.cardNumber;
  const mainDeckMatch = mainDeckSelections.find((s) => s.chosenPrintingImageId === canonicalPrintingId);
  const quantity = mainDeckMatch?.quantity;

  return (
    <>
      <CardTile
        card={toTileData(entry)}
        quantity={isLeaderCard ? undefined : quantity}
        onClick={() => setZoomOpen(true)}
        actionSlot={
          isLeaderCard ? (
            <Button
              size="sm"
              variant={isCurrentLeader ? 'secondary' : 'primary'}
              fullWidth
              disabled={isCurrentLeader}
              onClick={(event) => {
                event.stopPropagation();
                setLeader(entry, canonicalPrintingId);
              }}
            >
              {isCurrentLeader ? 'Current Leader' : 'Set Leader'}
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                fullWidth
                disabled={!quantity}
                onClick={(event) => {
                  event.stopPropagation();
                  setMainDeckQuantity(canonicalPrintingId, (quantity ?? 0) - 1);
                }}
              >
                −
              </Button>
              <Button
                size="sm"
                variant="primary"
                fullWidth
                onClick={(event) => {
                  event.stopPropagation();
                  addMainDeckCard(entry, canonicalPrintingId, 1);
                }}
              >
                +
              </Button>
            </div>
          )
        }
      />
      <CardDetailModal
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        definition={entry.definition}
        imageUrl={entry.printings[0]?.imageUrl ?? null}
        setName={entry.printings[0]?.setName}
      />
    </>
  );
}
