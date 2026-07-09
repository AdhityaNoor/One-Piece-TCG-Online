/**
 * Loads the full card catalog (from the warmed cache) and computes effect metrics.
 */
import { useEffect, useMemo, useState } from 'react';
import { fetchAllSets, fetchSetCards } from '../../cards/api/client';
import { withCache, type CardPrintingDto } from '../../cards/api';
import {
  catalogCardsFromPrintings,
  computeEffectMetrics,
  type EffectMetrics,
} from '../../cards/devMetrics';
import { assignmentSourceBundle } from '../dev/assignmentSourceBundle';
import { browserFetch, cardLibraryCache, CARD_LIBRARY_CACHE_TTL_MS } from '../lib/runtime';

export type MetricsLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useEffectCoverageMetrics(): {
  status: MetricsLoadStatus;
  error?: string;
  metrics: EffectMetrics | null;
  refresh: () => void;
} {
  const [status, setStatus] = useState<MetricsLoadStatus>('idle');
  const [error, setError] = useState<string | undefined>();
  const [printings, setPrintings] = useState<CardPrintingDto[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(undefined);

    void (async () => {
      const setsResult = await fetchAllSets(browserFetch);
      if (cancelled) return;
      if (!setsResult.ok) {
        setStatus('error');
        setError('Failed to load card catalog index.');
        return;
      }

      const collected: CardPrintingDto[] = [];
      for (const set of setsResult.data) {
        const setResult = await withCache<CardPrintingDto[]>(
          cardLibraryCache,
          `setCards:${set.set_id}`,
          () => fetchSetCards(browserFetch, set.set_id),
          { ttlMs: CARD_LIBRARY_CACHE_TTL_MS },
        );
        if (cancelled) return;
        if (setResult.ok) collected.push(...setResult.data);
      }

      if (collected.length === 0) {
        setStatus('error');
        setError('No cards loaded from catalog.');
        return;
      }

      setPrintings(collected);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const metrics = useMemo(() => {
    if (!printings) return null;
    return computeEffectMetrics(catalogCardsFromPrintings(printings), {
      assignmentSources: assignmentSourceBundle,
    });
  }, [printings]);

  return {
    status,
    error,
    metrics,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
