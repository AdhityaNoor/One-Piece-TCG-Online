import { type CSSProperties, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsWideDeckLayout } from '../hooks/useIsWideDeckLayout';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import { resolveAccessoryImageUrl, type DeckAccessories, type DeckAccessorySelection } from '../../cards/accessories';
import type { CardCategory, Color } from '../../engine/state/card';
import { Button, CanvasMenuButton, DeckFormatBadge, GameCanvasScreen, Modal } from '../components';
import { resolveAssetUrl } from '../lib/assetUrl';
import { DEFAULT_DON_ART_URL, DEFAULT_DON_SLEEVE_URL, DEFAULT_MAIN_SLEEVE_URL } from '../lib/savedDeckToSetupInput';
import { CARD_COLOR_TOKENS } from '../lib/cardColors';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

// ─── Color palette ────────────────────────────────────────────────────────────

const DECK_BOX_COLOR_HEX: Record<Color, string> = {
  red: '#c0242e',
  green: '#11945c',
  blue: '#1e72c3',
  purple: '#7e3ac7',
  black: '#111624',
  yellow: '#e0b02a',
};

// ─── Surface styles ───────────────────────────────────────────────────────────

/**
 * ONE light model, applied to every face — a single key light high and to the
 * front-left of the box, plus ambient fill.
 *
 * The faces used to be shaded independently and it showed. The front had a
 * diagonal sweep from the top-left; the RIGHT face had a purely horizontal
 * gradient with a bright band down its MIDDLE (a specular stripe with no
 * source, and in places brighter than the front, which reads as a differently
 * lit object glued on); and the TOP face went white at its far edge to 55%
 * black at its near one, laying a dark bar across the box's top-front corner —
 * exactly the edge that should be the brightest thing in the drawing.
 *
 * What replaces it:
 *
 *  - `verticalKey` is shared by BOTH upright faces (front and right). They are
 *    parallel to gravity and lit from the same place, so they take the same
 *    top-bright/bottom-dark ramp. That shared term is what makes them read as
 *    two planes of one object; the right face having no vertical component at
 *    all was the single biggest tell.
 *  - The right face then takes a flat multiplier on top, because it is turned
 *    away from the key: darkest of the three, with the lift only at its FRONT
 *    edge (local x=0, which `rotateY(90deg)` puts nearest the viewer) where
 *    the corner catches the light.
 *  - The top face is the brightest and nearly flat — it faces the key almost
 *    head on. Its ramp runs the other way (local y=100% is the NEAR edge, the
 *    one `rotateX(90deg)` swings toward the viewer), so it brightens toward
 *    the front corner instead of dropping into shadow there.
 *
 * Face order by luminance is therefore top > front > right, and no face
 * reverses direction against another. `art` is the same key laid over the card
 * scan itself: without it the printed face stayed flat-lit inside a shaded box
 * and read as a sticker rather than as part of the object.
 */
const VERTICAL_KEY =
  'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 26%, rgba(0,0,0,0.10) 58%, rgba(0,0,0,0.42) 100%)';

function buildDeckBoxSurfaceStyles(colors: Color[] | undefined): {
  front: CSSProperties;
  side: CSSProperties;
  top: CSSProperties;
  lid: CSSProperties;
  art: CSSProperties;
} {
  const [first = 'blue', second] = colors && colors.length > 0 ? colors : ['blue'];
  const c1 = DECK_BOX_COLOR_HEX[first];
  const c2 = second ? DECK_BOX_COLOR_HEX[second] : c1;

  // Front: left-half = c1, right-half = c2
  const frontSplit = second
    ? `linear-gradient(90deg, ${c1} 0 50%, ${c2} 50% 100%)`
    : c1;

  // Key falls from the front-left, so an upright face also loses a little
  // light across its width. Gentle — this is the secondary term; the vertical
  // ramp above is what carries the form.
  const frontSweep =
    'linear-gradient(105deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0.18) 100%)';

  // Turned away from the key: a flat multiplier over the whole face, lifted
  // only in the first few percent — the front corner's catchlight.
  const sideTurn =
    'linear-gradient(90deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.24) 16%, rgba(0,0,0,0.50) 100%)';

  return {
    front: {
      background: `${VERTICAL_KEY}, ${frontSweep}, ${frontSplit}`,
    },
    // RIGHT side face → c2, the darkest plane.
    side: {
      background: `${VERTICAL_KEY}, ${sideTurn}, ${c2}`,
    },
    // TOP face (the lid surface) → brightest, brightening toward the near edge.
    top: {
      background: `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.18) 62%, rgba(255,255,255,0.30) 100%), ${frontSplit}`,
    },
    // The lid BAND on the front face is an upright surface, not the lid's top:
    // it belongs to the front's light, just nearer the top of the ramp. It used
    // to borrow the top face's gradient, which is why the band went dark at its
    // own bottom edge and stacked a second shadow onto the seam below it.
    lid: {
      background: `linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 70%, rgba(0,0,0,0.06) 100%), ${frontSweep}, ${frontSplit}`,
    },
    // Laid over the card scan so the print takes the same light as the box.
    art: {
      background:
        'linear-gradient(160deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0) 34%, rgba(0,0,0,0.10) 66%, rgba(0,0,0,0.30) 100%)',
    },
  };
}

// ─── 3D Deck Box ──────────────────────────────────────────────────────────────

/*
 * Physical proportions: 95 × 71 × 46 mm (H × W × D).  H/W ratio = 1.338.
 * CSS: W = 8rem → H = 10.75rem.  D = 3.5rem (visual approximation — the
 * physical 5.18rem overwhelms the front face in CSS perspective at any sane
 * viewing angle; 3.5rem lets the side strip read as "thick box" without
 * competing with the art).
 *
 * Geometry — proper CSS 3D, NOT the fold-out hack:
 *   All faces centred at the box's geometric centre in the DOM, then moved
 *   to their edge with translateZ AFTER the face rotation:
 *
 *     front : translateZ(+D/2)              — pushed D/2 toward viewer
 *     right : rotateY( 90deg) translateZ(W/2) — pivot to right edge
 *     top   : rotateX( 90deg) translateZ(H/2) — pivot to top edge
 *
 *   This guarantees all three edges share the same corner point
 *   (W, 0, D/2) by construction — verified algebraically in dev notes.
 *
 * Viewing angle: rotateX(-15deg) rotateY(-25deg)
 *   rotateX(-15deg) → top tilts toward viewer   → top face visible
 *   rotateY(-25deg) → right tilts toward viewer  → right face visible
 *
 * Lid: top 24 % of the front / side faces; the TOP face IS the lid surface.
 */

// All values are plain numbers (rem) so we can compute derived values.
const BH  = 18.375;          // box height (rem)  — 14.7 × 1.25
const BW  = BH * 63 / 88;    // ~13.16rem — front/back match a card's 63:88 ratio
const BD  = 8.125;   // box depth  (rem)  — 6.5 × 1.25
const HW  = BW / 2;  // ~6.58rem
const HH  = BH / 2;  // 7.35rem
const HD  = BD / 2;  // 3.25rem
const LID   = BH * 0.24 * 0.30; // ~1.06rem — lid section on front/side faces (30% of prior height)
const FRAME = 0.45;             // rem — box-material bezel around the card window

// Seam gradient — reused on both front and side faces.
// A crease is two lines, not three bands: the groove's upper wall in shadow
// and its lower lip catching the key. The old three-stop version (dark →
// light → dark over 3px) read as a printed stripe because the second dark
// stop has nothing to cast it.
const SEAM_BG = 'linear-gradient(180deg, rgba(0,0,0,0.70) 0 50%, rgba(255,255,255,0.20) 50% 100%)';
const SEAM_H = '2px';

interface DeckBox3DProps {
  entry: DeckStoreListEntry;
  deck: DeckLoadResult;
  compact?: boolean;
  /**
   * 'peek' is the neighbouring deck shown cropped behind each cycle arrow.
   * Three things change: it is not draggable (it is scenery, and a drag there
   * would fight the click that cycles to it), it is smaller, and its wrapper
   * is EXACTLY the front face's footprint with the box group at 0,0 instead of
   * the main variant's padded slot. That last one is what makes cropping
   * predictable: anchoring the wrapper's right edge to the crop window's right
   * edge puts the box's own right edge there, with no guessing at how much
   * transparent margin sits in between.
   */
  variant?: 'main' | 'peek';
  /** Peek only: yaw, so the queued boxes read as turned rather than cloned. */
  poseRy?: number;
  /**
   * Box scale, measured by the showcase from its own width (see `useBoxFit`).
   * Overrides the `compact` default, which is a breakpoint guess and cannot
   * know how much room this particular column actually got.
   */
  scale?: number;
}

const BASE_RX = -15;
const BASE_RY = -25;
/** Neighbour boxes, relative to the main one. */
const PEEK_SCALE = 0.66;

/**
 * How much wider/taller the RENDERED box is than the element it lives in.
 *
 * The faces leave the wrapper's footprint: the front is pushed toward the
 * viewer (so perspective magnifies it), and the side and top swing outside it.
 * Measured off a real render at the default pose — 166.2 x 226.2 for a
 * 138.9 x 194 wrapper. Everything that has to reserve room for the box, or
 * crop it, needs these; guessing from the wrapper's own size undersizes it by
 * a fifth.
 */
const BOX_RENDER_W = 1.196;
const BOX_RENDER_H = 1.166;

function DeckBox3D({ entry, deck, compact = false, variant = 'main', poseRy, scale: scaleOverride }: DeckBox3DProps) {
  const loadedDeck = deck.ok ? deck.deck : null;
  const leader     = loadedDeck?.leader;
  const imageUrl   = leader?.imageUrl ?? null;
  const leaderName = leader?.definition.name ?? 'Unavailable';
  const colors     = leader?.definition.colors;
  const surf       = buildDeckBoxSurfaceStyles(colors);
  const peek       = variant === 'peek';
  const scale      = (scaleOverride ?? (compact ? 0.58 : 1)) * (peek ? PEEK_SCALE : 1);
  const bh         = BH * scale;
  const bw         = BW * scale;
  const bd         = BD * scale;
  const hw         = bw / 2;
  const hh         = bh / 2;
  const hd         = bd / 2;
  const lid        = LID * scale;
  const frame      = Math.max(0.26, FRAME * scale);

  // ── Drag-to-tilt ──────────────────────────────────────────────────────────
  const [tilt, setTilt] = useState({ rx: BASE_RX, ry: BASE_RY });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (peek) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = { x: e.clientX, y: e.clientY, rx: tilt.rx, ry: tilt.ry };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    setTilt({
      rx: Math.max(-45, Math.min(10,  dragOrigin.current.rx - dy * 0.4)),
      ry: Math.max(-65, Math.min(25,  dragOrigin.current.ry + dx * 0.4)),
    });
  };

  const onPointerUp = () => {
    dragOrigin.current = null;
    setDragging(false);
    setTilt({ rx: BASE_RX, ry: BASE_RY }); // spring back to default
  };

  return (
    /*
     * Perspective wrapper.  overflow:visible so the rotated box can bleed
     * outside its DOM footprint.  Width/height are the DOM slot size for the
     * gallery flex layout; the actual rendered box is larger.
     */
    <div
      className={`relative overflow-visible select-none ${peek ? '' : dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        // The main slot used to be `bw + 7rem` wide with the box group pinned
        // at 1.5rem — 1.5rem of margin on the left and 5.5rem on the right.
        // Centred in a flex row, that put the box visibly left of centre, and
        // it is why the previous-deck peek was almost entirely covered while
        // the next-deck one had room to spare. `+3` with the group at 1.5
        // leaves 1.5 on BOTH sides, which is more than the ~1.3rem the
        // perspective bleeds anyway.
        width: peek ? `${bw}rem` : `${bw + 3 * scale}rem`,
        height: peek ? `${bh}rem` : `${bh + 6 * scale}rem`,
        perspective: compact ? '900px' : '1400px',
        perspectiveOrigin: '55% 45%',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Ground shadow — flat ellipse beneath the box, outside the 3D group so
          it renders in normal 2D flow and isn't distorted by perspective. */}
      {!peek && (
      <>
      <div
        className="absolute"
        style={{
          bottom: '1rem',
          left: '50%',
          // Offset away from the key light rather than centred: a shadow
          // directly under a side-lit object is the one thing that always
          // reads as "flat sticker with a blur behind it".
          transform: `translateX(calc(-50% + ${0.7 * scale}rem))`,
          width: `${bw * 1.35}rem`,
          height: `${2.2 * scale}rem`,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.22) 45%, transparent 72%)',
          filter: 'blur(12px)',
        }}
      />
      {/* Contact shadow — small, dark and barely blurred, right where the box
          meets the surface. A single soft ellipse can only ever look like fog;
          the hard core is what plants the box on the ground. */}
      <div
        className="absolute"
        style={{
          bottom: `${1.35 * scale}rem`,
          left: '50%',
          transform: `translateX(calc(-50% + ${0.35 * scale}rem))`,
          width: `${bw * 0.86}rem`,
          height: `${0.7 * scale}rem`,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.72) 0%, transparent 70%)',
          filter: 'blur(4px)',
        }}
      />
      </>
      )}

      {/*
       * The 3D box group.  transform-style:preserve-3d passes the 3D context
       * down to all child faces.  The group itself is W × H in the DOM and sits
       * centred in the wrapper; faces use position:absolute and overflow it.
       */}
      <div
        className={`absolute [transform-style:preserve-3d] ${dragging ? '' : 'transition-[transform] duration-300'}`}
        style={{
          left: peek ? 0 : `${1.5 * scale}rem`, top: peek ? 0 : `${1.5 * scale}rem`,
          width: `${bw}rem`, height: `${bh}rem`,
          transform: `rotateX(${tilt.rx}deg) rotateY(${peek ? poseRy ?? BASE_RY : tilt.ry}deg)`,
        }}
      >

        {/* ══════════════ FRONT FACE ══════════════
         *  translateZ(+HD) pushes it HD toward viewer.
         *  Subdivided: lid band → seam → body (card art + name strip).
         */}
        <div
          className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
          style={{
            ...surf.front,
            transform: `translateZ(${hd}rem)`,
            borderRadius: '3px',
            // The cast shadow, plus a hairline of the material's own darkened
            // edge — without it the face ends on a hard colour boundary and
            // the box loses its thickness at the silhouette.
            boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.35)',
          }}
        >
          {/* Card window — inset so the box material (front face background)
              reads as a bezel/frame around the card. Face and card share the
              63:88 ratio, so object-cover shows the whole card, centred, with
              only the thin bezel cropped. */}
          <div className="absolute overflow-hidden rounded-[2px]" style={{ top: `${lid}rem`, left: `${frame}rem`, right: `${frame}rem`, bottom: `${frame}rem` }}>
            {imageUrl ? (
              <img src={resolveAssetUrl(imageUrl) ?? undefined} alt={leaderName} className="absolute inset-0 h-full w-full object-cover object-center" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black/40 text-[8px] font-black uppercase tracking-widest text-white/20">
                No Image
              </div>
            )}
            {/* The print is part of the box, so it takes the box's light. */}
            <div className="pointer-events-none absolute inset-0 rounded-[2px]" style={surf.art} />
            <div className="pointer-events-none absolute inset-0 rounded-[2px] ring-1 ring-inset ring-black/40" />
          </div>

          {/* Lid — opaque box-material band covering the top of the card */}
          <div className="absolute left-0 right-0 top-0 overflow-hidden" style={{ ...surf.lid, height: `${lid}rem`, borderRadius: '3px 3px 0 0' }}>
            {colors && colors.length > 0 && (
              <div className="absolute bottom-1 right-2 flex gap-1">
                {colors.map((c) => (
                  <span key={c} className={['h-1.5 w-1.5 rounded-full ring-1 ring-black/40', CARD_COLOR_TOKENS[c].dotClassName].join(' ')} />
                ))}
              </div>
            )}
          </div>

          {/* Seam crease under the lid */}
          <div className="absolute left-0 right-0" style={{ top: `${lid}rem`, height: SEAM_H, background: SEAM_BG }} />

          {/* Name label — overlays the bottom edge of the card, inside the bezel */}
          <div className="absolute flex items-end px-2 pb-1" style={{ left: `${frame}rem`, right: `${frame}rem`, bottom: `${frame}rem`, height: `${2.4 * scale}rem` }}>
            <div className="pointer-events-none absolute inset-0 rounded-b-[2px] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
            <p className="relative min-w-0 flex-1 truncate text-[7.5px] font-black uppercase tracking-[0.16em] text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {entry.name}
            </p>
          </div>
        </div>

        {/* ══════════════ RIGHT FACE ══════════════
         *  Element sized D × H, centred at the box's geometric centre.
         *  rotateY(90deg) makes it perpendicular to the front.
         *  translateZ(W/2) moves it to the right edge of the box.
         *
         *  Centring in parent: left = HW - HD, so element centre = HW. ✓
         */}
        <div
          className="absolute overflow-hidden [backface-visibility:hidden]"
          style={{
            ...surf.side,
            top: 0,
            left: `${hw - hd}rem`,
            width: `${bd}rem`,
            height: `${bh}rem`,
            transform: `rotateY(90deg) translateZ(${hw}rem)`,
            borderRadius: '0 3px 3px 0',
            // One catchlight on the front corner + a single ambient darkening.
            // The old pair (a wide white inset on one side, a wide black one on
            // the other) fought the face's own gradient and banded.
            boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.16), inset 0 0 34px rgba(0,0,0,0.38)',
          }}
        >
          {/* Lid sheen on side */}
          {/* `via-white/08` here generated no class at all in Tailwind 3 (the
              /12, /8, /6 gap — see the project's tailwind-opacity-scale note),
              so the sheen was a two-stop ramp pretending to be three. */}
          <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-white/25 via-white/10 to-transparent" style={{ height: `${lid}rem` }} />
          {/* Seam on side — same position as front seam */}
          <div className="absolute left-0 right-0" style={{ top: `${lid}rem`, height: SEAM_H, background: SEAM_BG }} />
        </div>

        {/* ══════════════ TOP FACE (lid surface) ══════════════
         *  Element sized W × D, centred at the box's geometric centre.
         *  rotateX(90deg) makes it perpendicular (horizontal).
         *  translateZ(H/2) moves it to the top edge of the box.
         *
         *  Centring in parent: top = HH - HD, so element centre = HH. ✓
         *
         *  With parent rotateX(-15deg), net = -15+90 = 75deg from viewer →
         *  top face visible as a lit strip (sin15 ≈ 26% of D wide).
         */}
        <div
          className="absolute [backface-visibility:hidden]"
          style={{
            ...surf.top,
            left: 0,
            top: `${hh - hd}rem`,
            width: `${bw}rem`,
            height: `${bd}rem`,
            transform: `rotateX(90deg) translateZ(${hh}rem)`,
            borderRadius: '3px 3px 0 0',
            // Local bottom is the NEAR edge (rotateX(90deg) swings it toward
            // the viewer), so the catchlight goes there — it is the box's
            // top-front corner. The old rule put a soft white glow on the FAR
            // edge and 55% black on this one, which is what laid a dark bar
            // across the brightest edge of the whole drawing.
            boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.24), inset 0 12px 22px rgba(0,0,0,0.22)',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Fits the whole showcase — main box plus both peeks — to the space the column
 * actually got, instead of picking a size off a breakpoint.
 *
 * The old sizing was a single `compact` boolean (0.58 or 1.0) from a media
 * query. That cannot work here: the overview column is the 1 of a 1:3 split
 * inside a panel whose own width depends on the deck-picker aside, so at
 * 1920x1080 it lands at roughly 390px while the box renders ~252px wide — the
 * two peeks then had ~60px of real estate between them and were mostly hidden
 * behind the box. The same arithmetic on a 1366 screen leaves no room at all.
 *
 * The split: the main box takes MAIN_SHARE of the row and each peek PEEK_SHARE,
 * summing just under 1 so the arrows and gaps still have somewhere to be.
 * Height is a second bound because the row is a fixed-height flex child at
 * `xl` — whichever runs out first wins, and neither may exceed 1.0 (the box's
 * artwork is a fixed asset; scaling past its natural size only softens it).
 */
const MAIN_SHARE = 0.6;
const PEEK_SHARE = 0.18;
/**
 * How much of a peek box the crop window shows. A share of the ROW alone is
 * not enough: on a wide column that share came out nearly as wide as the peek
 * box itself, so the "crop" showed the whole box — left edge, right edge and
 * all — which is not a peek, it is a third deck box parked behind the arrow.
 * The window is therefore the SMALLER of a share of the row (so it never
 * collides with the main box) and a share of the box (so it always crops).
 */
const PEEK_VISIBLE = 0.55;
/** Never shrink past this, even in a column too narrow to deserve a showcase. */
const MIN_BOX_SCALE = 0.34;

interface BoxFit {
  /** Scale for the main box; peeks multiply this by PEEK_SCALE themselves. */
  scale: number;
  /** Width of each peek's crop window, in px. 0 until the row is measured. */
  peekWidth: number;
}

function useBoxFit(ref: React.RefObject<HTMLDivElement>, fallbackScale: number, heightBounded: boolean): BoxFit {
  const [fit, setFit] = useState<BoxFit>({ scale: fallbackScale, peekWidth: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = (width: number, height: number): void => {
      if (width <= 0) return;
      // rem is read rather than assumed 16: the app shell rescales some type,
      // and every box constant in this file is authored in rem.
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const naturalW = BW * rem * BOX_RENDER_W;
      const naturalH = BH * rem * BOX_RENDER_H;
      const byWidth = (width * MAIN_SHARE) / naturalW;
      // Height is only a real bound at `xl`, where this row is a fixed-height
      // flex child of an overflow-hidden column. Below that the page scrolls
      // and the row is CONTENT-sized — measuring its height there and feeding
      // that back into the box's size is a shrinking loop: smaller box, shorter
      // row, smaller box again.
      const byHeight = heightBounded && height > 120 ? height / naturalH : Infinity;
      const scale = Math.max(MIN_BOX_SCALE, Math.min(1, byWidth, byHeight));
      const peekWidth = Math.min(width * PEEK_SHARE, BW * rem * scale * PEEK_SCALE * PEEK_VISIBLE);
      setFit((prev) =>
        Math.abs(prev.scale - scale) < 0.005 && Math.abs(prev.peekWidth - peekWidth) < 0.5
          ? prev
          : { scale, peekWidth },
      );
    };
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) measure(box.width, box.height);
    });
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    measure(rect.width, rect.height);
    return () => observer.disconnect();
  }, [ref, fallbackScale, heightBounded]);

  return fit;
}

/**
 * Which way the shelf just moved, and a key that changes on every move.
 *
 * The key is what actually restarts the animation: the boxes are re-rendered
 * with new content rather than unmounted, and a CSS animation on a surviving
 * element does not replay. Remounting on a bumped key is the cheapest honest
 * way to say "this is a new arrival".
 */
type SlideState = { dir: 'prev' | 'next'; key: number };

const SLIDE_EASE = '320ms cubic-bezier(0.22, 0.61, 0.36, 1) both';

function boxAnimation(slide: SlideState): string | undefined {
  if (slide.key === 0) return undefined; // first paint is not a transition
  return `op-deck-slide-${slide.dir} ${SLIDE_EASE}`;
}

function peekAnimation(slide: SlideState): string | undefined {
  if (slide.key === 0) return undefined;
  return `op-deck-peek-${slide.dir} ${SLIDE_EASE}`;
}

/**
 * The previous / next deck, cropped behind its cycle arrow, so the showcase
 * reads as a shelf you are moving along rather than one box that teleports.
 *
 * Absolutely positioned and OUT of the row's flex flow on purpose: taking real
 * layout width here would come straight out of the centre column, which is
 * already the tight one (the overview column is the 1 of a 1:3 split at `xl`
 * and the box's size is fixed in rem, so it has no give). Cropped scenery
 * behind the arrow costs the main box nothing.
 *
 * The crop shows the edge FACING the centre — the previous deck's right edge,
 * the next deck's left — so the two read as a shelf continuing past the arrows
 * rather than as two more boxes parked there.
 *
 * ALWAYS GIVE THE BOX BOTH AN OFFSET AND AN EXPLICIT WIDTH. An absolutely
 * positioned box with `width: auto` shrink-to-fits against the space its
 * offsets leave, so a bare `right: 0` in an 88px window clamped the wrapper to
 * 88px; the fixed-width box inside then overflowed to the RIGHT of that clamp,
 * starting at the window's LEFT edge — so the previous deck showed its left
 * edge, the exact opposite of what was asked for, and both peeks ended up
 * cropped the same way.
 *
 * `PEEK_BLEED` is the perspective overhang: the rendered box is wider than its
 * wrapper (the near face is pushed toward the viewer, and the side and top
 * faces swing outside the wrapper's footprint). Measured at ~14px for the
 * default pose at peek scale, i.e. ~1.3rem per unit of scale. Without it the
 * side face is sliced off at the very edge the crop is supposed to show.
 *
 * Both boxes keep a NEGATIVE yaw: only the front, right and top faces exist, so
 * a positive yaw swings the missing left/back faces into view and the box
 * renders as a hole. The previous deck is turned only slightly (-14) because
 * its RIGHT portion is what shows and a heavier turn would fill the whole crop
 * with the blank side panel; the next deck, showing its front-left, can take
 * the fuller -30.
 */
const PEEK_BLEED = 1.3;
function DeckBoxPeek({ row, side, boxScale, windowWidth, compact, slide }: {
  row: SavedDeckRow;
  side: 'left' | 'right';
  /** The MAIN box's scale; the peek applies PEEK_SCALE on top of it itself. */
  boxScale: number;
  /** Crop-window width in px, measured off the row (see useBoxFit). */
  windowWidth: number;
  compact: boolean;
  slide: SlideState;
}) {
  const bleed = `${PEEK_BLEED * boxScale * PEEK_SCALE}rem`;
  const boxWidth = `${BW * boxScale * PEEK_SCALE}rem`;
  const shade = side === 'left' ? '270deg' : '90deg';
  // Previous deck: pull the box left until its RENDERED right edge lands on the
  // window's right edge. Next deck: push it right by the bleed so its rendered
  // LEFT edge lands on the window's left edge. Both an offset AND a width, so
  // the anchor holds at any window width — which is what lets the window be a
  // measured px value rather than a constant this function has to know.
  // `right: +bleed`, not -bleed. The RENDERED box overhangs its wrapper by
  // `bleed` on each side, so pulling the wrapper's right edge INSIDE the window
  // by that much is what lands the rendered edge exactly on the window's edge.
  // Negating it pushed the box outward instead — which, on a column wide enough
  // for the window to approach the box's own width, slid the box's LEFT edge
  // into view and turned the crop into a whole second box.
  const anchor: CSSProperties =
    side === 'left'
      ? { right: bleed, width: boxWidth }
      : { left: bleed, width: boxWidth };
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 z-0 hidden overflow-hidden sm:block"
      style={{ [side]: 0, width: `${windowWidth}px` }}
    >
      <div className="absolute top-1/2 -translate-y-1/2" style={anchor}>
        {/* The slide lives on an inner element because this one's centring is
            itself a transform (-translate-y-1/2) — animating transform here
            would drop the box half a box-height down for the duration. */}
        <div key={slide.key} className="op-deck-slide opacity-70" style={{ animation: peekAnimation(slide) }}>
          <DeckBox3D entry={row.entry} deck={row.deck} compact={compact} scale={boxScale} variant="peek" poseRy={side === 'left' ? -14 : -30} />
        </div>
      </div>
      {/* Fades into the panel toward the outer edge, so the crop reads as
          depth rather than as a box someone cut in half. */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(${shade}, rgba(3,9,24,0) 0%, rgba(3,9,24,0.55) 45%, rgba(3,9,24,0.92) 88%)` }}
      />
    </div>
  );
}

// ─── Card list row ────────────────────────────────────────────────────────────

const CATEGORY_ORDER: CardCategory[] = ['leader', 'character', 'event', 'stage', 'don'];

interface CardRowSnapshot {
  cardNumber: string;
  imageUrl: string | null;
  quantity: number;
  definition: { name: string; category: CardCategory };
}

// Per-category color code. This used to be a gradient rail overlaid down the
// left edge of the card art, which sat on top of the scan and read as damage
// to the artwork; it now tints the title caption instead, where it labels the
// card without touching the image.
const CATEGORY_BAR: Record<CardCategory, string> = {
  leader: 'bg-gold',
  character: 'bg-cyan-300',
  event: 'bg-violet-300',
  stage: 'bg-emerald-300',
  don: 'bg-amber-300',
};

/**
 * Image-gallery tile: name + card number caption above the art (no type
 * badge — dropped on purpose), the card's own scan below it, and the copy
 * count as a bold corner badge. Hovering still pops a bigger preview near
 * the cursor on top of the inline art.
 */
function DeckCardRow({ snap }: { snap: CardRowSnapshot }) {
  const [previewPoint, setPreviewPoint] = useState<{ x: number; y: number } | null>(null);
  const imageSrc = resolveAssetUrl(snap.imageUrl);
  const previewLeft =
    previewPoint && typeof window !== 'undefined'
      ? Math.max(16, Math.min(previewPoint.x + 18, window.innerWidth - 500))
      : 0;
  const previewTop =
    previewPoint && typeof window !== 'undefined'
      ? Math.max(16, Math.min(previewPoint.y + 18, window.innerHeight - 710))
      : 0;

  return (
    <div
      className="op-deck-card-row group relative flex flex-col overflow-hidden bg-black/60 shadow-[0_8px_18px_rgba(0,0,0,0.28)]"
      onMouseEnter={(event) => imageSrc && setPreviewPoint({ x: event.clientX, y: event.clientY })}
      onMouseMove={(event) => imageSrc && setPreviewPoint({ x: event.clientX, y: event.clientY })}
      onMouseLeave={() => setPreviewPoint(null)}
    >
      {/* Name / code caption sits above the art, gallery-style. The category
          color-code lives here as a short bar beside the title. */}
      <div className="flex items-stretch gap-1.5 px-2 py-1.5">
        {/* self-stretch spans both caption lines (name + card number) because
            the row is items-stretch. */}
        <span
          aria-hidden="true"
          className={['w-[3px] flex-shrink-0 self-stretch rounded-full', CATEGORY_BAR[snap.definition.category]].join(' ')}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.03em] text-white/90">{snap.definition.name}</p>
          <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">{snap.cardNumber}</p>
        </div>
      </div>

      <div className="relative aspect-[63/88] w-full flex-shrink-0 overflow-hidden bg-black/40">
        {imageSrc && (
          <img src={imageSrc} alt={snap.definition.name} className="h-full w-full object-cover object-top" />
        )}
        {/* Copy count, centered over the art as a plain white-on-black chip
            instead of outlined text. */}
        <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="rounded bg-black/70 px-3 py-1 font-display text-3xl font-black text-white">
            {snap.quantity}
          </span>
        </span>
      </div>

      {imageSrc && previewPoint && (
        <div
          className="pointer-events-none fixed z-[90] hidden w-[30rem] max-w-[min(30rem,calc(100vw-2rem))] overflow-hidden bg-black/85 shadow-[0_18px_44px_rgba(0,0,0,0.65)] sm:block"
          style={{ left: previewLeft, top: previewTop }}
        >
          <img src={imageSrc} alt="" className="h-auto w-full object-contain" />
        </div>
      )}
    </div>
  );
}
// ─── Main screen ──────────────────────────────────────────────────────────────

type SavedDeckRow = { entry: DeckStoreListEntry; deck: DeckLoadResult };

function DeckInfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-500/20 px-3 py-2.5 shadow-[0_6px_14px_rgba(0,0,0,0.22)]">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gold/80">{label}</p>
      <p className="mt-1 truncate text-sm font-bold uppercase tracking-[0.06em] text-white/90">{value}</p>
    </div>
  );
}

function DeckAccessoryThumb({ label, selection, kind, defaultUrl }: { label: string; selection: DeckAccessorySelection; kind: 'sleeve' | 'donArt'; defaultUrl: string }) {
  const imageUrl = resolveAccessoryImageUrl(selection, kind, defaultUrl);
  const name = selection.label ?? 'Default';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="aspect-[63/88] w-full overflow-hidden rounded border border-white/10 bg-black/30 shadow-[0_4px_10px_rgba(0,0,0,0.35)]">
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" draggable={false} />
      </div>
      <span className="text-[8px] font-black uppercase tracking-[0.12em] text-gold/70">{label}</span>
      <span className="line-clamp-1 text-center text-[10px] font-semibold text-white/80" title={name}>{name}</span>
    </div>
  );
}

/**
 * Read-only summary of a deck's chosen cosmetic accessories, shown under the
 * card list on the deck-detail panel. Resolves each slot's art the same way
 * gameplay does (snapshot URL -> catalog -> bundled default), so what's shown
 * here matches what appears in a match. `onEdit` deep-links to the full
 * Accessories gallery for this deck.
 */
function DeckAccessoriesSummary({ accessories, onEdit }: { accessories: DeckAccessories; onEdit?: () => void }) {
  return (
    <div className="mt-4 flex-shrink-0 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full bg-gold shadow-[0_0_10px_rgba(217,164,65,0.65)]" />
          <p className="font-display text-sm font-black uppercase tracking-[0.18em] text-gold">Accessories</p>
        </div>
        {onEdit && (
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,9.5rem)]">
        <DeckAccessoryThumb label="Main Sleeve" selection={accessories.mainSleeve} kind="sleeve" defaultUrl={DEFAULT_MAIN_SLEEVE_URL} />
        <DeckAccessoryThumb label="DON!! Sleeve" selection={accessories.donSleeve} kind="sleeve" defaultUrl={DEFAULT_DON_SLEEVE_URL} />
        <DeckAccessoryThumb label="DON!! Art" selection={accessories.donCardArt} kind="donArt" defaultUrl={DEFAULT_DON_ART_URL} />
      </div>
    </div>
  );
}

/**
 * Two-pane layout: a deck picker (the one, obvious way to switch decks) —
 * now a large vertical gallery of leader art, poster-style, rather than a
 * row of small thumbnails — next to a detail panel. The detail panel used to
 * hide Overview behind a tab switch from the card list; both now render side
 * by side (deck showcase + stats on the left, full card list on the right)
 * since a tab switch just hid information the deck box's narrow column had
 * room to share with anyway. The prev/next deck-cycle arrows moved off the
 * title row (which they had nothing structurally to do with) to flank the
 * deck box they actually cycle.
 */
function DecksRevampLayout({
  rows,
  current,
  currentDeck,
  currentFormatStatus,
  clampedIndex,
  cardCount,
  updatedAt,
  cardListItems,
  onPrevious,
  onNext,
  onSelectDeck,
  onEditDeck,
  onEditAccessories,
  onOpenStats,
  onDeleteDeck,
}: {
  rows: SavedDeckRow[];
  current: SavedDeckRow | null;
  currentDeck: Extract<DeckLoadResult, { ok: true }>['deck'] | null;
  currentFormatStatus: ReturnType<typeof evaluateSavedDeckFormatStatus>['status'] | null;
  clampedIndex: number;
  cardCount: number;
  updatedAt: string | null;
  cardListItems: CardRowSnapshot[];
  onPrevious: () => void;
  onNext: () => void;
  onSelectDeck: (index: number) => void;
  onEditDeck: (deckId: string) => void;
  onEditAccessories: (deckId: string) => void;
  onOpenStats: (deckId: string) => void;
  onDeleteDeck: (deckId: string) => void;
}) {
  // Below `xl` the picker stacks above the detail panel instead of sitting
  // beside it (see the grid className just below), so the showcase column is
  // much narrower than on desktop — the deck box needs to shrink to fit or
  // it overflows/clips inside its `overflow-hidden` column on tablet/phone.
  const isWideLayout = useIsWideDeckLayout();

  // Wrap around, matching goLeft/goRight — the arrows cycle rather than stop,
  // so the peeks have to as well or the ends would show the wrong deck.
  const prevRow = rows.length > 1 ? rows[(clampedIndex - 1 + rows.length) % rows.length] : null;
  const nextRow = rows.length > 1 ? rows[(clampedIndex + 1) % rows.length] : null;

  // Direction is derived from the index rather than from which control was
  // used, because the picker list on the left changes the same index and its
  // jumps deserve the same motion. Distance is measured the short way round
  // the ring, so wrapping from the last deck to the first still reads as a
  // step forward instead of a rewind past everything in between.
  // The showcase row measures itself and everything in it is sized off that —
  // see useBoxFit for why a breakpoint boolean could not do this job.
  const showcaseRef = useRef<HTMLDivElement>(null);
  const boxFit = useBoxFit(showcaseRef, isWideLayout ? 1 : 0.58, isWideLayout);

  const lastIndexRef = useRef(clampedIndex);
  const [slide, setSlide] = useState<SlideState>({ dir: 'next', key: 0 });
  useEffect(() => {
    const before = lastIndexRef.current;
    if (before === clampedIndex || rows.length < 2) return;
    lastIndexRef.current = clampedIndex;
    const forward = (clampedIndex - before + rows.length) % rows.length <= rows.length / 2;
    setSlide((s) => ({ dir: forward ? 'next' : 'prev', key: s.key + 1 }));
  }, [clampedIndex, rows.length]);

  return (
    // Below `xl` the picker and detail panel stack into a single column
    // instead of sitting side by side in a fixed-height fit (see the
    // grid-cols swap below) — `overflow-hidden` on that fixed 2-column fit
    // is exactly right at `xl`, but on a stacked single column the combined
    // content is routinely taller than the viewport, so it needs to scroll
    // instead of silently clipping. `xl:overflow-hidden` restores the
    // original desktop behavior unchanged.
    <div className="h-full min-h-0 space-y-3 overflow-y-auto p-2 sm:space-y-4 sm:p-3 xl:grid xl:space-y-0 xl:gap-4 xl:grid-cols-[17rem_minmax(0,1fr)] xl:overflow-hidden">
      {/* Deck picker — plain list keyed off each deck's leader (name + card
          number), the one obvious way to switch decks. No art thumbnails:
          just enough to identify a deck by its leader at a glance. */}
      <aside className="flex max-h-[28rem] flex-col bg-black/60 shadow-[0_14px_0_rgba(1,5,16,0.5),_0_24px_40px_rgba(0,0,0,0.3)] xl:max-h-none xl:min-h-0">
        <div className="flex flex-shrink-0 items-center justify-between px-4 py-3">
          <div className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full bg-gold shadow-[0_0_10px_rgba(217,164,65,0.65)]" />
            <p className="font-display text-sm font-black uppercase tracking-[0.18em] text-gold">Your Decks</p>
          </div>
          <p className="text-[10px] font-bold text-white/40">{rows.length}</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {rows.map((row, index) => {
            const active = index === clampedIndex;
            const loadedDeck = row.deck.ok ? row.deck.deck : null;
            const leaderName = loadedDeck?.leader.definition.name ?? 'Unavailable';
            const leaderCardNumber = loadedDeck?.leader.cardNumber ?? '—';
            return (
              <button
                key={row.entry.deckId}
                type="button"
                onClick={() => onSelectDeck(index)}
                className={[
                  'flex w-full flex-shrink-0 items-center justify-between gap-2 px-3 py-2.5 text-left shadow-[0_6px_14px_rgba(0,0,0,0.28)] transition',
                  active ? 'bg-gray-500/35' : 'bg-gray-500/15 hover:bg-gray-500/25',
                ].join(' ')}
              >
                <div className="min-w-0">
                  <p className={['truncate text-[12px] font-bold uppercase leading-tight tracking-[0.04em]', active ? 'text-white' : 'text-white/85'].join(' ')}>
                    {leaderName}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">{leaderCardNumber}</p>
                </div>
                {active && <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full bg-gold shadow-[0_0_8px_rgba(217,164,65,0.8)]" />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Detail panel — overview and card list side by side, no tab switch. */}
      <section className="flex min-h-0 flex-col bg-black/60 shadow-[0_14px_0_rgba(1,5,16,0.5),_0_24px_40px_rgba(0,0,0,0.3)]">
        <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-black uppercase tracking-[0.06em] text-white sm:text-2xl">
              {current?.entry.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {currentFormatStatus && <DeckFormatBadge status={currentFormatStatus} size="sm" />}
              <span className="bg-black/45 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/55">
                {cardCount}/50 cards
              </span>
              {updatedAt && (
                <span className="hidden bg-black/45 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/55 sm:inline-flex">
                  {updatedAt}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!current?.deck.ok}
              onClick={() => current?.deck.ok && onOpenStats(current.entry.deckId)}
            >
              Deck Stats
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!current?.deck.ok}
              onClick={() => current?.deck.ok && onEditDeck(current.entry.deckId)}
            >
              Edit Deck
            </Button>
            {current && (
              <Button variant="danger" size="sm" onClick={() => onDeleteDeck(current.entry.deckId)}>
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5 xl:grid xl:min-h-0 xl:flex-1 xl:space-y-0 xl:grid-cols-[minmax(13rem,1fr)_minmax(0,3fr)] xl:gap-5 xl:overflow-hidden">
          {/* Overview: deck box flanked by its own prev/next cycle arrows — a more
              befitting home for them than the title row, since they cycle the
              box, not the deck's name. Column is 1 of the 1:3 split with the
              card list, but that split (like the aside/detail split above)
              only kicks in at `xl` — below that both stack full-width and the
              screen scrolls instead of squeezing two columns into a phone or
              tablet's width. The whole flex/min-h-0/overflow-hidden "fit
              exactly, clip, scroll internally" machinery below is likewise
              xl-only: below xl nothing here should fight the page's own
              scroll with its own nested scroll region — that's what was
              collapsing/overlapping content on real phones. */}
          <div className="flex flex-col sm:min-h-0 sm:overflow-hidden">
            {/* The 3D box itself is disabled below `sm` entirely (not just
                shrunk) — its perspective/3D-transform geometry doesn't play
                well with an unbounded-height mobile flow, and the stats
                below already cover the same info (leader, colors, deck
                size) without it. Chevrons go with it since they have
                nothing to cycle without the box on screen. */}
            <div ref={showcaseRef} className="relative hidden w-full items-center justify-between gap-2 sm:flex sm:min-h-0 sm:flex-1">
              {prevRow && <DeckBoxPeek row={prevRow} side="left" boxScale={boxFit.scale} windowWidth={boxFit.peekWidth} compact={!isWideLayout} slide={slide} />}
              {nextRow && <DeckBoxPeek row={nextRow} side="right" boxScale={boxFit.scale} windowWidth={boxFit.peekWidth} compact={!isWideLayout} slide={slide} />}
              <button
                type="button"
                onClick={onPrevious}
                disabled={rows.length <= 1}
                className="group relative z-10 flex h-10 w-7 flex-shrink-0 items-center justify-center text-white/55 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-30 sm:h-14 sm:w-10"
                aria-label="Previous deck"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 animate-[op-mobile-chevron-left_1.05s_ease-in-out_infinite] sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="relative z-10 flex min-w-0 flex-1 items-center justify-center overflow-visible">
                {current && (
                  <div key={slide.key} className="op-deck-slide" style={{ animation: boxAnimation(slide) }}>
                    <DeckBox3D entry={current.entry} deck={current.deck} compact={!isWideLayout} scale={boxFit.scale} />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onNext}
                disabled={rows.length <= 1}
                className="group relative z-10 flex h-10 w-7 flex-shrink-0 items-center justify-center text-white/55 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-30 sm:h-14 sm:w-10"
                aria-label="Next deck"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 animate-[op-mobile-chevron-right_1.05s_ease-in-out_infinite] sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Bottom: label/description stats, pinned to the container's
                bottom edge instead of floating in the middle. */}
            <div className="flex-shrink-0 pt-3 sm:pt-3">
              {currentDeck ? (
                <div className="grid w-full gap-2 text-left">
                  <DeckInfoStat label="Leader" value={currentDeck.leader.definition.name} />
                  <DeckInfoStat label="Colors" value={currentDeck.leader.definition.colors.join(' / ') || 'None'} />
                  <DeckInfoStat label="Entries" value={`${currentDeck.cards.length}`} />
                  <DeckInfoStat label="DON!! Deck" value={`${currentDeck.donDeckSize}`} />
                </div>
              ) : (
                <p className="bg-black/45 p-3 text-sm font-bold text-red-100">
                  Load error - data may be corrupted.
                </p>
              )}
            </div>
          </div>

          {/* Card list — plain natural-height flow below `xl` (no nested
              scroll region: the outer screen grid is the one and only
              scroll container down there). Only at `xl`, where this column
              sits beside a fixed-height overview column, does it need its
              own internal scroll. */}
          <div className="flex flex-col pt-4 xl:min-h-0 xl:overflow-hidden xl:pl-5 xl:pt-0">
            <div className="inline-flex flex-shrink-0 items-center gap-2 pb-3">
              <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full bg-gold shadow-[0_0_10px_rgba(217,164,65,0.65)]" />
              <p className="font-display text-sm font-black uppercase tracking-[0.18em] text-gold">Card List ({cardListItems.length})</p>
            </div>
            <div className="pr-1 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
              {cardListItems.length === 0 ? (
                <p className="py-4 text-center text-xs text-white/35">No cards to display</p>
              ) : (
                <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]">
                  {cardListItems.map((snap, index) => (
                    <DeckCardRow key={`${snap.cardNumber}-${index}`} snap={snap} />
                  ))}
                </div>
              )}
            </div>

            {currentDeck?.accessories && (
              <DeckAccessoriesSummary
                accessories={currentDeck.accessories}
                onEdit={current?.deck.ok ? () => onEditAccessories(current.entry.deckId) : undefined}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Decks tab content, embedded under the universal header (see HubScreen) —
 * no back button of its own since it isn't a pushed screen anymore.
 */
export function SavedDecksScreen() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);
  const remove = useSavedDecksStore((state) => state.remove);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const rows = useMemo(
    () => entries.map((entry) => ({ entry, deck: load(entry.deckId) })),
    [entries, load],
  );

  const clampedIndex = rows.length === 0 ? 0 : Math.max(0, Math.min(currentIndex, rows.length - 1));
  const current = rows[clampedIndex] ?? null;

  // Cycling decks swaps the whole detail panel — the 3D deck box plus up to
  // ~51 card tiles. Marking the index change as a transition lets the chevron
  // click paint immediately (its own hover/active feedback) instead of the
  // "next paint" being blocked behind that heavy re-render, which is what the
  // DevTools trace flagged as the worst INP (~2s under 20x CPU throttle).
  const goLeft = useCallback(
    () => startTransition(() => setCurrentIndex((i) => (i > 0 ? i - 1 : rows.length - 1))),
    [rows.length],
  );
  const goRight = useCallback(
    () => startTransition(() => setCurrentIndex((i) => (i < rows.length - 1 ? i + 1 : 0))),
    [rows.length],
  );
  const selectDeck = useCallback((index: number) => startTransition(() => setCurrentIndex(index)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (rows.length <= 1) return;
      if (e.key === 'ArrowLeft') goLeft();
      if (e.key === 'ArrowRight') goRight();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goLeft, goRight, rows.length]);

  const pendingDeleteName =
    pendingDeleteId ? (entries.find((e) => e.deckId === pendingDeleteId)?.name ?? 'this deck') : null;

  const cardListItems = useMemo<CardRowSnapshot[]>(() => {
    if (!current?.deck.ok) return [];
    const { leader, cards } = current.deck.deck;
    const all: CardRowSnapshot[] = [leader, ...cards];
    return [...all].sort((a, b) => {
      const catDiff =
        CATEGORY_ORDER.indexOf(a.definition.category) - CATEGORY_ORDER.indexOf(b.definition.category);
      if (catDiff !== 0) return catDiff;
      return a.definition.name.localeCompare(b.definition.name);
    });
  }, [current]);

  const cardCount = useMemo(() => {
    if (!current?.deck.ok) return 0;
    return current.deck.deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  }, [current]);

  const updatedAt = useMemo(() => {
    if (!current) return null;
    const date = new Date(current.entry.updatedAt);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
  }, [current]);

  const currentFormatStatus = useMemo(() => {
    if (!current?.deck.ok) return null;
    return evaluateSavedDeckFormatStatus(current.deck.deck).status;
  }, [current]);
  const currentDeck = current?.deck.ok === true ? current.deck.deck : null;

  return (
    <GameCanvasScreen
      dense
      topRight={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <CanvasMenuButton
            label="Card Library"
            size="sm"
            onClick={() => navigateTo({ screen: 'card-library' })}
            expandOnHover={false}
            className="h-9 w-[5.75rem] max-w-none px-1.5 text-[10px] sm:h-10 sm:w-[7.5rem] sm:px-2 sm:text-[11px]"
          />
          <CanvasMenuButton
            label="New Deck"
            size="sm"
            onClick={() => navigateTo({ screen: 'deck-builder' })}
            expandOnHover={false}
            className="h-9 w-[5rem] max-w-none px-1.5 text-[10px] sm:h-10 sm:w-[6.5rem] sm:px-2 sm:text-[11px]"
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
          <div className="text-center">
            <p className="font-heading text-2xl font-black uppercase tracking-widest text-white/20">No Decks Yet</p>
            <p className="mt-2 text-sm text-white/40">Build your first deck to get started.</p>
          </div>
          <CanvasMenuButton
            label="Build First Deck"
            prominence="primary"
            size="sm"
            onClick={() => navigateTo({ screen: 'deck-builder' })}
          />
        </div>
      ) : (
        <DecksRevampLayout
          rows={rows}
          current={current}
          currentDeck={currentDeck}
          currentFormatStatus={currentFormatStatus}
          clampedIndex={clampedIndex}
          cardCount={cardCount}
          updatedAt={updatedAt}
          cardListItems={cardListItems}
          onPrevious={goLeft}
          onNext={goRight}
          onSelectDeck={selectDeck}
          onEditDeck={(deckId) => navigateTo({ screen: 'deck-builder', deckIdToEdit: deckId })}
          onEditAccessories={(deckId) => navigateTo({ screen: 'accessories', deckIdToEdit: deckId })}
          onOpenStats={(deckId) => navigateTo({ screen: 'deck-stats', deckId })}
          onDeleteDeck={setPendingDeleteId}
        />
      )}

      <Modal open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)} title="Delete deck?">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-slate-200/75">
            This permanently removes <span className="font-bold text-white">"{pendingDeleteName}"</span> from local
            storage. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (pendingDeleteId) remove(pendingDeleteId);
                setPendingDeleteId(null);
                setCurrentIndex((i) => Math.max(0, i - 1));
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </GameCanvasScreen>
  );
}
