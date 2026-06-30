/**
 * App-layer adapter for the local card catalog.
 *
 * The stores (cardLibraryStore, deckBuilderStore) import from here rather
 * than directly from /src/cards/api so that the seam is easy to swap in
 * tests (inject a fake fetchImpl) and to keep the cards/ layer import-free
 * from app/ concerns.
 *
 * All four functions below forward to their canonical implementations in
 * /src/cards/api — this file is intentionally thin.
 */
export {
  fetchAllSets,
  fetchSetCards,
  fetchAllPlayableCardPrintings,
} from '../../cards/api/client';

export { resolveCardPrintingsById } from '../../cards/api/resolveCardById';
