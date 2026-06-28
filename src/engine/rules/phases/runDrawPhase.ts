/**
 * Draw Phase (6-3). Turn-player-only, fully automatic.
 *
 * 6-3-1: the player going first skips their draw on turn 1 specifically
 * (isFirstTurnOfGame, scoped to turnNumber === 1 only — see game.ts doc
 * comment; the second player's first turn, turnNumber === 2, draws
 * normally).
 *
 * 9-2-1 / 1-2-1-1: attempting to draw from an empty deck is an immediate
 * loss for that player ("decked out"). Checked here, not just left to fail
 * later, since this is the only phase that ever draws from the main deck
 * outside of setup.
 */
import type { GameState } from '../../state/game';
import { createActionLogger } from '../shared/actionLogger';
import { addToZoneBottom } from '../shared/zoneOps';
import type { PhaseStepResult } from './phaseStepResult';

export function runDrawPhase(state: GameState): PhaseStepResult {
  const player = state.players[state.activePlayerId];
  const logger = createActionLogger(state, null);

  if (state.isFirstTurnOfGame) {
    logger.push({
      actorPlayerId: player.playerId,
      type: 'PHASE_CHANGED',
      message: `${player.playerId} skips their Draw Phase — going first on turn 1 (6-3-1).`,
      data: { phase: 'draw', skipped: true },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    const nextState: GameState = { ...state, currentPhase: 'don', log: [...state.log, ...logger.log] };
    return { state: nextState, log: logger.log };
  }

  if (player.deck.cardIds.length === 0) {
    const opponentId = Object.keys(state.players).find((id) => id !== player.playerId) ?? null;
    logger.push({
      actorPlayerId: player.playerId,
      type: 'GAME_OVER',
      message: `${player.playerId} attempted to draw from an empty deck and loses by decking out (9-2-1).`,
      data: { reason: 'deckedOut', loserId: player.playerId, winnerId: opponentId },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    const nextState: GameState = {
      ...state,
      gameOver: { winnerId: opponentId, reason: 'deckedOut' },
      log: [...state.log, ...logger.log],
    };
    return { state: nextState, log: logger.log };
  }

  const [drawnId, ...restDeck] = player.deck.cardIds;
  const newPlayer = {
    ...player,
    deck: { ...player.deck, cardIds: restDeck },
    hand: addToZoneBottom(player.hand, drawnId),
  };

  // The Zone helpers above only move the id between zone.cardIds arrays —
  // the CardInstance's own currentZone field (the field every PLAY_*
  // validator actually checks for hand membership) has to be kept in sync
  // here too, or the drawn card silently fails "is not in hand" checks the
  // moment it's played.
  const cardsById = {
    ...state.cardsById,
    [drawnId]: { ...state.cardsById[drawnId], currentZone: 'hand' as const },
  };

  logger.push({
    actorPlayerId: player.playerId,
    type: 'CARD_DRAWN',
    message: `${player.playerId} drew 1 card for their Draw Phase (6-3).`,
    data: { count: 1 },
    relatedCardInstanceIds: [drawnId],
    visibility: { visibleTo: [player.playerId] },
  });

  const nextState: GameState = {
    ...state,
    players: { ...state.players, [player.playerId]: newPlayer },
    cardsById,
    currentPhase: 'don',
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log };
}
