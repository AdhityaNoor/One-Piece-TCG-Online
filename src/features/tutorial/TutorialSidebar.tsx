/**
 * The tutorial's entire chrome, in one rail.
 *
 * WHY A RAIL. The first version floated the instructor bubble and the
 * control buttons over the middle/bottom of the viewport — which is exactly
 * where MatchScreen puts the hand dock. Objectives like "Counter with
 * O-Robi" ask the player to click a hand card that the tutorial was itself
 * covering, so the step looked broken ("the instructor isn't even
 * attacking") when in fact the click target was underneath the UI. A rail
 * that the board is laid out AROUND can never overlap a click target,
 * whatever the beat highlights.
 *
 * WHERE IT SITS. It is a real column of MatchScreen's desktop grid, between
 * the board and the battle log (MatchScreen renders `#tutorial-rail-slot`
 * whenever the current screen is 'tutorial'; the track's width is
 * `--op-tutorial-rail-width`, which TutorialManager sets). The rail itself
 * still renders at the app root as a FIXED element pinned over that slot's
 * rect, because TutorialOverlay's dim bars are fixed at z-9990 in the root
 * stacking context — anything actually nested inside MatchScreen's `z-10`
 * section would be painted under the dim and could not be clicked. So:
 * laid out by the grid, painted above the dim. `hostRect` is that slot's
 * measured rect; when it is null (mobile, where there is no desktop grid)
 * the rail falls back to being pinned against the viewport's right edge and
 * TutorialManager reserves the space instead.
 *
 * WHY INLINE STYLES. Tailwind's `content` globs did not include
 * `src/features/**`, so every utility class in this folder was silently
 * dropped from the generated CSS and the whole panel rendered unstyled —
 * white-on-white text over a transparent box. tailwind.config.js is fixed
 * now, but this panel is the tutorial's only readable surface, so its
 * colours, sizing and contrast are inline and cannot regress with a config
 * change again. Hover states are the one thing inline styles cannot express,
 * so they live in RAIL_CSS below as plain CSS on `op-tut-*` class names —
 * still not Tailwind, still immune to a config change.
 *
 * STYLING follows ActionLogDock (the battle log) deliberately: same
 * cyan-rimmed navy gradient shell, same gold-ruled header/footer bands, same
 * square corners, same small-caps button chrome — and the same collapse
 * mechanism, where the open rail carries a chevron tab on its outer edge and
 * the collapsed rail is one full-height button with a vertical label. The
 * Tailwind classes it mirrors are named in comments next to their inline
 * equivalents so the two can be kept in step.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** Rail width. MatchScreen's grid reserves exactly this much via --op-tutorial-rail-width. */
export const TUTORIAL_SIDEBAR_WIDTH = 340;
/** Width of the thin strip left behind when the rail is collapsed. Matches the battle log's own 2.75rem collapsed strip. */
export const TUTORIAL_SIDEBAR_COLLAPSED_WIDTH = 44;
/** The grid cell MatchScreen renders for the rail; see the file doc comment. */
export const TUTORIAL_RAIL_SLOT_ID = 'tutorial-rail-slot';

// ── Palette, lifted from ActionLogDock's Tailwind classes ──────────────────
const INK = '#ffffff';
const INK_SOFT = 'rgba(255,255,255,0.82)'; // text-white/82 (log body copy)
const INK_DIM = 'rgba(255,255,255,0.48)'; // text-white/48 (log sub-heading)
const INK_META = 'rgba(255,255,255,0.38)'; // text-white/38 (log entry meta)
const GOLD = '#d9a441'; // Tailwind `gold` — the log's accent
const GOLD_RULE = 'rgba(217,164,65,0.25)'; // border-gold/25
const GOLD_SOFT = 'rgba(217,164,65,0.82)'; // text-gold/82
const CYAN_RIM = 'rgba(165,243,252,0.2)'; // border-cyan-200/20
const DOCK_BG = 'linear-gradient(180deg, rgba(10,28,66,0.82), rgba(3,9,24,0.9))';
const BAND_BG = 'rgba(0,0,0,0.18)'; // bg-black/18 (log header band)
const DISPLAY_FONT = "'Oxanium', system-ui, sans-serif"; // font-display

const RAIL_CSS = `
.op-tut-rail-toggle:hover { border-color: rgba(217,164,65,0.55); color: ${GOLD}; }
.op-tut-rail-strip:hover { border-color: rgba(217,164,65,0.45); background-color: rgba(0,0,0,0.30); color: ${GOLD}; }
.op-tut-btn:hover:not(:disabled) { border-color: rgba(217,164,65,0.55); color: ${GOLD}; }
.op-tut-primary:hover:not(:disabled) { background: #d43b31; }
`;

export interface RailRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Live rect of MatchScreen's `#tutorial-rail-slot` grid cell, polled every
 * animation frame — the same technique tutorialAnchors/TutorialOverlay use to
 * follow board zones, and for the same reason: the cell moves whenever the
 * battle log opens, the window resizes or the rail itself collapses, and none
 * of that is observable from here without instrumenting MatchScreen.
 * Returns null on layouts that render no slot at all (mobile).
 */
export function useTutorialRailSlotRect(): RailRect | null {
  const [rect, setRect] = useState<RailRect | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const el = document.getElementById(TUTORIAL_RAIL_SLOT_ID);
      const next = el ? el.getBoundingClientRect() : null;
      setRect((prev) => {
        if (!next || next.width === 0) return prev === null ? prev : null;
        if (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height) return prev;
        return { top: next.top, left: next.left, width: next.width, height: next.height };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return rect;
}

export interface TutorialSidebarProps {
  scenarioTitle: string;
  chapterIndex: number;
  chapterCount: number;
  chapterTitle: string;

  speaker: string;
  lines: readonly string[];
  lineIndex: number;

  objective: string;
  showObjective: boolean;
  showSuccess: boolean;
  successLine: string;

  blockedReason: string | null;
  scriptError: string | null;
  /** The engine refuses this beat's own action right now — the board and the script have diverged. */
  preflightIssue: string | null;

  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;

  canGoPrevious: boolean;
  onPrevious: () => void;
  onRestartChapter: () => void;
  onSkipTutorial: () => void;
  onExit: () => void;

  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Measured rect of MatchScreen's rail slot; null on layouts without one. */
  hostRect: RailRect | null;
}

/** The battle log's shell: 2px cyan rim over a navy vertical gradient, square corners. */
const SHELL: CSSProperties = {
  border: `2px solid ${CYAN_RIM}`,
  backgroundImage: DOCK_BG,
  boxShadow: '0 14px 0 rgba(1,5,16,0.55), 0 26px 45px rgba(0,0,0,0.3)',
};

export function TutorialSidebar(props: TutorialSidebarProps) {
  const { collapsed, onToggleCollapsed, hostRect } = props;
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [props.lineIndex, props.chapterIndex]);

  const width = collapsed ? TUTORIAL_SIDEBAR_COLLAPSED_WIDTH : TUTORIAL_SIDEBAR_WIDTH;

  // Docked: pinned over the grid cell between the board and the battle log.
  // Undocked (mobile): the old behaviour — flush against the viewport edge.
  const placement: CSSProperties = hostRect
    ? { top: hostRect.top, left: hostRect.left, width: hostRect.width, height: hostRect.height }
    : { top: 0, right: 0, bottom: 0, width, transition: 'width 160ms ease' };

  return (
    <>
      <style>{RAIL_CSS}</style>
      <aside
        style={{
          position: 'fixed',
          ...placement,
          // Above TutorialOverlay's dim bars (z-9990), which are fixed in the
          // root stacking context — see the file doc comment.
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          color: INK,
          fontFamily: 'inherit',
          ...(collapsed ? {} : SHELL),
        }}
      >
        {collapsed ? (
          // Collapsed: the WHOLE strip is the button, exactly like the battle
          // log's closed bar — chevron + vertical label together, so the
          // affordance is the bar rather than a sliver of it.
          <button
            type="button"
            className="op-tut-rail-strip"
            onClick={onToggleCollapsed}
            aria-expanded={false}
            aria-label="Expand tutorial panel"
            title="Show tutorial panel"
            style={{
              ...SHELL,
              display: 'flex',
              flex: 1,
              minHeight: 0,
              width: '100%',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 0',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              transition: 'color 150ms ease, border-color 150ms ease, background-color 150ms ease',
            }}
          >
            <Chevron direction="left" />
            <span
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                userSelect: 'none',
              }}
            >
              Tutorial · {props.chapterIndex + 1}/{props.chapterCount}
            </span>
          </button>
        ) : (
          <>
            {/* Open: a chevron tab on the outer edge, same size, position and
                chrome as the battle log's collapse tab. */}
            <button
              type="button"
              className="op-tut-rail-toggle"
              onClick={onToggleCollapsed}
              aria-expanded={true}
              aria-label="Collapse tutorial panel"
              title="Hide tutorial panel"
              style={{
                position: 'absolute',
                left: -12,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 44,
                border: '1px solid rgba(165,243,252,0.25)',
                background: 'rgba(10,28,66,0.94)',
                color: 'rgba(207,250,254,0.75)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                cursor: 'pointer',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              <Chevron direction="right" />
            </button>

            {/* Header band — mirrors the log dock's eyebrow / display title /
                sub-heading stack over bg-black/18 with a gold rule beneath. */}
            <header style={{ borderBottom: `1px solid ${GOLD_RULE}`, background: BAND_BG, padding: '12px 16px' }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 900, letterSpacing: '0.24em', textTransform: 'uppercase', color: GOLD }}>
                Tutorial
              </p>
              <h2
                style={{
                  margin: '1px 0 0',
                  fontFamily: DISPLAY_FONT,
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: INK,
                }}
              >
                {props.scenarioTitle}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: INK_DIM }}>
                Chapter {props.chapterIndex + 1} of {props.chapterCount}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700, lineHeight: 1.35, color: INK_SOFT }}>{props.chapterTitle}</p>
              <div style={{ marginTop: 10, height: 3, background: 'rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.round(((props.chapterIndex + 1) / props.chapterCount) * 100)}%`,
                    background: GOLD,
                    transition: 'width 400ms ease',
                  }}
                />
              </div>
            </header>

            <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }}>
              <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
                {props.speaker}
              </p>

              {props.showSuccess ? (
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, fontWeight: 600, color: '#7ee2a8' }}>{props.successLine}</p>
              ) : (
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: INK_SOFT }}>
                  {props.lines[Math.min(props.lineIndex, props.lines.length - 1)] ?? ''}
                </p>
              )}

              {props.lines.length > 1 && !props.showSuccess && (
                <p style={{ margin: '10px 0 0', fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: INK_META }}>
                  {Math.min(props.lineIndex + 1, props.lines.length)} / {props.lines.length}
                </p>
              )}

              {props.showObjective && props.objective && (
                // The log's effect box: gold hairline over bg-black/24, square,
                // gold small-caps label. The heavier left edge is the one
                // addition — this is the panel's call to action.
                <div
                  style={{
                    marginTop: 14,
                    border: '1px solid rgba(217,164,65,0.2)',
                    borderLeft: `3px solid ${GOLD}`,
                    background: 'rgba(0,0,0,0.24)',
                    padding: '10px 12px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD_SOFT }}>
                    Your move
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: INK }}>{props.objective}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 10.5, lineHeight: 1.5, color: INK_DIM }}>
                    Do it on the board — the rest of the board is locked until you do.
                  </p>
                </div>
              )}

              {props.blockedReason && (
                <NoticeBox tone="error">{props.blockedReason}</NoticeBox>
              )}

              {props.preflightIssue && (
                <NoticeBox tone="warning" heading="The board is not ready for this step">
                  {props.preflightIssue}
                  <br />
                  Use <em>Restart chapter</em> to replay this chapter from a clean board.
                </NoticeBox>
              )}

              {props.scriptError && (
                <NoticeBox tone="error" heading="This step could not run">
                  {props.scriptError}
                  <br />
                  Use <em>Restart chapter</em> to replay this chapter from a clean board.
                </NoticeBox>
              )}
            </div>

            <footer style={{ borderTop: `1px solid ${GOLD_RULE}`, background: BAND_BG, padding: 12 }}>
              <button
                type="button"
                className="op-tut-primary"
                onClick={props.onPrimary}
                disabled={props.primaryDisabled}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: props.primaryDisabled ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.5)',
                  background: props.primaryDisabled ? 'rgba(0,0,0,0.28)' : '#c0342c',
                  color: props.primaryDisabled ? INK_META : '#ffffff',
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                  cursor: props.primaryDisabled ? 'default' : 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                {props.primaryLabel}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <SecondaryButton label="Previous" onClick={props.onPrevious} disabled={!props.canGoPrevious} />
                <SecondaryButton label="Restart chapter" onClick={props.onRestartChapter} />
                <SecondaryButton label="Skip tutorial" onClick={props.onSkipTutorial} />
                <SecondaryButton label="Exit" onClick={props.onExit} />
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

/** The battle log's collapse chevron, same 14px stroke-2.5 glyph. */
function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
      style={{ flexShrink: 0, transform: direction === 'right' ? 'rotate(180deg)' : undefined }}
    >
      <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NoticeBox({ tone, heading, children }: { tone: 'error' | 'warning'; heading?: string; children: ReactNode }) {
  const error = tone === 'error';
  return (
    <div
      style={{
        marginTop: 12,
        border: error ? '1px solid rgba(248,113,113,0.55)' : '1px solid rgba(251,191,36,0.6)',
        background: error ? 'rgba(127,29,29,0.35)' : 'rgba(120,53,15,0.35)',
        padding: '10px 12px',
        fontSize: 11.5,
        lineHeight: 1.55,
        color: error ? '#fecaca' : '#fde68a',
      }}
    >
      {heading && <strong style={{ display: 'block', marginBottom: 4 }}>{heading}</strong>}
      {children}
    </div>
  );
}

/** The log dock's small control: square, white hairline over black/28, gold on hover. */
function SecondaryButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="op-tut-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 8px',
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(0,0,0,0.28)',
        color: disabled ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.65)',
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: '0.12em',
        lineHeight: 1.25,
        textTransform: 'uppercase',
        boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        transition: 'color 150ms ease, border-color 150ms ease',
      }}
    >
      {label}
    </button>
  );
}
