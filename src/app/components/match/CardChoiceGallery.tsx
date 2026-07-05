/**
 * Gallery-style card picker for effect-resolution choices that need the player
 * to pick from a set of cards — "look at the top 5 and choose one", DON!!
 * assignment, target selection, bottom-of-deck ordering, etc. All of these
 * arrive as the generic interpreter-suspended (`ir`) PendingChoice with a
 * candidate/visible id set and a [min, max] bound; this component only renders
 * the cards as real art and reports toggles. Selection order is preserved (and
 * shown as a number badge) so ordering choices work with the same UI.
 *
 * Pure presentational: no engine imports, no dispatch — the parent
 * (PendingChoicePrompt) owns the selection state and the RESOLVE action.
 */
import { CardImage } from '../CardImage';
import type { CardView } from '../../../board/projection';

export interface CardChoiceGalleryProps {
  /** Every card to show (may include context-only cards that aren't selectable). */
  cards: CardView[];
  /** Which of `cards` can actually be picked (e.g. only matching-type cards from a top-deck look). */
  selectableIds: Set<string>;
  /** Currently picked ids, in pick order — index drives the badge number. */
  selectedOrder: string[];
  /** Upper bound on selections; when >1 the badges show order numbers, at 1 a check. */
  max: number;
  onToggle: (instanceId: string) => void;
}

export function CardChoiceGallery({ cards, selectableIds, selectedOrder, max, onToggle }: CardChoiceGalleryProps) {
  const orderById = new Map(selectedOrder.map((id, index) => [id, index]));
  const atCap = max > 1 && selectedOrder.length >= max;
  const showOrderNumbers = max > 1;

  return (
    <div
      className="grid max-h-[58vh] gap-3 overflow-y-auto overflow-x-hidden py-1 pr-1"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(8.5rem, 100%), 1fr))' }}
    >
      {cards.map((card) => {
        const selectable = selectableIds.has(card.instanceId);
        const isSelected = orderById.has(card.instanceId);
        const dimmed = !selectable || (atCap && !isSelected);

        return (
          <button
            key={card.instanceId}
            type="button"
            disabled={!selectable}
            onClick={() => onToggle(card.instanceId)}
            aria-pressed={isSelected}
            title={selectable ? card.name : `${card.name} (not eligible)`}
            className={[
              'group relative block w-full text-left transition',
              selectable ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
              dimmed && !isSelected ? 'opacity-45' : '',
            ].join(' ')}
          >
            <CardImage
              src={card.imageUrl}
              alt={card.name}
              className={[
                'rounded-none',
                isSelected ? 'ring-4 ring-gold' : selectable ? 'ring-1 ring-white/15 group-hover:ring-gold/60' : '',
              ].join(' ')}
            />

            {isSelected && (
              <span className="absolute -right-2 -top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-gold px-1 font-heading text-sm font-black leading-none text-black shadow-[0_3px_0_rgba(0,0,0,0.5)]">
                {showOrderNumbers ? (orderById.get(card.instanceId) ?? 0) + 1 : '✓'}
              </span>
            )}

            <p className="mt-1 truncate text-center text-[11px] font-semibold text-white/75">{card.name}</p>
          </button>
        );
      })}
    </div>
  );
}
