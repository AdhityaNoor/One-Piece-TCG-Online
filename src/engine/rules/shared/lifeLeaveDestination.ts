/**
 * Where a Life card goes when it leaves the Life area for a "damage / add to hand"
 * style leave (7-1-4-1 and effect Life damage). Banish and ST13-003 face-up
 * redirect are checked here so battle damage and effect damage share one rule.
 */
import type { GameState } from '../../state/game';
import { isFaceUpLifeRedirectedToDeckBottom } from './lifeToHandRestriction';

export type LifeLeaveDestination = 'hand' | 'trash' | 'deckBottom';

export function resolveLifeLeaveDestination(
  state: GameState,
  ownerPlayerId: string,
  lifeCardInstanceId: string,
  opts: { banished?: boolean } = {},
): LifeLeaveDestination {
  if (opts.banished) return 'trash';
  const lifeCard = state.cardsById[lifeCardInstanceId];
  if (
    lifeCard?.faceState === 'faceUp'
    && isFaceUpLifeRedirectedToDeckBottom(state, ownerPlayerId)
  ) {
    return 'deckBottom';
  }
  return 'hand';
}
