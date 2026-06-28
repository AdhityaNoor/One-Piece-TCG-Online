/**
 * Per-player state.
 * Source of truth: Comprehensive Rules, Section 3 "Game Areas", Section 5
 * "Game Setup".
 */
import type { Zone } from './zone';

export interface PlayerState {
  playerId: string;
  leaderInstanceId: string; // CardInstance id, fixed for the game (3-6-3)
  /**
   * Snapshot of the Leader's printed Life value (2-9), captured once at
   * setup. CardInstance deliberately has no `life` field (Life is static
   * CardDefinition data, not per-instance state), and the engine never
   * imports CardDefinition lookups from /src/cards — so this plain number is
   * how 5-2-1-7 (deal Life cards) and any future Life-value-referencing
   * effect get this value without a lookup outside the engine.
   */
  leaderLifeValue: number;
  deck: Zone; // 3-2, secret
  donDeck: Zone; // 3-3, open
  hand: Zone; // 3-4, secret to opponent
  characterArea: Zone; // 3-7, max 5
  stageArea: Zone; // 3-8, max 1
  costArea: Zone; // 3-9, open
  trash: Zone; // 3-5, open
  lifeArea: Zone; // 3-10, secret
  /** Set once at setup (5-2-1-4 / 5-2-1-5); only meaningful for the deciding player's choice. */
  hasGoneFirst: boolean;
  /** 5-2-1-6 — the once-only opening-hand redraw. */
  hasMulliganed: boolean;
}
