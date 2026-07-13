/**
 * Shared "how many saved decks can play which mode" count, extracted out of
 * PlayMenuScreen so the Home tab's Play Casual / VS CPU / Ranked buttons can
 * disable themselves the same way the Play tab's mode cards do, without
 * duplicating the format-status walk.
 */
import { useMemo } from 'react';
import { evaluateSavedDeckFormatStatus } from '../../cards/format';
import { useSavedDecksStore } from '../store/savedDecksStore';

export interface DeckEligibility {
  local: number;
  standard: number;
  extra: number;
  ranked: number;
}

export function useDeckEligibility(): DeckEligibility {
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);

  return useMemo(() => {
    let local = 0;
    let standard = 0;
    let extra = 0;
    let ranked = 0;

    for (const entry of entries) {
      const loaded = load(entry.deckId);
      if (!loaded.ok) continue;
      local += 1;
      const status = evaluateSavedDeckFormatStatus(loaded.deck).status;
      if (status === 'legal') {
        standard += 1;
        extra += 1;
        ranked += 1;
      } else if (status === 'extraLegal') {
        extra += 1;
      }
    }

    return { local, standard, extra, ranked };
  }, [entries, load]);
}
