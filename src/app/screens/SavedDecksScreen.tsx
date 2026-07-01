import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import type { CardCategory, Color } from '../../engine/state/card';
import { Button, CanvasMenuButton, GameCanvasScreen, Modal } from '../components';
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

function buildDeckBoxSurfaceStyles(colors: Color[] | undefined): {
  front: CSSProperties;
  side: CSSProperties;
  top: CSSProperties;
} {
  const [first = 'blue', second] = colors && colors.length > 0 ? colors : ['blue'];
  const c1 = DECK_BOX_COLOR_HEX[first];
  const c2 = second ? DECK_BOX_COLOR_HEX[second] : c1;

  // Front: left-half = c1, right-half = c2
  const frontSplit = second
    ? `linear-gradient(90deg, ${c1} 0 50%, ${c2} 50% 100%)`
    : c1;

  return {
    front: {
      // Diagonal light sweep over the split color
      background: `linear-gradient(155deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.60) 100%), ${frontSplit}`,
    },
    // RIGHT side face → solid c2 with edge lighting
    side: {
      background: `linear-gradient(90deg, rgba(0,0,0,0.52) 0%, rgba(255,255,255,0.09) 45%, rgba(0,0,0,0.60) 100%), ${c2}`,
    },
    // TOP face → same split as front, lit from above
    top: {
      background: `linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(0,0,0,0.55) 100%), ${frontSplit}`,
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
const BW  = 13.75;   // box width  (rem)  — 11 × 1.25
const BH  = 18.375;  // box height (rem)  — 14.7 × 1.25
const BD  = 8.125;   // box depth  (rem)  — 6.5 × 1.25
const HW  = BW / 2;  // 5.5rem
const HH  = BH / 2;  // 7.35rem
const HD  = BD / 2;  // 3.25rem
const LID = BH * 0.24; // ~3.53rem — lid section on front/side faces

// Seam gradient — reused on both front and side faces
const SEAM_BG = 'linear-gradient(180deg,rgba(0,0,0,0.75) 0%,rgba(255,255,255,0.14) 55%,rgba(0,0,0,0.55) 100%)';

interface DeckBox3DProps {
  entry: DeckStoreListEntry;
  deck: DeckLoadResult;
}

const BASE_RX = -15;
const BASE_RY = -25;

function DeckBox3D({ entry, deck }: DeckBox3DProps) {
  const loadedDeck = deck.ok ? deck.deck : null;
  const leader     = loadedDeck?.leader;
  const imageUrl   = leader?.imageUrl ?? null;
  const leaderName = leader?.definition.name ?? 'Unavailable';
  const colors     = leader?.definition.colors;
  const surf       = buildDeckBoxSurfaceStyles(colors);

  // ── Drag-to-tilt ──────────────────────────────────────────────────────────
  const [tilt, setTilt] = useState({ rx: BASE_RX, ry: BASE_RY });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
      className={`relative overflow-visible select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ width: `${BW + 7}rem`, height: `${BH + 6}rem`, perspective: '1400px', perspectiveOrigin: '55% 45%' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Ground shadow — flat ellipse beneath the box, outside the 3D group so
          it renders in normal 2D flow and isn't distorted by perspective. */}
      <div
        className="absolute"
        style={{
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${BW * 1.3}rem`,
          height: '2rem',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, transparent 68%)',
          filter: 'blur(10px)',
        }}
      />

      {/*
       * The 3D box group.  transform-style:preserve-3d passes the 3D context
       * down to all child faces.  The group itself is W × H in the DOM and sits
       * centred in the wrapper; faces use position:absolute and overflow it.
       */}
      <div
        className={`absolute [transform-style:preserve-3d] ${dragging ? '' : 'transition-[transform] duration-300'}`}
        style={{
          left: '1.5rem', top: '1.5rem',
          width: `${BW}rem`, height: `${BH}rem`,
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
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
            transform: `translateZ(${HD}rem)`,
            borderRadius: '3px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          }}
        >
          {/* Lid band */}
          <div className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: `${LID}rem` }}>
            <div className="absolute inset-0 bg-gradient-to-b from-white/32 via-white/12 to-transparent" />
            {colors && colors.length > 0 && (
              <div className="absolute bottom-2 right-2 flex gap-1">
                {colors.map((c) => (
                  <span key={c} className={['h-1.5 w-1.5 rounded-full ring-1 ring-black/40', CARD_COLOR_TOKENS[c].dotClassName].join(' ')} />
                ))}
              </div>
            )}
          </div>

          {/* Seam crease */}
          <div className="absolute left-0 right-0" style={{ top: `${LID}rem`, height: '3px', background: SEAM_BG }} />

          {/* Body: card art */}
          <div className="absolute left-1.5 right-1.5 overflow-hidden rounded-[2px] border border-gold/15" style={{ top: `${LID + 0.3}rem`, bottom: '2.5rem' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={leaderName} className="absolute inset-0 h-full w-full object-cover object-center" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black/40 text-[8px] font-black uppercase tracking-widest text-white/20">
                No Image
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent" />
          </div>

          {/* Body: name strip */}
          <div className="absolute bottom-0 left-0 right-0 flex h-9 items-center border-t border-white/10 px-2">
            <p className="min-w-0 flex-1 truncate text-[7.5px] font-black uppercase tracking-[0.16em] text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
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
            left: `${HW - HD}rem`,
            width: `${BD}rem`,
            height: `${BH}rem`,
            transform: `rotateY(90deg) translateZ(${HW}rem)`,
            borderRadius: '0 3px 3px 0',
            boxShadow: 'inset 22px 0 32px rgba(255,255,255,0.06), inset -18px 0 28px rgba(0,0,0,0.70)',
          }}
        >
          {/* Lid sheen on side */}
          <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-white/28 via-white/08 to-transparent" style={{ height: `${LID}rem` }} />
          {/* Seam on side — same position as front seam */}
          <div className="absolute left-0 right-0" style={{ top: `${LID}rem`, height: '3px', background: SEAM_BG }} />
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
            top: `${HH - HD}rem`,
            width: `${BW}rem`,
            height: `${BD}rem`,
            transform: `rotateX(90deg) translateZ(${HH}rem)`,
            borderRadius: '3px 3px 0 0',
            boxShadow: 'inset 0 18px 28px rgba(255,255,255,0.22), inset 0 -14px 20px rgba(0,0,0,0.55)',
          }}
        />
      </div>
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

function DeckCardRow({ snap }: { snap: CardRowSnapshot }) {
  return (
    <div className="flex items-center gap-2.5 rounded border border-white/8 bg-white/4 px-2.5 py-1.5 transition-colors hover:bg-white/8">
      <div className="h-9 w-6 flex-shrink-0 overflow-hidden rounded-sm border border-white/15 bg-slate-900">
        {snap.imageUrl && (
          <img src={snap.imageUrl} alt={snap.definition.name} className="h-full w-full object-cover object-top" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.05em] text-white/85">{snap.definition.name}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35 capitalize">{snap.definition.category}</p>
      </div>
      <span className="flex-shrink-0 text-[11px] font-black text-gold/75">×{snap.quantity}</span>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function SavedDecksScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
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

  // Clamp index so it stays valid after deletions
  const clampedIndex = rows.length === 0 ? 0 : Math.max(0, Math.min(currentIndex, rows.length - 1));
  const current = rows[clampedIndex] ?? null;

  const goLeft = useCallback(
    () => setCurrentIndex((i) => (i > 0 ? i - 1 : rows.length - 1)),
    [rows.length],
  );
  const goRight = useCallback(
    () => setCurrentIndex((i) => (i < rows.length - 1 ? i + 1 : 0)),
    [rows.length],
  );

  // Keyboard navigation
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

  // Card list for the currently shown deck, sorted by category then name
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
    return current.deck.deck.cards.reduce((s, c) => s + c.quantity, 0);
  }, [current]);

  const updatedAt = useMemo(() => {
    if (!current) return null;
    const d = new Date(current.entry.updatedAt);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
  }, [current]);

  return (
    <GameCanvasScreen
      kicker="Deck Rack"
      status={`${entries.length} saved`}
      title="Decks"
      onBack={goBack}
      topRight={
        <CanvasMenuButton
          label="New Deck"
          size="sm"
          onClick={() => navigateTo({ screen: 'deck-builder' })}
          className="max-w-[10rem]"
        />
      }
    >
      {rows.length === 0 ? (
        /* ── Empty state ── */
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
        <div className="flex h-full min-h-0 flex-col">
          {/* ── Gallery area ── */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden py-4">
            {/* Navigation row — arrows are absolute so the box is always the true centre */}
            <div className="relative flex w-full items-center justify-center px-16">
              {/* Left arrow */}
              <button
                type="button"
                onClick={goLeft}
                disabled={rows.length <= 1}
                className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/6 text-white/50 transition-all hover:border-gold/50 hover:bg-white/12 hover:text-gold active:scale-95 disabled:pointer-events-none disabled:opacity-0"
                aria-label="Previous deck"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Deck box + meta — centred */}
              <div className="flex flex-col items-center gap-2">
                {current && <DeckBox3D entry={current.entry} deck={current.deck} />}

                {/* Deck name & stats */}
                <div className="text-center">
                  <p className="font-heading text-base font-black uppercase tracking-[0.10em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.7)]">
                    {current?.entry.name}
                  </p>
                  {current?.deck.ok && (
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gold/65">
                      {current.deck.deck.leader.definition.name}
                      {' · '}
                      {cardCount}/50
                      {updatedAt && ` · ${updatedAt}`}
                    </p>
                  )}
                  {current && !current.deck.ok && (
                    <p className="mt-0.5 text-[11px] font-bold text-red-400">Load error — data may be corrupted</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {current?.deck.ok && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigateTo({ screen: 'deck-builder', deckIdToEdit: current.entry.deckId })}
                    >
                      Edit
                    </Button>
                  )}
                  {current && (
                    <Button variant="danger" size="sm" onClick={() => setPendingDeleteId(current.entry.deckId)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {/* Right arrow */}
              <button
                type="button"
                onClick={goRight}
                disabled={rows.length <= 1}
                className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/6 text-white/50 transition-all hover:border-gold/50 hover:bg-white/12 hover:text-gold active:scale-95 disabled:pointer-events-none disabled:opacity-0"
                aria-label="Next deck"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Dot indicators */}
            {rows.length > 1 && (
              <div className="flex gap-2">
                {rows.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    aria-label={`Go to deck ${i + 1}`}
                    className={[
                      'h-2 rounded-full transition-all duration-200',
                      i === clampedIndex ? 'w-6 bg-gold' : 'w-2 bg-white/50 hover:bg-white/70',
                    ].join(' ')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Card list ── */}
          <div className="flex min-h-0 flex-shrink-0 flex-col border-t border-white/8 bg-[rgba(1,5,16,0.55)]" style={{ maxHeight: '38%' }}>
            {/* Section header */}
            <div className="flex flex-shrink-0 items-center justify-between px-4 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.20em] text-gold">Card List</p>
              <p className="text-[10px] text-white/35">{cardListItems.length} entr{cardListItems.length === 1 ? 'y' : 'ies'}</p>
            </div>

            {/* Scrollable cards */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              {cardListItems.length === 0 ? (
                <p className="py-4 text-center text-xs text-white/25">No cards to display</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cardListItems.map((snap, i) => (
                    <DeckCardRow key={`${snap.cardNumber}-${i}`} snap={snap} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
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
                // Clamp index after removal — clampedIndex is already derived reactively,
                // but reset to 0 to avoid stale high index if last deck was deleted.
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
