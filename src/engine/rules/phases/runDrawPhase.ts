/**
 * Draw Phase (6-3). Turn-player-only, fully automatic.
 *
 * 6-3-1: the player going first skips their draw on turn 1 specifically
 * (isFirstTurnOfGame, scoped to turnNumber === 1 only - see game.ts doc
 * comment; the second player's first turn, turnNumber === 2, draws
 * normally).
 *
 * 9-2-1 / 1-2-1-1: attempting to draw from an empty deck is an immediate
 * loss for that player ("decked out"), unless an empty-deck defeat deferral
 * is active (OP15-022) — then the draw is skipped as an impossible action
 * and loss is deferred to end of turn.
 */
import type { GameState } from '../../state/game';
import { createActionLogger } from '../shared/actionLogger';
import { addToZoneBottom } from '../shared/zoneOps';
import { hasEmptyDeckDefeatDeferral, withDeckBecameZeroThisTurn } from '../shared/emptyDeckDefeat';
import type { PhaseStepResult } from './phaseStepResult';

export function runDrawPhase(state: GameState): PhaseStepResult {
  const player = state.players[state.activePlayerId];
  const logger = createActionLogger(state, null);

  if (state.isFirstTurnOfGame) {
    logger.push({
      actorPlayerId: player.playerId,
      type: 'PHASE_CHANGED',
      message: `${player.playerId} skips their Draw Phase - going first on turn 1 (6-3-1).`,
      data: { phase: 'draw', skipped: true },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    const nextState: GameState = { ...state, currentPhase: 'don', log: [...state.log, ...logger.log] };
    return { state: nextState, log: logger.log };
  }

  if (player.deck.cardIds.length === 0) {
    if (hasEmptyDeckDefeatDeferral(state, player.playerId)) {
      const deferred = withDeckBecameZeroThisTurn(state, player.playerId);
      logger.push({
        actorPlayerId: player.playerId,
        type: 'PHASE_CHANGED',
        message: `${player.playerId} cannot draw — deck has 0 cards (draw skipped; empty-deck defeat deferred).`,
        data: { phase: 'draw', skipped: true, reason: 'emptyDeckDrawSkipped' },
        relatedCardInstanceIds: [],
        visibility: 'public',
      });
      const nextState: GameState = {
        ...deferred,
        currentPhase: 'don',
        log: [...deferred.log, ...logger.log],
      };
      return { state: nextState, log: logger.log };
    }

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
  let newPlayer = {
    ...player,
    deck: { ...player.deck, cardIds: restDeck },
    hand: addToZoneBottom(player.hand, drawnId),
  };

  // The Zone helpers above only move the id between zone.cardIds arrays.
  // Keep CardInstance.currentZone in sync too; PLAY_* validators read it.
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

  // Pushed after CARD_DRAWN (not before) so existing log[0]-is-CARD_DRAWN assertions in
  // runDrawPhase.test.ts stay valid — mirrors runDonPhase.ts's CARD_MOVED-then-PHASE_CHANGED
  // ordering. Without this, a NORMAL (non-skipped, non-empty-deck) draw never emitted its own
  // PHASE_CHANGED('draw') entry at all — only the skip/empty-deck edge cases above did — so
  // "Draw Phase" never had a marker to announce on the vast majority of real turns.
  logger.push({
    actorPlayerId: player.playerId,
    type: 'PHASE_CHANGED',
    message: `${player.playerId}'s Draw Phase: drew 1 card (6-3).`,
    data: { phase: 'draw' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  let nextState: GameState = {
    ...state,
    players: { ...state.players, [player.playerId]: newPlayer },
    cardsById,
    currentPhase: 'don',
    log: [...state.log, ...logger.log],
  };
  if (restDeck.length === 0) {
    nextState = withDeckBecameZeroThisTurn(nextState, player.playerId);
  }

  return { state: nextState, log: logger.log };
}
