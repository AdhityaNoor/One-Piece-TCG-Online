/**
 * The tutorial's entire chrome, in one right-hand rail.
 *
 * WHY A RAIL. The first version floated the instructor bubble and the
 * control buttons over the middle/bottom of the viewport — which is exactly
 * where MatchScreen puts the hand dock. Objectives like "Counter with
 * O-Robi" ask the player to click a hand card that the tutorial was itself
 * covering, so the step looked broken ("the instructor isn't even
 * attacking") when in fact the click target was underneath the UI. A rail
 * that the board is laid out AROUND (see TutorialManager's board wrapper)
 * can never overlap a click target, whatever the beat highlights.
 *
 * WHY INLINE STYLES. Tailwind's `content` globs did not include
 * `src/features/**`, so every utility class in this folder was silently
 * dropped from the generated CSS and the whole panel rendered unstyled —
 * white-on-white text over a transparent box. tailwind.config.js is fixed
 * now, but this panel is the tutorial's only readable surface, so its
 * colours, sizing and contrast are inline and cannot regress with a config
 * change again.
 */
import { useEffect, useRef } from 'react';

/** Rail width. TutorialManager reserves exactly this much board space. */
export const TUTORIAL_SIDEBAR_WIDTH = 340;
/** Width of the thin strip left behind when the rail is collapsed. */
export const TUTORIAL_SIDEBAR_COLLAPSED_WIDTH = 44;

const INK = '#f4f7ff';
const INK_DIM = '#aab6d4';
const GOLD = '#e0b352';
const PANEL = '#0a1330';
const PANEL_SOFT = '#131f45';
const BORDER = 'rgba(255,255,255,0.14)';

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
}

export function TutorialSidebar(props: TutorialSidebarProps) {
  const { collapsed, onToggleCollapsed } = props;
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [props.lineIndex, props.chapterIndex]);

  const width = collapsed ? TUTORIAL_SIDEBAR_COLLAPSED_WIDTH : TUTORIAL_SIDEBAR_WIDTH;

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        background: PANEL,
        borderLeft: `1px solid ${BORDER}`,
        boxShadow: '-18px 0 40px rgba(0,0,0,0.45)',
        color: INK,
        fontFamily: 'inherit',
        transition: 'width 160ms ease',
      }}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Show tutorial panel' : 'Hide tutorial panel'}
        style={{
          position: 'absolute',
          top: 10,
          left: collapsed ? 6 : 10,
          width: 32,
          height: 32,
          borderRadius: 8,
          border: `1px solid ${BORDER}`,
          background: PANEL_SOFT,
          color: INK,
          fontSize: 14,
          lineHeight: 1,
          cursor: 'pointer',
          zIndex: 2,
        }}
      >
        {collapsed ? '‹' : '›'}
      </button>

      {collapsed ? (
        <div
          style={{
            marginTop: 52,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            padding: '8px 0',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: GOLD,
            userSelect: 'none',
          }}
        >
          Tutorial · {props.chapterIndex + 1}/{props.chapterCount}
        </div>
      ) : (
        <>
          <header style={{ padding: '12px 14px 12px 52px', borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.25)' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
              {props.scenarioTitle}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_DIM }}>
              Chapter {props.chapterIndex + 1} of {props.chapterCount}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: INK }}>{props.chapterTitle}</p>
            <div style={{ marginTop: 10, height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.5)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(((props.chapterIndex + 1) / props.chapterCount) * 100)}%`,
                  background: GOLD,
                  borderRadius: 999,
                  transition: 'width 400ms ease',
                }}
              />
            </div>
          </header>

          <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
              {props.speaker}
            </p>

            {props.showSuccess ? (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, fontWeight: 600, color: '#7ee2a8' }}>{props.successLine}</p>
            ) : (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: INK }}>
                {props.lines[Math.min(props.lineIndex, props.lines.length - 1)] ?? ''}
              </p>
            )}

            {props.lines.length > 1 && !props.showSuccess && (
              <p style={{ margin: '10px 0 0', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_DIM }}>
                {Math.min(props.lineIndex + 1, props.lines.length)} / {props.lines.length}
              </p>
            )}

            {props.showObjective && props.objective && (
              <div
                style={{
                  marginTop: 14,
                  borderRadius: 10,
                  border: `1px solid ${GOLD}`,
                  borderLeftWidth: 4,
                  background: 'rgba(224,179,82,0.10)',
                  padding: '10px 12px',
                }}
              >
                <p style={{ margin: 0, fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD }}>
                  Your move
                </p>
                <p style={{ margin: '5px 0 0', fontSize: 13.5, fontWeight: 700, lineHeight: 1.5, color: INK }}>{props.objective}</p>
                <p style={{ margin: '7px 0 0', fontSize: 11, lineHeight: 1.5, color: INK_DIM }}>
                  Do it on the board — the rest of the board is locked until you do.
                </p>
              </div>
            )}

            {props.blockedReason && (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 10,
                  border: '1px solid rgba(248,113,113,0.55)',
                  background: 'rgba(127,29,29,0.35)',
                  padding: '9px 11px',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: '#fecaca',
                }}
              >
                {props.blockedReason}
              </div>
            )}

            {props.preflightIssue && (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 10,
                  border: '1px solid rgba(251,191,36,0.6)',
                  background: 'rgba(120,53,15,0.35)',
                  padding: '10px 12px',
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: '#fde68a',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>The board is not ready for this step</strong>
                {props.preflightIssue}
                <br />
                Use <em>Restart chapter</em> to replay this chapter from a clean board.
              </div>
            )}

            {props.scriptError && (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 10,
                  border: '1px solid rgba(248,113,113,0.7)',
                  background: 'rgba(127,29,29,0.5)',
                  padding: '10px 12px',
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: '#fee2e2',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>This step could not run</strong>
                {props.scriptError}
                <br />
                Use <em>Restart chapter</em> to replay this chapter from a clean board.
              </div>
            )}
          </div>

          <footer style={{ borderTop: `1px solid ${BORDER}`, padding: 12, background: 'rgba(0,0,0,0.25)' }}>
            <button
              type="button"
              onClick={props.onPrimary}
              disabled={props.primaryDisabled}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: props.primaryDisabled ? `1px solid ${BORDER}` : '1px solid rgba(255,255,255,0.75)',
                background: props.primaryDisabled ? 'rgba(255,255,255,0.06)' : '#c0342c',
                color: props.primaryDisabled ? INK_DIM : '#ffffff',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: props.primaryDisabled ? 'default' : 'pointer',
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
  );
}

function SecondaryButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 8px',
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)',
        color: disabled ? 'rgba(170,182,212,0.45)' : INK,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
