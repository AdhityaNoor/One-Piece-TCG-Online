/**
 * Empty-deck defeat (1-2-1-1-2 / 9-2-1-2) and Leader replacements:
 * - OP15-022 Brook: defer loss to end of the turn the deck became 0
 * - OP03-040 Nami: win instead of losing when deck is 0
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';
import { createActionLogger } from './actionLogger';

export function hasEmptyDeckDefeatDeferral(state: GameState, playerId: string): boolean {
  return state.continuousEffects.some(
    (record) => record.emptyDeckDefeatDeferral?.appliesToControllerId === playerId,
  );
}

export function hasEmptyDeckDefeatWinReplacement(state: GameState, playerId: string): boolean {
  return state.continuousEffects.some(
    (record) => record.emptyDeckDefeatWinReplacement?.appliesToControllerId === playerId,
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
 * empty-deck win replacement (they win) or deferral (flag for EOT loss).
 */
export function applyEmptyDeckDefeatJudgment(state: GameState): DefeatJudgmentResult {
  if (state.gameOver) return { state, log: [] };

  const logger = createActionLogger(state, null);
  let working = state;
  const losers: string[] = [];
  const winners: string[] = [];

  for (const playerId of Object.keys(working.players)) {
    const player = working.players[playerId];
    if (!player || player.deck.cardIds.length > 0) continue;

    if (hasEmptyDeckDefeatWinReplacement(working, playerId)) {
      winners.push(playerId);
      continue;
    }
    if (hasEmptyDeckDefeatDeferral(working, playerId)) {
      working = withDeckBecameZeroThisTurn(working, playerId);
      continue;
    }
    losers.push(playerId);
  }

  // One player wins via empty-deck replacement (optionally the other loses normally).
  if (winners.length === 1) {
    const winnerId = winners[0]!;
    logger.push({
      actorPlayerId: winnerId,
      type: 'GAME_OVER',
      message: `${winnerId} wins — their deck is 0 cards, so they win instead of losing.`,
      data: { reason: 'cardEffect', winnerId, loserIds: losers },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    return {
      state: { ...working, gameOver: { winnerId, reason: 'cardEffect' }, log: [...working.log, ...logger.log] },
      log: logger.log,
    };
  }

  if (winners.length >= 2) {
    // Both players would win via replacement — treat as draw.
    logger.push({
      actorPlayerId: winners[0]!,
      type: 'GAME_OVER',
      message: `Empty-deck win replacements conflict — the game ends in a draw.`,
      data: { reason: 'draw', winnerIds: winners },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    return {
      state: { ...working, gameOver: { winnerId: null, reason: 'draw' }, log: [...working.log, ...logger.log] },
      log: logger.log,
    };
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
  // Win replacement takes precedence if somehow both are present.
  if (hasEmptyDeckDefeatWinReplacement(state, endingPlayerId)) {
    const logger = createActionLogger(state, null);
    logger.push({
      actorPlayerId: endingPlayerId,
      type: 'GAME_OVER',
      message: `${endingPlayerId} wins — their deck became 0 this turn, so they win instead of losing.`,
      data: { reason: 'cardEffect', winnerId: endingPlayerId },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    return {
      state: { ...state, gameOver: { winnerId: endingPlayerId, reason: 'cardEffect' }, log: [...state.log, ...logger.log] },
      log: logger.log,
    };
  }

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
