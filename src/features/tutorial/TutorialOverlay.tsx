/**
 * Darkened background + spotlight cutout + pulsing glow ring. This is what
 * makes "Only valid actions are enabled... Everything else is temporarily
 * disabled" (project spec) literally true without touching a single line of
 * PlayerBoardPanel/ActionBar/DockHand: four fixed-position bars tile the
 * viewport AROUND the highlighted rect, each with `pointer-events: auto`, so
 * every click outside the spotlight is physically captured here instead of
 * reaching the real board underneath. Inside the cutout there is no bar at
 * all, so clicks fall straight through to the live MatchScreen board exactly
 * as normal — no disabled-prop plumbing needed anywhere else.
 *
 * When `anchorRect` is null (anchor not mounted, or `highlight: 'none'`),
 * this renders a single full-viewport dim layer with no cutout — used by
 * pure-narration chapters that aren't pointing at anything in particular.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { resolveAnchorRect, type AnchorRect } from './tutorialAnchors';
import type { TutorialAnchorId } from './types';

const GLOW_PAD = 10;

export interface TutorialOverlayProps {
  anchorId: TutorialAnchorId;
  /** Fired when the player clicks the dimmed area outside the spotlight — TutorialManager uses this to flash the objective banner instead of silently eating the click. */
  onBlockedClick?: () => void;
  /**
   * 'free' (multi-zone objectives, see types.ts `freeInteraction`): no dim,
   * no click-capture bars — only the decorative glow ring on the anchor, so
   * the whole board stays clickable while the dispatch guard does the actual
   * gating. Default 'spotlight' keeps the original block-everything-else
   * behavior.
   */
  mode?: 'spotlight' | 'free';
}

/** Polls the anchor's DOM rect every animation frame while mounted — cheap for a single small overlay, and the only reliable way to track layout shifts (board resize, ScaleToFit changes, hand dock animating open) without instrumenting every board component with a ResizeObserver of its own. */
function useAnchorRect(anchorId: TutorialAnchorId): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(() => resolveAnchorRect(anchorId));

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const next = resolveAnchorRect(anchorId);
      setRect((prev) => {
        if (!next && !prev) return prev;
        if (next && prev && next.top === prev.top && next.left === prev.left && next.width === prev.width && next.height === prev.height) return prev;
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchorId]);

  return rect;
}

export function TutorialOverlay({ anchorId, onBlockedClick, mode = 'spotlight' }: TutorialOverlayProps) {
  const rect = useAnchorRect(anchorId);
  const dim = 'rgba(4, 8, 20, 0.72)';

  if (!rect) {
    // Free mode with no anchor: nothing to draw at all — the board is fully live.
    if (mode === 'free') return null;
    return (
      <div
        aria-hidden="true"
        onClick={onBlockedClick}
        style={{ position: 'fixed', inset: 0, zIndex: 9990, background: dim, pointerEvents: 'auto' }}
      />
    );
  }

  const top = rect.top - GLOW_PAD;
  const left = rect.left - GLOW_PAD;
  const width = rect.width + GLOW_PAD * 2;
  const height = rect.height + GLOW_PAD * 2;

  if (mode === 'free') {
    // Hint ring only — no dim bars, every pointer event falls through to the board.
    return (
      <>
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top,
            left,
            width,
            height,
            borderRadius: 14,
            border: '2px solid rgba(217, 164, 65, 0.9)',
            boxShadow: '0 0 0 3px rgba(217, 164, 65, 0.25), 0 0 24px 6px rgba(217, 164, 65, 0.55)',
            pointerEvents: 'none',
            zIndex: 9991,
            animation: 'optcgTutorialPulse 1.6s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes optcgTutorialPulse {
            0%, 100% { opacity: 0.75; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.015); }
          }
        `}</style>
      </>
    );
  }

  const barBase: CSSProperties = { position: 'fixed', background: dim, pointerEvents: 'auto', zIndex: 9990 };

  return (
    <>
      {/* Top bar: full width, from viewport top down to the spotlight's top edge. */}
      <div aria-hidden="true" onClick={onBlockedClick} style={{ ...barBase, top: 0, left: 0, right: 0, height: Math.max(0, top) }} />
      {/* Bottom bar: full width, from the spotlight's bottom edge to viewport bottom. */}
      <div aria-hidden="true" onClick={onBlockedClick} style={{ ...barBase, top: top + height, left: 0, right: 0, bottom: 0 }} />
      {/* Left bar: spans only the spotlight's own row, from viewport left to its left edge. */}
      <div aria-hidden="true" onClick={onBlockedClick} style={{ ...barBase, top, left: 0, width: Math.max(0, left), height }} />
      {/* Right bar: spans only the spotlight's own row, from its right edge to viewport right. */}
      <div aria-hidden="true" onClick={onBlockedClick} style={{ ...barBase, top, left: left + width, right: 0, height }} />

      {/* Pulsing glow ring, purely decorative — sits above the bars but never intercepts pointer events. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top,
          left,
          width,
          height,
          borderRadius: 14,
          border: '2px solid rgba(217, 164, 65, 0.9)',
          boxShadow: '0 0 0 3px rgba(217, 164, 65, 0.25), 0 0 24px 6px rgba(217, 164, 65, 0.55)',
          pointerEvents: 'none',
          zIndex: 9991,
          animation: 'optcgTutorialPulse 1.6s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes optcgTutorialPulse {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.015); }
        }
      `}</style>
    </>
  );
}
