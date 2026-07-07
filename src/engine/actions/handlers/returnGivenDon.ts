/**
 * RETURN_GIVEN_DON — hotseat undo for mis-clicks only.
 *
 * Reverses GIVE_DON by detaching one rested DON!! from a Leader/Character and
 * returning it to the active cost-area pool. Not a printed Comprehensive Rules
 * player action; local-play correction affordance for the card hover stepper.
 */
import type { GameState } from '../../state/game';
import type { ReturnGivenDonAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import type { ActionExecuteResult } from '../actionExecuteResult';

export function validateReturnGivenDon(state: GameState, action: ReturnGivenDonAction): ValidationResult {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') {
    reasons.push('RETURN_GIVEN_DON is only legal during the Main Phase.');
  }
  if (action.playerId !== state.activePlayerId) {
    reasons.push('Only the turn player may return given DON!!.');
  }

  const target = state.cardsById[action.targetInstanceId];
  if (!target || target.ownerId !== action.playerId || (target.currentZone !== 'leaderArea' && target.currentZone !== 'characterArea')) {
    reasons.push(`'${action.targetInstanceId}' is not one of ${action.playerId}'s own Leader/Character cards.`);
  } else if (!target.donAttached.includes(action.donInstanceId)) {
    reasons.push(`'${action.donInstanceId}' is not attached to '${action.targetInstanceId}'.`);
  }

  const donInstance = state.cardsById[action.donInstanceId];
  if (!donInstance || donInstance.currentZone !== 'costArea' || donInstance.ownerId !== action.playerId) {
    reasons.push(`'${action.donInstanceId}' is not a DON!! in ${action.playerId}'s cost area.`);
  } else if (donInstance.donRested !== true) {
    reasons.push(`'${action.donInstanceId}' is not a given (rested) DON!!.`);
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeReturnGivenDon(state: GameState, action: ReturnGivenDonAction): ActionExecuteResult {
  const logger = createActionLogger(state, action.actionId);
  const target = state.cardsById[action.targetInstanceId];

  const cardsById = {
    ...state.cardsById,
    [action.donInstanceId]: { ...state.cardsById[action.donInstanceId], donRested: false },
    [action.targetInstanceId]: {
      ...target,
      donAttached: target.donAttached.filter((id) => id !== action.donInstanceId),
    },
  };

  logger.push({
    actorPlayerId: action.playerId,
    type: 'DON_RETURNED',
    message: `${action.playerId} returned 1 given DON!! from '${action.targetInstanceId}' to active (hotseat undo).`,
    data: { donInstanceId: action.donInstanceId, targetInstanceId: action.targetInstanceId },
    relatedCardInstanceIds: [action.donInstanceId, action.targetInstanceId],
    visibility: 'public',
  });

  const nextState: GameState = { ...state, cardsById, log: [...state.log, ...logger.log] };
  return { state: nextState, log: logger.log, pendingChoices: [] };
}
