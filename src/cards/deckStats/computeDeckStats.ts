/**
 * computeDeckStats — the single entry point that assembles a {@link DeckStats}
 * from a saved deck's card snapshots. Pure and synchronous: it reads only the
 * embedded `definition`/`quantity` on each snapshot, so it works fully offline
 * on any saved deck (requirement: saved decks never need the API again).
 *
 * The Leader is analysed separately from the 50-card main deck: it is excluded
 * from cost/power curves, the draw universe, on-curve odds, and searcher pools
 * (it is never in your deck to be drawn), matching how deck-analysis sites
 * treat the Leader.
 */
import type { SavedDeck, SavedDeckCardSnapshot } from '../decks/savedDeck';
import { computeCostCurve, computePowerCurve } from './curves';
import { computeCounterStat } from './counterStats';
import {
  computeAttributeDistribution,
  computeKeywordDistribution,
  computeTypeDistribution,
} from './distributions';
import { computeOnCurve } from './onCurve';
import { computeSearcherStat } from './searcher';
import type { DeckStats } from './types';

/** Copy-weighted total of the main-deck cards (should be 50 for a legal deck). */
function mainDeckSize(cards: SavedDeckCardSnapshot[]): number {
  return cards.reduce((sum, snap) => sum + snap.quantity, 0);
}

export function computeDeckStats(deck: Pick<SavedDeck, 'leader' | 'cards'>): DeckStats {
  const cards = deck.cards;
  const deckSize = mainDeckSize(cards);

  return {
    deckSize,
    costCurve: computeCostCurve(cards),
    powerCurve: computePowerCurve(cards),
    onCurve: computeOnCurve(cards, deckSize),
    counter: computeCounterStat(cards),
    types: computeTypeDistribution(cards),
    attributes: computeAttributeDistribution(cards),
    keywords: computeKeywordDistribution(cards),
    searcher: computeSearcherStat(cards, deckSize),
  };
}
