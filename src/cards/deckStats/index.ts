/**
 * deckStats — pure, offline deck analysis over a SavedDeck snapshot.
 * UI consumes {@link computeDeckStats}; it never recomputes stats itself.
 */
export { computeDeckStats } from './computeDeckStats';
export { atLeastOne, exactly } from './hypergeometric';
export * from './types';
