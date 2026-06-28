/**
 * A labeled zone of CardRows (Hand, Character Area, Stage Area, Cost Area).
 * Pure presentational — selection/highlight semantics all come from props
 * computed by the parent (PlayerBoardPanel), which itself only knows what
 * useBoardSelection.ts's current mode allows; this component has no idea
 * what an "action" even is.
 */
import type { ReactNode } from 'react';
import { CardRow } from './CardRow';
import type { CardView } from '../../../board/projection';

export interface ZoneSectionProps {
  label: string;
  cards: CardView[];
  emptyLabel?: string;
  selectedIds?: Set<string>;
  selectableIds?: Set<string>;
  onCardSelect?: (card: CardView) => void;
  onCardZoom?: (card: CardView) => void;
  rightSlot?: ReactNode;
}

export function ZoneSection({ label, cards, emptyLabel = 'Empty', selectedIds, selectableIds, onCardSelect, onCardZoom, rightSlot }: ZoneSectionProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">{label}</h4>
        <div className="flex items-center gap-2">
          {rightSlot}
          <span className="text-[11px] font-semibold text-white/40">{cards.length}</span>
        </div>
      </div>
      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-2 py-2 text-center text-[11px] text-white/30">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {cards.map((card) => (
            <CardRow
              key={card.instanceId}
              card={card}
              selected={selectedIds?.has(card.instanceId)}
              selectable={selectableIds ? selectableIds.has(card.instanceId) : Boolean(onCardSelect)}
              onSelect={onCardSelect ? () => onCardSelect(card) : undefined}
              onZoom={onCardZoom ? () => onCardZoom(card) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
