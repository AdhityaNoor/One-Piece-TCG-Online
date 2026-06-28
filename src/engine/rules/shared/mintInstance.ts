/**
 * 3-1-6: a card that changes zone into/out of the Character or Stage area
 * must be treated as a brand-new card (fresh instanceId, continuous effects
 * and once-per-turn usage reset). Setup-time minting (leader/deck/DON!!) is
 * handled separately by setup/instanceIds.ts and never touches this counter
 * — those ids are deterministic from playerId+index because setup runs
 * exactly once, before any GameState exists to hold a counter. Mid-game
 * minting has no such fixed ordering, so it draws from GameState.nextInstanceSeq
 * instead (see game.ts doc comment on that field).
 *
 * DON!! cards are the deliberate exception: given/attached DON!! never
 * changes `currentZone` (stays in costArea — see card.ts CardInstance.donRested
 * doc comment), so DON!! never goes through this minting path.
 */
import type { GameState } from '../../state/game';

export interface MintedInstance {
  id: string;
  state: GameState;
}

export function mintRuntimeInstanceId(state: GameState): MintedInstance {
  const id = `rt-${state.nextInstanceSeq}`;
  return { id, state: { ...state, nextInstanceSeq: state.nextInstanceSeq + 1 } };
}
