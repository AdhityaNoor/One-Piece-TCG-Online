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

const CARD_WIDTH = 54;
const CARD_HEIGHT = 76;
const BOX = CARD_HEIGHT;

export function DonChip({ card, selectable, selected, onSelect }: DonChipProps) {
  return (
    <div className="relative flex-shrink-0" style={{ width: BOX, height: BOX }}>
      <div
        role={selectable ? 'button' : undefined}
        tabIndex={selectable ? 0 : undefined}
        onClick={selectable ? onSelect : undefined}
        onKeyDown={selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(); } : undefined}
        className={[
          'absolute inset-0 flex items-center justify-center transition-transform duration-200',
          selectable ? 'cursor-pointer' : '',
        ].join(' ')}
      >
        <div
          className={[
            'relative overflow-hidden rounded-md border border-emerald-500/45 bg-white text-[10px] font-black uppercase tracking-tight text-emerald-900 shadow-[0_5px_12px_rgba(0,0,0,0.28)]',
            selected ? 'ring-2 ring-emerald-200' : '',
          ].join(' ')}
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        >
          <div className="absolute inset-1 rounded border border-emerald-500/35" />
          <div className="absolute left-1/2 top-2 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-emerald-500/45" />
          <div className="absolute inset-x-1 bottom-2 h-2 rounded-full bg-emerald-500/20" />
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">DON!!</span>
        </div>
      </div>
    </div>
  );
}
