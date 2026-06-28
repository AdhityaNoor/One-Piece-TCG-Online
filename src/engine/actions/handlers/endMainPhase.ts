/**
 * END_MAIN_PHASE (6-5-2-1). Turn-player-only. Hands off to the automatic
 * End Phase / turn-handoff cascade (rules/phases/advanceAutomaticPhases.ts),
 * which the dispatcher always runs immediately after this executes.
 */
import type { GameState } from '../../state/game';
import type { EndMainPhaseAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import type { ActionExecuteResult } from '../actionExecuteResult';

export function validateEndMainPhase(state: GameState, action: EndMainPhaseAction): ValidationResult {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') {
    reasons.push('END_MAIN_PHASE is only legal during the Main Phase (6-5-2-1).');
  }
  if (action.playerId !== state.activePlayerId) {
    reasons.push('Only the turn player may end the Main Phase (6-5-2-1).');
  }
  return { legal: reasons.length === 0, reasons };
}

export function executeEndMainPhase(state: GameState, action: EndMainPhaseAction): ActionExecuteResult {
  const logger = createActionLogger(state, action.actionId);
  logger.push({
    actorPlayerId: action.playerId,
    type: 'PHASE_CHANGED',
    message: `${action.playerId} ended their Main Phase (6-5-2-1).`,
    data: { phase: 'end' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  const nextState: GameState = { ...state, currentPhase: 'end', log: [...state.log, ...logger.log] };
  return { state: nextState, log: logger.log, pendingChoices: [] };
}
