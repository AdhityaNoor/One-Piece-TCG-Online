/**
 * Face-down stack visual for Deck, DON!! Deck and Trash zones.
 *
 * Field-size Deck renders with physical depth via ghost card layers:
 *
 *  Direction (reverseRows controls perspective):
 *   - reverseRows=true  (top player):   main card top-left,  ghosts go DOWN-RIGHT.
 *   - reverseRows=false (bottom player): main card top-right, ghosts go DOWN-LEFT.
 *
 *  Both players use top/left absolute positioning for predictability.
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

const GHOST_STEP = 4;    // px per ghost layer
const MAX_GHOSTS = 8;    // hard cap
const EXTRA = MAX_GHOSTS * GHOST_STEP; // 32 px — always reserved so layout stays stable

// Scale ghost layers with deck size: full ~50-card deck → MAX_GHOSTS, thins as cards are played.
// Divides by 6 so 48+ cards → 8 layers, 30 cards → 5, 12 cards → 2, <6 cards → 0–1.
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
  onClick?: () => void;
}

export function PileStack({
  label,
  count,
  variant,
  size = 'compact',
  reverseRows = false,
  boardFocused = false,
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
         * Container is always (card + EXTRA) in both axes so the board
         * layout never shifts as the deck empties.
         *
         * Top player  (reverseRows=true):  main card at top:0, left:0.
         *   Ghosts offset { top: +d, left: +d } → stacks DOWN-RIGHT.
         *
         * Bottom player (reverseRows=false): main card at top:0, left:EXTRA.
         *   Ghosts offset { top: +d, left: EXTRA-d } → stacks DOWN-LEFT.
         *
         * CountBadge lives inside the main card div so it centres on the
         * visible top card rather than the full container.
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
            width:  `calc(${cqh(150)} + ${EXTRA}px)`,
            height: `calc(${cqh(210)} + ${EXTRA}px)`,
          }}
        >
          {/* Ghost layers — rendered first so top card paints above them */}
          {Array.from({ length: ghosts }, (_, gi) => {
            const depth   = ghosts - gi;           // 1 = just below top … ghosts = deepest
            const xOffset = depth * GHOST_STEP;
            const yOffset = depth * GHOST_STEP;
            const opacity = 1;

            const posStyle = reverseRows
              ? { top: `${yOffset}px`, left: `${xOffset}px` }               // top player:    down-right
              : { top: `${yOffset}px`, left: `${EXTRA - xOffset}px` };      // bottom player: down-left

            return (
              <div
                key={gi}
                aria-hidden="true"
                className="absolute overflow-hidden rounded-md"
                style={{
                  width:  cqh(150),
                  height: cqh(210),
                  opacity,
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.10)',
                  ...posStyle,
                }}
              >
                <CardBackArt tone="navy" />
              </div>
            );
          })}

          {/* Top card — centred when boardFocused, otherwise anchored at near corner */}
          <div
            aria-hidden="true"
            data-board-card-anchor
            className="absolute overflow-hidden rounded-md group-hover/deck-pile:-translate-y-0.5"
            style={{
              width:  cqh(150),
              height: cqh(210),
              top:  boardFocused ? EXTRA / 2 : 0,
              left: boardFocused ? EXTRA / 2 : (reverseRows ? 0 : EXTRA),
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              transition: 'top 0.2s ease, left 0.2s ease',
            }}
          >
            <CardBackArt tone="navy" />
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
      <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/30">{label}</span>
    </div>
  );
}
