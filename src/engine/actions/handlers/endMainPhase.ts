/**
 * END_MAIN_PHASE (6-5-2-1). Turn-player-only. Hands off to the automatic
 * End Phase / turn-handoff cascade (rules/phases/advanceAutomaticPhases.ts),
 * which the dispatcher always runs immediately after this executes.
 *
 * Also the primary 9-2-1-2 empty-deck defeat checkpoint: ending Main with
 * 0 cards in deck loses immediately (unless a Leader deferral is active).
 */
import type { GameState } from '../../state/game';
import type { EndMainPhaseAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import { applyEmptyDeckDefeatJudgment } from '../../rules/shared/emptyDeckDefeat';
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
  const judgment = applyEmptyDeckDefeatJudgment(state);
  if (judgment.state.gameOver) {
    return { state: judgment.state, log: judgment.log, pendingChoices: [] };
  }

  const logger = createActionLogger(judgment.state, action.actionId);
  logger.push({
    actorPlayerId: action.playerId,
    type: 'PHASE_CHANGED',
    message: `${action.playerId} ended their Main Phase (6-5-2-1).`,
    data: { phase: 'end' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...judgment.state,
    currentPhase: 'end',
    log: [...judgment.state.log, ...logger.log],
  };
  return { state: nextState, log: [...judgment.log, ...logger.log], pendingChoices: [] };
}
