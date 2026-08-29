/**
 * Layer 3 (UI board projection): "whose decision is next" for a hotseat
 * board to decide which side's controls should be interactive right now.
 * This is a presentational convenience, NOT a legality check — dispatch()
 * (engine/actions/dispatch.ts, via the match store) is always the final
 * arbiter of whether a given playerId may actually take a given action; the
 * UI using this to decide what to render is just a head start, never a
 * substitute for that check (project rule: Layer 3+ never decides legality).
 */
import type { GameState } from '../../engine/state/game';
import { getOpponentId } from '../../engine/rules/shared';

export function getActingPlayerId(state: GameState): string {
  if (state.pendingChoices.length > 0) {
    return state.pendingChoices[0].playerId;
  }
  if (state.currentBattle && (state.currentBattle.step === 'block' || state.currentBattle.step === 'counter')) {
    // DECLARE_ATTACK can only ever be made by the turn player against their
    // own opponent (see rules/battle/declareAttack.ts validation), so the
    // defending player during Block/Counter timing is always the opponent
    // of whoever is the turn player.
    return getOpponentId(state, state.activePlayerId);
  }
  return state.activePlayerId;
}

/**
 * Which player's playmat is lit as "the playing side".
 *
 * The answer differs by mode because the two modes carry the turn in
 * different places, and getting this wrong is silent rather than broken:
 *
 * - PINNED board (Casual / VS CPU, `localPlayerId` set). The board never
 *   moves, so position says nothing about the turn and the light has to carry
 *   it. That means the TURN player — steady for a whole turn. Not
 *   getActingPlayerId(): that names the defender the instant an attack is
 *   declared, and the light would cross the Battle Line several times a turn.
 *
 * - FLIPPING board (hotseat, `localPlayerId` null). MatchScreen defines the
 *   bottom seat AS the turn player there, so a turn-player light sits on the
 *   bottom mat forever and tells nobody anything. Position already says whose
 *   turn it is; what a shared screen actually needs to show is who owes the
 *   next input, which is exactly getActingPlayerId().
 */
export function getGlowPlayerId(state: GameState, localPlayerId: string | null): string {
  return localPlayerId !== null ? state.activePlayerId : getActingPlayerId(state);
}
