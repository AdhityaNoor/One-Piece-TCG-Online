/**
 * Keeps a panel mounted long enough for its CRT power-off animation to play.
 *
 * A modal that unmounts the instant `open` flips to false can only ever
 * animate its entrance — the exit frames never render because the node is
 * already gone. This hook decouples "should be open" (the caller's prop) from
 * "is still in the DOM": on close it reports phase 'exiting' and holds
 * `mounted` true for `exitMs`, which is exactly how long op-crt-out runs.
 *
 * Pair with the .op-crt-enter / .op-crt-exit classes in index.css — keep
 * `exitMs` in sync with op-crt-out's duration there.
 */
import { useEffect, useRef, useState } from 'react';

export type CrtPhase = 'entering' | 'exiting';

/** Must match the .op-crt-exit animation duration in index.css. */
export const CRT_EXIT_MS = 320;

export function useCrtPresence(open: boolean, exitMs: number = CRT_EXIT_MS): {
  mounted: boolean;
  phase: CrtPhase;
} {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<CrtPhase>(open ? 'entering' : 'exiting');

  // Tracked in a ref as well as state so the close branch can bail out
  // without needing `mounted` in the dependency list (which would re-run this
  // effect on its own state update).
  const mountedRef = useRef(open);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (open) {
      window.clearTimeout(timerRef.current);
      mountedRef.current = true;
      setMounted(true);
      setPhase('entering');
      return;
    }

    // Never mounted (e.g. initial render with open=false): nothing to play out.
    if (!mountedRef.current) return;

    setPhase('exiting');
    timerRef.current = window.setTimeout(() => {
      mountedRef.current = false;
      setMounted(false);
    }, exitMs);

    return () => window.clearTimeout(timerRef.current);
  }, [open, exitMs]);

  // Unmounting mid-animation must not leave a timer pointing at dead state.
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { mounted, phase };
}
