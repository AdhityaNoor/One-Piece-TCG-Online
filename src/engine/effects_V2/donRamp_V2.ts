import type { PlayerReference_V2, ValueExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { GameLogEntry } from '../logs/logEntry';
import { createActionLogger } from '../rules/shared/actionLogger';
import type { GameState } from '../state/game';
import type { SelectorContext_V2 } from './selectorResolver_V2';
import { fixedNumberValue_V2 } from './damage_V2';

export interface AddDonFromDonDeckResult_V2 {
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

export function addDonFromDonDeck_V2(args: {
  ctx: SelectorContext_V2;
  player: PlayerReference_V2;
  count: ValueExpression_V2;
  state: 'ACTIVE' | 'RESTED';
  actionId: string | null;
}): AddDonFromDonDeckResult_V2 {
  const playerId = playerIdForReference(args.ctx, args.player);
  const count = fixedNumberValue_V2(args.count, 'addDonFromDonDeck_V2');
  const player = args.ctx.state.players[playerId];
  if (!player) return { state: args.ctx.state, log: [] };

  const moving = player.donDeck.cardIds.slice(0, Math.max(0, count));
  if (moving.length === 0) return { state: args.ctx.state, log: [] };

  const cardsById = { ...args.ctx.state.cardsById };
  for (const id of moving) {
    const card = cardsById[id];
    if (card) {
      cardsById[id] = {
        ...card,
        currentZone: 'costArea',
        faceState: 'faceUp',
        donRested: args.state === 'RESTED',
      };
    }
  }

  const logger = createActionLogger(args.ctx.state, args.actionId);
  logger.push({
    actorPlayerId: args.ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${playerId} added ${moving.length} DON!! from the DON!! deck to the cost area.`,
    data: { playerId, from: 'DON_DECK', to: 'COST_AREA', count: moving.length, state: args.state, donInstanceIds: moving },
    relatedCardInstanceIds: moving,
    visibility: 'public',
  });

  const state = {
    ...args.ctx.state,
    players: {
      ...args.ctx.state.players,
      [playerId]: {
        ...player,
        donDeck: { ...player.donDeck, cardIds: player.donDeck.cardIds.slice(moving.length) },
        costArea: { ...player.costArea, cardIds: [...player.costArea.cardIds, ...moving] },
      },
    },
    cardsById,
    log: [...args.ctx.state.log, ...logger.log],
  };

  return { state, log: logger.log };
}
