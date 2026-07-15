import type { PlayerReference_V2, ValueExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { GameLogEntry } from '../logs/logEntry';
import { createActionLogger } from '../rules/shared/actionLogger';
import { addToZoneBottom } from '../rules/shared/zoneOps';
import type { GameState } from '../state/game';
import type { SelectorContext_V2 } from './selectorResolver_V2';
import { fixedNumberValue_V2 } from './damage_V2';

export interface DrawCardsResult_V2 {
  state: GameState;
  log: GameLogEntry[];
}

function opponentOf(state: GameState, playerId: string): string {
  return Object.keys(state.players).find((id) => id !== playerId) ?? playerId;
}

function playerIdForReference(ctx: SelectorContext_V2, ref: PlayerReference_V2): string {
  const source = ctx.state.cardsById[ctx.sourceInstanceId];
  switch (ref) {
    case 'PLAYER':
    case 'EFFECT_OWNER':
      return ctx.controllerId;
    case 'OPPONENT':
      return opponentOf(ctx.state, ctx.controllerId);
    case 'CARD_OWNER':
      return source?.ownerId ?? ctx.controllerId;
    case 'CARD_CONTROLLER':
      return source?.controllerId ?? ctx.controllerId;
    case 'ANY':
      return ctx.controllerId;
  }
}

export function drawCards_V2(ctx: SelectorContext_V2, playerRef: PlayerReference_V2, count: ValueExpression_V2, actionId: string | null): DrawCardsResult_V2 {
  const playerId = playerIdForReference(ctx, playerRef);
  const drawCount = fixedNumberValue_V2(count, 'drawCards_V2');
  const logger = createActionLogger(ctx.state, actionId);
  let state = ctx.state;

  for (let drawIndex = 0; drawIndex < drawCount && !state.gameOver; drawIndex += 1) {
    const player = state.players[playerId];
    if (!player) break;

    if (player.deck.cardIds.length === 0) {
      const winnerId = opponentOf(state, playerId);
      logger.push({
        actorPlayerId: playerId,
        type: 'GAME_OVER',
        message: `${playerId} attempted to draw from an empty deck and loses by decking out.`,
        data: { reason: 'deckedOut', loserId: playerId, winnerId },
        relatedCardInstanceIds: [],
        visibility: 'public',
      });
      state = { ...state, gameOver: { winnerId, reason: 'deckedOut' } };
      break;
    }

    const [drawnId, ...restDeck] = player.deck.cardIds;
    state = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...player,
          deck: { ...player.deck, cardIds: restDeck },
          hand: addToZoneBottom(player.hand, drawnId),
        },
      },
      cardsById: {
        ...state.cardsById,
        [drawnId]: { ...state.cardsById[drawnId], currentZone: 'hand' },
      },
    };
    logger.push({
      actorPlayerId: playerId,
      type: 'CARD_DRAWN',
      message: `${playerId} drew 1 card from a V2 effect.`,
      data: { count: 1, drawIndex: drawIndex + 1, of: drawCount },
      relatedCardInstanceIds: [drawnId],
      visibility: { visibleTo: [playerId] },
    });
  }

  return {
    state: { ...state, log: [...state.log, ...logger.log] },
    log: logger.log,
  };
}
