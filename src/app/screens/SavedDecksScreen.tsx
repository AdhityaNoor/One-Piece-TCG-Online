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
      className="group flex items-center gap-2.5 rounded border border-white/8 bg-white/4 px-2.5 py-1.5 transition-colors hover:bg-white/8"
      onMouseEnter={(event) => imageSrc && setPreviewPoint({ x: event.clientX, y: event.clientY })}
      onMouseMove={(event) => imageSrc && setPreviewPoint({ x: event.clientX, y: event.clientY })}
      onMouseLeave={() => setPreviewPoint(null)}
    >
      <div className="h-9 w-6 flex-shrink-0 overflow-hidden rounded-sm border border-white/15 bg-slate-900">
        {imageSrc && (
          <img src={imageSrc} alt={snap.definition.name} className="h-full w-full object-cover object-top" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.05em] text-white/85">{snap.definition.name}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35 capitalize">{snap.definition.category}</p>
      </div>
      <span className="flex-shrink-0 text-[11px] font-black text-gold/75">x{snap.quantity}</span>
      {imageSrc && previewPoint && (
        <div
          className="pointer-events-none fixed z-[90] hidden w-[30rem] max-w-[min(30rem,calc(100vw-2rem))] overflow-hidden border border-gold/45 bg-black shadow-[0_18px_44px_rgba(0,0,0,0.65)] sm:block"
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
    <div className="px-1 py-1.5">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gold/70">{label}</p>
      <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.08em] text-white/78">{value}</p>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'relative flex-shrink-0 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition-colors',
        active ? 'text-gold' : 'text-white/45 hover:text-white/70',
      ].join(' ')}
    >
      {label}
      {active && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 bg-gold" />}
    </button>
  );
}

/**
 * Two-pane layout: a deck picker (the one, obvious way to switch decks) next
 * to a detail panel. The detail panel shows exactly ONE dense view at a
 * time — the 3D showcase, or the full card list — behind a tab switch,
 * instead of stacking the box + stat grid + full card grid all at once.
 * That stacking was the screen's core "too cluttered" problem; tabbing
 * fixes it without giving up either view.
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
  onDeleteDeck: (deckId: string) => void;
}) {
  const [tab, setTab] = useState<'overview' | 'cards'>('overview');

  // Land back on the showcase whenever the selected deck changes, so you
  // never end up staring at a stale/empty card-list tab after switching.
  useEffect(() => {
    setTab('overview');
  }, [clampedIndex]);

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-hidden p-2 sm:gap-4 sm:p-3 xl:grid-cols-[19rem_minmax(0,1fr)]">
      {/* Deck picker — the single, obvious way to switch decks. */}
      <aside className="flex min-h-[9rem] max-h-[13rem] flex-col border border-white/10 bg-[rgba(1,5,16,0.58)] xl:max-h-none xl:min-h-0">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.20em] text-gold">Your Decks</p>
          <p className="text-[10px] text-white/35">{rows.length}</p>
        </div>
        <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-2 xl:flex-col xl:overflow-x-hidden xl:overflow-y-auto">
          {rows.map((row, index) => {
            const active = index === clampedIndex;
            const loadedDeck = row.deck.ok ? row.deck.deck : null;
            const leaderName = loadedDeck?.leader.definition.name ?? 'Unavailable';
            const leaderImg = loadedDeck?.leader.imageUrl ?? null;
            const formatStatus = loadedDeck ? evaluateSavedDeckFormatStatus(loadedDeck).status : null;
            return (
              <button
                key={row.entry.deckId}
                type="button"
                onClick={() => onSelectDeck(index)}
                className={[
                  'flex min-w-[15rem] flex-shrink-0 items-center gap-2.5 border px-2.5 py-2 text-left transition-colors xl:min-w-0 xl:flex-shrink',
                  active ? 'border-gold/60 bg-gold/12' : 'border-white/8 bg-white/4 hover:bg-white/8',
                ].join(' ')}
              >
                <div className="h-12 w-8 flex-shrink-0 overflow-hidden rounded-sm border border-white/15 bg-slate-900">
                  {leaderImg && (
                    <img src={resolveAssetUrl(leaderImg) ?? undefined} alt="" className="h-full w-full object-cover object-top" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={['truncate text-[11px] font-bold uppercase leading-tight tracking-[0.04em]', active ? 'text-white' : 'text-white/80'].join(' ')}>
                    {row.entry.name}
                  </p>
                  <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.08em] text-white/35">{leaderName}</p>
                  {formatStatus && <DeckFormatBadge status={formatStatus} size="sm" className="mt-1 w-fit" />}
                </div>
                {active && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Detail panel. */}
      <section className="flex min-h-0 flex-col border border-white/10 bg-[rgba(1,5,16,0.58)]">
        <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              disabled={rows.length <= 1}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-white/18 bg-white/6 text-white/55 transition hover:border-gold/50 hover:bg-white/12 hover:text-gold disabled:pointer-events-none disabled:opacity-30"
              aria-label="Previous deck"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="min-w-0">
              <h2 className="truncate font-heading text-lg font-black uppercase tracking-[0.06em] text-white sm:text-2xl">
                {current?.entry.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {currentFormatStatus && <DeckFormatBadge status={currentFormatStatus} size="sm" />}
                <span className="border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/55">
                  {cardCount}/50 cards
                </span>
                {updatedAt && (
                  <span className="hidden border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/55 sm:inline-flex">
                    {updatedAt}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onNext}
              disabled={rows.length <= 1}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-white/18 bg-white/6 text-white/55 transition hover:border-gold/50 hover:bg-white/12 hover:text-gold disabled:pointer-events-none disabled:opacity-30"
              aria-label="Next deck"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="flex flex-shrink-0 gap-2">
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

        <div className="flex flex-shrink-0 gap-1 border-b border-white/8 px-3 sm:px-4">
          <TabButton label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
          <TabButton label={`Card List (${cardListItems.length})`} active={tab === 'cards'} onClick={() => setTab('cards')} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === 'overview' ? (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-6 lg:flex-row lg:gap-10">
              <div className="flex flex-shrink-0 items-center justify-center overflow-visible">
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
              </div>

              {currentDeck ? (
                <div className="grid w-full max-w-xs gap-2 text-left">
                  <DeckInfoStat label="Leader" value={currentDeck.leader.definition.name} />
                  <DeckInfoStat label="Colors" value={currentDeck.leader.definition.colors.join(' / ') || 'None'} />
                  <DeckInfoStat label="Entries" value={`${currentDeck.cards.length}`} />
                  <DeckInfoStat label="DON!! Deck" value={`${currentDeck.donDeckSize}`} />
                </div>
              ) : (
                <p className="border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-100">
                  Load error - data may be corrupted.
                </p>
              )}
            </div>
          ) : cardListItems.length === 0 ? (
            <p className="py-4 text-center text-xs text-white/25">No cards to display</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {cardListItems.map((snap, index) => (
                <DeckCardRow key={`${snap.cardNumber}-${index}`} snap={snap} />
              ))}
            </div>
          )}
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

  const goLeft = useCallback(
    () => setCurrentIndex((i) => (i > 0 ? i - 1 : rows.length - 1)),
    [rows.length],
  );
  const goRight = useCallback(
    () => setCurrentIndex((i) => (i < rows.length - 1 ? i + 1 : 0)),
    [rows.length],
  );

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
        <div className="flex items-center gap-2">
          <CanvasMenuButton
            label="Card Library"
            size="sm"
            onClick={() => navigateTo({ screen: 'card-library' })}
            expandOnHover={false}
            className="h-10 w-[7.5rem] max-w-none px-2 text-[11px]"
          />
          <CanvasMenuButton
            label="New Deck"
            size="sm"
            onClick={() => navigateTo({ screen: 'deck-builder' })}
            expandOnHover={false}
            className="h-10 w-[6.5rem] max-w-none px-2 text-[11px]"
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
          onSelectDeck={setCurrentIndex}
          onEditDeck={(deckId) => navigateTo({ screen: 'deck-builder', deckIdToEdit: deckId })}
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
