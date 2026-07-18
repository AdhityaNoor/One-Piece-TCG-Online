/**
 * Effect-sourced Life damage (card text "deal N damage").
 *
 * Moves top Life → hand per hit (with curated [Trigger] offers) and applies
 * 0-Life loss (9-2-1). Callers that have an EffectTemplateRegistry should then
 * fire life-to-hand / life-damage-dealt reactions (kept out of this module to
 * avoid interpreter ↔ fireTiming circular imports).
 */
import type { GameState } from '../../state/game';
import type { PendingChoice } from '../../events/pendingChoice';
import type { GameLogEntry } from '../../logs/logEntry';
import type { EffectTemplateRegistry } from '../../effects/effectTemplate';
import { effectLogDataForSource } from '../../logs/effectLogData';
import { createActionLogger } from './actionLogger';
import type { CardDefinitionLookup } from './definitions';
import { getOpponentId } from './players';
import { addToZoneBottom, addToZoneTop } from './zoneOps';
import { resolveLifeLeaveDestination } from './lifeLeaveDestination';

export interface DealLifeDamageResult {
  state: GameState;
  log: GameLogEntry[];
  pendingChoices: PendingChoice[];
  hitsResolved: number;
}

export function dealLifeDamage(args: {
  state: GameState;
  defs: CardDefinitionLookup;
  registry: EffectTemplateRegistry;
  actorPlayerId: string;
  targetPlayerId: string;
  amount: number;
  actionId: string | null;
  sourceInstanceId?: string | null;
}): DealLifeDamageResult {
  const logger = createActionLogger(args.state, args.actionId);
  let working = args.state;
  let hitsResolved = 0;
  const pending: PendingChoice[] = [];

  for (let hit = 0; hit < args.amount && !working.gameOver; hit += 1) {
    const player = working.players[args.targetPlayerId];
    if (!player) break;

    if (player.lifeArea.cardIds.length === 0) {
      const winnerId = getOpponentId(working, args.targetPlayerId);
      logger.push({
        actorPlayerId: args.actorPlayerId,
        type: 'GAME_OVER',
        message: `${args.targetPlayerId} took damage with no Life remaining and loses (9-2-1).`,
        data: { reason: 'lifeDamageAtZero', loserId: args.targetPlayerId, winnerId },
        relatedCardInstanceIds: [],
        visibility: 'public',
      });
      working = {
        ...working,
        gameOver: { winnerId, reason: 'lifeDamageAtZero' },
      };
      break;
    }

    const [lifeCardId, ...restLife] = player.lifeArea.cardIds;
    const lifeDef = args.defs[working.cardsById[lifeCardId]?.cardDefinitionId ?? ''];
    const leaveTo = resolveLifeLeaveDestination(working, args.targetPlayerId, lifeCardId);
    const cardsById = {
      ...working.cardsById,
      [lifeCardId]: {
        ...working.cardsById[lifeCardId],
        currentZone: leaveTo === 'deckBottom' ? 'deck' as const : 'hand' as const,
        faceState: 'faceUp' as const,
        revealedTo: leaveTo === 'deckBottom' ? 'all' as const : working.cardsById[lifeCardId].revealedTo,
      },
    };
    const nextPlayer = {
      ...player,
      lifeArea: { ...player.lifeArea, cardIds: restLife },
      ...(leaveTo === 'deckBottom'
        ? { deck: addToZoneBottom(player.deck, lifeCardId) }
        : { hand: addToZoneTop(player.hand, lifeCardId) }),
    };
    working = {
      ...working,
      players: { ...working.players, [args.targetPlayerId]: nextPlayer },
      cardsById,
    };
    hitsResolved += 1;

    if (leaveTo === 'hand' && lifeDef?.hasTrigger) {
      const hasCuratedTrigger = !!args.registry[working.cardsById[lifeCardId].cardDefinitionId]?.abilities.some(
        (ab) => ab.timing === 'lifeTrigger',
      );
      if (hasCuratedTrigger) {
        pending.push({
          id: `${args.targetPlayerId}__life-trigger-${lifeCardId}`,
          playerId: args.targetPlayerId,
          kind: 'YES_NO',
          prompt: `A revealed Life card has a [Trigger] — activate it? (It will be trashed instead of kept in hand.)`,
          constraints: { min: 0, max: 1 },
          sourceInstanceId: lifeCardId,
          sourceEffectId: 'rule:lifeTrigger',
        });
        logger.push({
          actorPlayerId: args.targetPlayerId,
          type: 'TRIGGER_REVEALED',
          message: `${args.targetPlayerId}'s revealed Life card has a [Trigger] — activation offered (10-1-5-2).`,
          data: {
            ...effectLogDataForSource(working, args.defs, args.sourceInstanceId ?? null),
            lifeCardInstanceId: lifeCardId,
          },
          relatedCardInstanceIds: [lifeCardId],
          visibility: { visibleTo: [args.targetPlayerId] },
        });
      }
    }

    logger.push({
      actorPlayerId: args.actorPlayerId,
      type: 'DAMAGE_DEALT',
      message: leaveTo === 'deckBottom'
        ? `${args.targetPlayerId} took 1 Life damage from an effect (hit ${hit + 1}/${args.amount}) — face-up Life placed at bottom of deck.`
        : `${args.targetPlayerId} took 1 Life damage from an effect (hit ${hit + 1}/${args.amount}).`,
      data: {
        hit: hit + 1,
        of: args.amount,
        targetPlayerId: args.targetPlayerId,
        lifeCardInstanceId: lifeCardId,
        sourceInstanceId: args.sourceInstanceId ?? undefined,
        faceUpLifeToDeckBottom: leaveTo === 'deckBottom' || undefined,
      },
      relatedCardInstanceIds: [lifeCardId],
      visibility: leaveTo === 'hand' ? { visibleTo: [args.targetPlayerId] } : 'public',
    });
  }

  const state: GameState = {
    ...working,
    log: [...working.log, ...logger.log],
    pendingChoices: [...working.pendingChoices, ...pending],
  };
  return { state, log: logger.log, pendingChoices: pending, hitsResolved };
}
