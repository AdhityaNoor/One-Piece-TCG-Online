/**
 * End Phase (6-6) plus turn handoff. Fully automatic.
 *
 * 6-6-1-2 / 6-6-1-3: "during this turn" / "until end of turn" continuous
 * effects expire in the ending player's own End Phase, below.
 *
 * "endOfOpponentsTurn" effects (e.g. "cannot attack until the end of your
 * opponent's next turn") and "untilStartOfNextTurn" effects ("until the start
 * of your next turn") are relative to the modifier's OWNER, not the ending
 * player: they expire in the End Phase of whichever player is the modifier
 * owner's opponent — i.e. exactly when `endingPlayerId !== effect.ownerId`.
 * Since turns strictly alternate between the two players, "the end of the
 * owner's opponent's next turn" and "the start of the owner's next turn" are
 * the SAME boundary, so both durations share this expiry rule — no separate
 * "next" tracking is needed.
 *
 * Turn handoff: turnNumber increments, activePlayerId flips to the other
 * player, isFirstTurnOfGame becomes false (it was only ever true for
 * turnNumber === 1), currentPhase returns to 'refresh' for the new turn
 * player. advanceAutomaticPhases (the orchestrator) picks this up and keeps
 * running Refresh -> Draw -> DON!! -> Main(stop) for them.
 */
import type { GameState } from '../../state/game';
import { createActionLogger } from '../shared/actionLogger';
import type { CardDefinitionLookup } from '../shared/definitions';
import { fireEndOfTurn, type EffectTemplateRegistry } from '../../effects';
import type { PhaseStepResult } from './phaseStepResult';

export function runEndPhaseAndHandoff(state: GameState, defs: CardDefinitionLookup = {}, registry: EffectTemplateRegistry = {}): PhaseStepResult {
  const endingPlayerId = state.activePlayerId;
  const nextPlayerId = Object.keys(state.players).find((id) => id !== endingPlayerId);
  if (!nextPlayerId) {
    throw new Error('runEndPhaseAndHandoff: expected exactly two players.');
  }

  // [End of Your Turn] triggers (10-2-x) fire before "until end of turn" effects
  // expire and before the turn passes, with each of the ending player's cards as source.
  const eot = fireEndOfTurn(state, endingPlayerId, registry, defs, null);
  const working = eot.state;

  const logger = createActionLogger(working, null);

  const continuousEffects = working.continuousEffects.filter(
    (effect) =>
      effect.duration !== 'endOfTurn' &&
      effect.duration !== 'duringThisTurn' &&
      // "endOfOpponentsTurn" ("until the end of your opponent's next turn") and
      // "untilStartOfNextTurn" ("until the start of your next turn") both clear at the
      // SAME boundary — the handoff from the modifier owner's opponent back to the owner,
      // i.e. the End Phase in which the ending player is NOT the modifier owner. (Turns
      // strictly alternate, so "end of the opponent's turn" == "start of the owner's next turn".)
      !((effect.duration === 'endOfOpponentsTurn' || effect.duration === 'untilStartOfNextTurn') && effect.ownerId !== endingPlayerId),
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
    message: `Turn passes to ${nextPlayerId} (turn ${working.turnNumber + 1}).`,
    data: { turnNumber: working.turnNumber + 1, previousPlayerId: endingPlayerId },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...working,
    continuousEffects,
    turnNumber: working.turnNumber + 1,
    activePlayerId: nextPlayerId,
    isFirstTurnOfGame: false,
    currentPhase: 'refresh',
    log: [...working.log, ...logger.log],
  };

  return { state: nextState, log: [...eot.log, ...logger.log] };
}
