/**
 * Layer 3 board leaf for a single DON!! card in a player's Cost Area. DON!!
 * has no card art in the API (it's a generic resource card, see
 * cards/decks/genericDonCard.ts), so it renders as a simple token rather
 * than forcing CardImage's "no image available" placeholder for every one
 * in the row. Same rotate-90-when-rested convention as BoardCardTile, for
 * the same reason: that's how a DON!! used to pay a cost actually looks on
 * a real table.
 */
export interface DonChipProps {
  card: { instanceId: string; donRested: boolean };
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

const BOX = 44;

export function DonChip({ card, selectable, selected, onSelect }: DonChipProps) {
  const rested = card.donRested;

  return (
    <div className="relative flex-shrink-0" style={{ width: BOX, height: BOX }}>
      <div
        role={selectable ? 'button' : undefined}
        tabIndex={selectable ? 0 : undefined}
        onClick={selectable ? onSelect : undefined}
        onKeyDown={selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(); } : undefined}
        className={[
          'absolute inset-0 flex items-center justify-center transition-transform duration-200',
          rested ? 'rotate-90' : '',
          selectable ? 'cursor-pointer' : '',
        ].join(' ')}
      >
        <div
          className={[
            'flex h-7 w-9 items-center justify-center rounded-md border text-[9px] font-extrabold uppercase tracking-tight shadow',
            rested ? 'border-white/10 bg-white/5 text-white/30' : 'border-amber-300/40 bg-gradient-to-b from-amber-400 to-amber-600 text-navy-950',
            selected ? 'ring-2 ring-amber-200' : '',
          ].join(' ')}
        >
          DON!!
        </div>
      </div>
    </div>
  );
}
