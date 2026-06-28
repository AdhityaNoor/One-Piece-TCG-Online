/**
 * CONCEDE (1-2-3, 1-2-4). Legal at any time, in any phase, for either
 * player — "cannot be replaced or forced by any card effect" just means no
 * OTHER mechanism may substitute for it; it does not restrict when the
 * conceding player may invoke it themselves.
 */
import type { GameState } from '../../state/game';
import type { ConcedeAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import type { ActionExecuteResult } from '../actionExecuteResult';

export function validateConcede(state: GameState, action: ConcedeAction): ValidationResult {
  const reasons: string[] = [];
  if (!state.players[action.playerId]) {
    reasons.push(`Unknown playerId '${action.playerId}'.`);
  }
  if (state.gameOver) {
    reasons.push('The game has already ended.');
  }
  return { legal: reasons.length === 0, reasons };
}

export function executeConcede(state: GameState, action: ConcedeAction): ActionExecuteResult {
  const logger = createActionLogger(state, action.actionId);
  const winnerId = Object.keys(state.players).find((id) => id !== action.playerId) ?? null;

  logger.push({
    actorPlayerId: action.playerId,
    type: 'GAME_OVER',
    message: `${action.playerId} conceded (1-2-3). ${winnerId ?? 'the opponent'} wins.`,
    data: { reason: 'concession', loserId: action.playerId, winnerId },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    gameOver: { winnerId, reason: 'concession' },
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log, pendingChoices: [] };
}
