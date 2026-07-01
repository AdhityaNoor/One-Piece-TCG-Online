/**
 * useAppInit — drives the splash-screen progress bar while pre-warming the
 * card catalog on startup.
 *
 * Progress buckets:
 *   0 – 5 %   HTML/CSS creep animation (bundle downloading, before JS runs)
 *   5 – 10%   JS mounted, fetching index.json
 *  10 – 100%  Per-set JSON file loading (53 sets × ~1.7 % each)
 *
 * Each step calls window.__splashProgress() so the *HTML* splash bar stays
 * in sync during the brief window between React mounting and the HTML splash
 * being removed (one rAF later in main.tsx). After that the React
 * <SplashScreen> reads `progress` directly from the returned state.
 *
 * Cache strategy: same key / TTL as cardLibraryStore so every subsequent
 * store.loadSetCards() call hits the in-memory cache synchronously.
 */
import { useEffect, useRef, useState } from 'react';
import { fetchAllSets, fetchSetCards } from '../../cards/api/client';
import { withCache, type CardPrintingDto } from '../../cards/api';
import { browserFetch, cardLibraryCache, CARD_LIBRARY_CACHE_TTL_MS } from '../lib/runtime';

// Give the global a proper type so TypeScript doesn't complain.
declare global {
  interface Window {
    __splashProgress?: (pct: number) => void;
  }
}

function reportProgress(pct: number) {
  window.__splashProgress?.(pct);
}

export function useAppInit(): { ready: boolean; progress: number } {
  const [progress, setProgress] = useState(5);
  const [ready, setReady] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    // StrictMode double-fires effects in dev — guard against running twice.
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      // 5 → 10 %: fetch the index to learn how many sets exist
      const update = (pct: number) => {
        setProgress(pct);
        reportProgress(pct);
      };

      update(5);

      const setsResult = await fetchAllSets(browserFetch);

      if (!setsResult.ok) {
        // Can't load at all — bail out so the user hits the error in-screen
        update(100);
        setReady(true);
        return;
      }

      const sets = setsResult.data;
      const total = sets.length;
      update(10);

      // 10 → 100 %: load each set, update after every file
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        // Use the same cache key as cardLibraryStore so the store gets a
        // free cache hit when the user opens the Deck Builder / Library.
        await withCache<CardPrintingDto[]>(
          cardLibraryCache,
          `setCards:${set.set_id}`,
          () => fetchSetCards(browserFetch, set.set_id),
          { ttlMs: CARD_LIBRARY_CACHE_TTL_MS },
        );

        const pct = 10 + ((i + 1) / total) * 90;
        update(Math.round(pct));
      }

      // Brief pause at 100% so the user can see the filled bar
      await new Promise<void>((res) => setTimeout(res, 300));
      setReady(true);
    })();
  }, []);

  return { ready, progress };
}
