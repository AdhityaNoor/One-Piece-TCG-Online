/**
 * One card tile in a grid — Card Library results (Task 9) and the Deck
 * Builder's Browse/selected-cards lists (Task 10) all render this. Takes a
 * deliberately minimal `CardTileData` shape rather than `CardLibraryEntry`
 * or `SavedDeckCardSnapshot` directly, so this component stays reusable for
 * both (each screen adapts its own data shape to this one — see
 * cardLibraryStore.ts / deckBuilderStore.ts for the richer source shapes).
 */
import type { ReactNode } from 'react';
import type { CardCategory, Color } from '../../engine/state/card';
import { CARD_COLOR_TOKENS } from '../lib/cardColors';
import { CardImage } from './CardImage';

export interface CardTileData {
  cardNumber: string;
  name: string;
  imageUrl: string | null;
  colors: Color[];
  category: CardCategory;
}

export interface CardTileProps {
  card: CardTileData;
  /** Shown as a small badge in the corner — main-deck copy count, omitted entirely when undefined (e.g. Card Library browsing has no count). */
  quantity?: number;
  selected?: boolean;
  onClick?: () => void;
  /** Rendered below the name/number — e.g. an Add/Remove Button or "Custom This Card"-style action. */
  actionSlot?: ReactNode;
}

export function CardTile({ card, quantity, selected, onClick, actionSlot }: CardTileProps) {
  // Deliberately a <div>, not a dynamic button/div tag: a union prop type
  // for an interactive vs. static tile gets awkward in TSX (each tag allows
  // different prop sets). A div + role="button" + keyboard handler gives the
  // same tap-to-select + keyboard accessibility without that complexity.
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={[
        'flex flex-col gap-2 rounded-2xl bg-surface-card p-2.5 text-left transition-colors',
        onClick ? 'cursor-pointer hover:bg-surface-cardHover' : '',
        selected ? 'ring-2 ring-brand ring-offset-2 ring-offset-white' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="relative">
        <CardImage src={card.imageUrl} alt={card.name} />
        {quantity !== undefined && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-navy-900 px-1.5 text-xs font-bold text-white shadow">
            ×{quantity}
          </span>
        )}
        <div className="absolute bottom-1 left-1 flex gap-1">
          {card.colors.map((color) => (
            <span key={color} className={['h-2.5 w-2.5 rounded-full ring-1 ring-white/70', CARD_COLOR_TOKENS[color].dotClassName].join(' ')} aria-hidden="true" />
          ))}
        </div>
      </div>
      <div className="min-h-0">
        <p className="truncate text-sm font-bold text-navy-900">{card.name}</p>
        <p className="text-[11px] text-navy-900/50">{card.cardNumber}</p>
      </div>
      {actionSlot}
    </div>
  );
}
