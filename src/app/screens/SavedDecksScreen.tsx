import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import type { CardCategory, Color } from '../../engine/state/card';
import { Button, CanvasMenuButton, DeckFormatBadge, GameCanvasScreen, Modal } from '../components';
import { resolveAssetUrl } from '../lib/assetUrl';
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
const BH  = 18.375;          // box height (rem)  — 14.7 × 1.25
const BW  = BH * 63 / 88;    // ~13.16rem — front/back match a card's 63:88 ratio
const BD  = 8.125;   // box depth  (rem)  — 6.5 × 1.25
const HW  = BW / 2;  // ~6.58rem
const HH  = BH / 2;  // 7.35rem
const HD  = BD / 2;  // 3.25rem
const LID   = BH * 0.24 * 0.30; // ~1.06rem — lid section on front/side faces (30% of prior height)
const FRAME = 0.45;             // rem — box-material bezel around the card window

// Seam gradient — reused on both front and side faces
const SEAM_BG = 'linear-gradient(180deg,rgba(0,0,0,0.75) 0%,rgba(255,255,255,0.14) 55%,rgba(0,0,0,0.55) 100%)';

interface DeckBox3DProps {
  entry: DeckStoreListEntry;
  deck: DeckLoadResult;
  compact?: boolean;
}

const BASE_RX = -15;
const BASE_RY = -25;

function DeckBox3D({ entry, deck, compact = false }: DeckBox3DProps) {
  const loadedDeck = deck.ok ? deck.deck : null;
  const leader     = loadedDeck?.leader;
  const imageUrl   = leader?.imageUrl ?? null;
  const leaderName = leader?.definition.name ?? 'Unavailable';
  const colors     = leader?.definition.colors;
  const surf       = buildDeckBoxSurfaceStyles(colors);
  const scale      = compact ? 0.58 : 1;
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
      style={{ width: `${bw + 7 * scale}rem`, height: `${bh + 6 * scale}rem`, perspective: compact ? '900px' : '1400px', perspectiveOrigin: '55% 45%' }}
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
          width: `${bw * 1.3}rem`,
          height: `${2 * scale}rem`,
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
          left: `${1.5 * scale}rem`, top: `${1.5 * scale}rem`,
          width: `${bw}rem`, height: `${bh}rem`,
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
            transform: `translateZ(${hd}rem)`,
            borderRadius: '3px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
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
            <div className="pointer-events-none absolute inset-0 rounded-[2px] ring-1 ring-inset ring-black/40" />
          </div>

          {/* Lid — opaque box-material band covering the top of the card */}
          <div className="absolute left-0 right-0 top-0 overflow-hidden" style={{ ...surf.top, height: `${lid}rem`, borderRadius: '3px 3px 0 0' }}>
            {colors && colors.length > 0 && (
              <div className="absolute bottom-1 right-2 flex gap-1">
                {colors.map((c) => (
                  <span key={c} className={['h-1.5 w-1.5 rounded-full ring-1 ring-black/40', CARD_COLOR_TOKENS[c].dotClassName].join(' ')} />
                ))}
              </div>
            )}
          </div>

          {/* Seam crease under the lid */}
          <div className="absolute left-0 right-0" style={{ top: `${lid}rem`, height: '3px', background: SEAM_BG }} />

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
            boxShadow: 'inset 22px 0 32px rgba(255,255,255,0.06), inset -18px 0 28px rgba(0,0,0,0.70)',
          }}
        >
          {/* Lid sheen on side */}
          <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-white/28 via-white/08 to-transparent" style={{ height: `${lid}rem` }} />
          {/* Seam on side — same position as front seam */}
          <div className="absolute left-0 right-0" style={{ top: `${lid}rem`, height: '3px', background: SEAM_BG }} />
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
          <img src={resolveAssetUrl(snap.imageUrl) ?? undefined} alt={snap.definition.name} className="h-full w-full object-cover object-top" />
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
  const [openDeleteId, setOpenDeleteId] = useState<string | null>(null);
  const swipeStart = useRef<{ deckId: string; x: number; y: number } | null>(null);
  const suppressRowClick = useRef(false);

  const rows = useMemo(
    () => entries.map((entry) => ({ entry, deck: load(entry.deckId) })),
    [entries, load],
  );

  // Clamp index so it stays valid after deletions
  const clampedIndex = rows.length === 0 ? 0 : Math.max(0, Math.min(currentIndex, rows.length - 1));
  const current = (rows[clampedIndex] ?? null) as any;

  const goLeft = useCallback(
    () => setCurrentIndex((i) => (i > 0 ? i - 1 : rows.length - 1)),
    [rows.length],
  );
  const goRight = useCallback(
    () => setCurrentIndex((i) => (i < rows.length - 1 ? i + 1 : 0)),
    [rows.length],
  );

  const startDeckSwipe = useCallback((deckId: string, x: number, y: number) => {
    swipeStart.current = { deckId, x, y };
    suppressRowClick.current = false;
  }, []);

  const moveDeckSwipe = useCallback((deckId: string, x: number, y: number) => {
    const start = swipeStart.current;
    if (!start || start.deckId !== deckId) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy)) return;
    suppressRowClick.current = true;
    setOpenDeleteId(dx < 0 ? deckId : null);
  }, []);

  const endDeckSwipe = useCallback(() => {
    swipeStart.current = null;
    window.setTimeout(() => {
      suppressRowClick.current = false;
    }, 0);
  }, []);

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
    return current.deck.deck.cards.reduce((s: number, c: CardRowSnapshot) => s + c.quantity, 0);
  }, [current]);

  const updatedAt = useMemo(() => {
    if (!current) return null;
    const d = new Date(current.entry.updatedAt);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
  }, [current]);

  const currentFormatStatus = useMemo(() => {
    if (!current?.deck.ok) return null;
    return evaluateSavedDeckFormatStatus(current.deck.deck).status;
  }, [current]);
  const currentDeck = current?.deck.ok === true ? current.deck.deck : null;

  return (
    <GameCanvasScreen
      kicker="Deck Rack"
      status={`${entries.length} saved`}
      onBack={goBack}
      headerTitle="Decks"
      dense
      topRight={
        <CanvasMenuButton
          label="New Deck"
          size="sm"
          onClick={() => navigateTo({ screen: 'deck-builder' })}
          expandOnHover={false}
          className="h-10 w-[6.5rem] max-w-none px-2 text-[11px]"
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
        <div className="flex h-full min-h-0 flex-col overflow-hidden xl:flex-row">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[rgba(1,5,16,0.55)] sm:hidden">
            <p className="flex-shrink-0 border-y border-white/10 bg-[#050b18] px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
              Tap to edit, swipe left to delete
            </p>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-0 pb-0 pt-1">
              {rows.map((row) => {
                const loadedDeck = row.deck.ok ? row.deck.deck : null;
                const leader = loadedDeck?.leader;
                const formatStatus = loadedDeck ? evaluateSavedDeckFormatStatus(loadedDeck).status : null;

                return (
                  <div key={row.entry.deckId} className="relative h-[6.25rem] min-w-0 overflow-hidden rounded bg-transparent">
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-600 font-heading text-xs font-black uppercase tracking-[0.08em] text-white"
                      onClick={() => setPendingDeleteId(row.entry.deckId)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className={[
                        'relative z-10 flex h-full w-full min-w-0 items-center gap-2 border border-white/10 bg-[#08101f] px-2 py-2 text-left transition-transform duration-200',
                        openDeleteId === row.entry.deckId ? '-translate-x-20' : 'translate-x-0',
                        row.deck.ok ? 'cursor-pointer' : 'cursor-default',
                      ].join(' ')}
                      onPointerDown={(event) => startDeckSwipe(row.entry.deckId, event.clientX, event.clientY)}
                      onPointerMove={(event) => moveDeckSwipe(row.entry.deckId, event.clientX, event.clientY)}
                      onPointerUp={endDeckSwipe}
                      onPointerCancel={endDeckSwipe}
                      onClick={() => {
                        if (suppressRowClick.current) return;
                        if (!row.deck.ok) return;
                        if (openDeleteId === row.entry.deckId) {
                          setOpenDeleteId(null);
                          return;
                        }
                        navigateTo({ screen: 'deck-builder', deckIdToEdit: row.entry.deckId });
                      }}
                    >
                      <div className="h-[5.25rem] w-[3.75rem] flex-shrink-0 overflow-hidden rounded-sm border border-white/15 bg-slate-900">
                        {leader?.imageUrl && (
                          <img src={resolveAssetUrl(leader.imageUrl) ?? undefined} alt="" className="h-full w-full object-cover object-top" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div className="min-w-0">
                          <p className="truncate font-heading text-sm font-black uppercase leading-tight tracking-[0.07em] text-white">
                            {row.entry.name}
                          </p>
                        </div>
                        {formatStatus && <DeckFormatBadge status={formatStatus} size="sm" className="mt-1 w-fit" />}
                        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.09em] text-gold/65">
                          {leader?.definition.name ?? 'Unavailable'}
                        </p>
                        {!row.deck.ok && <p className="mt-1 text-[10px] font-bold text-red-400">Load error - data may be corrupted</p>}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          {/* ── Main column: carousel + card list ── */}
          <div className="hidden min-h-0 flex-1 flex-col sm:flex">
          {/* ── Gallery area ── */}
          <div className="hidden flex-shrink-0 flex-col items-center justify-center gap-2 overflow-hidden py-1 sm:flex sm:min-h-0 sm:flex-1 sm:gap-4 sm:py-4">
            {/* Navigation row — arrows are absolute so the box is always the true centre */}
            <div className="relative flex w-full items-center justify-center px-10 sm:px-16">
              {/* Left arrow */}
              <button
                type="button"
                onClick={goLeft}
                disabled={rows.length <= 1}
                className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/6 text-white/50 transition-all hover:border-gold/50 hover:bg-white/12 hover:text-gold active:scale-95 disabled:pointer-events-none disabled:opacity-0 sm:left-4 sm:h-11 sm:w-11"
                aria-label="Previous deck"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Deck box + meta — centred */}
              <div className="flex min-w-0 flex-col items-center gap-2">
                {current && (
                  <>
                    <div className="sm:hidden">
                      <DeckBox3D entry={current.entry} deck={current.deck} compact />
                    </div>
                    <div className="hidden sm:block">
                      <DeckBox3D entry={current.entry} deck={current.deck} />
                    </div>
                  </>
                )}

                {/* Deck name & stats */}
                <div className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <p className="max-w-[min(18rem,72vw)] truncate font-heading text-sm font-black uppercase leading-tight tracking-[0.10em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.7)] sm:text-base">
                      {current?.entry.name}
                    </p>
                    {currentFormatStatus && <DeckFormatBadge status={currentFormatStatus} />}
                  </div>
                  {current?.deck.ok && (
                    <p className="mt-0.5 max-w-[min(20rem,78vw)] truncate text-[10px] font-bold uppercase tracking-[0.12em] text-gold/65 sm:text-[11px]">
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
                className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/6 text-white/50 transition-all hover:border-gold/50 hover:bg-white/12 hover:text-gold active:scale-95 disabled:pointer-events-none disabled:opacity-0 sm:right-4 sm:h-11 sm:w-11"
                aria-label="Next deck"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Dot indicators */}
            {rows.length > 1 && (
              <div className="flex max-w-full gap-2 overflow-x-auto px-2 pb-1">
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
          {false && (
          <div className="hidden">
            <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-sm border border-white/15 bg-slate-900">
              {false && (
                <img
                  src={undefined}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate font-heading text-sm font-black uppercase leading-tight tracking-[0.08em] text-white">
                  {current?.entry.name}
                </p>
                {false && <DeckFormatBadge status="legal" size="sm" className="flex-shrink-0" />}
              </div>
              {false && (
                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.1em] text-gold/65">
                  {current.deck.deck.leader.definition.name} · {cardCount}/50{updatedAt && ` · ${updatedAt}`}
                </p>
              )}
              {false && (
                <p className="mt-1 text-[10px] font-bold text-red-400">Load error - data may be corrupted</p>
              )}
            </div>
            <div className="flex flex-shrink-0 gap-1.5">
              {false && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigateTo({ screen: 'deck-builder' })}
                >
                  Edit
                </Button>
              )}
              {false && (
                <Button variant="danger" size="sm" onClick={() => setPendingDeleteId('')}>
                  Delete
                </Button>
              )}
            </div>
          </div>
          )}

          <div className="flex flex-shrink-0 gap-2 overflow-x-auto border-y border-white/8 bg-[rgba(1,5,16,0.55)] px-2 py-1.5 xl:hidden">
            {rows.map((row, i) => {
              const active = i === clampedIndex;
              const leaderImg = row.deck.ok ? row.deck.deck.leader.imageUrl : null;
              const formatStatus = row.deck.ok ? evaluateSavedDeckFormatStatus(row.deck.deck).status : null;
              return (
                <button
                  key={row.entry.deckId}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={[
                    'flex min-w-[10.5rem] max-w-[12.5rem] items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors',
                    active ? 'border-gold/60 bg-gold/12' : 'border-white/8 bg-white/4',
                  ].join(' ')}
                >
                  <div className="h-9 w-6 flex-shrink-0 overflow-hidden rounded-sm border border-white/15 bg-slate-900">
                    {leaderImg && (
                      <img src={resolveAssetUrl(leaderImg) ?? undefined} alt="" className="h-full w-full object-cover object-top" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={['truncate text-[11px] font-bold uppercase leading-tight tracking-[0.04em]', active ? 'text-white' : 'text-white/80'].join(' ')}>
                      {row.entry.name}
                    </p>
                    {formatStatus && <DeckFormatBadge status={formatStatus} size="sm" className="mt-1 w-fit" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t border-white/8 bg-[rgba(1,5,16,0.55)] sm:max-h-[38%] sm:flex-shrink-0">
            {/* Section header */}
            <div className="flex flex-shrink-0 items-center justify-between gap-3 px-4 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.20em] text-gold">Card List</p>
              <div className="flex min-w-0 items-center gap-2">
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
                <p className="hidden text-[10px] text-white/35 sm:block">{cardListItems.length} entr{cardListItems.length === 1 ? 'y' : 'ies'}</p>
              </div>
            </div>

            {/* Scrollable cards */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-4">
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

          {/* ── Deck list sidebar — stays in sync with the carousel ── */}
          <aside className="hidden w-60 flex-shrink-0 flex-col border-l border-white/8 bg-[rgba(1,5,16,0.55)] xl:flex">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/8 px-4 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.20em] text-gold">All Decks</p>
              <p className="text-[10px] text-white/35">{rows.length}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-1.5">
                {rows.map((row, i) => {
                  const active = i === clampedIndex;
                  const leaderName = row.deck.ok ? row.deck.deck.leader.definition.name : null;
                  const leaderImg = row.deck.ok ? row.deck.deck.leader.imageUrl : null;
                  const formatStatus = row.deck.ok ? evaluateSavedDeckFormatStatus(row.deck.deck).status : null;
                  return (
                    <button
                      key={row.entry.deckId}
                      type="button"
                      onClick={() => setCurrentIndex(i)}
                      className={[
                        'flex items-center gap-2.5 rounded border px-2.5 py-2 text-left transition-colors',
                        active ? 'border-gold/60 bg-gold/12' : 'border-white/8 bg-white/4 hover:bg-white/8',
                      ].join(' ')}
                    >
                      <div className="h-10 w-7 flex-shrink-0 overflow-hidden rounded-sm border border-white/15 bg-slate-900">
                        {leaderImg && (
                          <img src={resolveAssetUrl(leaderImg) ?? undefined} alt="" className="h-full w-full object-cover object-top" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5">
                          <p className={['truncate text-[11px] font-bold uppercase leading-tight tracking-[0.04em]', active ? 'text-white' : 'text-white/80'].join(' ')}>
                            {row.entry.name}
                          </p>
                          {formatStatus && <DeckFormatBadge status={formatStatus} size="sm" className="w-fit" />}
                        </div>
                        <p className="truncate text-[9px] font-bold uppercase tracking-[0.08em] text-white/35">
                          {leaderName ?? 'Unavailable'}
                        </p>
                      </div>
                      {active && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
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
