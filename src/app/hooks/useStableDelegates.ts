import { useRef } from 'react';

/**
 * Gives a bag of functions that are recreated every render (e.g. everything
 * returned by a big interaction hook like useBoardSelection) a PERMANENTLY
 * stable identity, without hand-picking a useCallback dependency array per
 * function.
 *
 * Why this exists (see docs/08-match-performance-plan.md Phase 1): React.memo
 * on a component only helps if its props are reference-stable. A hook that
 * returns ~30 closures, all recreated on every render because they close
 * over render-scoped state, defeats React.memo on every component those
 * closures get passed into — no matter how deep the memo boundary is.
 *
 * The naive fix (useCallback per function, with a manually-tracked
 * dependency array) is real risk in a hook with many interdependent
 * closures: get one dependency array wrong and a callback captures stale
 * state, which is a correctness bug, not just a missed optimization — and
 * exactly the kind of bug that's easy to miss without render-count test
 * coverage. This hook sidesteps that entirely with the standard "latest
 * ref" pattern: every wrapper function is created exactly ONCE (so its
 * identity never changes) and always delegates to THIS render's real
 * implementation via a ref that's reassigned on every render. Callers
 * always get current-render-accurate behavior no matter when they invoke a
 * wrapper — React commits a parent's render before its children's, so the
 * ref is already pointing at the latest implementation by the time any
 * child actually calls one of these during its own render or an event
 * handler.
 *
 * Only safe for a bag of FUNCTIONS — plain data (state, derived values that
 * should reflect the current render) must not be routed through this; wrap
 * those with a normal useMemo instead so they still change when they
 * should.
 */
export function useStableDelegates<T extends Record<string, (...args: never[]) => unknown>>(latest: T): T {
  const latestRef = useRef(latest);
  latestRef.current = latest;

  const stableRef = useRef<T | null>(null);
  if (!stableRef.current) {
    const stable = {} as T;
    for (const key of Object.keys(latest) as (keyof T)[]) {
      // Each wrapper is created once and never changes identity; it always
      // calls through to the CURRENT render's real function via the ref
      // above, so behavior is never stale even though identity is frozen.
      stable[key] = ((...args: unknown[]) => (latestRef.current[key] as (...a: unknown[]) => unknown)(...args)) as T[keyof T];
    }
    stableRef.current = stable;
  }

  return stableRef.current;
}
