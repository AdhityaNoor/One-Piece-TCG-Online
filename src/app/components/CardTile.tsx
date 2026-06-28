/**
 * One card tile in a grid.
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
  quantity?: number;
  selected?: boolean;
  onClick?: () => void;
  actionSlot?: ReactNode;
  size?: 'default' | 'compact';
}

export function CardTile({ card, quantity, selected, onClick, actionSlot, size = 'default' }: CardTileProps) {
  const compact = size === 'compact';

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
        'flex flex-col rounded-[1.4rem] border border-white/10 bg-gradient-to-br from-white/12 to-white/5 text-left text-slate-100 shadow-[0_14px_30px_rgba(0,0,0,0.18)] transition-all',
        compact ? 'gap-1 p-1.5' : 'gap-2 p-2.5',
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-white/20 hover:from-white/16 hover:to-white/8' : '',
        selected ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-navy-950' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="relative">
        <CardImage src={card.imageUrl} alt={card.name} className={compact ? 'max-h-20' : undefined} />
        {quantity !== undefined && (
          <span className={['absolute -right-1 -top-1 flex min-w-6 items-center justify-center rounded-full border border-white/10 bg-navy-950 px-1.5 font-bold text-white shadow', compact ? 'h-4 text-[9px]' : 'h-6 text-xs'].join(' ')}>
            ×{quantity}
          </span>
        )}
        <div className="absolute bottom-1 left-1 flex gap-1">
          {card.colors.map((color) => (
            <span key={color} className={['rounded-full ring-1 ring-white/70', compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5', CARD_COLOR_TOKENS[color].dotClassName].join(' ')} aria-hidden="true" />
          ))}
        </div>
      </div>
      <div className="min-h-0">
        <p className={['truncate font-bold uppercase tracking-[0.08em] text-white', compact ? 'text-[9px] leading-3' : 'text-sm'].join(' ')}>{card.name}</p>
        <p className={compact ? 'text-[8px] leading-3 text-slate-200/60' : 'text-[11px] text-slate-200/60'}>{card.cardNumber}</p>
      </div>
      {actionSlot}
    </div>
  );
}
