/**
 * End Phase (6-6) plus turn handoff. Fully automatic.
 *
 * 6-6-1-2 / 6-6-1-3: "during this turn" / "until end of turn" continuous
 * effects expire now. Nothing can populate ContinuousEffectRecord yet
 * (effects are fully stubbed this milestone), so this filter is currently
 * inert — kept here because it's cheap, obviously correct, and exactly
 * where the rule says expiry happens; NOT a deviation from "stub
 * everything", since no effect-template system exists to create these
 * records in the first place.
 *
 * Turn handoff: turnNumber increments, activePlayerId flips to the other
 * player, isFirstTurnOfGame becomes false (it was only ever true for
 * turnNumber === 1), currentPhase returns to 'refresh' for the new turn
 * player. advanceAutomaticPhases (the orchestrator) picks this up and keeps
 * running Refresh -> Draw -> DON!! -> Main(stop) for them.
 */
import type { GameState } from '../../state/game';
import { createActionLogger } from '../shared/actionLogger';
import type { PhaseStepResult } from './phaseStepResult';

export function runEndPhaseAndHandoff(state: GameState): PhaseStepResult {
  const endingPlayerId = state.activePlayerId;
  const nextPlayerId = Object.keys(state.players).find((id) => id !== endingPlayerId);
  if (!nextPlayerId) {
    throw new Error('runEndPhaseAndHandoff: expected exactly two players.');
  }

  const logger = createActionLogger(state, null);

  const continuousEffects = state.continuousEffects.filter(
    (effect) => effect.duration !== 'endOfTurn' && effect.duration !== 'duringThisTurn',
  );

  logger.push({
    actorPlayerId: endingPlayerId,
    type: 'PHASE_CHANGED',
    message: `${endingPlayerId}'s End Phase: "until end of turn" effects expire (6-6).`,
    data: { phase: 'end' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  logger.push({
    actorPlayerId: nextPlayerId,
    type: 'TURN_PASSED',
    message: `Turn passes to ${nextPlayerId} (turn ${state.turnNumber + 1}).`,
    data: { turnNumber: state.turnNumber + 1, previousPlayerId: endingPlayerId },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    continuousEffects,
    turnNumber: state.turnNumber + 1,
    activePlayerId: nextPlayerId,
    isFirstTurnOfGame: false,
    currentPhase: 'refresh',
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log };
}
