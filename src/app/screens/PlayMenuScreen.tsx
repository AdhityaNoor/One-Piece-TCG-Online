import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useDeckEligibility } from '../hooks/useDeckEligibility';
import { GameCanvasScreen } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { hasCompletedCurrentTutorialVersion, useTutorialPersistenceStore } from '../../features/tutorial';

type PlayModeItem = {
  label: string;
  eyebrow: string;
  description: string;
  disabled: boolean;
  disabledReason?: string;
  onClick: () => void;
  /** "NEW" badge (project spec: shown for first-time players, removed permanently once the tutorial is completed — see hasCompletedCurrentTutorialVersion). */
  badge?: string;
  /** First-launch highlight (project spec: "Automatically highlight the Tutorial game mode"). */
  highlighted?: boolean;
  /** First-launch callout bubble (project spec mockup: "New to One Piece Card Game? Start here!"). */
  callout?: { text: string; onDismiss: () => void };
};

/**
 * Each of the three play modes (Local / Casual / Ranked) gets its own accent
 * color so the columns read as distinct destinations at a glance instead of
 * three identical translucent-black blocks. Colors are additive on top of
 * the flat translucent card body — only the left rail, dot, and eyebrow
 * text shift per section (no borders or drop shadows on the cards).
 */
type AccentKey = 'gold' | 'cyan' | 'violet';

/** Space between neighbouring honeycomb cells, in px. Mirrored by the
    --hex-gap CSS variable (see .op-hex-col / .op-hex-lane-overlap). */
const HEX_GAP = 8;

/** height / width of a REGULAR hexagon (sqrt(3)/2). Must match the ratio used
    by .op-hex-tile in index.css, or the tiles won't fit the measured height. */
const HEX_RATIO = 0.8660254;

/** Vertical chrome around the tile column inside the play area: the row's
    py-2 (16px) + the section's py-2 (16px) + the column's own top margin. */
const LANE_CHROME = 40;

const ACCENT_STYLES: Record<AccentKey, { title: string; dot: string; bar: string; ring: string }> = {
  gold: {
    title: 'text-gold',
    dot: 'bg-gold shadow-[0_0_10px_rgba(217,164,65,0.65)]',
    bar: 'bg-gradient-to-b from-gold/90 via-gold/35 to-transparent',
    ring: 'text-[rgb(var(--op-gold-rgb))]',
  },
  cyan: {
    title: 'text-cyan-300',
    dot: 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.6)]',
    bar: 'bg-gradient-to-b from-cyan-300/90 via-cyan-300/35 to-transparent',
    ring: 'text-cyan-300',
  },
  violet: {
    title: 'text-violet-300',
    dot: 'bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.6)]',
    bar: 'bg-gradient-to-b from-violet-300/90 via-violet-300/35 to-transparent',
    ring: 'text-violet-300',
  },
};

/**
 * Play tab content, embedded under the universal header (see HubScreen) —
 * no back button of its own since it isn't a pushed screen anymore.
 */
export function PlayMenuScreen() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const deckCounts = useDeckEligibility();

  const tutorialCompleted = useTutorialPersistenceStore((state) => state.tutorialCompleted);
  const tutorialVersion = useTutorialPersistenceStore((state) => state.tutorialVersion);
  const hasSeenFirstLaunchCallout = useTutorialPersistenceStore((state) => state.hasSeenFirstLaunchCallout);
  const markFirstLaunchCalloutSeen = useTutorialPersistenceStore((state) => state.markFirstLaunchCalloutSeen);
  const tutorialIsNew = !hasCompletedCurrentTutorialVersion({ tutorialCompleted, tutorialVersion });

  // First-launch highlight (project spec: "Automatically highlight the
  // Tutorial game mode" + "Display a small callout" — never forces the
  // player into it, see the dismiss button on the callout itself). Shown
  // once per player until either dismissed or the tutorial is completed;
  // never shown again after that even if hasSeenFirstLaunchCallout is somehow
  // reset, since a completed tutorial has nothing left to call out.
  const [calloutDismissed, setCalloutDismissed] = useState(false);
  const showFirstLaunchCallout = tutorialIsNew && !hasSeenFirstLaunchCallout && !calloutDismissed;

  function dismissCallout(): void {
    setCalloutDismissed(true);
    markFirstLaunchCalloutSeen();
  }

  const hasLocalDecks = deckCounts.local > 0;
  const hasStandardDecks = deckCounts.standard > 0;
  const hasExtraDecks = deckCounts.extra > 0;
  const hasRankedDecks = deckCounts.ranked > 0;

  // Desktop honeycomb sizing: derive one hexagon edge length from the
  // available height so the tallest lane's three tiles exactly fill the
  // viewport (no stretching, no empty space). Published as the `--hex` CSS
  // var; every dimension below (tile box, lane width, overlap, offset) is a
  // multiple of it. Square tiles (1:1) — width and height both `--hex`. Below
  // `lg` the var is cleared and tiles fall back to fixed rem sizes.
  const rowRef = useRef<HTMLDivElement>(null);
  const [hexSize, setHexSize] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const compute = () => {
      if (!mql.matches) {
        el.style.removeProperty('--hex');
        setHexSize(null);
        return;
      }
      const header = el.querySelector('[data-lane-header]') as HTMLElement | null;
      // Fixed point, not a single pass: the lane header's own type is sized
      // from --hex (see .op-hex-lane-title), so its height depends on the
      // answer we're solving for. Writing --hex straight onto the element and
      // re-reading offsetHeight forces a synchronous relayout, so two or
      // three rounds converge within the same frame. Without this the header
      // would be measured at its PREVIOUS size and the tiles would be sized
      // from stale chrome.
      let width = 150;
      for (let pass = 0; pass < 3; pass += 1) {
        const headerH = header?.offsetHeight ?? 68;
        // Tallest lane = 3 tile HEIGHTS + 2 gaps, plus the lane header and the
        // row/section vertical padding. Solve for one tile's height, then
        // convert to the width that --hex expects (height = width * 0.866).
        const chrome = headerH + LANE_CHROME + HEX_GAP * 2;
        const tileH = Math.floor((el.clientHeight - chrome) / 3);
        const next = Math.floor(tileH / HEX_RATIO);
        const clamped = Number.isFinite(next) && next > 150 ? next : 150;
        // Converged (or oscillating by a hair) — stop, don't thrash layout.
        if (Math.abs(clamped - width) <= 2) {
          width = clamped;
          break;
        }
        width = clamped;
        el.style.setProperty('--hex', `${width}px`);
      }
      setHexSize(width);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    mql.addEventListener('change', compute);
    return () => {
      ro.disconnect();
      mql.removeEventListener('change', compute);
    };
  }, []);

  return (
    <GameCanvasScreen dense>
      {/* Below `lg` this is plain block flow — no flexbox, no grid, nothing
          with any layout-engine ambiguity. `<section>` is block-level by
          default, so three of them just stack top to bottom, full stop;
          `space-y-5` (margin-top on every sibling after the first) is the
          spacing, not `gap`, so there's no flex/grid container involved at
          all down here. Both the CSS Grid + `grid-cols-1` version and the
          `flex flex-col` version of this still overlapped section headers
          onto the previous section's cards on the actual device this was
          tested on, so this drops every layout mechanism that could
          possibly explain that and keeps only plain document flow. Grid
          only takes over at `lg`, matching the desktop-only fixed 3-column
          fit. */}
      {/* Desktop: a true honeycomb. Lanes overlap horizontally by 1/4 of a
          hexagon (negative margins on the section) so the pointed sides nest
          into each other, and the middle lane is pushed down by half a hex so
          its tiles sit in the notches — a proper interlocking tessellation
          rather than three separated columns. Mobile just stacks the lanes. */}
      <div
        ref={rowRef}
        style={{ ['--hex-gap']: `${HEX_GAP}px`, ...(hexSize ? { ['--hex']: `${hexSize}px` } : {}) } as CSSProperties}
        className="relative z-10 flex h-full min-h-0 flex-col space-y-3 overflow-y-auto px-2 py-2 sm:px-3 lg:flex-row lg:items-start lg:justify-center lg:gap-0 lg:space-y-0 lg:overflow-hidden"
      >
        <PlaySection
          title="Local"
          accent="gold"
          deckHint={`${deckCounts.local} decks available`}
          items={[
            {
              label: 'Tutorial',
              eyebrow: 'Learn to Play',
              description: 'A guided, chapter-by-chapter walkthrough of the rules — start here if this is your first match.',
              disabled: false,
              badge: tutorialIsNew ? 'NEW' : undefined,
              onClick: () => {
                dismissCallout();
                navigateTo({ screen: 'tutorial' });
              },
              highlighted: showFirstLaunchCallout,
              callout: showFirstLaunchCallout ? { text: 'New to One Piece Card Game? Start here!', onDismiss: dismissCallout } : undefined,
            },
            {
              label: 'VS Self',
              eyebrow: 'Local Hotseat',
              description: 'Control both seats locally. Best for testing decks, effects, and board states.',
              disabled: !hasLocalDecks,
              disabledReason: 'Save at least one deck first.',
              onClick: () => navigateTo({ screen: 'deck-select' }),
            },
            {
              label: 'VS CPU',
              eyebrow: 'Single Player',
              description: 'Play against the local CPU using any saved deck for either side.',
              disabled: !hasLocalDecks,
              disabledReason: 'Save at least one deck first.',
              onClick: () => navigateTo({ screen: 'cpu-deck-select' }),
            },
          ]}
        />

        <PlaySection
          title="Casual"
          accent="cyan"
          offsetDown
          overlapLeft
          deckHint={`${deckCounts.extra} eligible decks`}
          items={[
            {
              label: 'Standard',
              eyebrow: 'Online Casual',
              description: 'Bring a Legal deck into the live casual lobby.',
              disabled: !hasStandardDecks,
              disabledReason: 'No Legal decks found.',
              onClick: () => navigateTo({ screen: 'casual-lobby', regulation: 'casualStandard' }),
            },
            {
              label: 'Extra Legal',
              eyebrow: 'Online Casual',
              description: 'Bring a Legal or Extra Legal deck into the live casual lobby.',
              disabled: !hasExtraDecks,
              disabledReason: 'No Legal or Extra Legal decks found.',
              onClick: () => navigateTo({ screen: 'casual-lobby', regulation: 'casualExtra' }),
            },
          ]}
        />

        <PlaySection
          title="Ranked"
          accent="violet"
          overlapLeft
          deckHint={`${deckCounts.ranked} legal decks`}
          items={[
            {
              label: 'Standard',
              eyebrow: 'Ranked Queue',
              description: 'Competitive seasonal ladder for Legal decks only.',
              disabled: !hasRankedDecks,
              disabledReason: 'No Standard-legal decks found.',
              onClick: () => navigateTo({ screen: 'ranked' }),
            },
          ]}
        />
      </div>
    </GameCanvasScreen>
  );
}

function PlaySection({
  title,
  accent,
  deckHint,
  items,
  offsetDown = false,
  overlapLeft = false,
}: {
  title: string;
  accent: AccentKey;
  deckHint: string;
  items: PlayModeItem[];
  /** Honeycomb: push this lane down half a hexagon so its tiles nest into the
      notches of its neighbours (the middle lane). */
  offsetDown?: boolean;
  /** Honeycomb: pull this lane 1/4-hexagon left so its points interlock with
      the lane before it (every lane except the first). */
  overlapLeft?: boolean;
}) {
  const styles = ACCENT_STYLES[accent];
  return (
    <section
      className={[
        'op-hex-lane relative flex min-w-0 flex-col px-1 py-2 lg:flex-none lg:px-0',
        overlapLeft ? 'op-hex-lane-overlap' : '',
      ].join(' ')}
    >
      {/* Font sizes come from .op-hex-lane-header / -title / -hint, which are
          expressed in container-query units against the lane, so the header
          shrinks in step with the hexagons instead of colliding with the
          neighbouring lane's header on short viewports. The dot and the gap
          are in `em` so they follow the title. */}
      <div data-lane-header className="op-hex-lane-header pb-4 text-center">
        <div className={['op-hex-lane-title inline-flex max-w-full items-center justify-center gap-[0.4em]', styles.title].join(' ')}>
          <span aria-hidden="true" className={['h-[0.4em] w-[0.4em] flex-shrink-0 rounded-full', styles.dot].join(' ')} />
          <p className="font-display font-black uppercase leading-tight tracking-[0.22em]">{title}</p>
        </div>
        <p className="op-hex-lane-hint mt-[0.4em] font-bold uppercase leading-tight tracking-[0.16em] text-white/42">{deckHint}</p>
      </div>

      {/* gap-0: hexagons in a lane share flat edges (their 2px accent borders
          become the honeycomb cell walls). The offset lane's TILES (not its
          header) drop half a hexagon so headers stay aligned in a row while
          the tiles interlock. */}
      <div
        className={[
          'op-hex-col lg:min-h-0 lg:justify-start',
          offsetDown ? 'op-hex-col-offset' : '',
        ].join(' ')}
      >
        {items.map((item) => (
          <ModeCard key={`${title}-${item.label}-${item.eyebrow}`} item={item} accent={accent} />
        ))}
      </div>
    </section>
  );
}

function ModeCard({ item, accent }: { item: PlayModeItem; accent: AccentKey }) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className="relative mx-auto w-full max-w-[16rem] sm:max-w-[17rem] lg:max-w-none">
      {item.callout && (
        <div className="absolute -top-3 left-4 z-10 flex -translate-y-full items-center gap-2 rounded-lg border border-gold/60 bg-[#0b1c3e] px-3 py-2 text-xs font-semibold text-white shadow-lg">
          <span>{item.callout.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(event) => {
              event.stopPropagation();
              item.callout?.onDismiss();
            }}
            className="text-white/50 hover:text-white"
          >
            ✕
          </button>
          <span aria-hidden="true" className="absolute left-6 top-full h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-gold/60 bg-[#0b1c3e]" />
        </div>
      )}
      {/* Accent-colored border wrapper: clipped to the same hexagon as the
          button, its 2px padding shows through as the hex outline. Interlocks
          with the neighbours above/below to read as a honeycomb column. */}
      <button
        type="button"
        disabled={item.disabled}
        onClick={item.onClick}
        className={[
          // Square box (1:1) sized purely from --hex — see .op-hex-tile. Fixed
          // width AND height mean long text can never stretch the shape.
          // Translucent navy fill so the honeycomb background reads through;
          // the accent outline is drawn as an SVG ring ON TOP (below) rather
          // than as a backing layer, which would tint the whole translucent
          // tile with the accent color.
          // Hover grows the cell from its own center (transform-origin is
          // center by default) rather than nudging it upwards; hover:z-10
          // lifts it above the neighbouring cells it overlaps while enlarged.
          'group/tile op-hex-tile op-hex-clip relative block text-left transition-transform duration-200 ease-out',
          item.disabled ? 'bg-[#0a1533]/45' : 'bg-[#0a1533]/45 hover:bg-[#0a1533]/65',
          'backdrop-blur-[2px] focus:outline-none focus-visible:brightness-125',
          item.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer hover:z-10 hover:scale-[1.05] focus-visible:z-10 focus-visible:scale-[1.05]',
          item.highlighted ? 'animate-pulse' : '',
        ].join(' ')}
      >
        {/* The viewBox must match the tile's real 1 : 0.8660254 ratio. With a
            square viewBox the coordinate system was scaled unevenly (x and y
            by different factors), which rendered the flat edges and the
            slanted edges at visibly different thicknesses. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 86.60254"
          preserveAspectRatio="none"
          className={['pointer-events-none absolute inset-0 h-full w-full opacity-70 transition-opacity group-hover/tile:opacity-100', styles.ring].join(' ')}
        >
          <polygon
            points="25,0 75,0 100,43.30127 75,86.60254 25,86.60254 0,43.30127"
            fill="none"
            stroke="currentColor"
            // The stroke straddles the polygon edge and the tile's clip-path
            // cuts the outer half away, so the visible thickness is half this
            // value (6 -> ~3px on screen).
            strokeWidth="6"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
        {/* Per-tile compass backdrop, centred in the hexagon and sized as a
            share of it so it scales with --hex. Brightens slightly on hover
            alongside the outline. Sits under the label because the content
            span below is `relative`. */}
        <span
          aria-hidden="true"
          className="op-compass pointer-events-none absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 text-white opacity-[0.09] transition-opacity duration-200 group-hover/tile:opacity-[0.16]"
        />
        <span
          className={[
            // Sizing (font, padding, gap) lives in .op-hex-content and is
            // expressed in container-query units, so the whole text block is
            // a fixed fraction of the hexagon at every tile size. Everything
            // below is therefore in `em` — one knob scales the lot. Wide
            // left/right padding keeps text inside the hexagon's central
            // band — the shape narrows to ~half width at the flat top/bottom
            // edges, so text set full-width would be clipped by the slanted
            // sides.
            'op-hex-content relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center',
          ].join(' ')}
        >
          <span className="flex max-w-full items-center justify-center gap-[0.5em]">
            <span className={['text-[0.8em] font-black uppercase tracking-[0.2em]', styles.title].join(' ')}>{item.eyebrow}</span>
            {item.badge && (
              <span className="rounded-sm border border-gold/70 bg-gold/20 px-[0.35em] py-[0.15em] text-[0.7em] font-black uppercase tracking-[0.12em] text-gold">{item.badge}</span>
            )}
          </span>
          <span className="font-display text-[1.55em] font-black uppercase leading-[1.1] tracking-[0.06em] text-white">{item.label}</span>
          {/* line-clamp is the last line of defence: on the shortest viewports
              a long description would otherwise run past the hexagon's bottom
              edge and get sliced by the clip-path mid-word. */}
          <span className="line-clamp-4 text-[1em] leading-[1.25] text-slate-200/75">{item.description}</span>

          {item.disabled && item.disabledReason && (
            <span className="pt-[0.2em] text-[0.8em] font-bold uppercase tracking-[0.1em] text-white/40">{item.disabledReason}</span>
          )}
        </span>
      </button>
    </div>
  );
}
