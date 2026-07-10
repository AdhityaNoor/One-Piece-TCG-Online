/**
 * Full-pile view for a player's Trash, opened by clicking TrashPile.tsx's
 * face-up top card. A single pile visual can only ever show one card.
 */
import { CardImage } from '../CardImage';
import { Modal } from '../Modal';
import type { CardView } from '../../../board/projection';

export interface TrashGalleryModalProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  cards: CardView[];
  onCardZoom: (card: CardView) => void;
}

export function TrashGalleryModal({ open, onClose, playerId, cards, onCardZoom }: TrashGalleryModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`${playerId} - Trash (${cards.length})`} maxWidthClassName="max-w-2xl" rootClassName="op-trash-gallery-modal">
      <div className="op-trash-gallery-content p-4">
        {cards.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">Empty</p>
        ) : (
          <div className="op-trash-gallery-grid flex flex-wrap gap-2">
            {cards.map((card, index) => (
              <button
                key={card.instanceId}
                type="button"
                onClick={() => onCardZoom(card)}
                className="op-trash-gallery-card w-20 flex-shrink-0 text-left transition hover:-translate-y-0.5 sm:w-24 md:w-28"
                aria-label={`Preview ${card.name}${index === 0 ? ' (most recently trashed)' : ''}`}
              >
                <CardImage src={card.imageUrl} alt={card.name} />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
