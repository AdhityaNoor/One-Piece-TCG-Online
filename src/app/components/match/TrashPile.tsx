/**
 * Layer 3 board leaf: the Trash zone, rendered as a face-up pile showing
 * the single most-recently-trashed card — `cards[0]`, "top of stack" per
 * zone.ts's documented convention (new cards are unshifted to the front via
 * addToZoneTop, see zoneOps.ts) — instead of a sealed card-back like Deck/
 * DON!! Deck use. Trash is public information in OPTCG (3-1-5), so showing
 * real card art here is correct, not a debug-mode concession.
 *
 * A single face-up card can't show what's underneath it, so clicking opens
 * the full TrashGalleryModal (see that file) for the complete pile.
 *
 * Lives in PlayerBoardPanel's boardRow, in the slot the Deck pile used to
 * occupy before Deck moved next to the Character Area — see
 * PlayerBoardPanel.tsx's stageTrashGroup/characterZone for why.
 */
import { CardImage } from '../CardImage';
import { cqh } from './boardScale';
import { CountBadge } from './CountBadge';
import type { CardView } from '../../../board/projection';

export interface TrashPileProps {
  cards: CardView[];
  onClick: () => void;
}

export function TrashPile({ cards, onClick }: TrashPileProps) {
  const topCard = cards[0] ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={cards.length === 0}
      style={{ width: cqh(150), height: cqh(210) }}
      className={[
        'relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-md shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform',
        // CardImage already draws its own border-gold/20 edge (same as every
        // other card-art instance — BoardCardTile doesn't fight this either,
        // see its CardImage usage), so the button itself stays borderless
        // when a card is showing, to avoid a visible double ring. The empty
        // state has no CardImage to supply a border, so it gets one here.
        topCard ? 'border-none' : 'border border-dashed border-white/15 bg-white/[0.03]',
        cards.length > 0 ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
      ].join(' ')}
      aria-label={topCard ? `Trash, ${cards.length} cards, top card ${topCard.name} — open gallery` : 'Trash, empty'}
    >
      {topCard ? (
        <>
          <CardImage src={topCard.imageUrl} alt={topCard.name} className="h-full w-full" />
          <CountBadge count={cards.length} />
        </>
      ) : (
        <span className="text-[9px] font-black uppercase tracking-wide text-white/25">Trash</span>
      )}
    </button>
  );
}
