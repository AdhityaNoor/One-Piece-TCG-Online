/**
 * Layer 3 board leaf: one player's Active or Rested DON!! pile.
 *
 * The pile is a fanned stack that always fits the box it is given. Its
 * container on the mat is one half of the DON!! row's spare width (see
 * PlayerBoardPanel's donRow), which is a percentage, not a card multiple —
 * so the per-card step is `min(natural step, room / (n - 1))`: the fan opens
 * to its comfortable spacing when the pile is small and tightens as it grows,
 * but the last card's box never leaves the container. That replaces the old
 * uncapped `CHIP_BOX + (n-1) * STEP_PX` span, which grew without limit and
 * had to be kept out of flow so it wouldn't shove the rest of the row aside.
 *
 * The natural step is taken from the pile's ON-SCREEN card width, which
 * differs by orientation: an active DON!! is upright (150 wide inside its
 * square box) while a rested one is rotated flat (210 wide). Stepping by a
 * constant fraction of that width leaves the same visible sliver of every
 * card either way.
 *
 * Every card in the stack is individually clickable — that sliver is the
 * whole point. There is deliberately no hover behaviour: this pile used to
 * open a full-screen portal popup on mouseenter so a specific DON!! could be
 * picked, which meant an idle cursor resting near the pile could black out
 * the board, and a pile whose length changed under a stationary cursor fired
 * a synthetic mouseenter and opened it with no hover intent at all. Selection
 * now happens in place, on the mat.
 */
import { cqh } from './boardScale';
import { CountBadge } from './CountBadge';
import { DonChip } from './DonChip';
import { useSeatDonArtUrl } from './MatchAccessoriesContext';
import type { CardView } from '../../../board/projection';

export type DonStackOrientation = 'active' | 'rested';

export interface DonStackProps {
  /** Screen-reader name for the pile ("Active" / "Rested"). Not painted — the mat's DON!! row has no room for a caption, and the chips' own rotation already reads as active vs rested. */
  label: string;
  playerId: string;
  cards: CardView[];
  /**
   * Which pile this is. Only affects the fan's natural step, which is a
   * fraction of the card's on-screen width — and a rested DON!! is rotated,
   * so it is CARD_HEIGHT_PX wide on screen rather than CARD_WIDTH_PX.
   */
  orientation: DonStackOrientation;
  selectable: (card: CardView) => boolean;
  selectedIds: Set<string>;
  onDonSelect: (card: CardView) => void;
}

/** DonChip's square box: the footprint a chip occupies whichever way it is turned. */
const CHIP_BOX_PX = 210;
/** On-screen width of the card art itself, by orientation (rested = rotated 90°). */
const VISIBLE_WIDTH_PX: Record<DonStackOrientation, number> = { active: 150, rested: 210 };
/** Comfortable fan spacing as a fraction of that visible width — the exposed sliver of each buried card. */
const STEP_RATIO = 0.34;

export function DonStack({ label, playerId, cards, orientation, selectable, selectedIds, onDonSelect }: DonStackProps) {
  const donArtUrl = useSeatDonArtUrl(playerId);
  // Room the fan may travel across = the container minus one whole chip box,
  // shared between the gaps. `min()` keeps the natural spacing until the pile
  // is long enough to need less. Guard n-1 so a 0/1-card pile never divides
  // by zero; with no gaps to place, the natural step is simply unused.
  const gaps = Math.max(cards.length - 1, 1);
  const naturalStep = cqh(VISIBLE_WIDTH_PX[orientation] * STEP_RATIO);
  const step = `min(${naturalStep}, calc((100% - ${cqh(CHIP_BOX_PX)}) / ${gaps}))`;

  return (
    <div
      className="relative h-full w-full"
      data-board-zone="costArea"
      data-board-player={playerId}
      aria-label={`${label} DON!!, ${cards.length}`}
    >
      {cards.length === 0 ? (
        <>
          {/* Anchor for card-flight animations targeting an empty pile, kept
              at a real chip's size and position so a DON!! flying in lands
              where the first chip will actually appear. */}
          <div
            aria-hidden="true"
            data-board-card-anchor
            className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
            style={{ width: cqh(150), height: cqh(210) }}
          />
          <div
            className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md border border-dashed border-white/15 text-[8px] font-bold uppercase text-white/20"
            style={{ width: cqh(150), height: cqh(210) }}
          >
            None
          </div>
        </>
      ) : (
        <>
          {cards.map((don, index) => (
            <div
              key={don.instanceId}
              className="absolute top-1/2 -translate-y-1/2"
              // Later cards sit on top, so the exposed sliver of each buried
              // card is its LEFT edge and the fan reads left-to-right.
              style={{ left: `calc(${index} * ${step})`, zIndex: index }}
            >
              <DonChip
                card={don}
                selectable={selectable(don)}
                selected={selectedIds.has(don.instanceId)}
                onSelect={() => onDonSelect(don)}
                donArtUrl={donArtUrl}
              />
            </div>
          ))}
          {/* Centred on the pile's own span rather than the half-row container,
              so the number sits on cards instead of floating in the gap left
              over when the pile is short. */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2"
            style={{
              left: `calc(${Math.max(cards.length - 1, 0)} / 2 * ${step})`,
              width: cqh(CHIP_BOX_PX),
              height: cqh(CHIP_BOX_PX),
              zIndex: cards.length + 1,
            }}
          >
            <CountBadge count={cards.length} />
          </div>
        </>
      )}
    </div>
  );
}
