/**
 * Face-down stack visual for Deck, DON!! Deck and Trash zones.
 *
 * Field-size Deck renders with physical depth via ghost card layers:
 *
 *  The pile is anchored on its BOTTOM card and grows UPWARD from there, the
 *  way a real pile gains height on a table tilted toward the viewer (the mat
 *  carries a rotateX — see .op-match-playmat-layer). Only the sideways skew
 *  mirrors between the two halves of the board:
 *   - reverseRows=false (bottom player): stacks UP-RIGHT.
 *   - reverseRows=true  (top player):    stacks UP-LEFT.
 *  Each grows toward its own outer edge, away from the play field.
 *
 *  The container is EXACTLY one card and the BOTTOM (deepest) layer fills it,
 *  so the pile's anchor never moves: it stays dead centre in its cell whatever
 *  the deck's size, which is what keeps Deck lined up with Trash one row down.
 *  Nothing is reserved for the depth — reserving it made the pile bigger than
 *  the card it represents, pushing it off-centre and past its one-card-tall
 *  row, which the mat's overflow-hidden then sheared. The visible top card and
 *  the layers under it simply draw outside that box (the Deck cell passes
 *  allowOverflow, so nothing clips them), and the whole stack shortens back
 *  toward the anchor as the deck is drawn down.
 *
 *  Layer count: Math.min(Math.floor(count / 2), MAX_GHOSTS)
 *   → a fresh 50-card deck shows MAX_GHOSTS layers; a 4-card deck shows 2.
 *
 *  boardFocused: when true all ghost layers are suppressed so the pile
 *   doesn't compete with active board interaction.
 */
import { CardBackArt } from './CardBackArt';
import { cqh } from './boardScale';
import { CountBadge } from './CountBadge';

export type PileStackVariant = 'deck' | 'don' | 'trash';

const VARIANT_CLASSES: Record<PileStackVariant, string> = {
  deck:  'from-slate-700 to-slate-900 border-white/10',
  don:   'from-amber-700 to-amber-900 border-amber-400/20',
  trash: 'from-zinc-800 to-black border-white/10',
};

// Reference px per ghost layer, in the same units as every other board
// constant (see boardScale.ts): fed through cqh() so the pile's depth shrinks
// and grows with the board instead of staying a fixed pixel size.
const GHOST_STEP = 4;
const MAX_GHOSTS = 8;    // hard cap — the deepest layer sits 32 reference px off the top card

// Scale ghost layers with deck size: full ~50-card deck → MAX_GHOSTS, thins as cards are played.
// Divides by 6 so 48+ cards → 8 layers, 30 cards → 5, 12 cards → 2, <6 cards → 0–1.
/**
 * Where one layer of the pile sits, given how high it is above the bottom
 * card. `bottom` for both players (the pile grows up); the horizontal edge
 * mirrors so each half of the board leans toward its own outer edge.
 */
function layerOffset(offsetPx: number, reverseRows: boolean): { bottom: string; left?: string; right?: string } {
  const offset = cqh(offsetPx);
  return reverseRows ? { bottom: offset, right: offset } : { bottom: offset, left: offset };
}

function calcGhostCount(count: number, boardFocused: boolean): number {
  if (boardFocused || count <= 1) return 0;
  return Math.min(Math.ceil(count / 6), MAX_GHOSTS);
}

export interface PileStackProps {
  label: string;
  count: number;
  variant: PileStackVariant;
  size?: 'compact' | 'field';
  /** Mirrors PlayerBoardPanel's reverseRows — controls ghost depth direction. */
  reverseRows?: boolean;
  /** When true ghost layers are hidden (board is being interacted with). */
  boardFocused?: boolean;
  /** Seat this pile belongs to — lets a face-down deck pile show that deck's chosen main-deck sleeve. Omit to use the bundled default back. */
  playerId?: string;
  onClick?: () => void;
}

export function PileStack({
  label,
  count,
  variant,
  size = 'compact',
  reverseRows = false,
  boardFocused = false,
  playerId,
  onClick,
}: PileStackProps) {
  const isFieldDeck = variant === 'deck' && size === 'field';
  const ghosts = calcGhostCount(count, boardFocused);

  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
      {isFieldDeck ? (
        /*
         * Field deck — 3-D pile.
         *
         * Field deck — 3-D pile, anchored on its bottom card.
         *
         * Every layer is offset from the container by its own height in the
         * pile: the deepest (gi = 0) sits at 0 and fills the container, each
         * one above it steps GHOST_STEP further, and the visible top card ends
         * up ghosts * GHOST_STEP out. `bottom` is the anchored edge for both
         * players so the pile always grows UP; only the horizontal edge
         * mirrors — `left` for the bottom player (stack leans right), `right`
         * for the top player (stack leans left).
         *
         * Positive offsets against those edges, rather than negative ones
         * against top/left, because cqh() emits a min() of two lengths:
         * negated, min() would pick the larger magnitude and the mirror would
         * not match.
         *
         * CountBadge lives inside the top card div so it rides the visible
         * face rather than the container.
         */
        <button
          type="button"
          disabled={!onClick}
          onClick={onClick}
          className={[
            'relative flex-shrink-0',
            onClick ? 'cursor-pointer group/deck-pile' : 'cursor-default group/deck-pile',
          ].join(' ')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            width:  cqh(150),
            height: cqh(210),
          }}
        >
          {/* Ghost layers — rendered deepest first, so each higher layer (and
              finally the top card) paints over the one below it. */}
          {Array.from({ length: ghosts }, (_, gi) => (
            <div
              key={gi}
              aria-hidden="true"
              className="absolute overflow-hidden rounded-md"
              style={{
                width:  cqh(150),
                height: cqh(210),
                boxShadow: '0 0 0 1px rgba(255,255,255,0.10)',
                ...layerOffset(gi * GHOST_STEP, reverseRows),
              }}
            >
              <CardBackArt tone="navy" playerId={playerId} />
            </div>
          ))}

          {/* Top card — the highest layer, so it sits the full pile height out
              from the anchor. It slides back toward the anchor as the deck is
              drawn down, and all the way onto it when boardFocused drops the
              ghosts entirely; the transition makes that read as the pile
              settling rather than the card teleporting. */}
          <div
            aria-hidden="true"
            data-board-card-anchor
            className="absolute overflow-hidden rounded-md group-hover/deck-pile:-translate-y-0.5"
            style={{
              width:  cqh(150),
              height: cqh(210),
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              transition: 'bottom 0.2s ease, left 0.2s ease, right 0.2s ease',
              ...layerOffset(ghosts * GHOST_STEP, reverseRows),
            }}
          >
            <CardBackArt tone="navy" playerId={playerId} />
            <CountBadge count={count} />
          </div>
        </button>
      ) : (
        /* Compact variant (DON!! deck, Trash) — unchanged */
        <button
          type="button"
          disabled={!onClick}
          onClick={onClick}
          style={{ width: cqh(40), height: cqh(56) }}
          className={[
            'relative flex items-center justify-center overflow-hidden rounded-md border text-[10px] font-extrabold text-white/70 shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform',
            `bg-gradient-to-br ${VARIANT_CLASSES[variant]}`,
            onClick ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
          ].join(' ')}
        >
          <span className="relative z-10">{count}</span>
        </button>
      )}
      {/* Caption. The field deck hides it visually: that pile sits in a mat
          row that is exactly one card tall (PlayerBoardPanel's CARD_ROW_TRACK),
          so a caption below the card is 14px this pile does not have — it
          pushed the whole pile up out of its row and the mat's overflow-hidden
          sheared the top off it. The pile is already labelled by its CountBadge
          and by its cell's own sr-only "Deck" label, and the text stays in the
          DOM for screen readers. Compact piles keep the visible caption. */}
      <span className={['text-[8px] font-bold uppercase tracking-[0.14em] text-white/30', isFieldDeck ? 'sr-only' : ''].join(' ')}>{label}</span>
    </div>
  );
}
