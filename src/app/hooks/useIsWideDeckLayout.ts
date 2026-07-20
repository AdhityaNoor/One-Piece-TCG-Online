/**
 * Tracks whether the viewport is at/above Tailwind's `xl` breakpoint
 * (1280px) — the width at which SavedDecksScreen's two-column layout
 * (deck-picker aside beside the detail panel, see `xl:grid-cols-[17rem_...]`
 * in SavedDecksScreen.tsx) actually applies. Below `xl` the picker stacks
 * above the detail panel, so the deck-box showcase gets a much narrower
 * column than desktop — the box is rendered at full scale there and only
 * needs to shrink below this same threshold, so this hook exists to drive
 * that one `compact` toggle without hardcoding a `window.innerWidth` check
 * inline in the screen.
 *
 * Plain `matchMedia` + resize listener rather than a CSS-only trick because
 * `DeckBox3D`'s geometry is computed in JS (rem-based inline styles driving
 * a real CSS 3D transform), not expressible as a Tailwind responsive class.
 */
import { useEffect, useState } from 'react';

const XL_BREAKPOINT_QUERY = '(min-width: 1280px)';

export function useIsWideDeckLayout(): boolean {
  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(XL_BREAKPOINT_QUERY).matches : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(XL_BREAKPOINT_QUERY);
    const handler = (event: MediaQueryListEvent) => setIsWide(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isWide;
}
