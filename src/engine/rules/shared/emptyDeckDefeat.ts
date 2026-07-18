/**
 * Empty-deck defeat (1-2-1-1-2 / 9-2-1-2) and OP15-022-style deferral.
 *
 * Default: having 0 cards in deck is a defeat condition resolved at rule
 * processing. This engine runs that judgment when the turn player ends the
 * Main Phase / enters End Phase processing — matching "lose when ending the
 * phase with deck at 0" rather than waiting for the next Refresh/Draw.
 *
 * Some Leaders (Brook OP15-022) replace that with: do not lose from an empty
 * deck; instead lose at the end of the turn in which the deck became 0
 * (even if cards are later returned to the deck).
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';
import { createActionLogger } from './actionLogger';

export function hasEmptyDeckDefeatDeferral(state: GameState, playerId: string): boolean {
  return state.continuousEffects.some(
    (record) => record.emptyDeckDefeatDeferral?.appliesToControllerId === playerId,
  );
}

/** Mark that this player's deck hit 0 this turn (only when deferral is active). */
export function withDeckBecameZeroThisTurn(state: GameState, playerId: string): GameState {
  if (!hasEmptyDeckDefeatDeferral(state, playerId)) return state;
  const player = state.players[playerId];
  if (!player || player.deckBecameZeroThisTurn) return state;
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, deckBecameZeroThisTurn: true },
    },
  };
}

export interface DefeatJudgmentResult {
  state: GameState;
  log: GameLogEntry[];
}

/**
 * 9-2-1-2 checkpoint: players with 0 cards in deck lose, unless they have an
 * active empty-deck defeat deferral (in which case the end-of-turn flag is set).
 */
export function applyEmptyDeckDefeatJudgment(state: GameState): DefeatJudgmentResult {
  if (state.gameOver) return { state, log: [] };

  const logger = createActionLogger(state, null);
  let working = state;
  const losers: string[] = [];

  for (const playerId of Object.keys(working.players)) {
    const player = working.players[playerId];
    if (!player || player.deck.cardIds.length > 0) continue;

    if (hasEmptyDeckDefeatDeferral(working, playerId)) {
      working = withDeckBecameZeroThisTurn(working, playerId);
      continue;
    }
    losers.push(playerId);
  }

  if (losers.length === 0) {
    return { state: working, log: logger.log };
  }

  if (losers.length >= 2) {
    logger.push({
      actorPlayerId: losers[0]!,
      type: 'GAME_OVER',
      message: `Both players have 0 cards in their deck and lose (9-2-1-2).`,
      data: { reason: 'draw', loserIds: losers },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    return {
      state: { ...working, gameOver: { winnerId: null, reason: 'draw' }, log: [...working.log, ...logger.log] },
      log: logger.log,
    };
  }

  const loserId = losers[0]!;
  const winnerId = Object.keys(working.players).find((id) => id !== loserId) ?? null;
  logger.push({
    actorPlayerId: loserId,
    type: 'GAME_OVER',
    message: `${loserId} has 0 cards in their deck and loses (9-2-1-2).`,
    data: { reason: 'deckedOut', loserId, winnerId },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });
  return {
    state: { ...working, gameOver: { winnerId, reason: 'deckedOut' }, log: [...working.log, ...logger.log] },
    log: logger.log,
  };
}

/**
 * Brook-style end-of-turn loss: if the ending player's deck became 0 this turn
 * under an active deferral, they lose now (card text takes precedence over 9-2-1-2).
 */
export function applyDeferredEmptyDeckEndOfTurnLoss(
  state: GameState,
  endingPlayerId: string,
): DefeatJudgmentResult {
  if (state.gameOver) return { state, log: [] };
  const player = state.players[endingPlayerId];
  if (!player?.deckBecameZeroThisTurn) return { state, log: [] };
  if (!hasEmptyDeckDefeatDeferral(state, endingPlayerId)) return { state, log: [] };

  const logger = createActionLogger(state, null);
  const winnerId = Object.keys(state.players).find((id) => id !== endingPlayerId) ?? null;
  logger.push({
    actorPlayerId: endingPlayerId,
    type: 'GAME_OVER',
    message: `${endingPlayerId} loses at the end of the turn in which their deck became 0 cards.`,
    data: { reason: 'cardEffect', loserId: endingPlayerId, winnerId },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });
  return {
    state: { ...state, gameOver: { winnerId, reason: 'cardEffect' }, log: [...state.log, ...logger.log] },
    log: logger.log,
  };
}
