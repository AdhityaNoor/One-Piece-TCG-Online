/**
 * Decide a game that ran out of time instead of throwing it away.
 *
 * At hard difficulty the grindy matchups (OP04-001 literally cannot attack)
 * produce games longer than any practical per-game deadline. Recording those as
 * draws and dropping them from the win-rate denominator looks conservative but
 * is not: whether a game finishes CORRELATES with the thing being measured — a
 * config that is worse at closing games out times out more often, and excluding
 * its unfinished games flatters it. That is selection bias, not noise, and no
 * amount of extra sampling removes it.
 *
 * So an unfinished game is adjudicated on the position, the way engine test
 * suites and correspondence games handle adjournment. The ordering below is
 * deliberate: Life is the actual win condition, and everything after it is a
 * tie-break, not a second objective.
 */
import { computeCurrentPower } from '../../src/engine/rules/shared/power';
import type { CardDefinitionLookup } from '../../src/engine/rules/shared';
import type { GameState } from '../../src/engine/state/game';

export interface Adjudication {
  winnerSeatId: string | null;
  reason: string;
}

function boardPower(state: GameState, defs: CardDefinitionLookup, seatId: string): number {
  const player = state.players[seatId];
  if (!player) return 0;
  let total = 0;
  for (const id of player.characterArea.cardIds) {
    total += computeCurrentPower(defs, state, id);
  }
  return total;
}

/**
 * Adjudicate an unfinished game. Returns a null winner only when the two sides
 * are genuinely indistinguishable — a real draw, not a measurement failure.
 */
export function adjudicate(
  state: GameState,
  defs: CardDefinitionLookup,
  seatA: string,
  seatB: string,
): Adjudication {
  const lifeA = state.players[seatA]?.lifeArea.cardIds.length ?? 0;
  const lifeB = state.players[seatB]?.lifeArea.cardIds.length ?? 0;
  if (lifeA !== lifeB) {
    return { winnerSeatId: lifeA > lifeB ? seatA : seatB, reason: 'adjudicated-life' };
  }

  // Equal Life: board presence is the best available proxy for who was winning.
  const powerA = boardPower(state, defs, seatA);
  const powerB = boardPower(state, defs, seatB);
  if (powerA !== powerB) {
    return { winnerSeatId: powerA > powerB ? seatA : seatB, reason: 'adjudicated-board' };
  }

  const handA = state.players[seatA]?.hand.cardIds.length ?? 0;
  const handB = state.players[seatB]?.hand.cardIds.length ?? 0;
  if (handA !== handB) {
    return { winnerSeatId: handA > handB ? seatA : seatB, reason: 'adjudicated-hand' };
  }

  return { winnerSeatId: null, reason: 'adjudicated-draw' };
}
