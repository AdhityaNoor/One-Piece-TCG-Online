/**
 * Keeps the honeycomb backdrop's drift continuous across screen changes.
 *
 * Each screen renders its own .op-hex-bg layer, and a CSS animation always
 * starts at 0% when its element mounts — so navigating visibly snapped the
 * pattern back to its origin every time. There is no way to hand an animation
 * off between two different elements, but a NEGATIVE animation-delay starts it
 * part-way through: -15s on a 60s loop begins at the 25% mark.
 *
 * So every layer computes how far the app-wide clock has advanced through the
 * loop and offsets itself by that much. The result is that any number of
 * layers, mounted at any time, all render the same frame — the drift reads as
 * one continuous background rather than a per-screen animation.
 *
 * performance.now() is milliseconds since page load, which is exactly the
 * shared origin we want: it survives navigation (no remount of the document)
 * and needs no global state.
 */
import { useRef } from 'react';
import type { CSSProperties } from 'react';

/** Must match the --op-hex-speed default on .op-hex-bg in index.css. */
export const HEX_DRIFT_SECONDS = 60;

export function useHexDriftDelay(): CSSProperties {
  // Computed once per mount and held in a ref: recomputing on every render
  // would hand React a new animation-delay string each time, and changing
  // animation-delay restarts the animation — the exact bug this fixes.
  const style = useRef<CSSProperties | null>(null);
  if (style.current === null) {
    const elapsed = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
    style.current = { animationDelay: `-${(elapsed % HEX_DRIFT_SECONDS).toFixed(2)}s` };
  }
  return style.current;
}
