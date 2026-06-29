/**
 * Layer 3 board leaf for a single DON!! card in a player's Cost Area. DON!!
 * has no card art in the API (it's a generic resource card, see
 * cards/decks/genericDonCard.ts), so it renders the real DON!! token artwork
 * (provided by the user, stored as static UI chrome at public/ui/don-token.png
 * — NOT fetched from any card API at runtime) rather than forcing CardImage's
 * "no image available" placeholder for every one in the row. Same
 * rotate-90-when-rested convention as BoardCardTile, for the same reason:
 * that's how a DON!! used to pay a cost actually looks on a real table.
 */
import { cqh } from './boardScale';

const DON_TOKEN_SRC = '/ui/don-token.png';

export interface DonChipProps {
  card: { instanceId: string; donRested: boolean };
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

// Same footprint as every other field card (BoardCardTile's 'field' size,
// PlayerBoardPanel's FIELD_CARD_WIDTH/HEIGHT) — DON!! chips used to be a
// smaller token, but the design now wants them reading as full-size cards.
// cqh-based (see boardScale.ts) so chips shrink/grow with the board's
// height instead of staying a fixed pixel size.
const CARD_WIDTH = cqh(150);
const CARD_HEIGHT = cqh(210);
const BOX = cqh(210);

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
            'relative overflow-hidden rounded-md shadow-[0_5px_12px_rgba(0,0,0,0.5)]',
            selected ? 'ring-2 ring-white/80' : '',
          ].join(' ')}
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        >
          <img src={DON_TOKEN_SRC} alt="" aria-hidden="true" className="block h-full w-full object-cover" draggable={false} />
        </div>
      </div>
    </div>
  );
}
