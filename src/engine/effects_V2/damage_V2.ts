import type { ValueExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { GameLogEntry } from '../logs/logEntry';
import { createActionLogger } from '../rules/shared/actionLogger';
import { addToZoneTop } from '../rules/shared/zoneOps';
import type { CardInstance } from '../state/card';
import type { GameState } from '../state/game';

export type LifeDamageProcessing_V2 = 'CHECK_TRIGGER' | 'BANISH' | 'CUSTOM';

export interface DamageApplicationResult_V2 {
  state: GameState;
  log: GameLogEntry[];
}

export function fixedNumberValue_V2(value: ValueExpression_V2, primitive: string): number {
  if (value.kind !== 'NUMBER') {
    throw new Error(`${primitive} requires a fixed NUMBER value until native V2 expression evaluation is available.`);
  }
  return value.value;
}

function opponentOf(state: GameState, playerId: string): string {
  return Object.keys(state.players).find((id) => id !== playerId) ?? playerId;
}

export function applyLifeDamage_V2(args: {
  state: GameState;
  actorPlayerId: string;
  targetPlayerId: string;
  amount: ValueExpression_V2;
  processing: LifeDamageProcessing_V2;
  actionId: string | null;
}): DamageApplicationResult_V2 {
  const amount = fixedNumberValue_V2(args.amount, 'applyLifeDamage_V2');
  const logger = createActionLogger(args.state, args.actionId);
  let state = args.state;

  for (let hit = 0; hit < amount && !state.gameOver; hit += 1) {
    const player = state.players[args.targetPlayerId];
    if (!player) break;

    if (player.lifeArea.cardIds.length === 0) {
      const winnerId = opponentOf(state, args.targetPlayerId);
      logger.push({
        actorPlayerId: args.actorPlayerId,
        type: 'GAME_OVER',
        message: `${args.targetPlayerId} took damage with no Life remaining and loses.`,
        data: { reason: 'lifeDamageAtZero', loserId: args.targetPlayerId, winnerId },
        relatedCardInstanceIds: [],
        visibility: 'public',
      });
      state = { ...state, gameOver: { winnerId, reason: 'lifeDamageAtZero' } };
      break;
    }

    const [lifeCardId, ...restLife] = player.lifeArea.cardIds;
    const lifeCard = state.cardsById[lifeCardId];
    const banished = args.processing === 'BANISH';
    const movedLifeCard: CardInstance | null = lifeCard
      ? {
          ...lifeCard,
          currentZone: banished ? 'trash' : 'hand',
          faceState: 'faceUp',
          revealedTo: banished ? 'all' : [args.targetPlayerId],
        }
      : null;
    const nextCardsById = lifeCard
      ? {
          ...state.cardsById,
          [lifeCardId]: movedLifeCard as CardInstance,
        }
      : state.cardsById;
    const nextPlayer = banished
      ? { ...player, lifeArea: { ...player.lifeArea, cardIds: restLife }, trash: addToZoneTop(player.trash, lifeCardId) }
      : { ...player, lifeArea: { ...player.lifeArea, cardIds: restLife }, hand: addToZoneTop(player.hand, lifeCardId) };

    state = {
      ...state,
      players: { ...state.players, [args.targetPlayerId]: nextPlayer },
      cardsById: nextCardsById,
    };
    logger.push({
      actorPlayerId: args.actorPlayerId,
      type: 'DAMAGE_DEALT',
      message: `${args.targetPlayerId} took 1 Life damage through a V2 effect.`,
      data: {
        hit: hit + 1,
        of: amount,
        targetPlayerId: args.targetPlayerId,
        lifeCardInstanceId: lifeCardId,
        processing: args.processing,
        destination: banished ? 'TRASH' : 'HAND',
      },
      relatedCardInstanceIds: [lifeCardId],
      visibility: banished ? 'public' : { visibleTo: [args.targetPlayerId] },
    });
  }

  return {
    state: { ...state, log: [...state.log, ...logger.log] },
    log: logger.log,
  };
}
