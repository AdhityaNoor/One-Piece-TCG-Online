/**
 * Zone definitions.
 * Source of truth: Comprehensive Rules, Section 3 "Game Areas".
 *
 * The 9 zones listed in 3-1-1. "Given" DON!! cards are NOT a 10th zone —
 * per 3-1-1 the rules only enumerate these 9 areas. Given DON!! are modeled
 * as CardInstance.donAttached on the Leader/Character they were given to
 * (see card.ts).
 */

export type ZoneId =
  | 'deck'
  | 'donDeck'
  | 'hand'
  | 'trash'
  | 'leaderArea'
  | 'characterArea'
  | 'stageArea'
  | 'costArea'
  | 'lifeArea';

/** Whether the contents/order of a zone are visible to the opponent. See 3-1-5. */
export type ZoneVisibility = 'open' | 'secret';

/**
 * A single player's instance of a zone. `cardIds` always stores CardInstance
 * ids, never full CardInstance objects, so the zone itself never duplicates
 * card state (single source of truth lives in GameState.cardsById — see
 * game.ts).
 *
 * `cardIds[0]` is defined as "top of stack" for stack-shaped zones (deck,
 * donDeck, trash, lifeArea) per the "top card" language used throughout
 * Section 3 (e.g. 3-10-2, 2-9-2-1).
 */
export interface Zone {
  id: ZoneId;
  visibility: ZoneVisibility;
  /** Ordered list of CardInstance ids currently in this zone. */
  cardIds: string[];
  /** Optional hard cap, e.g. characterArea = 5 (3-7-6), stageArea = 1 (3-8-5). */
  maxSize?: number;
}
