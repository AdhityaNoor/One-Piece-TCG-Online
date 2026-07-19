/**
 * TIMEOUT_LOSS — a ranked-match chess-clock expiring on `playerId`'s turn.
 * Structurally identical to CONCEDE (see concede.ts): the timed-out player
 * loses immediately, the other player wins. Kept as its own action type
 * (rather than reusing CONCEDE) so `gameOver.reason` is distinguishably
 * 'timeout' rather than 'concession' — the ranked result pipeline
 * (server/src/rooms/GameRoom.ts's rankedResultType) branches on this to
 * record a 'timeout' ranked result instead of a voluntary concession.
 *
 * Legal in any phase, exactly like CONCEDE, and for the same reason: a
 * clock can hit 0 during any phase or step, and the loss must always be
 * applicable regardless of what else is mid-resolution.
 */
import type { GameState } from '../../state/game';
import type { TimeoutLossAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import type { ActionExecuteResult } from '../actionExecuteResult';

export function validateTimeoutLoss(state: GameState, action: TimeoutLossAction): ValidationResult {
  const reasons: string[] = [];
  if (!state.players[action.playerId]) {
    reasons.push(`Unknown playerId '${action.playerId}'.`);
  }
  if (state.gameOver) {
    reasons.push('The game has already ended.');
  }
  return { legal: reasons.length === 0, reasons };
}

export function executeTimeoutLoss(state: GameState, action: TimeoutLossAction): ActionExecuteResult {
  const logger = createActionLogger(state, action.actionId);
  const winnerId = Object.keys(state.players).find((id) => id !== action.playerId) ?? null;

  logger.push({
    actorPlayerId: action.playerId,
    type: 'GAME_OVER',
    message: `${action.playerId} ran out of time. ${winnerId ?? 'the opponent'} wins.`,
    data: { reason: 'timeout', loserId: action.playerId, winnerId },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    gameOver: { winnerId, reason: 'timeout' },
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log, pendingChoices: [] };
}
