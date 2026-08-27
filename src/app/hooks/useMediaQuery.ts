/**
 * Subscribe to a CSS media query from React.
 *
 * For layout that Tailwind's responsive classes cannot express on their own — where the
 * component TREE differs between breakpoints, not just its styling. The deck builder is
 * the case in point: on a phone it renders one pane at a time behind a tab bar, on
 * desktop all three panes at once, and no amount of `xl:` utilities turns one into the
 * other. Prefer plain responsive classes whenever the markup is the same at both sizes.
 *
 * SSR/JSDOM-safe: falls back to `false` where `matchMedia` is absent, and re-reads on
 * mount so the first paint cannot be stuck on a stale value.
 */
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** The deck builder's desktop breakpoint — Tailwind `xl`, matching its `xl:` classes. */
export const DECK_BUILDER_WIDE_QUERY = '(min-width: 1280px)';
