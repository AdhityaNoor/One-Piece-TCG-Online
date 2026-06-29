/**
 * Layer 3 (UI board projection) leaf component for the "Functional
 * debug-style board" decision: one card rendered as a clear text/stat row
 * rather than a full-art tile (CardTile.tsx is reserved for the image-grid
 * Card Library/Deck Builder browsing experience). Tapping the row IS the
 * tap-to-select fallback the project requires; the small magnifier button
 * is the card zoom/preview entry point (opens CardDetailModal, supplied by
 * the parent — this component never owns that modal itself).
 */
import { CARD_COLOR_TOKENS } from '../../lib/cardColors';
import { Pill } from '../Pill';
import type { CardView } from '../../../board/projection';

export interface CardRowProps {
  card: CardView;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onZoom?: () => void;
}

function StatBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-bold text-white/80">
      <span className="text-white/40">{label}</span>
      {value}
    </span>
  );
}

export function CardRow({ card, selectable, selected, onSelect, onZoom }: CardRowProps) {
  const isRested = card.orientation === 'rested';

  return (
    <div
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(); } : undefined}
      className={[
        'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
        selected ? 'border-gold bg-gold/15' : 'border-white/10 bg-white/5',
        selectable ? 'cursor-pointer hover:border-white/30 hover:bg-white/10' : '',
        isRested ? 'opacity-70' : '',
      ].join(' ')}
    >
      <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
        <span className="flex gap-0.5">
          {card.colors.map((color) => (
            <span key={color} className={['h-2 w-2 rounded-full', CARD_COLOR_TOKENS[color].dotClassName].join(' ')} aria-hidden="true" />
          ))}
        </span>
        <span className="truncate text-xs font-semibold text-white">{card.name}</span>

        {card.power !== null && <StatBadge label="PWR" value={card.power} />}
        {card.cost !== null && <StatBadge label="C" value={card.cost} />}
        {card.life !== null && <StatBadge label="LIFE" value={card.life} />}
        {card.counter !== null && <StatBadge label="CTR" value={`+${card.counter}`} />}
        {card.donAttachedCount > 0 && <StatBadge label="DON" value={card.donAttachedCount} />}

        {card.orientation !== null && (
          <Pill tone={isRested ? 'neutral' : 'gold'}>{isRested ? 'Rested' : 'Active'}</Pill>
        )}
        {card.donRested && <Pill tone="neutral">Rested</Pill>}
        {card.summoningSick && <Pill tone="brand">Sick</Pill>}
        {card.hasBlocker && <Pill tone="navy">Blocker</Pill>}
        {card.hasRush && <Pill tone="navy">Rush</Pill>}
        {card.hasDoubleAttack && <Pill tone="navy">Double</Pill>}
        {card.isUnblockable && <Pill tone="navy">Unblockable</Pill>}
        {card.hasTrigger && <Pill tone="gold">Trigger</Pill>}
      </div>

      {onZoom && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onZoom(); }}
          aria-label={`Preview ${card.name}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/30 text-xs text-white/70 hover:bg-black/50 hover:text-white"
        >
          🔍
        </button>
      )}
    </div>
  );
}
